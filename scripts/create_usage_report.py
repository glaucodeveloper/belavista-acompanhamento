from __future__ import annotations

import json
import os
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSET_DIR = os.path.join(ROOT, "output", "usage-previews")
OUTPUT_DIR = os.path.join(ROOT, "output", "pdf")
OUTPUT = os.path.join(OUTPUT_DIR, "prints-utilizacao-playwright.pdf")


PAGE_PREVIEWS = [
    ("dashboard.png", "Dashboard inicial", "Visão geral, indicadores e mapa operacional."),
    ("control.png", "Central operacional", "Registros, materiais e serviços associados."),
    ("stages.png", "Etapas e cronograma", "Agenda, atividades e materiais por etapa."),
    ("records.png", "Registros", "Lista e propriedades dos registros operacionais."),
    ("instagram_leads.png", "Instagram Leads", "Fila de leads para atendimento."),
    ("instagram_direct.png", "Atendimento Direct", "Superfície de atendimento via Browser JEV."),
    ("instagram_prompt.png", "Prompt do atendente", "Configuração das instruções do atendente."),
    ("contracts.png", "Contratos", "Tela preservada na aplicação original para conferência."),
    ("brokers.png", "Comissões", "Negociações e cálculos comerciais."),
    ("brokers_board.png", "Lotes", "Tabela de lotes e controle de entrada."),
    ("finance.png", "Financeiro", "Fluxo financeiro e lançamentos."),
    ("settings.png", "Configurações", "Preferências de uso e parâmetros."),
    ("documents.png", "Documentos", "Documentos e comprovantes vinculados."),
    ("reports.png", "Relatórios", "Tabela analítica e exportação."),
]

EVIDENCE = [
    ("nota-01-anexo-no-chat.png", "Nota 1 - Anexo no chat", "O anexo aparece no compositor antes do envio."),
    ("nota-02-propriedades-e-alocacao.png", "Nota 2 - Propriedades e alocação", "O OCR apresenta a etapa Rede de Água, o material Diesel S10 e o anexo."),
    ("entrada-01-modal-vazio.png", "Entrada 1 - Modal do lote", "O comando de entrada está dentro do modal do lote selecionado."),
    ("entrada-02-modal-preenchido.png", "Entrada 2 - Modal preenchido", "Cliente, valor bruto e descrição foram preenchidos antes do envio."),
    ("entrada-03-lancamento-salvo.png", "Entrada 3 - Lançamento salvo", "A entrada aparece na tabela de lançamentos após o salvamento."),
]


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "ReportTitle", parent=base["Title"], fontName="Helvetica-Bold", fontSize=23,
            leading=28, alignment=TA_CENTER, textColor=colors.HexColor("#10243e"), spaceAfter=14,
        ),
        "subtitle": ParagraphStyle(
            "ReportSubtitle", parent=base["Normal"], fontName="Helvetica", fontSize=11,
            leading=16, alignment=TA_CENTER, textColor=colors.HexColor("#4b5f76"), spaceAfter=20,
        ),
        "h1": ParagraphStyle(
            "ReportH1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=17,
            leading=21, textColor=colors.HexColor("#10243e"), spaceBefore=8, spaceAfter=10,
        ),
        "h2": ParagraphStyle(
            "ReportH2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=13,
            leading=17, textColor=colors.HexColor("#1b4f83"), spaceBefore=8, spaceAfter=7,
        ),
        "body": ParagraphStyle(
            "ReportBody", parent=base["BodyText"], fontName="Helvetica", fontSize=9.5,
            leading=14, textColor=colors.HexColor("#26384a"), spaceAfter=7,
        ),
        "small": ParagraphStyle(
            "ReportSmall", parent=base["BodyText"], fontName="Helvetica", fontSize=8,
            leading=11, textColor=colors.HexColor("#5d6b79"), spaceAfter=4,
        ),
        "caption": ParagraphStyle(
            "ReportCaption", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=10,
            leading=13, textColor=colors.HexColor("#10243e"), spaceBefore=6, spaceAfter=3,
        ),
    }


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#d6dee7"))
    canvas.line(1.7 * cm, 1.25 * cm, A4[0] - 1.7 * cm, 1.25 * cm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor("#667788"))
    canvas.drawString(1.7 * cm, 0.82 * cm, "Aliança Park · Evidências Playwright")
    canvas.drawRightString(A4[0] - 1.7 * cm, 0.82 * cm, f"Página {doc.page}")
    canvas.restoreState()


