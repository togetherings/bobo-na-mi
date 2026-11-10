"""Builds the game's pictures from the Petixel art packs.

    python3 tools/build_assets.py

Needs Python 3 with Pillow, and the packs unpacked anywhere inside art-src/ (never committed:
see "Art" in README.md). Any folder layout works: files are found by name. The packs:
Petixel Base Characters, Petixel Hair, Petixel Prototype and Petixel Main UI.

Writes:
  assets/sprites.png   things and word tiles, packed into one picture
  assets/ui.png        touch buttons (top row: normal, bottom row: pressed)
  assets/window.png    the frame drawn around dialogs (CSS border-image)
  src/atlas.js         where each sprite is in sprites.png (generated: don't edit)

Characters are made by a palette swap, the way Plenty Heaps does it: one child body sheet and
one hair sheet, recoloured for each character's skin, hair and clothes.
"""
import json
import os
import re
import sys

from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ART = os.path.join(ROOT, "art-src")
T = 16

# ------------------------------------------------------------------ finding files
_files = {}


def find(name):
    """A pack file by its file name, anywhere under art-src/."""
    if not _files:
        for folder, _, names in os.walk(ART):
            for n in names:
                # Prefer the 16x16 versions (the packs also have 48x48 copies with the same names).
                if n not in _files or "16x16" in folder:
                    _files[n] = os.path.join(folder, n)
    if name not in _files:
        sys.exit("Missing %s: unpack the Petixel packs into art-src/ (see README.md)." % name)
    return Image.open(_files[name]).convert("RGBA")


# ------------------------------------------------------------------ colours
# The Petixel body sheets draw skin with three colours (shadow, base, highlight), and the
# hair sheets with five. These are swapped for each character's colours (from Plenty Heaps'
# src/data/appearance.js). Skin below the neck becomes clothes.
SKIN_KEYS = [(131, 86, 145), (161, 93, 77), (230, 162, 126)]
HAIR_KEYS = [(35, 93, 106), (131, 86, 145), (139, 130, 211), (89, 59, 61), (69, 72, 78)]
OUTLINE = (89, 59, 61)
HAIR_BLACK = [(46, 38, 46), (74, 60, 72), (108, 94, 110), (30, 22, 26), (56, 46, 52)]
SKINS = {
    "deep": {"colors": [(66, 42, 52), (104, 64, 54), (156, 102, 78)], "outline": (40, 26, 30)},
    "brown": {"colors": [(92, 56, 70), (132, 80, 62), (190, 126, 92)]},
    "warm": {"colors": [(118, 72, 86), (161, 93, 77), (230, 162, 126)]},
}

# Each character: skin, hairstyle (Petixel's child hair), top and bottom (shadow, base, highlight).
CHARACTERS = {
    "bobo": {"skin": "brown", "hair": "Child_Spiky",
             "top": [(38, 70, 140), (58, 120, 210), (120, 180, 245)],
             "bottom": [(52, 48, 74), (78, 72, 104), (110, 104, 140)]},
    "titi": {"skin": "warm", "hair": "Child_DoubleBuns",
             "top": [(150, 46, 96), (226, 86, 146), (255, 156, 196)],
             "bottom": [(150, 46, 96), (226, 86, 146), (255, 156, 196)]},     # a dress
    "padi": {"skin": "deep", "hair": "Child_FlatTop",
             "top": [(34, 98, 58), (64, 160, 84), (130, 214, 120)],
             "bottom": [(96, 80, 56), (140, 118, 80), (184, 160, 110)]},
}
# On the child body sheet (frames 16x32), the neck is at row 22 and the waist at row 26,
# one row higher in the middle frame, which bobs up.
NECK, WAIST = 22, 26


