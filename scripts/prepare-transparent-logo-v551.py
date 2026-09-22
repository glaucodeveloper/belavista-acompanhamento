from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_FULL = ROOT / "assets" / "public" / "alianca-park-logo-full-transparent-v550.png"
SOURCE_MARK = ROOT / "assets" / "public" / "alianca-park-logo-mark-v5346.png"
TARGET_FULL = ROOT / "assets" / "public" / "alianca-park-logo-full-transparent-v551.png"
TARGET_MARK = ROOT / "assets" / "public" / "alianca-park-logo-mark-transparent-v551.png"


def main() -> None:
    image = Image.open(SOURCE_FULL).convert("RGBA")
    pixels = image.load()

    # Keep every color of the emblem. The old source has a green backing
    # behind the wordmark; remove it only below the emblem so the counters of
    # A/L/a/k/O and the space around the lettering stay genuinely transparent.
    removed = 0
    for y in range(290, image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            is_green_background = a > 0 and g > 35 and g > r * 1.05 and g > b * 0.85
            if is_green_background:
                pixels[x, y] = (r, g, b, 0)
                removed += 1

    image.save(TARGET_FULL, optimize=True)

    # Build the compact mark from the already-clean emblem component instead
    # of copying the legacy green-backed mark. Pixels outside the crop remain
    # transparent, while the green segment inside the emblem is preserved.
    emblem = image.crop((135, 47, 391, 305)).resize((162, 153), Image.Resampling.LANCZOS)
    emblem.save(TARGET_MARK, optimize=True)
    print(f"Logo transparente preparada: {TARGET_FULL} ({removed} pixels verdes removidos)")


if __name__ == "__main__":
    main()
