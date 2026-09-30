from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "alianca-park-apresentacao-loteamento-v3.pdf"
ASSETS = ROOT / "assets"
PORTFOLIO = ASSETS / "portfolio" / "screens"
REFERENCE = ASSETS / "reference"
BRAND = ROOT / "video" / "product-intro" / "assets" / "brand"

PAGE_W, PAGE_H = 960, 540
BG = HexColor("#07121d")
BG_2 = HexColor("#0b1c29")
PANEL = HexColor("#102738")
PANEL_2 = HexColor("#132f42")
LINE = HexColor("#28475a")
TEXT = HexColor("#f1f5f1")
MUTED = HexColor("#a9bec6")
BLUE = HexColor("#69b7ff")
LIME = HexColor("#b9dd6a")
GREEN = HexColor("#36c987")
GOLD = HexColor("#f2bd48")
ORANGE = HexColor("#ed8f51")
PURPLE = HexColor("#ad8cff")
RED = HexColor("#ec6b62")


def register_fonts() -> tuple[str, str, str]:
    candidates = [
        (Path("C:/Windows/Fonts/segoeui.ttf"), Path("C:/Windows/Fonts/segoeuib.ttf")),
        (Path("C:/Windows/Fonts/arial.ttf"), Path("C:/Windows/Fonts/arialbd.ttf")),
    ]
    for regular, bold in candidates:
        if regular.exists() and bold.exists():
            pdfmetrics.registerFont(TTFont("AppSans", str(regular)))
            pdfmetrics.registerFont(TTFont("AppSansBold", str(bold)))
            break
    else:
        return "Helvetica", "Helvetica-Bold", "Courier"
    mono = Path("C:/Windows/Fonts/consola.ttf")
    if mono.exists():
        pdfmetrics.registerFont(TTFont("AppMono", str(mono)))
        mono_name = "AppMono"
    else:
        mono_name = "Courier"
    return "AppSans", "AppSansBold", mono_name


FONT, FONT_BOLD, FONT_MONO = register_fonts()


def pstyle(size: float, leading: float | None = None, color=TEXT, bold=False, align=TA_LEFT):
    return ParagraphStyle(
        name=f"p-{size}-{leading}-{color}-{bold}-{align}",
        fontName=FONT_BOLD if bold else FONT,
        fontSize=size,
        leading=leading or size * 1.25,
        textColor=color,
        alignment=align,
        spaceAfter=0,
        spaceBefore=0,
    )


def para(c: Canvas, text: str, x: float, top: float, width: float, size=12, color=TEXT,
         leading=None, bold=False, max_height=200, align=TA_LEFT) -> float:
    p = Paragraph(text, pstyle(size, leading, color, bold, align))
    _, h = p.wrap(width, max_height)
    p.drawOn(c, x, top - h)
    return h


def text(c: Canvas, value: str, x: float, y: float, size=12, color=TEXT, bold=False,
         font=None, align="left"):
    c.setFont(font or (FONT_BOLD if bold else FONT), size)
    c.setFillColor(color)
    if align == "right":
        c.drawRightString(x, y, value)
    elif align == "center":
        c.drawCentredString(x, y, value)
    else:
        c.drawString(x, y, value)


def image_size(path: Path) -> tuple[int, int]:
    with Image.open(path) as img:
        return img.size


