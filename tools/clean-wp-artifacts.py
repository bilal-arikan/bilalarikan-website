#!/usr/bin/env python3
"""Strip WordPress-only artifacts from the static HTML export.

The site is served as plain static files (GitHub Pages), so anything that
depends on a live WordPress backend is dead weight: it either 404s, leaks the
old admin surface, or just wastes bytes on every page load.

Run from the repository root:

    python tools/clean-wp-artifacts.py          # apply
    python tools/clean-wp-artifacts.py --dry-run
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

# Each rule is (label, compiled pattern). Matches are removed outright.
RULES: list[tuple[str, re.Pattern[str]]] = [
    (
        "emoji detection script (references a file that does not exist)",
        re.compile(
            r"[ \t]*<script type=\"text/javascript\">\s*window\._wpemojiSettings.*?</script>\s*?\n",
            re.DOTALL,
        ),
    ),
    (
        "emoji stylesheet",
        re.compile(
            r"[ \t]*<style type=\"text/css\">\s*img\.wp-smiley,.*?</style>\s*?\n",
            re.DOTALL,
        ),
    ),
    (
        "REST API discovery link (wp-json is gone)",
        re.compile(r"[ \t]*<link rel=\"https://api\.w\.org/\"[^>]*>\s*?\n"),
    ),
    (
        "oEmbed discovery link (wp-json is gone)",
        re.compile(r"[ \t]*<link[^>]*wp-json[^>]*>\s*?\n"),
    ),
    (
        "shortlink (?p=<id> resolves to the home page without WordPress)",
        re.compile(r"[ \t]*<link rel=\"shortlink\"[^>]*>\s*?\n"),
    ),
    (
        "RSD / EditURI link (XML-RPC endpoint does not exist)",
        re.compile(r"[ \t]*<link rel=\"EditURI\"[^>]*>\s*?\n"),
    ),
    (
        "Windows Live Writer manifest link",
        re.compile(r"[ \t]*<link rel=\"wlwmanifest\"[^>]*>\s*?\n"),
    ),
    (
        "pingback link (XML-RPC endpoint does not exist)",
        re.compile(r"[ \t]*<link rel=\"pingback\"[^>]*>\s*?\n"),
    ),
    (
        "comment reply form (posts nowhere on a static site)",
        re.compile(
            r"[ \t]*<div id=\"respond\" class=\"comment-respond\">.*?<!-- #respond -->\s*?\n",
            re.DOTALL,
        ),
    ),
]


def clean(text: str) -> tuple[str, dict[str, int]]:
    hits: dict[str, int] = {}
    for label, pattern in RULES:
        text, count = pattern.subn("", text)
        if count:
            hits[label] = hits.get(label, 0) + count
    return text, hits


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="report without writing")
    parser.add_argument("--root", default=".", help="repository root (default: cwd)")
    args = parser.parse_args()

    root = pathlib.Path(args.root)
    totals: dict[str, int] = {}
    changed = 0
    saved = 0

    for path in sorted(root.rglob("*.html")):
        if ".git" in path.parts:
            continue
        original = path.read_text(encoding="utf-8", errors="surrogateescape")
        cleaned, hits = clean(original)
        if not hits:
            continue
        changed += 1
        saved += len(original) - len(cleaned)
        for label, count in hits.items():
            totals[label] = totals.get(label, 0) + count
        if not args.dry_run:
            path.write_text(cleaned, encoding="utf-8", errors="surrogateescape")

    for label, count in sorted(totals.items(), key=lambda item: -item[1]):
        print(f"{count:5d}x  {label}")
    verb = "would change" if args.dry_run else "changed"
    print(f"\n{verb} {changed} file(s), {saved / 1024:.1f} KB removed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
