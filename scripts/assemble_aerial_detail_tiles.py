"""Align AI detail crops to the approved map and export 15 seamless zoom tiles."""

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "assets/public/alianca-park-aerial-reference-expanded-v4-4k-600dpi.png"
GENERATED = ROOT / "assets/data/aerial-detail-generated-v2"
TARGET = ROOT / "assets/public/alianca-park-aerial-realistic-tiles-v2"
PREVIEW = ROOT / "assets/data/aerial-realistic-tiles-v2-preview.jpg"
COLS, ROWS, SCALE = 5, 3, 5


def crop_bounds(width: int, height: int, row: int, col: int):
    left = width * col // COLS
    top = height * row // ROWS
    right = width * (col + 1) // COLS
    bottom = height * (row + 1) // ROWS
    margin_x = round((right - left) * 0.1)
    margin_y = round((bottom - top) * 0.1)
    padded = (
        max(0, left - margin_x), max(0, top - margin_y),
        min(width, right + margin_x), min(height, bottom + margin_y),
    )
    return (left, top, right, bottom), padded


def register(reference: np.ndarray, generated: np.ndarray) -> np.ndarray:
    target_size = (reference.shape[1], reference.shape[0])
    resized = cv2.resize(generated, target_size, interpolation=cv2.INTER_AREA)
    ref_gray = cv2.cvtColor(reference, cv2.COLOR_BGR2GRAY)
    gen_gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    ref_edges = cv2.GaussianBlur(cv2.Canny(ref_gray, 60, 130), (5, 5), 0).astype(np.float32) / 255
    gen_edges = cv2.GaussianBlur(cv2.Canny(gen_gray, 60, 130), (5, 5), 0).astype(np.float32) / 255
    warp = np.eye(2, 3, dtype=np.float32)
    try:
        _, warp = cv2.findTransformECC(
            ref_edges, gen_edges, warp, cv2.MOTION_AFFINE,
            (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 50, 1e-5),
            None, 5,
        )
    except cv2.error:
        return np.eye(2, 3, dtype=np.float32)
    if (
        abs(warp[0, 2]) > 32 or abs(warp[1, 2]) > 32
        or abs(warp[0, 0] - 1) > 0.07 or abs(warp[1, 1] - 1) > 0.07
        or abs(warp[0, 1]) > 0.07 or abs(warp[1, 0]) > 0.07
    ):
        return np.eye(2, 3, dtype=np.float32)
    return warp


def make_tile(reference: np.ndarray, generated: np.ndarray, inner: tuple[int, int, int, int], padded: tuple[int, int, int, int]):
    crop_width = padded[2] - padded[0]
    crop_height = padded[3] - padded[1]
    generated_low = cv2.resize(generated, (crop_width, crop_height), interpolation=cv2.INTER_AREA)
    warp = register(reference, generated)
    generated_high = cv2.resize(generated, (crop_width * SCALE, crop_height * SCALE), interpolation=cv2.INTER_LANCZOS4)
    scaled_warp = warp.copy()
    scaled_warp[:, 2] *= SCALE
    aligned = cv2.warpAffine(
        generated_high, scaled_warp, (crop_width * SCALE, crop_height * SCALE),
        flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
        borderMode=cv2.BORDER_REFLECT_101,
    )
    x0 = (inner[0] - padded[0]) * SCALE
    y0 = (inner[1] - padded[1]) * SCALE
    x1 = x0 + (inner[2] - inner[0]) * SCALE
    y1 = y0 + (inner[3] - inner[1]) * SCALE
    aligned = aligned[y0:y1, x0:x1]
    base = cv2.resize(reference, (crop_width * SCALE, crop_height * SCALE), interpolation=cv2.INTER_LANCZOS4)[y0:y1, x0:x1]

    # Match broad color while retaining the newly generated fine texture.
    shift = (reference.mean(axis=(0, 1)) - generated_low.mean(axis=(0, 1))) * 0.65
    aligned = np.clip(aligned.astype(np.float32) + shift, 0, 255)

    ref_inner = reference[inner[1] - padded[1]:inner[3] - padded[1], inner[0] - padded[0]:inner[2] - padded[0]]
    hsv = cv2.cvtColor(ref_inner, cv2.COLOR_BGR2HSV)
    edges = cv2.Canny(cv2.cvtColor(ref_inner, cv2.COLOR_BGR2GRAY), 65, 145)
    structural = np.uint8((edges > 0) & (hsv[:, :, 1] < 105) & (hsv[:, :, 2] > 100)) * 255
    structural = cv2.dilate(structural, np.ones((3, 3), np.uint8))
    structural = cv2.GaussianBlur(structural, (5, 5), 0)
    structure_high = cv2.resize(structural, (x1 - x0, y1 - y0), interpolation=cv2.INTER_LINEAR).astype(np.float32) / 255

    h, w = aligned.shape[:2]
    border = max(1, round(min(w, h) * 0.045))
    xs = np.minimum(np.arange(w), np.arange(w)[::-1])
    ys = np.minimum(np.arange(h), np.arange(h)[::-1])
    edge_fade = np.minimum(1, np.minimum(xs[None, :] / border, ys[:, None] / border)).astype(np.float32)
    edge_fade = edge_fade * edge_fade * (3 - 2 * edge_fade)
    ai_weight = (0.9 * edge_fade * (1 - 0.75 * structure_high)).astype(np.float32)
    composed = aligned * ai_weight[:, :, None] + base.astype(np.float32) * (1 - ai_weight[:, :, None])
    return np.uint8(np.clip(composed, 0, 255)), warp


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    base_image = cv2.imread(str(BASE), cv2.IMREAD_COLOR)
    if base_image is None:
        raise FileNotFoundError(BASE)
    height, width = base_image.shape[:2]
    preview = Image.new("RGB", (width, height))
    manifest = {"source": BASE.name, "grid": [COLS, ROWS], "sourcePixels": [width * SCALE, height * SCALE], "tiles": []}
    for row in range(ROWS):
        for col in range(COLS):
            inner, padded = crop_bounds(width, height, row, col)
            name = f"r{row + 1}-c{col + 1}"
            generated = cv2.imread(str(GENERATED / f"{name}.png"), cv2.IMREAD_COLOR)
            if generated is None:
                raise FileNotFoundError(GENERATED / f"{name}.png")
            reference = base_image[padded[1]:padded[3], padded[0]:padded[2]]
            tile, warp = make_tile(reference, generated, inner, padded)
            filename = f"{name}.webp"
            cv2.imwrite(str(TARGET / filename), tile, [cv2.IMWRITE_WEBP_QUALITY, 96])
            tile_preview = Image.fromarray(cv2.cvtColor(tile, cv2.COLOR_BGR2RGB)).resize(
                (inner[2] - inner[0], inner[3] - inner[1]), Image.Resampling.LANCZOS
            )
            preview.paste(tile_preview, inner[:2])
            manifest["tiles"].append({
                "row": row, "col": col, "file": filename,
                "pixels": [value * SCALE for value in inner],
                "uv": [inner[0] / width, inner[1] / height, inner[2] / width, inner[3] / height],
                "alignment": [round(float(v), 5) for v in warp.flatten()],
            })
            print(f"{name}: {tile.shape[1]}x{tile.shape[0]} | affine {warp[0, 2]:.2f},{warp[1, 2]:.2f}", flush=True)

    (TARGET / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    preview.save(PREVIEW, "JPEG", quality=93)
    print(f"Completed {len(manifest['tiles'])} realistic tiles in {TARGET}")


if __name__ == "__main__":
    main()
