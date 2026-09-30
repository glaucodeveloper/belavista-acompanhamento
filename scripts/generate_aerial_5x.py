"""Create a print-resolution 5x aerial texture from the approved map image."""

from pathlib import Path

from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = 210_000_000  # This generated image is 207,456,000 pixels.


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/public/alianca-park-aerial-reference-expanded-v4-4k-600dpi.png"
OUTPUT = ROOT / "assets/public/alianca-park-aerial-reference-expanded-v5-20k-3000dpi.png"


def main() -> None:
    with Image.open(SOURCE) as source:
        source.load()
        # Enhance existing microcontrast without moving any mapped geometry.
        detailed = source.convert("RGB").filter(
            ImageFilter.UnsharpMask(radius=1.1, percent=105, threshold=3)
        )
        enlarged = detailed.resize(
            (source.width * 5, source.height * 5), Image.Resampling.LANCZOS
        )
        enlarged.save(OUTPUT, format="PNG", dpi=(3000, 3000), compress_level=4)

    with Image.open(OUTPUT) as result:
        print(f"{OUTPUT}\n{result.width}x{result.height} px | {result.info.get('dpi')} DPI")


if __name__ == "__main__":
    main()
