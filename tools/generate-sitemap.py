#!/usr/bin/env python3
"""Generate sitemap.xml from the static HTML files in the repository.

WordPress used to serve the sitemap dynamically; the static export does not
include one, so search engines have no index of the site. This walks the
checked-in HTML and writes a plain sitemap at the repository root.

Run from the repository root:

    python tools/generate-sitemap.py
"""

from __future__ import annotations

import argparse
import datetime
import pathlib
import subprocess
import sys
import xml.etree.ElementTree as ET

BASE_URL = "https://www.bilalarikan.com"

# Directories that exist only to serve assets or machine-readable feeds.
EXCLUDED_DIRS = {".git", "tools", "wp-content", "wp-includes", "feed", "comments"}

# Files that should never show up in search results.
EXCLUDED_FILES = {"404.html"}


def is_excluded(path: pathlib.Path) -> bool:
    if path.name in EXCLUDED_FILES:
        return True
    return any(part in EXCLUDED_DIRS for part in path.parts)


def last_modified(root: pathlib.Path, rel: pathlib.Path) -> str:
    """Last content change, from git history.

    The filesystem mtime is the clone date, which would mark every page as
    changed today. Git knows when the page actually changed; fall back to mtime
    only when git cannot answer (shallow clone, export without history).
    """
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", rel.as_posix()],
            cwd=root,
            capture_output=True,
            text=True,
            check=True,
        )
        stamp = result.stdout.strip()
        if stamp:
            return stamp
    except (OSError, subprocess.CalledProcessError):
        pass

    mtime = datetime.datetime.fromtimestamp(
        (root / rel).stat().st_mtime, datetime.timezone.utc
    )
    return mtime.strftime("%Y-%m-%d")


def to_url(path: pathlib.Path) -> str:
    """Map a file path to its canonical served URL."""
    parts = list(path.parts)
    if parts[-1] == "index.html":
        parts.pop()
    if not parts:
        return f"{BASE_URL}/"
    return f"{BASE_URL}/{'/'.join(parts)}/"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="repository root (default: cwd)")
    parser.add_argument("--out", default="sitemap.xml", help="output file")
    args = parser.parse_args()

    root = pathlib.Path(args.root)
    entries: list[tuple[str, str]] = []

    for path in sorted(root.rglob("*.html")):
        rel = path.relative_to(root)
        if is_excluded(rel):
            continue
        entries.append((to_url(rel), last_modified(root, rel)))

    # Sort so the home page leads and the rest stay stable across runs.
    entries.sort(key=lambda item: (item[0].count("/"), item[0]))

    ns = "http://www.sitemaps.org/schemas/sitemap/0.9"
    ET.register_namespace("", ns)
    urlset = ET.Element(f"{{{ns}}}urlset")
    for loc, lastmod in entries:
        url = ET.SubElement(urlset, f"{{{ns}}}url")
        ET.SubElement(url, f"{{{ns}}}loc").text = loc
        ET.SubElement(url, f"{{{ns}}}lastmod").text = lastmod

    ET.indent(urlset, space="\t")
    tree = ET.ElementTree(urlset)
    out = root / args.out
    tree.write(out, encoding="utf-8", xml_declaration=True)
    out.write_text(out.read_text(encoding="utf-8") + "\n", encoding="utf-8")

    print(f"wrote {out} with {len(entries)} URL(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
