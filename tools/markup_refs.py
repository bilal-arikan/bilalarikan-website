#!/usr/bin/env python3
"""Find and resolve the file references inside the site's markup.

Both the link checker and the image converter need the same answer to the same
question: "which file on disk does this reference point at?" They used to
answer it differently — the checker parsed whole attributes, the converter
guessed by scanning backwards from a filename — and the guessing version could
mistake a filename in prose for a path.

This module is the single answer. It reports the exact span of every reference
so a caller can rewrite it in place, not just read it.
"""

from __future__ import annotations

import pathlib
import re
import urllib.parse
from typing import Iterator, NamedTuple

# href/src on any tag, plus the url(...) form used inside inline styles.
# `content` is deliberately left out: on <meta> it holds prose, not paths.
REFERENCE = re.compile(
    r"""(?P<attr>srcset|href|src|data-src|poster)\s*=\s*"""
    r"""(?P<quote>["'])(?P<value>[^"']*)(?P=quote)"""
    r"""|url\((?P<quote2>["']?)(?P<value2>[^)"']+)(?P=quote2)\)""",
    re.IGNORECASE,
)

# On <meta>, `content` usually holds prose ("width=device-width"), so it is not
# in REFERENCE. On the image metas it holds a real path, and nothing else would
# ever check those.
IMAGE_META = re.compile(
    r"""<meta\b(?=[^>]*(?:og:image|twitter:image|msapplication-TileImage))"""
    r"""[^>]*?content\s*=\s*(?P<quote>["'])(?P<value>[^"']+)(?P=quote)""",
    re.IGNORECASE,
)

SKIPPED_SCHEMES = (
    "http://",
    "https://",
    "//",
    "mailto:",
    "tel:",
    "data:",
    "javascript:",
)

# Directories that hold no served markup.
SKIP_DIRS = {".git", "tools"}


class Reference(NamedTuple):
    """One URL found in markup, with the span it occupies in the source text."""

    start: int
    end: int
    raw: str


def iter_references(text: str) -> Iterator[Reference]:
    """Yield every URL in `text`, including each entry of a srcset."""
    for match in REFERENCE.finditer(text):
        if match.group("value2") is not None:
            value, offset = match.group("value2"), match.start("value2")
            yield Reference(offset, offset + len(value), value)
            continue

        value, offset = match.group("value"), match.start("value")
        if not value:
            continue

        if match.group("attr").lower() != "srcset":
            stripped = value.strip()
            lead = len(value) - len(value.lstrip())
            if stripped:
                yield Reference(offset + lead, offset + lead + len(stripped), stripped)
            continue

        # srcset holds a comma-separated list of "<url> <descriptor>" pairs.
        cursor = 0
        for part in value.split(","):
            url = part.strip().split(" ")[0] if part.strip() else ""
            if url:
                at = value.index(url, cursor)
                yield Reference(offset + at, offset + at + len(url), url)
            cursor += len(part) + 1

    for match in IMAGE_META.finditer(text):
        value, offset = match.group("value"), match.start("value")
        yield Reference(offset, offset + len(value), value)


def resolve(page: pathlib.Path, root: pathlib.Path, raw: str) -> pathlib.Path | None:
    """The file a reference points at, or None when it is not a local file.

    Remote URLs resolve to None: old posts still embed images from the previous
    WordPress server, and those are not ours to check or convert.
    """
    if not raw or raw.startswith("#") or raw.lower().startswith(SKIPPED_SCHEMES):
        return None

    target = urllib.parse.unquote(raw.split("#", 1)[0].split("?", 1)[0])
    if not target:
        return None

    base = root if target.startswith("/") else page.parent
    try:
        return (base / target.lstrip("/")).resolve()
    except OSError:
        return None


def iter_pages(root: pathlib.Path, suffixes: set[str]) -> Iterator[pathlib.Path]:
    """Every served file under `root` with one of `suffixes`, in stable order."""
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in suffixes:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        yield path


def read(path: pathlib.Path) -> str:
    """Read markup, tolerating the mixed encodings left by the WordPress export."""
    return path.read_text(encoding="utf-8", errors="surrogateescape")


def write(path: pathlib.Path, text: str) -> None:
    return path.write_text(text, encoding="utf-8", errors="surrogateescape")


def apply_edits(text: str, edits: list[tuple[int, int, str]]) -> str:
    """Replace spans in `text`, back to front so earlier offsets stay valid."""
    for start, end, replacement in sorted(edits, reverse=True):
        text = text[:start] + replacement + text[end:]
    return text
