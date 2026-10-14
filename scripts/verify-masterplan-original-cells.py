"""Independent coverage check: detect enclosed green regions in ORIGINAL PDF.

This never uses the application's parcel/marker JSON to define expected areas,
and never draws or changes the artwork. Common green spaces are counted too;
the count is deliberately NOT presented as the number of commercial lots.
"""
import json
from pathlib import Path
import cv2
import numpy as np

root = Path(__file__).resolve().parent.parent
source = cv2.imread(str(root / "tmp/pdfs/warley-embedded-image.jpg"))
overlay = cv2.imread(str(root / "assets/public/alianca-park-masterplan-lot-overlay-v3.webp"), cv2.IMREAD_UNCHANGED)
small = cv2.resize(source, None, fx=.5, fy=.5)
alpha = np.zeros(small.shape[:2], np.uint8)
alpha[200:3880, 400:3320] = overlay[::2, ::2, 3]
white = ((small.min(axis=2) > 155) & ((small.max(axis=2) - small.min(axis=2)) < 45)).astype(np.uint8) * 255
white = cv2.morphologyEx(white, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
_, labels, stats, _ = cv2.connectedComponentsWithStats(255 - white)
green = (small[:, :, 1] > small[:, :, 2] * 1.1) & (small[:, :, 1] > small[:, :, 0] * 1.1)
regions = []
for index, (x, y, w, h, area) in enumerate(stats):
    # Excludes exterior/background component and small lettering in the logo.
    if not (2000 < area < 50000 and x > 350 and y > 180 and x + w < 3330 and y + h < 3900):
        continue
    mask = labels[y:y+h, x:x+w] == index
    if green[y:y+h, x:x+w][mask].mean() < .8:
        continue
    coverage = float((alpha[y:y+h, x:x+w][mask] >= 240).mean())
    regions.append({"sourceComponent": index, "bbox": [int(v * 2) for v in (x, y, w, h)],
                    "sourcePixels": int(area), "coverage": coverage})
missing = [r for r in regions if r["coverage"] < .999]
report = {"method": "independent original-PDF white boundary / enclosed green coverage",
          "enclosedGreenRegions": len(regions), "regionsBelow99_9Percent": missing,
          "minimumCoverage": min(r["coverage"] for r in regions), "regions": regions}
target = root / "output/map-pdf-original/coverage.json"
target.write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps({k: v for k, v in report.items() if k != "regions"}))
if len(regions) < 290 or missing:
    raise SystemExit("Original PDF green regions were clipped or coverage detection failed")
