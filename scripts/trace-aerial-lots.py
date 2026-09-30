"""Fit the canonical GLB lot outlines to visible pale cadastral lines in the aerial.

Writes a reproducible image-space trace and an inspection overlay. Lot identities
and topology always come from the GLB; the photograph only refines placement.
"""
import json
import struct
from pathlib import Path

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
IMAGE = ROOT / "assets/public/alianca-park-aerial-reference-expanded-v1.png"
MODEL = ROOT / "assets/model/alianca_park_masterplan_preview.glb"
GEO = ROOT / "assets/data/dwg-georeference.json"
OUTPUT = ROOT / "assets/data/aerial-lot-trace-v1.json"
PREVIEW = ROOT / "assets/data/aerial-lot-trace-preview-v1.png"
H = np.array([
    [-2.94306335e-7, -6.87434193e-8, 7.15685809e-1],
    [3.56353169e-11, 3.82122918e-7, -3.27219102],
    [7.83358933e-8, -1.2079129e-7, 1],
], dtype=np.float64)


def glb_lots():
    raw = MODEL.read_bytes()
    json_length = struct.unpack_from("<I", raw, 12)[0]
    doc = json.loads(raw[20:20 + json_length])
    binary_start = 20 + json_length + 8
    polygons = {}
    for node in doc["nodes"]:
        name = node.get("name", "")
        if not name.startswith("Lote_") or "mesh" not in node:
            continue
        primitive = doc["meshes"][node["mesh"]]["primitives"][0]
        accessor = doc["accessors"][primitive["attributes"]["POSITION"]]
        view = doc["bufferViews"][accessor["bufferView"]]
        start = binary_start + view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
        vertices = np.frombuffer(raw, dtype="<f4", count=accessor["count"] * 3, offset=start).reshape(-1, 3)
        # Vertex data are the four corners in local GLB X/Z coordinates.
        polygons[name] = np.column_stack((vertices[:, 0], -vertices[:, 2])).astype(np.float64)
    return polygons


def project(polygons, width, height, geo):
    matrix = np.asarray(geo["alignment"]["glbToDwgMatrix"], dtype=np.float64)
    translation = np.asarray(geo["alignment"]["translation"], dtype=np.float64)
    result = {}
    for name, polygon in polygons.items():
        utm = polygon @ matrix.T + translation
        hom = np.column_stack((utm, np.ones(len(utm)))) @ H.T
        uv = hom[:, :2] / hom[:, 2:3]
        result[name] = uv * [width, height]
    return result


def sample_segments(polygons):
    segments = []
    for polygon in polygons.values():
        if len(polygon) < 3:
            continue
        center = polygon.mean(axis=0)
        ordered = polygon[np.argsort(np.arctan2(polygon[:, 1] - center[1], polygon[:, 0] - center[0]))]
        for start, end in zip(ordered, np.roll(ordered, -1, axis=0)):
            length = np.linalg.norm(end - start)
            if 4 < length < 180:
                segments.append((start, end))
    return np.asarray(segments, dtype=np.float64)


def image_line_distance(rgb):
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    # Narrow bright, low-saturation parcel ink; reject bright broad roads and
    # highlights by requiring a thin local ridge.
    bright = ((gray > 118) & (hsv[:, :, 1] < 95)).astype(np.uint8)
    enhanced = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
    pale = ((bright > 0) & (enhanced > 4)).astype(np.uint8)
    # Parcel dividers in this composite are thin grey strokes, often darker
    # than the road margins. A low local-contrast threshold retains them.
    line = pale
    distance = cv2.distanceTransform(1 - line, cv2.DIST_L2, 3)
    return np.minimum(distance, 18), line


def sample_distance(distance, points):
    h, w = distance.shape
    x = np.clip(points[..., 0].round().astype(int), 0, w - 1)
    y = np.clip(points[..., 1].round().astype(int), 0, h - 1)
    return distance[y, x]


def trace_polygon_edges(polygon, distance):
    """Snap each GLB edge to a matching photographic divider, not to a lot dot.

    Edges remain straight; neighboring shifted edges intersect to form corners.
    Large changes and edges with no continuous photographic evidence are rejected.
    """
    edges = []
    accepted = 0
    for start, end in zip(polygon, np.roll(polygon, -1, axis=0)):
        direction = end - start
        length = np.linalg.norm(direction)
        if length < 3:
            edges.append((start, end))
            continue
        normal = np.array([-direction[1], direction[0]]) / length
        steps = max(9, min(24, int(length / 2)))
        t = np.linspace(.12, .88, steps)[:, None]
        points = start[None, :] * (1 - t) + end[None, :] * t
        original_dist = sample_distance(distance, points)
        original_score = float(np.mean(np.minimum(original_dist, 8)))
        best_offset, best_score = 0., original_score
        for offset in np.arange(-6., 6.01, .5):
            measured = sample_distance(distance, points + normal * offset)
            # A true boundary is continuous over much of the edge. Sparse
            # circles, trees and texture highlights must not attract an edge.
            hit_fraction = np.mean(measured <= 2.4)
            if hit_fraction < .38:
                continue
            score = float(np.mean(np.minimum(measured, 8)) + .035 * offset**2)
            if score < best_score:
                best_offset, best_score = float(offset), score
        if abs(best_offset) >= .5 and original_score - best_score >= .35:
            accepted += 1
        else:
            best_offset = 0.
        edges.append((start + normal * best_offset, end + normal * best_offset))

    corners = []
    for index in range(len(edges)):
        prior_start, prior_end = edges[index - 1]
        next_start, next_end = edges[index]
        a = prior_end - prior_start
        b = next_end - next_start
        matrix = np.column_stack((a, -b))
        if abs(np.linalg.det(matrix)) < 1e-5:
            corner = polygon[index]
        else:
            point = prior_start + np.linalg.solve(matrix, next_start - prior_start)[0] * a
            delta = point - polygon[index]
            corner = polygon[index] + delta * min(1., 7. / max(np.linalg.norm(delta), 1e-6))
        corners.append(corner)
    return np.asarray(corners), accepted