def image_cover(c: Canvas, path: Path, x: float, y: float, w: float, h: float,
                alpha: float = 1.0, radius: float = 0, position=(0.5, 0.5)):
    if not path.exists():
        return
    iw, ih = image_size(path)
    scale = max(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    px, py = position
    dx = x + (w - dw) * px
    dy = y + (h - dh) * py
    c.saveState()
    if radius:
        clip = c.beginPath()
        clip.roundRect(x, y, w, h, radius)
        c.clipPath(clip, stroke=0, fill=0)
    if alpha < 1:
        c.setFillAlpha(alpha)
    c.drawImage(ImageReader(str(path)), dx, dy, width=dw, height=dh, mask="auto")
    c.restoreState()


def image_contain(c: Canvas, path: Path, x: float, y: float, w: float, h: float,
                  alpha: float = 1.0):
    if not path.exists():
        return
    iw, ih = image_size(path)
    scale = min(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    c.saveState()
    if alpha < 1:
        c.setFillAlpha(alpha)
    c.drawImage(ImageReader(str(path)), x + (w - dw) / 2, y + (h - dh) / 2,
                width=dw, height=dh, mask="auto")
    c.restoreState()


def rect(c: Canvas, x, y, w, h, fill=PANEL, stroke=LINE, radius=8, sw=1):
    c.setLineWidth(sw)
    if fill:
        c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke)
    c.roundRect(x, y, w, h, radius, stroke=1 if stroke else 0, fill=1)


def line(c: Canvas, x1, y1, x2, y2, color=LINE, sw=1):
    c.setStrokeColor(color)
    c.setLineWidth(sw)
    c.line(x1, y1, x2, y2)


def pill(c: Canvas, label: str, x: float, y: float, color=BLUE, width=None):
    width = width or (len(label) * 5.6 + 22)
    c.setFillColor(color)
    c.setFillAlpha(0.16)
    c.roundRect(x, y, width, 20, 10, stroke=0, fill=1)
    c.setFillAlpha(1)
    text(c, label.upper(), x + 11, y + 6, 7.5, color, bold=True, font=FONT_MONO)
    return width


def dot(c: Canvas, x, y, color=GREEN, radius=4):
    c.setFillColor(color)
    c.circle(x, y, radius, stroke=0, fill=1)


def stat(c: Canvas, x, y, w, h, value, label, note="", accent=BLUE):
    rect(c, x, y, w, h, fill=BG_2, stroke=LINE, radius=6)
    c.setFillColor(accent)
    c.rect(x, y + h - 3, w, 3, stroke=0, fill=1)
    text(c, value, x + 16, y + h - 31, 24, TEXT, bold=True)
    text(c, label.upper(), x + 16, y + 10, 7.2, MUTED, font=FONT_MONO)
    if note:
        text(c, note, x + 16, y + 21, 8, MUTED)


def footer(c: Canvas, page_no: int, section: str):
    line(c, 40, 28, PAGE_W - 40, 28, LINE, 0.7)
    text(c, "ALIANÇA PARK  /  LOTEAMENTO", 40, 13, 7.2, MUTED, bold=True, font=FONT_MONO)
    text(c, section.upper(), PAGE_W / 2, 13, 7.2, MUTED, font=FONT_MONO, align="center")
    text(c, f"V3.0  ·  {page_no:02d}", PAGE_W - 40, 13, 7.2, MUTED, font=FONT_MONO, align="right")


def base(c: Canvas, page_no: int, section: str, title: str, eyebrow: str,
         accent=BLUE):
    c.setFillColor(BG)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(accent)
    c.rect(0, PAGE_H - 4, PAGE_W, 4, stroke=0, fill=1)
    text(c, "ALIANÇA PARK", 40, PAGE_H - 35, 8, accent, bold=True, font=FONT_MONO)
    text(c, "WORKBENCH OPERACIONAL", 153, PAGE_H - 35, 8, MUTED, font=FONT_MONO)
    text(c, eyebrow.upper(), 40, PAGE_H - 76, 8, accent, bold=True, font=FONT_MONO)
    para(c, title, 40, PAGE_H - 91, 650, size=28, leading=31, bold=True, max_height=60)
    footer(c, page_no, section)


def arrow(c: Canvas, x1, y1, x2, y2, color=BLUE):
    line(c, x1, y1, x2, y2, color, 2)
    c.setFillColor(color)
    c.setStrokeColor(color)
    c.setLineWidth(2)
    c.line(x2, y2, x2 - 6, y2 + 3)
    c.line(x2, y2, x2 - 6, y2 - 3)


def callout(c: Canvas, number, title, body, x, y, w, accent=BLUE):
    rect(c, x, y, w, 74, fill=BG_2, stroke=LINE, radius=7)
    c.setFillColor(accent)
    c.circle(x + 22, y + 50, 12, stroke=0, fill=1)
    text(c, str(number), x + 22, y + 46, 10, BG, bold=True, align="center")
    text(c, title, x + 44, y + 53, 10, TEXT, bold=True)
    para(c, body, x + 16, y + 34, w - 32, size=8.7, leading=11, color=MUTED, max_height=38)


def section_card(c, x, y, w, h, number, title, body, accent=BLUE):
    rect(c, x, y, w, h, fill=BG_2, stroke=LINE, radius=8)
    text(c, str(number).zfill(2), x + 18, y + h - 25, 8, accent, bold=True, font=FONT_MONO)
    text(c, title, x + 18, y + h - 52, 14, TEXT, bold=True)
    para(c, body, x + 18, y + h - 67, w - 36, size=9.5, leading=13, color=MUTED, max_height=h - 82)


def page_cover(c: Canvas):
    c.setFillColor(HexColor("#052b25"))
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    image_cover(c, PORTFOLIO / "admin-brokers.jpg", 510, 0, 450, PAGE_H, alpha=0.43, position=(0.55, 0.5))
    c.setFillColor(HexColor("#052b25"))
    c.setFillAlpha(0.88)
    c.rect(0, 0, 620, PAGE_H, stroke=0, fill=1)
    c.setFillAlpha(1)
    c.setFillColor(BLUE)
    c.rect(40, 64, 4, 96, stroke=0, fill=1)
    image_contain(c, BRAND / "alianca-park-logo-intro.png", 42, 397, 170, 100)
    pill(c, "Apresentação executiva", 42, 352, LIME)
    para(c, "Abertura de loteamento<br/><font color='#b9dd6a'>com operação conectada</font>", 42, 330, 500,
         size=38, leading=40, bold=True, max_height=110)
    para(c, "Contexto, funções e usos do software Aliança Park Workbench para organizar a implantação, acompanhar as frentes e transformar cada avanço em decisão.", 42, 196, 450,
         size=14, leading=20, color=MUTED, max_height=74)
    text(c, "VERSÃO 3.0", 42, 82, 9, GOLD, bold=True, font=FONT_MONO)
    text(c, "SETEMBRO DE 2026", 42, 66, 8.5, MUTED, font=FONT_MONO)
    text(c, "01", 880, 474, 56, HexColor("#b9dd6a"), bold=True)
    text(c, "VISÃO GERAL", 880, 455, 8, MUTED, font=FONT_MONO)
    footer(c, 1, "Abertura")


def page_context(c: Canvas):
    base(c, 2, "Contexto", "Abrir um loteamento é coordenar uma cadeia de decisões.", "01  ·  O desafio", LIME)
    para(c, "O trabalho começa antes da primeira frente física. Projetos, liberações, compras, equipes, lotes e relacionamento precisam compartilhar o mesmo contexto operacional.", 40, 386, 530, size=14, leading=19, color=MUTED, max_height=54)
    cards = [
        ("BASE LEGAL E PROJETOS", "Confirmar viabilidade, licenças, compatibilização, topografia e marcos de liberação.", BLUE),
        ("IMPLANTAÇÃO E INFRA", "Transformar etapas em atividades executáveis, com materiais, produtividade, dependências e evidências.", GOLD),
        ("MERCADO E RELAÇÃO", "Conectar lotes, intenções, contratos e comunicação ao momento real de cada frente.", GREEN),
    ]
    x = 40
    for i, (title, body, color) in enumerate(cards):
        section_card(c, x + i * 293, 230, 270, 122, f"{i+1}", title, body, color)
    line(c, 100, 177, 860, 177, LINE, 2)
    steps = [("01", "Documentar"), ("02", "Planejar"), ("03", "Executar"), ("04", "Comprovar"), ("05", "Decidir")]
    for i, (n, label) in enumerate(steps):
        cx = 100 + i * 190
        dot(c, cx, 177, [BLUE, GOLD, ORANGE, GREEN, PURPLE][i], 8)
        text(c, n, cx - 9, 145, 8, MUTED, font=FONT_MONO)
        text(c, label, cx - 9, 128, 10, TEXT, bold=True)
        if i < len(steps) - 1:
            arrow(c, cx + 12, 177, cx + 165, 177, LINE)
    rect(c, 40, 66, 880, 42, fill=HexColor("#0e2733"), stroke=LINE, radius=6)
    text(c, "PRINCÍPIO", 58, 84, 7.5, LIME, bold=True, font=FONT_MONO)
    text(c, "Uma etapa só avança quando o sistema consegue mostrar o que está pronto, o que falta e qual evidência sustenta a decisão.", 145, 83, 10, TEXT)


def page_overview(c: Canvas):
    base(c, 3, "Software", "Um workbench para ligar mapa, operação e relacionamento.", "02  ·  O produto", BLUE)
    para(c, "A plataforma organiza a implantação em três superfícies temáticas, com dados e navegação coerentes entre si.", 40, 386, 600, size=13, leading=18, color=MUTED, max_height=42)
    modes = [
        ("ACOMPANHAMENTO", "Etapas, atividades, cronograma, materiais, RAID e evidências.", "Mapa operacional 3D", BLUE),
        ("LEADS E LOTES", "Intenções, contratos, reservas, parcelas e disponibilidade por lote.", "Mapa comercial", PURPLE),
        ("COMUNICAÇÃO", "Instagram, pessoal, clientes, corretores, encarregados e serviços.", "Contexto da conversa", GREEN),
    ]
    for i, (mode, body, label, color) in enumerate(modes):
        x = 40 + i * 300
        rect(c, x, 222, 275, 132, fill=BG_2, stroke=LINE, radius=8)
        pill(c, mode, x + 16, 326, color, 122)
        text(c, label, x + 16, 296, 14, TEXT, bold=True)
        para(c, body, x + 16, 279, 238, size=10, leading=14, color=MUTED, max_height=46)
        line(c, x + 16, 244, x + 259, 244, LINE, 0.7)
        text(c, "widgets + filtros de highlight", x + 16, 230, 8.5, color, font=FONT_MONO)
    rect(c, 40, 76, 880, 100, fill=PANEL, stroke=LINE, radius=8)
    text(c, "FLUXO DE CONTEXTO", 60, 151, 8, GOLD, bold=True, font=FONT_MONO)
    nodes = [("Mapa", BLUE), ("Etapa", GOLD), ("Atividade", ORANGE), ("Registro", GREEN), ("Ação IA", PURPLE)]
    for i, (label, color) in enumerate(nodes):
        x = 68 + i * 164
        rect(c, x, 103, 116, 32, fill=BG_2, stroke=color, radius=5)
        dot(c, x + 15, 119, color, 4)
        text(c, label, x + 27, 115, 10, TEXT, bold=True)
        if i < len(nodes) - 1:
            arrow(c, x + 120, 119, x + 151, 119, LINE)
    text(c, "A mesma leitura atravessa a experiência de escritório, campo e atendimento.", 60, 87, 9.5, MUTED)


def page_map(c: Canvas):
    base(c, 4, "Acompanhamento", "O mapa operacional transforma o empreendimento em uma superfície de decisão.", "03  ·  Função principal", BLUE)
    image_cover(c, PORTFOLIO / "admin-brokers.jpg", 40, 88, 562, 300, alpha=0.98, radius=8, position=(0.52, 0.42))
    c.setFillColor(BG)
    c.setFillAlpha(0.42)
    c.rect(40, 88, 562, 300, stroke=0, fill=1)
    c.setFillAlpha(1)
    pill(c, "Mapa 3D", 62, 348, BLUE)
    text(c, "Acompanhamento em uma cena", 62, 319, 18, TEXT, bold=True)
    para(c, "Polígonos de área, lotes numerados e camadas de progresso ajudam o administrador a localizar a frente certa antes de abrir seu contexto.", 62, 299, 330, size=10.5, leading=14, color=MUTED, max_height=60)
    callout(c, 1, "Highlights acumuláveis", "Filtros temáticos podem coexistir e sobrepor cores de leitura sobre os lotes.", 634, 303, 286, BLUE)
    callout(c, 2, "Navegação espacial", "Pan, zoom e inclinação permitem sair da visão de implantação e aproximar uma área específica.", 634, 215, 286, GOLD)
    callout(c, 3, "Seleção por área", "A seleção por retângulo associa a área do mapa a uma etapa, atividade ou registro.", 634, 127, 286, GREEN)
    rect(c, 40, 45, 880, 25, fill=HexColor("#102d36"), stroke=None, radius=5)
    text(c, "LEITURA DE STATUS", 57, 54, 7, MUTED, font=FONT_MONO)
    for i, (label, color) in enumerate([("Planejado", GOLD), ("Em execução", BLUE), ("Concluído", GREEN), ("Bloqueado", RED)]):
        x = 168 + i * 145
        dot(c, x, 57, color, 3.5)
        text(c, label, x + 10, 53, 8.5, TEXT)


def page_stages(c: Canvas):
    base(c, 5, "Etapas", "A linha do tempo dá uma ordem visual para a implantação.", "04  ·  Organização", GOLD)
    image_cover(c, PORTFOLIO / "admin-stages.jpg", 40, 86, 555, 304, alpha=1, radius=8, position=(0.45, 0.45))
    rect(c, 624, 315, 296, 75, fill=BG_2, stroke=LINE, radius=7)
    text(c, "7", 642, 344, 30, GOLD, bold=True)
    text(c, "ETAPAS RELACIONADAS", 694, 358, 8, MUTED, font=FONT_MONO)
    text(c, "do projeto executivo a pavimentação", 694, 341, 9.5, TEXT)
    text(c, "Cada etapa carrega prioridade, produção, materiais, equipe e dependências.", 642, 325, 9, MUTED)
    points = [
        ("Timeline", "Clique em um card da linha do tempo para abrir a subpágina da etapa.", BLUE),
        ("Agenda", "O calendário reúne compromissos e cards de atividades em um contexto navegável.", GREEN),
        ("RAID", "Urgências e riscos ficam visíveis para orientar a saída da IA e a decisão do administrador.", RED),
    ]
    for i, (title, body, color) in enumerate(points):
        y = 224 - i * 72
        dot(c, 642, y + 31, color, 5)
        text(c, title, 658, y + 32, 11, TEXT, bold=True)
        para(c, body, 658, y + 20, 248, size=9.2, leading=12, color=MUTED, max_height=33)
        if i < 2:
            line(c, 642, y - 14, 905, y - 14, LINE, 0.7)
    rect(c, 40, 45, 880, 25, fill=HexColor("#2d2c1c"), stroke=None, radius=5)
    text(c, "MARCO OPERACIONAL", 57, 54, 7, GOLD, font=FONT_MONO)
    text(c, "A linha do tempo conecta planejamento, execução e próxima liberação de frente.", 180, 53, 8.5, TEXT)


def page_control(c: Canvas):
    base(c, 6, "Central operacional", "O mesmo formulário concentra propriedades, requisitos e execução.", "05  ·  Configuração", ORANGE)
    image_cover(c, PORTFOLIO / "admin-control-center.jpg", 40, 72, 590, 322, alpha=1, radius=8, position=(0.47, 0.34))
    rect(c, 663, 328, 257, 66, fill=BG_2, stroke=LINE, radius=7)
    text(c, "FORMULÁRIO UNIFICADO", 680, 371, 8, ORANGE, bold=True, font=FONT_MONO)
    text(c, "Um lugar para calibrar a frente", 680, 350, 12, TEXT, bold=True)
    text(c, "e alimentar o ciclo do Worker.", 680, 334, 9.5, MUTED)
    rows = [
        ("01", "Propriedades", "quantidade, unidade e situação", BLUE),
        ("02", "Requisitos", "regras, condições e evidências", GOLD),
        ("03", "Execução", "produção, ritmo e liberação", ORANGE),
        ("04", "Materiais", "composição editável por etapa", GREEN),
    ]
    for i, (n, title, body, color) in enumerate(rows):
        y = 260 - i * 49
        text(c, n, 664, y + 13, 8, color, bold=True, font=FONT_MONO)
        text(c, title, 700, y + 13, 11, TEXT, bold=True)
        text(c, body, 700, y - 1, 8.8, MUTED)
        line(c, 664, y - 16, 918, y - 16, LINE, 0.7)
    rect(c, 40, 45, 880, 25, fill=HexColor("#2e251e"), stroke=None, radius=5)
    text(c, "REGRA", 57, 54, 7, ORANGE, font=FONT_MONO)
    text(c, "A configuração é por etapa; trocar a etapa troca o conjunto de propriedades e requisitos em foco.", 113, 53, 8.5, TEXT)


def page_activity(c: Canvas):
    base(c, 7, "Registros", "Uma atividade só termina quando o avanço vira evidência.", "06  ·  Execução", GREEN)
    image_cover(c, PORTFOLIO / "admin-records.jpg", 40, 76, 580, 316, alpha=1, radius=8, position=(0.42, 0.44))
    pill(c, "Registro de atividade", 651, 354, GREEN, 132)
    text(c, "Do campo para o histórico", 651, 322, 19, TEXT, bold=True)
    para(c, "O detalhe da atividade mantém a etapa em foco, organiza a produção e oferece contexto para o próximo passo.", 651, 301, 245, size=10.5, leading=14, color=MUTED, max_height=60)
    flow = [("Apontar", BLUE), ("Anexar", GOLD), ("Validar", GREEN), ("Histórico", PURPLE)]
    for i, (label, color) in enumerate(flow):
        x = 651 + (i % 2) * 135
        y = 204 - (i // 2) * 64
        rect(c, x, y, 112, 39, fill=BG_2, stroke=color, radius=5)
        dot(c, x + 15, y + 20, color, 4)
        text(c, label, x + 28, y + 16, 9.5, TEXT, bold=True)
    rect(c, 651, 70, 245, 49, fill=HexColor("#0e2d2a"), stroke=GREEN, radius=6)
    text(c, "Anexos de imagem e documento", 666, 99, 9, GREEN, bold=True)
    text(c, "ficam ligados ao registro da frente.", 666, 83, 8.7, MUTED)


def page_calendar(c: Canvas):
    base(c, 8, "Cronograma", "Calendário, dependências e RAID no mesmo horizonte.", "07  ·  Visibilidade", PURPLE)
    image_cover(c, REFERENCE / "cronograma.png", 40, 74, 612, 320, alpha=0.95, radius=8, position=(0.5, 0.42))
    c.setFillColor(BG)
    c.setFillAlpha(0.24)
    c.rect(40, 74, 612, 320, stroke=0, fill=1)
    c.setFillAlpha(1)
    cards = [
        ("CALENDÁRIO", "Visualizar compromissos, marcos e frentes em uma cadência semanal.", BLUE),
        ("PERT", "Explicitar relações de dependência e descobrir o caminho crítico.", GOLD),
        ("RAID", "Dar saída operacional para riscos, ações, problemas, urgências e decisões.", RED),
    ]
    for i, (title, body, color) in enumerate(cards):
        y = 284 - i * 90
        rect(c, 680, y, 240, 72, fill=BG_2, stroke=LINE, radius=7)
        text(c, title, 697, y + 47, 9, color, bold=True, font=FONT_MONO)
        para(c, body, 697, y + 34, 204, size=9.3, leading=12, color=MUTED, max_height=32)
    text(c, "Do alerta, o administrador chega à atividade sem perder a etapa selecionada.", 680, 69, 8.3, TEXT)


def page_leads(c: Canvas):
    base(c, 9, "Leads e lotes", "A operação comercial também enxerga o território.", "08  ·  Relação", PURPLE)
    image_cover(c, REFERENCE / "leads.png", 40, 72, 590, 324, alpha=1, radius=8, position=(0.5, 0.5))
    pill(c, "Mapa comercial", 661, 354, PURPLE, 117)
    text(c, "Lote, intenção e próximo contato", 661, 322, 17, TEXT, bold=True)
    para(c, "Marcadores numerados e filtros por objetivo e situação conectam a disponibilidade física à conversa comercial.", 661, 301, 244, size=10, leading=14, color=MUTED, max_height=60)
    stats = [("238", "intenções", PURPLE), ("96", "lotes com interesse", BLUE), ("37", "qualificados", GREEN)]
    stat(c, 661, 195, 118, 60, stats[0][0], stats[0][1], accent=stats[0][2])
    stat(c, 791, 195, 118, 60, stats[1][0], stats[1][1], accent=stats[1][2])
    stat(c, 661, 119, 118, 60, stats[2][0], stats[2][1], accent=stats[2][2])
    rect(c, 791, 107, 118, 72, fill=HexColor("#17152b"), stroke=PURPLE, radius=7)
    text(c, "FUNIL", 807, 156, 8, PURPLE, bold=True, font=FONT_MONO)
    text(c, "Novo > Em", 807, 137, 9.2, TEXT, bold=True)
    text(c, "contato >", 807, 123, 9.2, TEXT, bold=True)
    text(c, "Qualificado", 807, 109, 9.2, TEXT, bold=True)
    text(c, "A cor acompanha o status.", 661, 88, 8.7, MUTED)


def page_workers(c: Canvas):
    base(c, 10, "Inteligência", "Workers mantêm a operação ouvindo a obra.", "09  ·  Continuidade", GREEN)
    image_cover(c, PORTFOLIO / "workers-monitor.jpg", 40, 78, 585, 316, alpha=1, radius=8, position=(0.43, 0.39))
    rect(c, 660, 307, 260, 87, fill=BG_2, stroke=LINE, radius=7)
    text(c, "ESCUTA ATIVA", 678, 368, 8, GREEN, bold=True, font=FONT_MONO)
    text(c, "Eventos, agenda e regras", 678, 346, 14, TEXT, bold=True)
    text(c, "alimentam a próxima ação.", 678, 328, 10, MUTED)
    items = [
        ("Local-first", "A sessão funciona como PWA e mantém uma base local para o uso cotidiano.", BLUE),
        ("Sinalização", "Alertas e pendências aparecem na superfície certa para o perfil do usuário.", GOLD),
        ("Ação IA", "A leitura contextual sugere prioridades; a decisão continua revisável pelo administrador.", PURPLE),
    ]
    for i, (title, body, color) in enumerate(items):
        y = 236 - i * 72
        dot(c, 667, y + 26, color, 5)
        text(c, title, 684, y + 29, 10.5, TEXT, bold=True)
        para(c, body, 684, y + 16, 222, size=9, leading=12, color=MUTED, max_height=30)


def page_flow(c: Canvas):
    base(c, 11, "Abertura", "Um roteiro claro para instalar a operação.", "10  ·  Como usar", LIME)
    steps = [
        ("01", "Preparar a base", "Cadastrar a obra e validar escopo, fontes e responsáveis.", BLUE),
        ("02", "Instalar etapas", "Organizar fases, atividades, produção, materiais e evidências.", GOLD),
        ("03", "Relacionar", "Criar dependências no PERT e papéis no RACI.", ORANGE),
        ("04", "Calibrar", "Revisar requisitos e prioridades com Ações IA.", PURPLE),
        ("05", "Executar", "Registrar avanço, anexos e apontamentos no contexto da frente.", GREEN),
        ("06", "Decidir", "Ler mapa, calendário, RAID e indicadores para liberar o próximo passo.", RED),
    ]
    for i, (n, title, body, color) in enumerate(steps):
        col, row = i % 3, i // 3
        x = 40 + col * 300
        y = 246 - row * 138
        rect(c, x, y, 270, 106, fill=BG_2, stroke=LINE, radius=8)
        c.setFillColor(color)
        c.rect(x, y, 5, 106, stroke=0, fill=1)
        text(c, n, x + 20, y + 78, 9, color, bold=True, font=FONT_MONO)
        text(c, title, x + 20, y + 55, 14, TEXT, bold=True)
        para(c, body, x + 20, y + 42, 230, size=9.5, leading=13, color=MUTED, max_height=35)
        if i in (0, 1, 3, 4):
            arrow(c, x + 274, y + 52, x + 293, y + 52, LINE)
    rect(c, 40, 58, 880, 44, fill=HexColor("#112a25"), stroke=GREEN, radius=6)
    text(c, "RESULTADO", 58, 77, 7.5, GREEN, bold=True, font=FONT_MONO)
    text(c, "A implantação deixa de ser uma coleção de telas e passa a funcionar como um ciclo: contexto > execução > evidência > decisão.", 145, 76, 10, TEXT)


def page_closing(c: Canvas):
    c.setFillColor(HexColor("#052b25"))
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    image_cover(c, REFERENCE / "dashboard.png", 480, 0, 480, 540, alpha=0.40, position=(0.5, 0.5))
    c.setFillColor(HexColor("#052b25"))
    c.setFillAlpha(0.82)
    c.rect(0, 0, 600, PAGE_H, stroke=0, fill=1)
    c.setFillAlpha(1)
    text(c, "ALIANÇA PARK", 42, 462, 9, LIME, bold=True, font=FONT_MONO)
    para(c, "Da abertura<br/>ao próximo marco.", 42, 430, 410, size=38, leading=42, bold=True, max_height=100)
    para(c, "O Workbench operacional foi desenhado para colocar o loteamento, a equipe, o atendimento e a decisão no mesmo fluxo de trabalho.", 42, 292, 410, size=14, leading=20, color=MUTED, max_height=70)
    line(c, 42, 196, 480, 196, HexColor("#437a59"), 1)
    text(c, "PRÓXIMAS EVOLUÇÕES", 42, 174, 8, GOLD, bold=True, font=FONT_MONO)
    for i, label in enumerate(["Validar base local", "Conectar fontes", "Acompanhar a primeira frente"]):
        dot(c, 48, 145 - i * 25, [BLUE, GOLD, GREEN][i], 3.5)
        text(c, label, 61, 141 - i * 25, 10, TEXT)
    text(c, "v3.0  ·  Material demonstrativo de contexto e uso", 42, 54, 8.5, MUTED, font=FONT_MONO)
    footer(c, 12, "Encerramento")


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = Canvas(str(OUT), pagesize=(PAGE_W, PAGE_H), pageCompression=1)
    c.setTitle("Aliança Park - Abertura de loteamento e Workbench operacional v3.0")
    c.setAuthor("Aliança Park")
    pages = [
        page_cover, page_context, page_overview, page_map, page_stages, page_control,
        page_activity, page_calendar, page_leads, page_workers, page_flow, page_closing,
    ]
    for render in pages:
        render(c)
        c.showPage()
    c.save()
    print(OUT)


if __name__ == "__main__":
    build()
