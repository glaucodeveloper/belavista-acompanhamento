from pathlib import Path
import json
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
source = Image.open(ROOT / 'frontend/src/assets/planta.webp').convert('RGBA')
width, height = source.size
red, green, blue, alpha = source.split()

# Asphalt in the official plan is its neutral mid-gray texture.
high = ImageChops.lighter(ImageChops.lighter(red, green), blue)
low = ImageChops.darker(ImageChops.darker(red, green), blue)
spread = ImageChops.difference(high, low)
gray = source.convert('L')
asphalt = ImageChops.multiply(
    ImageChops.multiply(alpha.point(lambda a: 255 if a > 220 else 0), spread.point(lambda a: 255 if a < 26 else 0)),
    gray.point(lambda a: 255 if 92 <= a <= 198 else 0),
)
asphalt = asphalt.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))

# Diagonal bands divide the road network into selectable work fronts.
band_width = 260
asphalt_data = asphalt.tobytes()
band_data = bytearray(width * height)
for row in range(height):
    start = row * width
    for column in range(width):
        band_data[start + column] = int((column * 0.38 + row * 0.925) // band_width) + 1
band_image = Image.frombytes('L', (width, height), bytes(band_data))
band_ids = sorted(set(band_data))

# The curb mask is the inner edge of the road mask.
curb = ImageChops.subtract(asphalt, asphalt.filter(ImageFilter.MinFilter(9)))

# Raster trace around the landscaped recreation/social precinct.
social_image = Image.new('L', (width, height), 0)
ImageDraw.Draw(social_image).polygon(
    [(735, 1195), (865, 1190), (1010, 1275), (1128, 1418),
     (1085, 1555), (974, 1635), (824, 1578), (708, 1450), (690, 1320)],
    fill=255,
)
social = ImageChops.multiply(social_image, alpha.point(lambda a: 255 if a > 20 else 0))

# RGB stores independent selection channels: slice id, curb, and social area.
curb_data, social_data = curb.tobytes(), social.tobytes()
mask_data = bytearray(width * height * 3)
for index, alpha_value in enumerate(asphalt_data):
    offset = index * 3
    mask_data[offset] = band_data[index] if alpha_value else 0
    mask_data[offset + 1] = 255 if curb_data[index] else 0
    mask_data[offset + 2] = 255 if social_data[index] else 0
out = ROOT / 'frontend/src/assets/map-selection-mask.png'
Image.frombytes('RGB', (width, height), bytes(mask_data)).save(out, optimize=True)
bands = sorted({value for value in band_ids if value < 255 and any(band_data[i] == value and asphalt_data[i] for i in range(len(band_data)))})
(ROOT / 'frontend/src/assets/map-selection-mask.json').write_text(json.dumps({
    'version': 1, 'imageSize': [width, height],
    'encoding': {'red': 'asphalt slice id', 'green': 'curb', 'blue': 'social area'},
    'asphaltSlices': bands, 'socialArea': 'Praça e área social',
}, ensure_ascii=False, indent=2) + '\n')
print(f'Wrote {out}: {width}×{height}; {len(bands)} asphalt slices; curb pixels={sum(bool(x) for x in curb_data)}; social pixels={sum(bool(x) for x in social_data)}')