def recolor_body(img, skin, top, bottom):
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            if (r, g, b) == OUTLINE and "outline" in skin:
                px[x, y] = skin["outline"] + (a,)
                continue
            if (r, g, b) not in SKIN_KEYS:
                continue                      # eyes, mouth: keep
            k = SKIN_KEYS.index((r, g, b))
            bob = -1 if (x // 16) % 3 == 1 else 0
            fy = y % 32
            colors = skin["colors"] if fy < NECK + bob else top if fy <= WAIST + bob else bottom
            px[x, y] = colors[k] + (a,)
    return img


def recolor(img, keys, colors):
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            p = px[x, y]
            if p[3] and p[:3] in keys:
                px[x, y] = colors[keys.index(p[:3])] + (p[3],)
    return img


def character(spec):
    body = recolor_body(find("!$CharaBase_Black_C.png"), SKINS[spec["skin"]], spec["top"], spec["bottom"])
    hair = recolor(find("!$CharaHair_%s_noireau.png" % spec["hair"]), HAIR_KEYS, HAIR_BLACK)
    body.alpha_composite(hair)
    return body


# ------------------------------------------------------------------ word tiles
# Words are spelled with the letters of Petixel Prototype's tileset (column, row there).
# It has no W, so W is an upside-down M.
LETTERS = {}
for row, cols in ((3, "12345ABR"), (4, "67890YXL"), (13, "    CDEF"), (14, "GHIJKNMO"), (15, "PQSTUVZ")):
    for i, ch in enumerate(cols):
        if ch != " ":
            LETTERS[ch] = (8 + i, row)
STROKE = (89, 59, 61)          # the letters are dark strokes carved in a beige block
WORD = 36                       # word tiles are 36x36


def glyph(ch):
    """The letter's strokes only (12x14 crop; the beige block around them is dropped)."""
    sheet = find("Petixel Tileset - Prototype_B.png")
    flip = ch == "W"
    c, r = LETTERS["M" if flip else ch]
    g = sheet.crop((c * T + 2, r * T + 1, c * T + 14, r * T + 15))
    return g.transpose(Image.FLIP_TOP_BOTTOM) if flip else g


def hex_color(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def word_tile(label, color, prop):
    """Baba-style: 2 or 3 letters in a row, 4 letters as 2 rows of 2.
    Things and joining words: coloured letters on a dark plate. Properties: dark letters on
    a coloured plate."""
    tile = Image.new("RGBA", (WORD, WORD), (0, 0, 0, 0))
    plate = color if prop else (46, 43, 63)
    edge = tuple(int(v * 0.55) for v in color) if prop else (89, 59, 61)
    ink = (34, 30, 46) if prop else color
    for y in range(1, WORD - 1):                      # a plate with cut corners
        for x in range(1, WORD - 1):
            if (x in (1, WORD - 2)) and (y in (1, WORD - 2)):
                continue
            border = x in (1, WORD - 2) or y in (1, WORD - 2)
            tile.putpixel((x, y), (edge if border else plate) + (255,))
    rows = [label[:2], label[2:]] if len(label) == 4 else [label]
    # The strokes sit in columns 1-10 and rows 2-11 of each 12x14 crop (measured).
    sx, sw, sy, sh, step, gap = 1, 10, 2, 10, 11, 3
    height = len(rows) * sh + (len(rows) - 1) * gap
    top = (WORD - height) // 2 - sy
    for ri, text in enumerate(rows):
        width = len(text) * step - (step - sw)
        left = (WORD - width) // 2 - sx
        for i, ch in enumerate(text):
            g = glyph(ch)
            gp = g.load()
            for y in range(14):
                for x in range(12):
                    p = gp[x, y]
                    if p[3] and p[:3] == STROKE:
                        tile.putpixel((left + i * step + x, top + ri * (sh + gap) + y), ink + (255,))
    return tile


def read_words():
    """Labels and colours from src/words.js, so the tiles always match the game's words."""
    text = open(os.path.join(ROOT, "src", "words.js"), encoding="utf-8").read()
    pattern = r"^\s*(\w+):\s*\{\s*kind:\s*'(\w+)',\s*label:\s*'([A-Z]+)',.*?color:\s*'(#[0-9a-fA-F]{6})'"
    return [(m[0], m[1], m[2], m[3]) for m in re.findall(pattern, text, re.M)]


# ------------------------------------------------------------------ things
def shade(img, k):
    """Darker by k (0-1), so walls sit back behind the things that move."""
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            px[x, y] = (int(r * k), int(g * k), int(b * k), a)
    return img


def things():
    proto = find("Petixel Tileset - Prototype_B.png")
    objects = find("!Prototype_Objects.png.png")
    door = find("!Door_Prototype.png").crop((9 * T, 0, 10 * T, 2 * T))          # the red keyhole door
    door = door.crop(door.getbbox())
    flag = find("!$Prototype_Flag.png")                                           # 3 frames of 48x32, yellow is row 2
    frames = [flag.crop((i * 48, 64, i * 48 + 48, 96)) for i in range(3)]
    box = frames[0].getbbox()
    strip = Image.new("RGBA", ((box[2] - box[0]) * 3, box[3] - box[1]))
    for i, f in enumerate(frames):
        strip.alpha_composite(f.crop(box), (i * (box[2] - box[0]), 0))
    return [
        ("wol", shade(proto.crop((0, 3 * T, 2 * T, 5 * T)), 0.6), {"tiles": 2}),    # 2x2 repeating wall, darkened
        ("rok", objects.crop((0, 4 * T, T, 5 * T)), {}),                            # grey stone block
        ("ki", objects.crop((6 * T, 2 * T, 9 * T, 3 * T)), {"frames": 3}),          # yellow key, 3 frames
        ("dor", door, {}),
        ("flag", strip, {"frames": 3}),
    ]


# ------------------------------------------------------------------ packing
def pack(items, width=256):
    """Shelf packing: left to right, in rows. Returns the picture and each item's place."""
    x = y = shelf = 0
    places = []
    for name, img, extra in items:
        if x + img.width > width:
            x, y, shelf = 0, y + shelf + 1, 0
        places.append((name, img, extra, x, y))
        x += img.width + 1
        shelf = max(shelf, img.height)
    sheet = Image.new("RGBA", (width, y + shelf), (0, 0, 0, 0))
    atlas = {}
    for name, img, extra, px, py in places:
        sheet.alpha_composite(img, (px, py))
        entry = {"x": px, "y": py, "w": img.width, "h": img.height}
        entry.update(extra)
        atlas[name] = entry
    return sheet, atlas


# ------------------------------------------------------------------ interface
def ui():
    """Touch buttons from Main UI's ButtonSet: up, down, left, right, blank, undo, blank wide."""
    src = find("ButtonSet.png")                       # row 0 normal, row 1 pressed; 48px high
    def blank(x, w, row):
        b = src.crop((x, row * 48, x + w, row * 48 + 48))
        px = b.load()
        for y in range(48):                           # wipe the icon: repeat column 3, plain button face
            for xx in range(5, w - 5):
                px[xx, y] = px[3, y]
        return b
    parts = [("up", 240, 48), ("down", 192, 48), ("left", 96, 48), ("right", 144, 48),
             ("blank", None, 48), ("undo", 0, 96), ("wide", None, 96)]
    out = Image.new("RGBA", (sum(w for _, _, w in parts), 96), (0, 0, 0, 0))
    x = 0
    places = {}
    for name, sx, w in parts:
        for row in (0, 1):
            img = blank(480 if w == 48 else 0, w, row) if sx is None else src.crop((sx, row * 48, sx + w, row * 48 + 48))
            out.alpha_composite(img, (x, row * 48))
        places[name] = [x, w]
        x += w
    out.save(os.path.join(ROOT, "assets", "ui.png"))
    frame = find("Window.png").crop((96, 0, 192, 96))
    px = frame.load()
    for y in range(16, 80):                           # clear the middle: only the frame is used
        for xx in range(16, 80):
            px[xx, y] = (0, 0, 0, 0)
    frame.save(os.path.join(ROOT, "assets", "window.png"))
    return places


def main():
    os.makedirs(os.path.join(ROOT, "assets"), exist_ok=True)
    items = [(name, character(spec), {"frames": 3, "fw": 16, "fh": 32}) for name, spec in CHARACTERS.items()]
    items += things()
    words = read_words()
    if not words:
        sys.exit("No words found in src/words.js")
    for key, kind, label, color in words:
        items.append(("T:" + key, word_tile(label, hex_color(color), kind == "prop"), {}))
    sheet, atlas = pack(items)
    sheet.save(os.path.join(ROOT, "assets", "sprites.png"))
    buttons = ui()
    with open(os.path.join(ROOT, "src", "atlas.js"), "w", encoding="utf-8") as f:
        f.write("/* atlas.js: made by tools/build_assets.py from the Petixel art packs. Don't edit. */\n")
        f.write("var BNM = window.BNM = window.BNM || {};\n")
        f.write("BNM.ATLAS = " + json.dumps(atlas, separators=(",", ":")) + ";\n")
        f.write("BNM.UI_BUTTONS = " + json.dumps(buttons, separators=(",", ":")) + ";\n")
    print("sprites.png %dx%d, %d sprites; ui.png; window.png; src/atlas.js" % (sheet.width, sheet.height, len(atlas)))


if __name__ == "__main__":
    main()
