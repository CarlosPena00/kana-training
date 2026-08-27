#!/usr/bin/env python3
"""Generate the app's visual identity: PWA icons, Android launcher mipmaps and adaptive icon,
the iOS app icon, and the Android splash screens.

The mark pairs the two scripts the app teaches: ア set large and offset behind in a lighter
indigo, with あ in front in warm off-white. Both are present at 512px; at 48px the eye reads the
bold あ and the ア becomes depth — two same-size glyphs would each land at ~20px and turn to mush
on a launcher.

Ground is ai-iro, traditional Japanese indigo dye, rather than a software blue. Type is mincho
(Noto Serif CJK) for real stroke-weight variation.

All output is committed, so a normal build never runs this.

Usage: python3 scripts/make-icons.py
"""
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
ICONS = ROOT / "public/icons"

# ai-iro indigo, deepening toward the bottom so the tile has some weight to it.
INDIGO_TOP = (32, 58, 122)
INDIGO_BOTTOM = (18, 32, 74)
INDIGO_FLAT = (24, 43, 96)
KATAKANA_INK = (58, 88, 158)      # the ア behind: lighter indigo, present but not competing
HIRAGANA_INK = (245, 241, 230)    # warm off-white, not pure white

FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/System/Library/Fonts/ttf/HiraginoSans-W6.ttc",
]

ANDROID_DENSITIES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
ANDROID_FOREGROUND = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
SPLASH_SIZES = {"mdpi": (320, 480), "hdpi": (480, 800), "xhdpi": (720, 1280),
                "xxhdpi": (960, 1600), "xxxhdpi": (1280, 1920)}


def load_font(size):
    for path in FONT_CANDIDATES:
        if pathlib.Path(path).exists():
            return ImageFont.truetype(path, size)
    raise SystemExit("no Japanese font found; install fonts-noto-cjk")


def draw_glyph(draw, glyph, size, center, fill):
    """Draw one kana optically centered on `center`, using its own ink bounds rather than the
    font's line box — kana sit high in the em square, so line-box centering looks low."""
    font = load_font(size)
    box = draw.textbbox((0, 0), glyph, font=font)
    x = center[0] - (box[0] + box[2]) / 2
    y = center[1] - (box[1] + box[3]) / 2
    draw.text((x, y), glyph, font=font, fill=fill)


def gradient(size):
    grad = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / max(size - 1, 1)
        grad.putpixel((0, y), tuple(
            round(INDIGO_TOP[i] + (INDIGO_BOTTOM[i] - INDIGO_TOP[i]) * t) for i in range(3)
        ))
    return grad.resize((size, size))


def compose_glyphs(size, scale):
    """Draw the pair on their own layer, then recenter by the combined ink bounds.

    Nominal positions leave the mark visibly off-centre, because the two glyphs have very
    different ink extents. Samsung (and other launchers) also zoom adaptive icons past the
    documented safe zone, so anything drifting toward an edge gets clipped — centring the real
    bounds keeps the mark clear of the crop whatever the launcher does.
    """
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    # ア behind, up and to the right; あ in front, down and to the left.
    draw_glyph(draw, "ア", int(size * 0.50 * scale), (size * 0.62, size * 0.38), KATAKANA_INK)
    draw_glyph(draw, "あ", int(size * 0.58 * scale), (size * 0.44, size * 0.60), HIRAGANA_INK)

    bounds = layer.split()[-1].getbbox()
    if bounds:
        dx = round((size - (bounds[0] + bounds[2])) / 2)
        dy = round((size - (bounds[1] + bounds[3])) / 2)
        if dx or dy:
            shifted = Image.new("RGBA", (size, size), (0, 0, 0, 0))
            shifted.paste(layer, (dx, dy))
            layer = shifted
    return layer


