#!/usr/bin/env python3
"""Verify the kana datasets against an independent authority: the Unicode Standard.

Unicode names every kana with its reading (HIRAGANA LETTER KA), using a Nihon-shiki-style
transliteration. Mapping that onto this project's canonical romanization gives an expectation
derived from outside the repository, which catches a correct-looking glyph paired with the wrong
reading — something the structural invariants in tests/data/dataset.test.ts cannot detect (SC-003).

Usage: python3 scripts/verify-dataset.py   (rewrites tests/data/unicode-reference.json)
"""
import json
import pathlib
import re
import sys
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Unicode's own transliteration -> this project's canonical romanization
# (specs/001-kana-flashcards/contracts/kana-dataset.md).
BASE = {"si": "shi", "ti": "chi", "tu": "tsu", "hu": "fu", "zi": "ji"}
STEM = {"si": "sh", "ti": "ch", "zi": "j", "di": "dy", "ki": "ky", "ni": "ny",
        "hi": "hy", "mi": "my", "ri": "ry", "gi": "gy", "bi": "by", "pi": "py"}
VOWEL = {"ya": "a", "yu": "u", "yo": "o"}


def parse(path, script):
    src = (ROOT / path).read_text(encoding="utf-8")
    rows = re.findall(r"\['((?:main|dakuten|combo)\.[a-z]+)', \[(.*?)\]\],", src, re.S)
    return [
        {"kana": k, "romaji": r, "script": script, "groupId": gid}
        for gid, body in rows
        for k, r in re.findall(r"\['(.+?)', '([a-z]+)'\]", body)
    ]


def unicode_romaji(kana):
    parts = [unicodedata.name(c).split("LETTER ")[1].lower() for c in kana]
    if len(parts) == 1:
        return BASE.get(parts[0], parts[0])
    base, small = parts[0], parts[1].replace("small ", "")
    return STEM[base] + VOWEL[small]


def main():
    entries = parse("src/data/hiragana.ts", "hiragana") + parse("src/data/katakana.ts", "katakana")
    reference, problems = {}, []
    for entry in entries:
        expected = unicode_romaji(entry["kana"])
        reference[entry["kana"]] = expected
        if expected != entry["romaji"]:
            problems.append(f'  {entry["kana"]} ({unicodedata.name(entry["kana"][0])}): '
                            f'dataset={entry["romaji"]!r} unicode={expected!r}')

    print(f"checked {len(entries)} entries")
    if problems:
        print(f"{len(problems)} MISMATCHES:")
        print("\n".join(problems))
        return 1

    out = ROOT / "tests/data/unicode-reference.json"
    out.write_text(json.dumps(reference, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
    print(f"no mismatches; wrote {out.relative_to(ROOT)} ({len(reference)} entries)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
