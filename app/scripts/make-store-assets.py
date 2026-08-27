#!/usr/bin/env python3
"""Generate the Google Play listing graphics.

Play requires a 512x512 app icon and a 1024x500 feature graphic. Screenshots come from a real
device instead — see the publishing section of the README.

Usage: python3 scripts/make-store-assets.py
"""
import importlib.util
import pathlib
import sys

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "store"

# Reuse the icon generator so the store art and the launcher icon can never drift apart.
spec = importlib.util.spec_from_file_location("icons", ROOT / "scripts/make-icons.py")
icons = importlib.util.module_from_spec(spec)
spec.loader.exec_module(icons)


def feature_graphic(path):
    """1024x500. Play crops this on some surfaces, so the mark and text stay well inside."""
    w, h = 1024, 500
    image = icons.gradient(h).resize((w, h)).convert("RGB")

    draw = ImageDraw.Draw(image)
    margin = 72
    mark_size = 260
    text_left = margin + mark_size + 56
    available = w - text_left - margin

    def fit(text, start, minimum=20):
        """Largest size that still fits the column — measured, not guessed."""
        for size in range(start, minimum, -2):
            font = icons.load_font(size)
            if draw.textlength(text, font=font) <= available:
                return font
        return icons.load_font(minimum)

    title, subtitle = "Kana Flashcards", "Hiragana and Katakana, offline"
    title_font = fit(title, 64)
    sub_font = fit(subtitle, 30)

    mark = icons.render_mark(mark_size, ground=False)
    image.paste(mark, (margin, (h - mark.height) // 2), mark)

    # Set the two lines as one optically centred block.
    tb = draw.textbbox((0, 0), title, font=title_font)
    sb = draw.textbbox((0, 0), subtitle, font=sub_font)
    gap = 20
    block = (tb[3] - tb[1]) + gap + (sb[3] - sb[1])
    top = (h - block) // 2

    draw.text((text_left, top - tb[1]), title, font=title_font, fill=icons.HIRAGANA_INK)
    draw.text((text_left, top + (tb[3] - tb[1]) + gap - sb[1]), subtitle, font=sub_font,
              fill=icons.KATAKANA_INK)

    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True)
    print(f"  {path.relative_to(ROOT)}  {w}x{h}  {path.stat().st_size / 1024:.1f} KB")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    print("Play listing graphics:")
    # The 512 store icon must be a plain square: no transparency, no rounded corners — Play
    # applies its own mask. Flattened to RGB so there is no alpha channel at all, which Play's
    # design spec asks for.
    icon = icons.render_mark(512, radius_ratio=0.0)
    icon_path = OUT / "play-icon-512.png"
    icon.convert("RGB").save(icon_path, "PNG", optimize=True)
    print(f"  {icon_path.relative_to(ROOT)}  512x512 RGB  {icon_path.stat().st_size / 1024:.1f} KB")
    feature_graphic(OUT / "play-feature-graphic.png")
    return 0


if __name__ == "__main__":
    sys.exit(main())
