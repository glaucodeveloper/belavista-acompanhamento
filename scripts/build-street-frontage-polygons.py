"""Split the asphalt mask into paired street-front polygons, one per mapped lot."""
from array import array
from collections import Counter, defaultdict
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'frontend/src/assets'
mask = Image.open(ASSETS / 'map-selection-mask.png').convert('RGB')
plant = Image.open(ASSETS / 'planta.webp').convert('RGB')
metadata = json.loads((ASSETS / 'map-selection-mask.json').read_text())
geometry = json.loads((ASSETS / 'lotes.json').read_text())
mapping = json.loads((ASSETS / 'mapeamento.json').read_text())
width, height = mask.size
mask_rgb = mask.tobytes()
road_ids = set(metadata['asphaltSlices'])
road = bytearray(width * height)
image_road = bytearray(width * height)


def mask_point(point):
    u, v = point
    return (((u * 2886 + 16.9) / 2990.08) * 2048, ((v * 3468 + 37.2) / 3768.32) * 2581)


plant_rgb = plant.tobytes()
for index in range(width * height):
    px = index % width
    py = index // width
    mask_offset = index * 3
    image_offset = (py * plant.width + px + 281) * 3
    red, green, blue = plant_rgb[image_offset:image_offset + 3]
    # Keep a wider neutral-gray range so pavement texture and lighter asphalt
    # patches do not remain unassigned in the rendered street map.
    is_image_road = min(red, green, blue) >= 55 and max(red, green, blue) <= 230 and max(red, green, blue) - min(red, green, blue) <= 40
    is_mask_road = mask_rgb[mask_offset] in road_ids and mask_rgb[mask_offset + 2] == 0
    image_road[index] = is_image_road
    road[index] = is_image_road or is_mask_road
