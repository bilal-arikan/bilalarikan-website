#!/usr/bin/env python3
"""Report asset files that nothing in the site references.

The counterpart to check-links: that one finds references with no file, this
one finds files with no reference. Both read the markup through markup_refs, so
a reference either tool understands is understood by the other.

Nothing is deleted — a file may be unreferenced because a link is broken rather
than because the file is unwanted, and only reading the output tells you which.
Run check-links first; if it is clean, what shows up here is genuinely unused.

Run from the repository root:

    python tools/find-orphans.py
    python tools/find-orphans.py --list      # every path, not just a summary
"""

from __future__ import annotations

import argparse
import collections
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))

import markup_refs

MARKUP_SUFFIXES = {".html", ".xml", ".css", ".js"}

ASSET_SUFFIXES = {
    ".webp", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
    ".css", ".js",
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
}

# Served directly rather than referenced from markup.
ALWAYS_KEEP = {"sitemap.xml", "robots.txt", "404.html", "CNAME", ".nojekyll"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="repository root (default: cwd)")
    parser.add_argument("--list", action="store_true", help="print every orphan path")
    args = parser.parse_args()

    root = pathlib.Path(args.root).resolve()

    referenced: set[pathlib.Path] = set()
    for page in markup_refs.iter_pages(root, MARKUP_SUFFIXES):
        for ref in markup_refs.iter_references(markup_refs.read(page)):
            target = markup_refs.resolve(page, root, ref.raw)
            if target:
                referenced.add(target)

    orphans = [
        path
        for path in sorted(root.rglob("*"))
        if path.is_file()
        and path.suffix.lower() in ASSET_SUFFIXES
        and path.name not in ALWAYS_KEEP
        and not any(part in markup_refs.SKIP_DIRS for part in path.parts)
        and path.resolve() not in referenced
    ]

    if not orphans:
        print("no unreferenced assets")
        return 0

    total = sum(path.stat().st_size for path in orphans)
    print(f"{len(orphans)} unreferenced asset(s), {total / 1048576:.1f} MB\n")

    if args.list:
        for path in orphans:
            size = path.stat().st_size / 1024
            print(f"{size:9.1f} KB  {path.relative_to(root)}")
        return 0

    sizes: collections.Counter[str] = collections.Counter()
    counts: collections.Counter[str] = collections.Counter()
    for path in orphans:
        folder = str(path.parent.relative_to(root)).replace("\\", "/")
        sizes[folder] += path.stat().st_size
        counts[folder] += 1

    for folder, size in sizes.most_common(20):
        print(f"  {counts[folder]:4d} file(s)  {size / 1048576:6.2f} MB  {folder}")
    print("\nre-run with --list for individual paths")
    return 0


if __name__ == "__main__":
    sys.exit(main())
