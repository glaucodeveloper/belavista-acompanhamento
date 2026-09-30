"""Prepare 15 overlapping source-image crops for realistic tile editing."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/public/alianca-park-aerial-reference-expanded-v4-4k-600dpi.png"
TARGET = ROOT / "assets/data/aerial-detail-references-v2"
COLS, ROWS = 5, 3


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as source:
        width, height = source.size
        for row in range(ROWS):
            for col in range(COLS):
                left = width * col // COLS
                top = height * row // ROWS
                right = width * (col + 1) // COLS
                bottom = height * (row + 1) // ROWS
                margin_x = round((right - left) * 0.1)
                margin_y = round((bottom - top) * 0.1)
                crop = source.crop((
                    max(0, left - margin_x), max(0, top - margin_y),
                    min(width, right + margin_x), min(height, bottom + margin_y),
                ))
                crop.save(TARGET / f"r{row + 1}-c{col + 1}.png", "PNG")
    print(f"Prepared {COLS * ROWS} source crops in {TARGET}")


if __name__ == "__main__":
    main()
