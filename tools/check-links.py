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
import re
import sys
import urllib.parse

# href/src on any tag, plus the url(...) form used inside inline styles.
# `content` is deliberately left out: on <meta> it holds prose, not paths.
REFERENCE = re.compile(
    r"""(?:(srcset)|href|src|data-src|poster)\s*=\s*["']([^"']+)["']|url\((["']?)([^)"']+)\3\)""",
    re.IGNORECASE,
)

SKIPPED_SCHEMES = ("http://", "https://", "//", "mailto:", "tel:", "data:", "javascript:")


def targets(text: str):
    for match in REFERENCE.finditer(text):
        value = match.group(2) or match.group(4)
        if not value:
            continue
        if match.group(1):
            # srcset holds a comma-separated list of "<url> <descriptor>" pairs.
            for candidate in value.split(","):
                url = candidate.strip().split()[0] if candidate.strip() else ""
                if url:
                    yield url
        else:
            yield value.strip()


def resolve(page: pathlib.Path, root: pathlib.Path, raw: str) -> pathlib.Path | None:
    """Return the file a reference points to, or None when it is not local."""
    if not raw or raw.startswith("#") or raw.lower().startswith(SKIPPED_SCHEMES):
        return None

    target = urllib.parse.unquote(raw.split("#", 1)[0].split("?", 1)[0])
    if not target:
        return None

    base = root if target.startswith("/") else page.parent
    return (base / target.lstrip("/")).resolve()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="repository root (default: cwd)")
    args = parser.parse_args()

    root = pathlib.Path(args.root).resolve()
    broken: dict[str, list[str]] = collections.defaultdict(list)
    checked = 0

    for page in sorted(root.rglob("*.html")):
        if ".git" in page.parts:
            continue
        text = page.read_text(encoding="utf-8", errors="surrogateescape")
        for raw in targets(text):
            resolved = resolve(page, root, raw)
            if resolved is None:
                continue
            checked += 1
            if resolved.is_file() or (resolved / "index.html").is_file():
                continue
            broken[raw].append(str(page.relative_to(root)).replace("\\", "/"))

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