def main():
    bgr = cv2.imread(str(IMAGE))
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    height, width = rgb.shape[:2]
    geo = json.loads(GEO.read_text(encoding="utf-8"))
    initial = project(glb_lots(), width, height, geo)
    segments = sample_segments(initial)
    distance, line = image_line_distance(rgb)
    # Shared dividers occur twice. Sample interior edge pixels; exclude corners
    # where road and circle markings would bias the fit.
    t = np.linspace(.15, .85, 7)
    samples = (segments[:, None, 0, :] * (1 - t[None, :, None]) + segments[:, None, 1, :] * t[None, :, None]).reshape(-1, 2)
    # The source geometry is close enough to constrain displacement to a few
    # pixels. Large free transforms can lock onto the next parallel lot line.
    cols, rows = 7, 5
    x0, x1 = 380., 1250.
    y0, y1 = 60., 700.
    grid = np.zeros((rows, cols, 2), dtype=np.float64)

    def interpolate(points, field):
        gx = np.clip((points[:, 0] - x0) / (x1 - x0) * (cols - 1), 0, cols - 1)
        gy = np.clip((points[:, 1] - y0) / (y1 - y0) * (rows - 1), 0, rows - 1)
        ix = np.minimum(gx.astype(int), cols - 2)
        iy = np.minimum(gy.astype(int), rows - 2)
        fx = (gx - ix)[:, None]
        fy = (gy - iy)[:, None]
        return ((1 - fx) * (1 - fy) * field[iy, ix] +
                fx * (1 - fy) * field[iy, ix + 1] +
                (1 - fx) * fy * field[iy + 1, ix] +
                fx * fy * field[iy + 1, ix + 1])

    def field_loss(field):
        xy = samples + interpolate(samples, field)
        x = np.clip(np.round(xy[:, 0]).astype(int), 0, width - 1)
        y = np.clip(np.round(xy[:, 1]).astype(int), 0, height - 1)
        return float(np.mean(distance[y, x]) + .018 * np.mean(field**2))

    before = field_loss(grid)
    for _ in range(2):
        changed = False
        for row in range(rows):
            for col in range(cols):
                current = grid[row, col].copy()
                base_score = field_loss(grid)
                best = current
                best_score = base_score
                for dx in (-3., 0., 3.):
                    for dy in (-3., 0., 3.):
                        candidate = np.clip(current + [dx, dy], -7., 7.)
                        grid[row, col] = candidate
                        score = field_loss(grid)
                        if score < best_score - .002:
                            best, best_score = candidate.copy(), score
                grid[row, col] = best
                changed |= not np.array_equal(best, current)
        if not changed:
            break
    after = field_loss(grid)
    print("lot_count", len(initial), "line_pixels", int(line.sum()), "score_before", before, "score_after", after, "max_shift", float(np.abs(grid).max()))
    corrected = {}
    snapped_edges = 0
    for name, poly in initial.items():
        traced, accepted = trace_polygon_edges(poly + interpolate(poly, grid), distance)
        corrected[name] = np.round(traced, 3).tolist()
        snapped_edges += accepted
    OUTPUT.write_text(json.dumps({"version": 2, "source": IMAGE.name, "model": MODEL.name, "lotCount": len(corrected), "imageSize": [width, height], "gridBounds": [x0, y0, x1, y1], "grid": np.round(grid, 3).tolist(), "scoreBefore": before, "scoreAfter": after, "snappedEdges": snapped_edges, "lots": corrected}, separators=(",", ":")), encoding="utf-8")
    print("snapped_edges", snapped_edges, "of", sum(len(poly) for poly in initial.values()))
    overlay = cv2.addWeighted(bgr, .65, np.full_like(bgr, (0, 0, 0)), .35, 0)
    for poly in corrected.values():
        cv2.polylines(overlay, [np.round(poly).astype(np.int32)], True, (0, 255, 255), 1, cv2.LINE_AA)
    cv2.imwrite(str(PREVIEW), overlay)


if __name__ == "__main__":
    main()