road_image = Image.frombytes('L', (width, height), bytes(road)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
road = bytearray(1 if value else 0 for value in road_image.tobytes())


def has_road_near(x, y, radius=8):
    cx, cy = round(x), round(y)
    for yy in range(max(0, cy - radius), min(height, cy + radius + 1)):
        row = yy * width
        left, right = max(0, cx - radius), min(width, cx + radius + 1)
        if any(road[row + xx] for xx in range(left, right)):
            return True
    return False


def simplify_open(points, tolerance):
    if len(points) <= 2:
        return points
    first, last = points[0], points[-1]
    dx, dy = last[0] - first[0], last[1] - first[1]
    length = (dx * dx + dy * dy) ** 0.5
    maximum, split = -1, 0
    for index, point in enumerate(points[1:-1], 1):
        if length:
            distance = abs(dy * point[0] - dx * point[1] + last[0] * first[1] - last[1] * first[0]) / length
        else:
            distance = ((point[0] - first[0]) ** 2 + (point[1] - first[1]) ** 2) ** 0.5
        if distance > maximum:
            maximum, split = distance, index
    if maximum <= tolerance:
        return [first, last]
    return simplify_open(points[:split + 1], tolerance)[:-1] + simplify_open(points[split:], tolerance)


def simplify_closed(points, tolerance=1.15):
    points = points[:-1]
    if len(points) < 4:
        return points
    first = points[0]
    farthest = max(range(1, len(points)), key=lambda i: (points[i][0] - first[0]) ** 2 + (points[i][1] - first[1]) ** 2)
    one = simplify_open(points[:farthest + 1], tolerance)
    two = simplify_open(points[farthest:] + [first], tolerance)
    result = one[:-1] + two[:-1]
    return result if len(result) >= 3 else points


def trace_region(region, tolerance=1.15):
    members = set(region)
    edges, outgoing = [], defaultdict(list)

    def add(start, end, direction):
        edge_id = len(edges)
        edges.append((start, end, direction))
        outgoing[start].append(edge_id)

    for current in region:
        x, y = current % width, current // width
        if y == 0 or current - width not in members:
            add((x, y), (x + 1, y), 0)
        if x + 1 == width or current + 1 not in members:
            add((x + 1, y), (x + 1, y + 1), 1)
        if y + 1 == height or current + width not in members:
            add((x + 1, y + 1), (x, y + 1), 2)
        if x == 0 or current - 1 not in members:
            add((x, y + 1), (x, y), 3)

    used = bytearray(len(edges))
    rings = []
    turn_rank = {1: 0, 0: 1, 3: 2, 2: 3}
    for initial in range(len(edges)):
        if used[initial]:
            continue
        start, end, direction = edges[initial]
        used[initial] = 1
        points = [start, end]
        previous_direction, current = direction, end
        while current != start:
            options = [edge for edge in outgoing[current] if not used[edge]]
            if not options:
                break
            next_edge = min(options, key=lambda edge: turn_rank[(edges[edge][2] - previous_direction) % 4])
            _, current, previous_direction = edges[next_edge]
            used[next_edge] = 1
            points.append(current)
        if current == start and len(points) >= 5:
            rings.append(simplify_closed(points, tolerance=tolerance))
    return rings


# Rasterize lot boundaries that actually face asphalt in the plant. A gray-pixel
# sample outside an edge finds the frontage; the old mask is a fallback for locations
# where the plant boundary is too irregular. The two sides of each street form paired rows.
seed_image = Image.new('I', (width, height), 0)
seed_draw = ImageDraw.Draw(seed_image)
frontages = []
plant_image = plant.load()


def is_plant_asphalt(x, y):
    x, y = round(x + 281), round(y)
    if x < 0 or y < 0 or x >= plant.width or y >= plant.height:
        return False
    red, green, blue = plant_image[x, y]
    return min(red, green, blue) >= 80 and max(red, green, blue) <= 205 and max(red, green, blue) - min(red, green, blue) <= 25


for _, item in enumerate(mapping['mappings'], 1):
    points = geometry['lots'].get(item['greenPolygonId'])
    if not points or len(points) < 3:
        continue
    points = simplify_closed([mask_point(point) for point in points], tolerance=1.5)
    edge_candidates = []
    mask_candidates = []
    for index, start in enumerate(points):
        end = points[(index + 1) % len(points)]
        length = ((end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2) ** 0.5
        if length < 12:
            continue
        samples = max(2, int(length / 2))
        dx, dy = end[0] - start[0], end[1] - start[1]
        nx, ny = -dy / length, dx / length
        side_scores = []
        mask_scores = []
        for sign in (-1, 1):
            plant_hits = 0
            mask_hits = 0
            for sample in range(1, 10):
                t = sample / 10
                x, y = start[0] + dx * t, start[1] + dy * t
                plant_hits += any(is_plant_asphalt(x + sign * nx * distance, y + sign * ny * distance) for distance in (3, 5, 7, 9))
                mask_hits += has_road_near(x + sign * nx * 5, y + sign * ny * 5, radius=4)
            side_scores.append(plant_hits / 9)
            mask_scores.append(mask_hits / 9)
        score = max(side_scores)
        if score >= 0.6:
            edge_candidates.append((score, index, start, end))
        mask_candidates.append((max(mask_scores), index, start, end))

    # Keep two sides only when they meet at a lot corner. Parallel or opposite roads
    # do not turn an ordinary lot into a corner lot.
    ranked_edges = sorted(edge_candidates, key=lambda candidate: candidate[0], reverse=True)
    selected_edges = ranked_edges[:1]
    adjacent_pairs = [
        (first, second) for first_index, first in enumerate(ranked_edges)
        for second in ranked_edges[first_index + 1:]
        if abs(first[1] - second[1]) == 1 or abs(first[1] - second[1]) == len(points) - 1
    ]
    if adjacent_pairs:
        selected_edges = max(adjacent_pairs, key=lambda pair: pair[0][0] + pair[1][0])
    if not selected_edges and mask_candidates:
        selected_edges = [max(mask_candidates, key=lambda candidate: candidate[0])]
    for frontage_part, (score, index, start, end) in enumerate(selected_edges, 1):
        frontage_id = len(frontages) + 1
        frontages.append({
            'labelId': frontage_id,
            'lotId': item['lotId'],
            'officialLabel': item['officialLabel'],
            'number': item['number'],
            'partNumber': frontage_part,
            'edgeIndex': index,
            'frontEdge': [start, end],
            'edgeConfidence': round(score, 3),
        })
        seed_draw.line([(round(start[0]), round(start[1])), (round(end[0]), round(end[1]))], fill=frontage_id, width=1)

seed_values = array('I')
seed_values.frombytes(seed_image.tobytes())
count = width * height
infinity = 1e9
distance = array('f', [infinity]) * count
nearest = array('H', [0]) * count
for index, label_id in enumerate(seed_values):
    if label_id:
        distance[index] = 0
        nearest[index] = label_id

# Two-pass 8-neighbor chamfer transform, enough to partition street surfaces at map scale.
diagonal = 1.41421356
for y in range(height):
    row = y * width
    for x in range(width):
        i = row + x
        best = distance[i]
        best_id = nearest[i]
        if x and distance[i - 1] + 1 < best:
            best, best_id = distance[i - 1] + 1, nearest[i - 1]
        if y:
            for neighbor, cost in ((i - width, 1), (i - width - 1, diagonal) if x else (-1, diagonal), (i - width + 1, diagonal) if x + 1 < width else (-1, diagonal)):
                if neighbor >= 0 and distance[neighbor] + cost < best:
                    best, best_id = distance[neighbor] + cost, nearest[neighbor]
        distance[i], nearest[i] = best, best_id
for y in range(height - 1, -1, -1):
    row = y * width
    for x in range(width - 1, -1, -1):
        i = row + x
        best = distance[i]
        best_id = nearest[i]
        if x + 1 < width and distance[i + 1] + 1 < best:
            best, best_id = distance[i + 1] + 1, nearest[i + 1]
        if y + 1 < height:
            for neighbor, cost in ((i + width, 1), (i + width - 1, diagonal) if x else (-1, diagonal), (i + width + 1, diagonal) if x + 1 < width else (-1, diagonal)):
                if neighbor >= 0 and distance[neighbor] + cost < best:
                    best, best_id = distance[neighbor] + cost, nearest[neighbor]
        distance[i], nearest[i] = best, best_id

# The wider reach includes full carriageways and nearby junction paving. Always
# retain pixels explicitly marked as asphalt in the source mask, even at junctions
# that sit farther from a lot frontage.
regions = defaultdict(list)
counts = Counter()
for index, is_road in enumerate(road):
    label_id = nearest[index]
    mask_offset = index * 3
    is_selected_asphalt = mask_rgb[mask_offset] in road_ids and mask_rgb[mask_offset + 2] == 0
    if is_road and label_id and (distance[index] <= 72 or is_selected_asphalt):
        regions[label_id].append(index)
        counts[label_id] += 1


def keep_components(region, minimum=4):
    members = set(region)
    remaining = set(members)
    while remaining:
        start = remaining.pop()
        stack, component = [start], [start]
        while stack:
            current = stack.pop()
            x, y = current % width, current // width
            for dy in (-1, 0, 1):
                yy = y + dy
                if yy < 0 or yy >= height:
                    continue
                for dx in (-1, 0, 1):
                    xx = x + dx
                    neighbor = yy * width + xx
                    if not (dx or dy) or xx < 0 or xx >= width or neighbor not in remaining:
                        continue
                    remaining.remove(neighbor)
                    stack.append(neighbor)
                    component.append(neighbor)
        if len(component) >= minimum:
            yield component


segments = []
parts_per_lot = Counter(item['lotId'] for item in frontages)
without_road_polygon = []
for item in frontages:
    lot_region = regions.get(item['labelId'], [])
    rings = [ring for component in keep_components(lot_region) for ring in trace_region(component)]
    if not rings:
        without_road_polygon.append((item['officialLabel'], item['edgeIndex'], counts[item['labelId']]))
        continue
    segments.append({
        'id': f"street-frontage-{item['lotId']}-{item['partNumber']}",
        'lotId': item['lotId'],
        'lotLabel': item['officialLabel'],
        'lotNumber': item['number'],
        'frontageNumber': item['partNumber'],
        'label': f"{item['officialLabel']} · frente {item['partNumber']}" if parts_per_lot[item['lotId']] > 1 else f"{item['officialLabel']} · frente de rua",
        'areaLabel': f"Rua em frente a {item['officialLabel']}",
        'pixelCount': counts[item['labelId']],
        'frontEdge': [[round(x, 1), round(y, 1)] for x, y in item['frontEdge']],
        'rings': rings,
    })
segments.sort(key=lambda item: (item['lotLabel'], item['lotNumber'], item['id']))

# The social courts are one area. This perimeter follows the green side of the
# upper and lower streets and stays inside the cut image edge. Keep the courts,
# their green surroundings, and the fountain together without covering asphalt.
social_perimeter = [
    [710, 960], [710, 1000], [707, 1060], [705, 1120], [700, 1180],
    [695, 1240], [690, 1300], [682, 1360], [690, 1400], [710, 1430],
    [725, 1460], [745, 1490], [765, 1515], [785, 1530], [812, 1530],
    [830, 1510], [860, 1490], [870, 1470], [900, 1450], [895, 1440],
    [915, 1430], [940, 1420], [950, 1400], [975, 1380], [995, 1360],
    [1015, 1340], [1035, 1320], [1035, 1300], [1020, 1280], [1005, 1260],
    [990, 1240], [975, 1220], [955, 1200], [940, 1180], [920, 1160],
    [900, 1140], [870, 1120], [850, 1100], [830, 1080], [815, 1060],
    [795, 1040], [785, 1020], [770, 1000], [745, 980], [730, 960],
]
social_candidate = Image.new('L', (width, height), 0)
ImageDraw.Draw(social_candidate).polygon(social_perimeter, fill=255)

social_plan_alpha = Image.open(ASSETS / 'planta.webp').convert('RGBA').getchannel('A').crop((281, 0, 2329, 2581))
social_inside_plan = social_plan_alpha.point(lambda value: 255 if value else 0).filter(ImageFilter.MinFilter(21))
candidate_pixels = social_candidate.tobytes()
plan_pixels = social_inside_plan.tobytes()
social_region = [index for index, included in enumerate(candidate_pixels) if included and plan_pixels[index]]
social_components = list(keep_components(social_region, minimum=32))
if not social_components:
    raise RuntimeError('Could not find the social area inside the inset plan boundary')
social_component = max(social_components, key=len)
social_contours = trace_region(social_component, tolerance=1.1)
if not social_contours:
    raise RuntimeError('Could not trace the inset social area')
social_outer_ring = max(social_contours, key=lambda ring: abs(sum(
    ring[index][0] * ring[(index + 1) % len(ring)][1] - ring[(index + 1) % len(ring)][0] * ring[index][1]
    for index in range(len(ring))
)))
social_rings = [[[round(x, 1), round(y, 1)] for x, y in social_outer_ring]]
social_area = {
    'id': 'area-social',
    'label': 'Área social das quadras',
    'rings': social_rings,
}

output = ASSETS / 'street-segments.json'
output.write_text(json.dumps({
    'version': 2,
    'sourceMask': 'map-selection-mask.png',
    'lotGeometry': 'lotes.json + mapeamento.json',
    'coordinateSpace': 'mask-top-left; add 281 px to x for lot-map stage',
    'maskSize': [width, height],
    'partition': 'one road polygon per lot-facing street side; corner lots split by frontage edge; paired across each road',
    'socialArea': social_area,
    'segments': segments,
}, separators=(',', ':')) + '\n')
segment_lot_ids = {segment['lotId'] for segment in segments}
missing = [item['officialLabel'] for item in mapping['mappings'] if item['lotId'] not in segment_lot_ids]
corner_count = sum(1 for amount in parts_per_lot.values() if amount > 1)
print(f'Wrote {output}: {len(segments)} lot-front polygons across {len(parts_per_lot)} lots, {output.stat().st_size:,} bytes')
print(f'Corner lots split into two street faces: {corner_count}')
print(f"Selected road pixels by segment: {sum(counts.values()):,}; no polygon for {len(missing)} mapped lots")
if missing:
    print('Missing frontage polygons:', ', '.join(missing))
if without_road_polygon:
    print('Frontage edges without a rasterized road region:', ', '.join(f'{label} (edge {edge}, {pixels} px)' for label, edge, pixels in without_road_polygon))
