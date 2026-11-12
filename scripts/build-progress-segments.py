"""Derive selectable half-frontage road and curb polygons from the plan mask.

Run with: uv run --python 3.12 --with numpy --with opencv-python-headless python scripts/build-progress-segments.py
The input street polygons were traced from the plan's asphalt contrast. This
step partitions each frontage at its midpoint and isolates the curb strip.
"""
import json
from pathlib import Path

import cv2
import numpy as np
from skimage.morphology import skeletonize

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'frontend/src/assets'
source = json.loads((ASSETS / 'street-segments.json').read_text(encoding='utf-8'))
lots = json.loads((ASSETS / 'lotes.json').read_text(encoding='utf-8'))['lots']
width, height = source['maskSize']


def rings_to_mask(rings):
    mask = np.zeros((height, width), dtype=np.uint8)
    # Draw rings separately using XOR to preserve holes (SVG even-odd rule).
    for ring in rings:
        if len(ring) < 3:
            continue
        layer = np.zeros_like(mask)
        cv2.fillPoly(layer, [np.rint(ring).astype(np.int32)], 1)
        mask ^= layer
    return mask


def trace(mask):
    contours, _ = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    result = []
    for contour in contours:
        if cv2.contourArea(contour) < 5:
            continue
        points = cv2.approxPolyDP(contour, 0.7, True).reshape(-1, 2)
        if len(points) >= 3:
            result.append(points.tolist())
    return result


# Union and close tiny gaps in the traced asphalt, then extract a narrow edge.
road_union = np.zeros((height, width), dtype=np.uint8)
for segment in source['segments']:
    road_union |= rings_to_mask(segment['rings'])
lot_mask = np.zeros_like(road_union)
for points in lots.values():
    if len(points) >= 3:
        polygon = np.array([[(u * 2886 + 16.9) / 2990.08 * 2048, (v * 3468 + 37.2) / 3768.32 * 2581] for u, v in points], dtype=np.float32)
        cv2.fillPoly(lot_mask, [np.rint(polygon).astype(np.int32)], 1)
# Discard texture and parcel markings inside lots before detecting roads.
lot_interior = cv2.erode(lot_mask, np.ones((3, 3), np.uint8))
road_union &= (1 - lot_interior)
# Narrow parcel seams and raster noise are not pavement: remove them before
# extracting the road network, then fill texture gaps inside broad surfaces.
road_union = cv2.morphologyEx(road_union, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
closed = cv2.morphologyEx(road_union, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
closed &= (1 - lot_interior)
distance = cv2.distanceTransform(closed, cv2.DIST_L2, 3)
# Estimate intersections on a smoothed silhouette; the central remainder is a
# separate selectable surface, bounded by the asphalt, not an invented rectangle.
smooth = cv2.morphologyEx(closed, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
spine = skeletonize(smooth > 0).astype(np.uint8)
neighbors = cv2.filter2D(spine, cv2.CV_16S, np.ones((3, 3), np.int16)) - spine
branches = ((spine > 0) & (neighbors >= 3) & (distance >= 7)).astype(np.uint8)
branches = cv2.dilate(branches, np.ones((11, 11), np.uint8))
count, junction_labels = cv2.connectedComponents(branches)
junctions = []
central = np.zeros_like(closed)
for label in range(1, count):
    ys, xs = np.nonzero((junction_labels == label) & (spine > 0))
    if len(xs) == 0:
        continue
    x, y = int(np.median(xs)), int(np.median(ys))
    if distance[y, x] < 12:
        continue
    # A true junction has at least three broad asphalt arms around its centre.
    # Short spurs caused by antialiasing, markings and lot borders are ignored.
    radius_test = max(28, min(65, int(distance[y, x] * 2.2)))
    angles = np.linspace(0, 2 * np.pi, 360, endpoint=False)
    sample_x = np.clip(np.rint(x + radius_test * np.cos(angles)).astype(int), 0, width - 1)
    sample_y = np.clip(np.rint(y + radius_test * np.sin(angles)).astype(int), 0, height - 1)
    samples = smooth[sample_y, sample_x].astype(bool)
    # Start after a gap so wrapped arcs are counted only once.
    if samples.all() or not samples.any():
        continue
    samples = np.roll(samples, -int(np.flatnonzero(~samples)[0]))
    transitions = np.diff(np.r_[False, samples, False].astype(np.int8))
    widths = np.flatnonzero(transitions == -1) - np.flatnonzero(transitions == 1)
    if np.count_nonzero(widths >= 12) < 3:
        continue
    radius = min(45, max(7, int(distance[y, x] * .8)))
    local = np.zeros_like(closed)
    cv2.circle(local, (x, y), radius, 1, -1)
    local &= closed
    if np.count_nonzero(local) < 100:
        continue
    central |= local
    junctions.append((x, y, radius))
segments = []
for segment in source['segments']:
    region = rings_to_mask(segment['rings']) & closed & (1 - central)
    (ax, ay), (bx, by) = segment['frontEdge']
    dx, dy = bx - ax, by - ay
    length2 = dx * dx + dy * dy
    if length2 < 1:
        continue
    ys, xs = np.nonzero(region)
    projection = ((xs - ax) * dx + (ys - ay) * dy) / length2
    for part in (0, 1):
        subset = (projection < .5) if part == 0 else (projection >= .5)
        part_mask = np.zeros_like(region)
        part_mask[ys[subset], xs[subset]] = 1
        # Restrict the boundary strip to the side adjoining this frontage.
        perpendicular = np.abs((xs - ax) * dy - (ys - ay) * dx) / np.sqrt(length2)
        near_frontage = perpendicular <= 9
        curb = np.zeros_like(region)
        curb_pixels = subset & near_frontage & (distance[ys, xs] <= 5)
        curb[ys[curb_pixels], xs[curb_pixels]] = 1
        road_part = part_mask & (1 - curb)
        for kind, mask in (('street', road_part), ('curb', curb)):
            contours = trace(mask)
            if not contours:
                continue
            title = 'Rua' if kind == 'street' else 'Meio-fio'
            segments.append({
                'id': f"{kind}-{segment['id']}-{part + 1}",
                'kind': kind,
                'lotId': segment['lotId'],
                'lotLabel': segment['lotLabel'],
                'label': f"{title} · {segment['lotLabel']} · frente {segment['frontageNumber']} · metade {part + 1}",
                'rings': contours,
            })

for index, (x, y, radius) in enumerate(junctions, 1):
    mask = np.zeros_like(closed)
    cv2.circle(mask, (x, y), radius, 1, -1)
    mask &= closed
    rings = trace(mask)
    if rings:
        segments.append({'id': f'junction-{index}', 'kind': 'street', 'label': f'Centro de encontro de ruas {index}', 'rings': rings})

out = ASSETS / 'progress-segments.json'
out.write_text(json.dumps({'version': 1, 'source': 'street-segments.json', 'segments': segments}, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print(f"{sum(s['kind'] == 'street' for s in segments)} street regions; {sum(s['kind'] == 'curb' for s in segments)} curb halves; {len(junctions)} junction centres; {out.stat().st_size:,} bytes")
