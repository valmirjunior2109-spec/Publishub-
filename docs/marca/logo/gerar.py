"""Gera os logos da publishub: horizontal, vertical, símbolo e ícone de app, em várias cores.

O símbolo usa as medidas de frontend/src/components/LogoArt.tsx (a única fonte dos
números do desenho). O nome "Publishub" sai da Geist semibold (600), com o mesmo
espaçamento do site (-0,035 em), convertido em contorno: os arquivos não dependem
de a fonte estar instalada em quem abrir.

Rodar (da raiz do repositório):
    pip install fonttools brotli uharfbuzz resvg-py
    python docs/marca/logo/gerar.py
"""

import io
from pathlib import Path

import resvg_py
import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
FONT = ROOT / "social-assets/publishub-motion/source/public/fonts/Geist-Variable.woff2"

# ---------------------------------------------------------------- o desenho (LogoArt.tsx)

MARK = (405, 368, 500, 524)  # x, y, largura, altura do símbolo sozinho
NOTEBOOK = (409, 372, 352, 516, 60)
BAND = (657, 37)
PAGE_EDGE = "M463.5 795 H657 V850 H463.5 A27.5 27.5 0 0 1 463.5 795 Z"
PEN = "translate(651 888) rotate(24.4)"
HALO = 19
PEN_PARTS = [
    "M0 0 C 7 -22, 20 -62, 20 -106 L -20 -106 C -20 -62, -7 -22, 0 0 Z",
    "M-20 -116 H20 C 20 -138, 10.5 -150, 10.5 -168 H-10.5 C -10.5 -150, -20 -138, -20 -116 Z",
    "M-10.5 -167 H10.5 V-335 H-10.5 Z",
    "M-23.5 -345 H23.5 V-517.5 A23.5 23.5 0 0 0 -23.5 -517.5 Z",
    "M38 -302 A8 8 0 0 1 54 -302 V-480 Q54 -486 48 -486 H21.5 V-470 H38 Z",
]
SHOULDERS = [(-42.5, -345, 13, HALO), (29.5, -345, 13, HALO)]
HIGHLIGHT = (-2.2, -309, 4.4, 115, 2.2)
TIP = (0, -4, 3.2)

# ---------------------------------------------------------------- as cores da marca (globals.css)

INK = "#1E1B18"
CREAM = "#F6F0E4"
PAGE = "#FBF3E6"
CARAMEL = "#C9824A"
CARAMEL_INK = "#8A4F22"
BLUE = "#1F47A6"
BLUE_LIGHT = "#8FAAF0"
DARK_PAPER = "#17140F"
DARK_TEXT = "#F4ECDF"

# Colorido: o caderno caramelo, o elástico em tinta, as páginas em creme, a caneta azul.
# Uma cor: o símbolo inteiro numa cor, com as páginas, o elástico e o brilho da caneta recortados.
PALETTES = {
    "cor": {"kind": "color", "pen": BLUE, "text": INK, "preview": CREAM, "label": "Colorido · fundo claro"},
    "cor-fundo-escuro": {"kind": "color", "pen": BLUE_LIGHT, "text": DARK_TEXT, "preview": DARK_PAPER, "label": "Colorido · fundo escuro"},
    "cor-fundo-azul": {"kind": "color", "pen": CREAM, "text": CREAM, "preview": BLUE, "label": "Colorido · fundo azul"},
    "tinta": {"kind": "mono", "color": INK, "preview": "#FFFFFF", "label": "Uma cor · tinta"},
    "branco": {"kind": "mono", "color": "#FFFFFF", "preview": INK, "label": "Uma cor · branco"},
    "azul": {"kind": "mono", "color": BLUE, "preview": CREAM, "label": "Uma cor · azul"},
    "caramelo": {"kind": "mono", "color": CARAMEL_INK, "preview": CREAM, "label": "Uma cor · caramelo"},
    "creme-sobre-caramelo": {"kind": "mono", "color": CREAM, "preview": CARAMEL, "label": "Uma cor · creme sobre caramelo"},
}

