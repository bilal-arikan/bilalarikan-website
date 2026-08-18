#!/usr/bin/env python3
"""Point RSS discovery links at the file that actually exists.

Every page advertises its feed as `feed/index.html`, but the export wrote
`feed/index.xml`. On WordPress the pretty URL `/feed/` was resolved server
side; on static hosting the advertised path simply 404s, so no reader can
subscribe. This rewrites the advertised path to the real file.

Run from the repository root:

    python tools/fix-feed-links.py
    python tools/fix-feed-links.py --dry-run
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

FEED_HREF = re.compile(r"(feed/)index\.html")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="report without writing")
    parser.add_argument("--root", default=".", help="repository root (default: cwd)")
    args = parser.parse_args()

    root = pathlib.Path(args.root)
    changed = 0
    replacements = 0

    for path in sorted(root.rglob("*.html")):
        if ".git" in path.parts:
            continue
        original = path.read_text(encoding="utf-8", errors="surrogateescape")
        fixed, count = FEED_HREF.subn(r"\1index.xml", original)
        if not count:
            continue
        changed += 1
        replacements += count
        if not args.dry_run:
            path.write_text(fixed, encoding="utf-8", errors="surrogateescape")

    verb = "would fix" if args.dry_run else "fixed"
    print(f"{verb} {replacements} feed link(s) across {changed} file(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
