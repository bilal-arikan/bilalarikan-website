#!/usr/bin/env python3
"""Report local references in the HTML that point at files which do not exist.

Only local targets are checked — external URLs, mailto:, tel: and in-page
anchors are skipped. Query strings and fragments are stripped before resolving,
and a directory target also matches its index.html, which is how GitHub Pages
serves it.

Run from the repository root:

    python tools/check-links.py
"""

from __future__ import annotations

import argparse
import collections
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))

import markup_refs


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="repository root (default: cwd)")
    args = parser.parse_args()

    root = pathlib.Path(args.root).resolve()
    broken: dict[str, list[str]] = collections.defaultdict(list)
    checked = 0

    for page in markup_refs.iter_pages(root, {".html"}):
        text = markup_refs.read(page)
        for ref in markup_refs.iter_references(text):
            resolved = markup_refs.resolve(page, root, ref.raw)
            if resolved is None:
                continue
            checked += 1
            if resolved.is_file() or (resolved / "index.html").is_file():
                continue
            broken[ref.raw].append(str(page.relative_to(root)).replace("\\", "/"))

    for raw, pages in sorted(broken.items(), key=lambda item: -len(item[1])):
        print(f"{len(pages):4d}x  {raw}")
        for page in pages[:3]:
            print(f"          {page}")
        if len(pages) > 3:
            print(f"          ... +{len(pages) - 3} more")

    print(f"\n{checked} local reference(s) checked, {len(broken)} broken target(s)")
    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main())