# Ícones de app: quadrados cheios (o sistema arredonda os cantos).
APP_ICONS = {
    "creme": {"bg": CREAM, "palette": "cor"},
    "tinta": {"bg": INK, "palette": "cor-fundo-escuro"},
    "azul": {"bg": BLUE, "palette": "cor-fundo-azul"},
    "caramelo": {"bg": CARAMEL, "palette": "branco"},
}


def _pen_paths(fill: str, extra: str = "") -> str:
    return f'<g transform="{PEN}" fill="{fill}"{extra}>' + "".join(f'<path d="{d}"/>' for d in PEN_PARTS) + "</g>"


def _halo(color: str) -> str:
    """A silhueta da caneta engordada pelo respiro, e os ombros da tampa."""
    outline = _pen_paths(color, f' stroke="{color}" stroke-width="{HALO * 2}" stroke-linejoin="round"')
    shoulders = f'<g transform="{PEN}" fill="{color}">' + "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}"/>' for x, y, w, h in SHOULDERS) + "</g>"
    return outline + shoulders


def mark_svg(palette: dict, uid: str) -> str:
    """O símbolo, em coordenadas do quadro de 1254 (LogoArt.tsx)."""
    x, y, w, h, r = NOTEBOOK
    bx, bw = BAND
    hx, hy, hw, hh, hr = HIGHLIGHT
    if palette["kind"] == "color":
        notebook = (
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{CARAMEL}"/>'
            f'<rect x="{bx}" y="{y}" width="{bw}" height="{h}" fill="{INK}"/>'
            f'<path d="{PAGE_EDGE}" fill="{PAGE}"/>'
        )
        cut = _halo("#000")
        pen = (
            f'<g transform="{PEN}">'
            + "".join(f'<path d="{d}" fill="{palette["pen"]}"/>' for d in PEN_PARTS)
            + f'<rect x="{hx}" y="{hy}" width="{hw}" height="{hh}" rx="{hr}" fill="{PAGE}"/>'
            + f'<circle cx="{TIP[0]}" cy="{TIP[1]}" r="{TIP[2]}" fill="{INK}"/></g>'
        )
    else:
        c = palette["color"]
        notebook = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{c}"/>'
        # o elástico aparece como duas frestas, e as páginas como um recorte
        cut = (
            _halo("#000")
            + f'<path d="{PAGE_EDGE}" fill="#000"/>'
            + f'<rect x="{bx - 9}" y="{y}" width="9" height="{h}" fill="#000"/>'
            + f'<rect x="{bx + bw}" y="{y}" width="9" height="{h}" fill="#000"/>'
        )
        pen = (
            f'<mask id="{uid}-pen" maskUnits="userSpaceOnUse" x="0" y="0" width="1254" height="1254">'
            f'<rect width="1254" height="1254" fill="#fff"/>'
            f'<g transform="{PEN}"><rect x="{hx}" y="{hy}" width="{hw}" height="{hh}" rx="{hr}" fill="#000"/></g></mask>'
            f'<g mask="url(#{uid}-pen)">{_pen_paths(c)}</g>'
        )
    return (
        f'<defs><mask id="{uid}-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="1254" height="1254">'
        f'<rect width="1254" height="1254" fill="#fff"/>{cut}</mask></defs>'
        f'<g mask="url(#{uid}-cut)">{notebook}</g>{pen}'
    )


# ---------------------------------------------------------------- o nome, em contorno


def wordmark(text: str = "Publishub", weight: int = 600, tracking: float = -0.035):
    """(path em unidades da fonte, com a linha de base em y=0; caixa xmin, ymin, xmax, ymax; unidades por em)."""
    font = TTFont(str(FONT))
    font.flavor = None
    instancer.instantiateVariableFont(font, {"wght": weight}, inplace=True)
    buffer = io.BytesIO()
    font.save(buffer)
    hb_font = hb.Font(hb.Face(buffer.getvalue()))
    shaping = hb.Buffer()
    shaping.add_str(text)
    shaping.guess_segment_properties()
    hb.shape(hb_font, shaping, {"kern": True, "liga": True})

    upem = font["head"].unitsPerEm
    glyphs = font.getGlyphSet()
    order = font.getGlyphOrder()
    svg_pen = SVGPathPen(glyphs)
    bounds = BoundsPen(glyphs)
    cursor = 0.0
    for info, pos in zip(shaping.glyph_infos, shaping.glyph_positions):
        name = order[info.codepoint]
        # y para baixo, como no SVG
        transform = (1, 0, 0, -1, cursor + pos.x_offset, -pos.y_offset)
        glyphs[name].draw(TransformPen(svg_pen, transform))
        glyphs[name].draw(TransformPen(bounds, transform))
        cursor += pos.x_advance + tracking * upem
    return svg_pen.getCommands(), bounds.bounds, upem


