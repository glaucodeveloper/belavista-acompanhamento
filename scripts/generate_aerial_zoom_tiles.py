"""Cut the approved aerial's 5x detail image into 15 zoom tiles."""

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/public/alianca-park-aerial-reference-expanded-v5-20k-3000dpi.png"
TARGET = ROOT / "assets/public/alianca-park-aerial-zoom-tiles-v1"
COLS, ROWS = 5, 3
Image.MAX_IMAGE_PIXELS = 210_000_000


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as source:
        width, height = source.size
        tiles = []
        for row in range(ROWS):
            for col in range(COLS):
                left = width * col // COLS
                top = height * row // ROWS
                right = width * (col + 1) // COLS
                bottom = height * (row + 1) // ROWS
                filename = f"r{row + 1}-c{col + 1}.webp"
                source.crop((left, top, right, bottom)).save(
                    TARGET / filename, "WEBP", quality=96, method=5, dpi=(3000, 3000)
                )
                tiles.append({
                    "row": row,
                    "col": col,
                    "file": filename,
                    "pixels": [left, top, right, bottom],
                    "uv": [left / width, top / height, right / width, bottom / height],
                })

    manifest = {
        "source": SOURCE.name,
        "sourcePixels": [width, height],
        "grid": [COLS, ROWS],
        "tiles": tiles,
    }
    (TARGET / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Generated {len(tiles)} tiles in {TARGET}")


if __name__ == "__main__":
    main()