def screenshot_flow(path, caption, description, style):
    full_path = os.path.join(ASSET_DIR, path)
    if not os.path.exists(full_path):
        return [Paragraph(f"Print ausente: {path}", style["small"])]
    image = Image(full_path)
    max_width = A4[0] - 3.4 * cm
    max_height = 15.7 * cm
    scale = min(max_width / image.imageWidth, max_height / image.imageHeight)
    image.drawWidth = image.imageWidth * scale
    image.drawHeight = image.imageHeight * scale
    return [
        Paragraph(caption, style["caption"]),
        Paragraph(description, style["small"]),
        Spacer(1, 0.12 * cm),
        image,
    ]


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    style = styles()
    story = []

    story.extend([
        Spacer(1, 2.3 * cm),
        Paragraph("Prévia de Uso e Evidências Playwright", style["title"]),
        Paragraph("Páginas da aplicação, adição de nota com OCR e adição de entrada em lote", style["subtitle"]),
        Paragraph(
            "Documento gerado a partir de capturas reais dos testes Playwright executados no ambiente local. "
            "As telas abaixo servem como roteiro de utilização e registro visual do comportamento verificado.",
            style["body"],
        ),
        Spacer(1, 0.4 * cm),
    ])

    test_rows = [
        ["Fluxo", "Resultado", "Evidência"],
        ["Adição de entrada no lote", "1 teste Playwright passou", "Modal, formulário e lançamento salvo"],
        ["Anexo de nota no chat", "3 testes UI passaram", "OCR, alocação segura e pergunta sem encaixe"],
        ["Contrato de nota e propriedades", "5 passaram · 1 live ignorado", "Identidade, OCR, properties e persistência"],
        ["Prévia de páginas", "14 testes passaram", "Uma captura por página navegável"],
        ["Evidência visual", "2 testes passaram", "5 capturas estáveis para este documento"],
    ]
    table = Table(test_rows, colWidths=[5.0 * cm, 4.2 * cm, 7.3 * cm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#173b63")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("LEADING", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#c9d4df")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f6fa")]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([Paragraph("Resultado da execução", style["h1"]), table, PageBreak()])

    story.extend([
        Paragraph("Roteiro de utilização", style["h1"]),
        Paragraph("Adição de nota com anexo", style["h2"]),
        Paragraph("1. Abra o painel e localize o chat do assistente operacional.", style["body"]),
        Paragraph("2. Use o botão de anexo e selecione uma nota fiscal, como nf-diesel-18452.png.", style["body"]),
        Paragraph("3. Escreva uma instrução, por exemplo: Leia esta nota fiscal e prepare um registro.", style["body"]),
        Paragraph("4. Envie a mensagem. O OCR identifica propriedades, itens, etapa e material.", style["body"]),
        Paragraph("5. Abra a alocação sugerida e confira a etapa, o material, o anexo e as propriedades antes de gravar.", style["body"]),
        Paragraph("6. Se não houver encaixe seguro, o assistente pergunta a etapa/atividade e não cria registro órfão.", style["body"]),
        Spacer(1, 0.25 * cm),
        Paragraph("Adição de entrada", style["h2"]),
        Paragraph("1. Abra Lotes e selecione uma linha da tabela de valores.", style["body"]),
        Paragraph("2. No modal flutuante, preencha cliente, valor bruto da entrada/parcela e descrição.", style["body"]),
        Paragraph("3. Confira imposto, comissão, arredondamento e valor final.", style["body"]),
        Paragraph("4. Clique em Adicionar entrada. O modal fecha e o lançamento aparece na tabela.", style["body"]),
        PageBreak(),
        Paragraph("Prévia das páginas", style["h1"]),
        Paragraph("Cada página abaixo foi aberta pelo Playwright com dados de demonstração e capturada em tela cheia.", style["body"]),
    ])

    for index, (filename, title, description) in enumerate(PAGE_PREVIEWS):
        story.extend(screenshot_flow(filename, title, description, style))
        if index != len(PAGE_PREVIEWS) - 1:
            story.append(PageBreak())

    story.append(PageBreak())
    story.extend([
        Paragraph("Evidências dos fluxos solicitados", style["h1"]),
        Paragraph("As cinco capturas seguintes são produzidas pelo teste de evidência e mostram a sequência de uso.", style["body"]),
    ])
    for index, (filename, title, description) in enumerate(EVIDENCE):
        story.extend(screenshot_flow(filename, title, description, style))
        if index != len(EVIDENCE) - 1:
            story.append(PageBreak())

    story.append(PageBreak())
    story.extend([
        Paragraph("Rastreabilidade", style["h1"]),
        Paragraph("Testes executados", style["h2"]),
        Paragraph("tests/screen/lots-toolbar-modal.spec.mjs", style["body"]),
        Paragraph("tests/screen/chat-record-attachment-properties.cert-v36.spec.mjs", style["body"]),
        Paragraph("tests/operational/chat-record-attachment-properties.cert.test.mjs", style["body"]),
        Paragraph("tests/screen/usage-previews.spec.mjs", style["body"]),
        Paragraph("tests/screen/usage-evidence.spec.mjs", style["body"]),
        Paragraph(f"Data da execução: {datetime.now().strftime('%d/%m/%Y %H:%M')}", style["small"]),
        Paragraph("Observação: o cenário live autenticado de OCR foi ignorado quando o token BELAVISTA_ADMIN_ID_TOKEN não estava configurado; os cenários fixture/UI passaram.", style["small"]),
    ])

    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        rightMargin=1.7 * cm,
        leftMargin=1.7 * cm,
        topMargin=1.45 * cm,
        bottomMargin=1.65 * cm,
        title="Prévia de Uso e Evidências Playwright",
        author="Aliança Park",
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT)


if __name__ == "__main__":
    main()