def render_mark(size, scale=1.0, ground=True, radius_ratio=0.22, path=None):
    """The mark itself. `scale` shrinks the glyphs for maskable and adaptive-icon safe zones."""
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    if ground:
        tile = gradient(size).convert("RGBA")
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255
        )
        image.paste(tile, (0, 0), mask)

    glyphs = compose_glyphs(size, scale)
    image.alpha_composite(glyphs)

    if path is not None:
        path.parent.mkdir(parents=True, exist_ok=True)
        image.save(path, "PNG", optimize=True)
        print(f"  {path.relative_to(ROOT)}  {size}x{size}  {path.stat().st_size / 1024:.1f} KB")
    return image


def render_splash(width, height, path):
    image = Image.new("RGB", (width, height), INDIGO_FLAT)
    mark = render_mark(int(min(width, height) * 0.34), ground=False)
    image.paste(mark, ((width - mark.width) // 2, (height - mark.height) // 2), mark)
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True)
    print(f"  {path.relative_to(ROOT)}  {width}x{height}  {path.stat().st_size / 1024:.1f} KB")


def main():
    print("PWA icons:")
    render_mark(192, path=ICONS / "icon-192.png")
    render_mark(512, path=ICONS / "icon-512.png")
    # Launchers crop maskable icons to a circle, so the mark needs a wider margin.
    render_mark(512, scale=0.78, radius_ratio=0.0, path=ICONS / "icon-maskable-512.png")
    render_mark(180, radius_ratio=0.0, path=ICONS / "apple-touch-icon.png")

    (ICONS / "icon.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" '
        'aria-label="Kana Flashcards">'
        '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="rgb{INDIGO_TOP}"/>'
        f'<stop offset="1" stop-color="rgb{INDIGO_BOTTOM}"/></linearGradient></defs>'
        '<rect width="512" height="512" rx="112" fill="url(#g)"/>'
        '<g font-family="Noto Serif CJK JP, Noto Serif JP, serif" font-weight="700" '
        'text-anchor="middle" dominant-baseline="central">'
        f'<text x="338" y="184" font-size="266" fill="rgb{KATAKANA_INK}">ア</text>'
        f'<text x="215" y="307" font-size="307" fill="rgb{HIRAGANA_INK}">あ</text>'
        "</g></svg>",
        encoding="utf-8",
    )
    print(f"  {(ICONS / 'icon.svg').relative_to(ROOT)}")

    res = ROOT / "android/app/src/main/res"
    if res.exists():
        print("Android launcher icons:")
        for density, size in ANDROID_DENSITIES.items():
            render_mark(size, path=res / f"mipmap-{density}" / "ic_launcher.png")
            render_mark(size, radius_ratio=0.5, path=res / f"mipmap-{density}" / "ic_launcher_round.png")
        for density, size in ANDROID_FOREGROUND.items():
            # Transparent: the adaptive icon paints ic_launcher_background behind it. Only the
            # middle 72 of 108 dp is guaranteed visible, hence the tighter scale.
            render_mark(size, scale=0.52, ground=False,
                        path=res / f"mipmap-{density}" / "ic_launcher_foreground.png")

        (res / "values/ic_launcher_background.xml").write_text(
            '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
            f'    <color name="ic_launcher_background">#{INDIGO_FLAT[0]:02X}{INDIGO_FLAT[1]:02X}{INDIGO_FLAT[2]:02X}</color>\n'
            "</resources>\n",
            encoding="utf-8",
        )

        print("Android splash screens:")
        render_splash(*SPLASH_SIZES["xxxhdpi"], res / "drawable" / "splash.png")
        for density, (w, h) in SPLASH_SIZES.items():
            render_splash(w, h, res / f"drawable-port-{density}" / "splash.png")
            render_splash(h, w, res / f"drawable-land-{density}" / "splash.png")
    else:
        print("  (no android project — skipping launcher icons and splash)")

    appicon = ROOT / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
    if appicon.parent.exists():
        print("iOS app icon:")
        # iOS masks the corners itself and rejects transparency: full-bleed square.
        render_mark(1024, radius_ratio=0.0, path=appicon)
    else:
        print("  (no ios project — skipping app icon)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
