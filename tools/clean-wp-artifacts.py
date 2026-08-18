#!/usr/bin/env python3
"""Repair the markup WordPress left behind in the static export.

The site is served as plain static files (GitHub Pages), so anything that
depends on a live WordPress backend is dead weight: it either 404s, leaks the
old admin surface, or just wastes bytes on every page load. Most rules here
delete such markup; a few rewrite a path WordPress used to resolve server side.

Run from the repository root:

    python tools/clean-wp-artifacts.py          # apply
    python tools/clean-wp-artifacts.py --dry-run
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))

import markup_refs

# Each rule is (label, pattern, replacement). The replacement is empty for the
# rules that delete markup outright.
RULES: list[tuple[str, re.Pattern[str], str]] = [
    (
        "emoji detection script (references a file that does not exist)",
        re.compile(
            r"[ \t]*<script type=\"text/javascript\">\s*window\._wpemojiSettings.*?</script>\s*?\n",
            re.DOTALL,
        ),
        "",
    ),
    (
        "emoji stylesheet",
        re.compile(
            r"[ \t]*<style type=\"text/css\">\s*img\.wp-smiley,.*?</style>\s*?\n",
            re.DOTALL,
        ),
        "",
    ),
    (
        "REST API discovery link (wp-json is gone)",
        re.compile(r"[ \t]*<link rel=\"https://api\.w\.org/\"[^>]*>\s*?\n"),
        "",
    ),
    (
        "oEmbed discovery link (wp-json is gone)",
        re.compile(r"[ \t]*<link[^>]*wp-json[^>]*>\s*?\n"),
        "",
    ),
    (
        "shortlink (?p=<id> resolves to the home page without WordPress)",
        re.compile(r"[ \t]*<link rel=\"shortlink\"[^>]*>\s*?\n"),
        "",
    ),
    (
        "RSD / EditURI link (XML-RPC endpoint does not exist)",
        re.compile(r"[ \t]*<link rel=\"EditURI\"[^>]*>\s*?\n"),
        "",
    ),
    (
        "Windows Live Writer manifest link",
        re.compile(r"[ \t]*<link rel=\"wlwmanifest\"[^>]*>\s*?\n"),
        "",
    ),
    (
        "pingback link (XML-RPC endpoint does not exist)",
        re.compile(r"[ \t]*<link rel=\"pingback\"[^>]*>\s*?\n"),
        "",
    ),
    (
        "comment reply form (posts nowhere on a static site)",
        re.compile(
            r"[ \t]*<div id=\"respond\" class=\"comment-respond\">.*?<!-- #respond -->\s*?\n",
            re.DOTALL,
        ),
        "",
    ),
    (
        # Not a deletion: WordPress resolved the pretty URL /feed/ server side,
        # but the export wrote index.xml, so the advertised path 404s and no
        # reader can subscribe.
        "RSS discovery link pointing at feed/index.html instead of index.xml",
        re.compile(r"(?<![\w-])feed/index\.html"),
        "feed/index.xml",
    ),
    (
        # Same mistake seen from inside the feed: a feed's self link names the
        # file it is served as, and the export wrote index.html there too.
        "feed self link (atom:link rel=self) naming index.html",
        re.compile(r'(<atom:link href=")\./index\.html(" rel="self")'),
        r"\1./index.xml\2",
    ),
]


def clean(text: str) -> tuple[str, dict[str, int]]:
    hits: dict[str, int] = {}
    for label, pattern, replacement in RULES:
        text, count = pattern.subn(replacement, text)
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

    # Feeds carry the same markup and the same stale paths as the pages.
    for path in markup_refs.iter_pages(root, {".html", ".xml"}):
        original = markup_refs.read(path)
        cleaned, hits = clean(original)
        if not hits:
            continue
        changed += 1
        saved += len(original) - len(cleaned)
        for label, count in hits.items():
            totals[label] = totals.get(label, 0) + count
        if not args.dry_run:
            markup_refs.write(path, cleaned)

    for label, count in sorted(totals.items(), key=lambda item: -item[1]):
        print(f"{count:5d}x  {label}")
    verb = "would change" if args.dry_run else "changed"
    print(f"\n{verb} {changed} file(s), {saved / 1024:.1f} KB removed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