WORD_PATH, WORD_BOX, UPEM = wordmark()


def text_group(color: str, size: float, x: float, y: float) -> str:
    """O nome com `size` de corpo, a caixa visual começando em (x, y)."""
    s = size / UPEM
    xmin, ymin, _, _ = WORD_BOX
    return f'<path transform="translate({x - xmin * s:.2f} {y - ymin * s:.2f}) scale({s:.5f})" d="{WORD_PATH}" fill="{color}"/>'


def text_size(size: float) -> tuple[float, float]:
    s = size / UPEM
    xmin, ymin, xmax, ymax = WORD_BOX
    return (xmax - xmin) * s, (ymax - ymin) * s


# ---------------------------------------------------------------- as composições

PAD = 40  # folga em volta, em unidades do símbolo


def horizontal(palette: dict, uid: str) -> tuple[str, float, float]:
    """Como no site: o símbolo com 1,3 vez o corpo do texto, 0,4 em de distância, centrado."""
    mx, my, mw, mh = MARK
    size = mh / 1.3
    gap = 0.4 * size
    tw, th = text_size(size)
    width, height = mw + gap + tw + 2 * PAD, mh + 2 * PAD
    body = (
        f'<g transform="translate({PAD - mx} {PAD - my})">{mark_svg(palette, uid)}</g>'
        + text_group(palette.get("text", palette.get("color")), size, PAD + mw + gap, PAD + (mh - th) / 2)
    )
    return body, width, height


def vertical(palette: dict, uid: str) -> tuple[str, float, float]:
    """O símbolo em cima e o nome embaixo, centrados; o nome com a largura de 1,8 símbolo."""
    mx, my, mw, mh = MARK
    tw1, _ = text_size(1)
    size = (mw * 1.8) / tw1
    tw, th = text_size(size)
    gap = 0.62 * th
    width = max(mw, tw) + 2 * PAD
    height = mh + gap + th + 2 * PAD
    body = (
        f'<g transform="translate({(width - mw) / 2 - mx} {PAD - my})">{mark_svg(palette, uid)}</g>'
        + text_group(palette.get("text", palette.get("color")), size, (width - tw) / 2, PAD + mh + gap)
    )
    return body, width, height


def symbol(palette: dict, uid: str) -> tuple[str, float, float]:
    mx, my, mw, mh = MARK
    side = max(mw, mh) + 2 * PAD
    return f'<g transform="translate({(side - mw) / 2 - mx} {(side - mh) / 2 - my})">{mark_svg(palette, uid)}</g>', side, side


def app_icon(bg: str, palette: dict, uid: str) -> tuple[str, float, float]:
    """Quadrado cheio; o símbolo ocupa 62% da altura, levemente acima do centro óptico."""
    mx, my, mw, mh = MARK
    side = 1024
    scale = side * 0.62 / mh
    x = (side - mw * scale) / 2
    y = (side - mh * scale) / 2 - side * 0.01
    return (
        f'<rect width="{side}" height="{side}" fill="{bg}"/>'
        f'<g transform="translate({x:.2f} {y:.2f}) scale({scale:.5f}) translate({-mx} {-my})">{mark_svg(palette, uid)}</g>'
    ), side, side


def document(body: str, width: float, height: float, title: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.2f} {height:.2f}" width="{width:.0f}" height="{height:.0f}" role="img" aria-label="{title}">'
        f"<title>{title}</title>{body}</svg>\n"
    )


def png(svg: str, path: Path, width: int) -> None:
    path.write_bytes(bytes(resvg_py.svg_to_bytes(svg_string=svg, width=width)))


