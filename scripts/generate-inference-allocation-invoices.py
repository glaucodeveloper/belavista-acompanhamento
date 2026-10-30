#!/usr/bin/env python3
"""Generate clearly marked synthetic invoice images for OCR allocation tests."""
import json
import sys
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
cases = json.loads((root / "worker/test/inference-allocation-cases.json").read_text(encoding="utf-8"))
clarification_cases = json.loads((root / "worker/test/inference-allocation-clarification-cases.json").read_text(encoding="utf-8"))
all_cases = [*cases, *clarification_cases]
output = Path(sys.argv[1]) if len(sys.argv) > 1 else root / ".test-artifacts/inference-allocation"
selected_ids = set(sys.argv[2].split(",")) if len(sys.argv) > 2 else set()
if selected_ids - {case["id"] for case in all_cases}:
    raise SystemExit(f"Caso(s) desconhecido(s): {', '.join(sorted(selected_ids - {case['id'] for case in all_cases}))}")
generation_cases = [case for case in all_cases if not selected_ids or case["id"] in selected_ids]
output.mkdir(parents=True, exist_ok=True)
font_candidates = [Path("/usr/share/fonts/TTF/DejaVuSans.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")]
bold_candidates = [Path("/usr/share/fonts/TTF/DejaVuSans-Bold.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")]
font_path = next((candidate for candidate in font_candidates if candidate.exists()), None)
bold_path = next((candidate for candidate in bold_candidates if candidate.exists()), None)
if not font_path or not bold_path:
    raise SystemExit("Fonte DejaVu Sans ausente; instale fonts-dejavu-core para gerar as notas.")
font = ImageFont.truetype(str(font_path), 22)
small = ImageFont.truetype(str(font_path), 17)
bold = ImageFont.truetype(str(bold_path), 26)
title = ImageFont.truetype(str(bold_path), 34)

def money(value):
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

for case in generation_cases:
    width, height = 1400, 980
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    margin = 70
    draw.rectangle((margin, margin, width - margin, height - margin), outline="#27364a", width=3)
    draw.text((margin + 28, margin + 22), case.get("documentLabel", "DOCUMENTO FISCAL SIMULADO"), font=title, fill="#162b46")
    draw.text((margin + 28, margin + 68), "AMOSTRA DE TESTE DE OCR · SEM VALIDADE FISCAL", font=bold, fill="#a12e2e")
    draw.line((margin + 25, margin + 112, width - margin - 25, margin + 112), fill="#8794a4", width=2)
    y = margin + 135
    draw.text((margin + 30, y), f"Fornecedor: {case['supplier']}", font=font, fill="#172334")
    y += 42
    draw.text((margin + 30, y), f"CNPJ de teste: {case['cnpj']}   Nota: {case['invoiceNumber']}   Emissão: {case['date']}", font=small, fill="#35445a")
    y += 58
    table_left, table_right = margin + 25, width - margin - 25
    draw.rectangle((table_left, y, table_right, y + 52), fill="#e9eef5", outline="#aeb9c7", width=2)
    draw.text((table_left + 16, y + 12), "DESCRIÇÃO DO ITEM", font=bold, fill="#1d2d43")
    draw.text((table_right - 430, y + 12), "QTD.    UN.      UNITÁRIO       TOTAL", font=small, fill="#1d2d43")
    y += 52
    total = case["quantity"] * case["unitPrice"]
    draw.rectangle((table_left, y, table_right, y + 130), outline="#aeb9c7", width=2)
    description = case.get("descriptionOnImage", case.get("description", ""))
    description_lines = []
    if description:
        description_lines = textwrap.wrap(description, width=96, break_long_words=False, break_on_hyphens=False)
        for line_number, line in enumerate(description_lines):
            draw.text((table_left + 16, y + 18 + line_number * 29), line, font=font, fill="#172334")
    if case.get("productCode") or case.get("ncm"):
        details_y = max(y + 72, y + 18 + len(description_lines) * 29)
        draw.text((table_left + 16, details_y), f"Código: {case.get('productCode', '—')}   NCM: {case.get('ncm', '—')}", font=small, fill="#35445a")
    draw.text((table_right - 430, y + 78), f"{case['quantity']} {case['unit']}   {money(case['unitPrice'])}   {money(total)}", font=small, fill="#172334")
    y += 175
    draw.line((table_left, y, table_right, y), fill="#8794a4", width=2)
    draw.text((table_right - 600, y + 20), f"VALOR TOTAL DA NOTA: {money(total)}", font=bold, fill="#162b46")
    y += 88
    draw.text((margin + 30, y), "Pagamento: transferência bancária", font=small, fill="#35445a")
    draw.text((margin + 30, y + 34), "Documento criado exclusivamente para teste de leitura e alocação.", font=small, fill="#68778b")
    image.save(output / case["filename"], format="PNG", optimize=True)
print(f"Geradas {len(generation_cases)} notas simuladas em {output}")
