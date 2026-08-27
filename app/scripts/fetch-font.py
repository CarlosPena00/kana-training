#!/usr/bin/env python3
"""Regenerate src/assets/fonts/noto-sans-jp-kana.woff2 — a Noto Sans JP subset containing only
the kana this app displays plus Basic Latin.

The font is committed, so a normal build never runs this. Re-run it only after a dataset change
that adds characters outside the current subset. FR-006 forbids depending on the user's installed
fonts, and Constitution Principle I forbids runtime network requests, so the font must ship with
the app rather than load from a CDN.

Usage: python3 scripts/fetch-font.py
"""
import pathlib
import re
import sys
import unicodedata
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"}


def dataset_characters():
    chars = set()
    for name in ("hiragana", "katakana"):
        src = (ROOT / f"src/data/{name}.ts").read_text(encoding="utf-8")
        for kana, _ in re.findall(r"\['(.+?)', '([a-z]+)'\]", src):
            chars.update(kana)
    return chars


def main():
    kana = dataset_characters()
    latin = {chr(c) for c in range(0x20, 0x7F)}
    text = "".join(sorted(kana | latin | {"ー"}))
    print(f"requesting subset for {len(kana)} kana code points + Basic Latin")

    css_url = "https://fonts.googleapis.com/css2?family=Noto+Sans+JP&text=" + urllib.parse.quote(text)
    css = urllib.request.urlopen(urllib.request.Request(css_url, headers=UA), timeout=60).read().decode()
    match = re.search(r"src: url\((https://[^)]+)\) format\('woff2'\)", css)
    if not match:
        print("could not find a woff2 face in the Google Fonts response", file=sys.stderr)
        return 1

    data = urllib.request.urlopen(urllib.request.Request(match.group(1), headers=UA), timeout=60).read()
    if data[:4] != b"wOF2":
        print("downloaded file is not woff2", file=sys.stderr)
        return 1

    out = ROOT / "src/assets/fonts/noto-sans-jp-kana.woff2"
    out.write_bytes(data)
    print(f"wrote {out.relative_to(ROOT)} ({len(data) / 1024:.1f} KB)")
    print("check the total payload against the budget in specs/001-kana-flashcards/plan.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