# ---------------------------------------------------------------- saída


def main() -> None:
    (OUT / "svg").mkdir(exist_ok=True)
    (OUT / "png").mkdir(exist_ok=True)
    made: dict[str, dict[str, tuple[str, float, float]]] = {}

    layouts = {"horizontal": (horizontal, 2400), "vertical": (vertical, 1600), "simbolo": (symbol, 1024)}
    for layout, (build, px) in layouts.items():
        for name, palette in PALETTES.items():
            uid = f"{layout}-{name}"
            body, w, h = build(palette, uid)
            svg = document(body, w, h, "Publishub")
            (OUT / "svg" / f"publishub-{layout}-{name}.svg").write_text(svg, encoding="utf-8")
            png(svg, OUT / "png" / f"publishub-{layout}-{name}.png", px)
            made.setdefault(layout, {})[name] = (body, w, h)

    for name, spec in APP_ICONS.items():
        body, w, h = app_icon(spec["bg"], PALETTES[spec["palette"]], f"app-{name}")
        svg = document(body, w, h, "Publishub")
        (OUT / "svg" / f"publishub-icone-app-{name}.svg").write_text(svg, encoding="utf-8")
        png(svg, OUT / "png" / f"publishub-icone-app-{name}.png", 1024)
        made.setdefault("app", {})[name] = (body, w, h)

    preview(made)


def preview(made) -> None:
    """Uma folha com tudo, cada versão sobre o fundo para o qual ela foi feita."""
    cell_w, gutter = 560, 24
    cols = 4
    rows_svg = []
    y = 120
    title = text_group(INK, 46, 60, 40)
    for layout, label, cell_h in (("horizontal", "Horizontal", 190), ("vertical", "Vertical", 330), ("simbolo", "Símbolo", 230)):
        rows_svg.append(f'<text x="60" y="{y + 22}" font-family="Segoe UI, Arial" font-size="20" font-weight="600" fill="{INK}">{label}</text>')
        y += 44
        for i, (name, palette) in enumerate(PALETTES.items()):
            col, row = i % cols, i // cols
            cx, cy = 60 + col * (cell_w + gutter), y + row * (cell_h + 52)
            body, w, h = made[layout][name]
            scale = min((cell_w - 80) / w, (cell_h - 50) / h)
            rows_svg.append(
                f'<rect x="{cx}" y="{cy}" width="{cell_w}" height="{cell_h}" rx="18" fill="{palette["preview"]}" stroke="#E4D6C1"/>'
                f'<g transform="translate({cx + (cell_w - w * scale) / 2:.1f} {cy + (cell_h - h * scale) / 2:.1f}) scale({scale:.4f})">{body.replace("id=\"", "id=\"pv-").replace("url(#", "url(#pv-")}</g>'
                f'<text x="{cx + 4}" y="{cy + cell_h + 24}" font-family="Segoe UI, Arial" font-size="15" fill="#5C544B">{palette["label"]}</text>'
            )
        y += 2 * (cell_h + 52) + 20
    rows_svg.append(f'<text x="60" y="{y + 22}" font-family="Segoe UI, Arial" font-size="20" font-weight="600" fill="{INK}">Ícone de app</text>')
    y += 44
    for i, (name, _) in enumerate(APP_ICONS.items()):
        body, w, _ = made["app"][name]
        side = 200
        cx = 60 + i * (side + 40)
        s = side / w
        rows_svg.append(
            f'<g transform="translate({cx} {y}) scale({s:.4f})"><clipPath id="app-clip-{i}"><rect width="1024" height="1024" rx="230"/></clipPath>'
            f'<g clip-path="url(#app-clip-{i})">{body.replace("id=\"", "id=\"pa-").replace("url(#", "url(#pa-")}</g></g>'
        )
    y += 260
    width = 60 * 2 + cols * cell_w + (cols - 1) * gutter
    sheet = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {y}" width="{width}" height="{y}"><rect width="{width}" height="{y}" fill="#FFFDF8"/>{title}{"".join(rows_svg)}</svg>'
    png(sheet, OUT / "folha-de-logos.png", width)


if __name__ == "__main__":
    main()
