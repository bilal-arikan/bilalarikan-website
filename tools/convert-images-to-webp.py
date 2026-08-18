#!/usr/bin/env python3
"""Convert the JPEG/PNG uploads to WebP and repoint every reference at them.

The uploads directory is by far the largest thing in the repository and it is
all raster output straight from WordPress, saved without any optimisation.
WebP cuts it down substantially at a quality difference that is not visible at
the sizes these images are actually displayed.

Conversion and rewriting happen in one pass on purpose: half of either leaves
the site with broken images.

Safety rules applied here:
  * an image is only replaced when the WebP is actually smaller
  * favicons and touch icons stay PNG (iOS does not accept WebP for those)
  * "photo.jpg" next to "photo.png" would both target "photo.webp" and
    overwrite each other, so such pairs are left untouched
  * a reference is rewritten only when the exact file it resolves to was
    converted, which leaves remote URLs and dangling references alone

Run from the repository root:

    python tools/convert-images-to-webp.py --dry-run
    python tools/convert-images-to-webp.py
"""

from __future__ import annotations

import argparse
import collections
import pathlib
import re
import sys
import urllib.parse

from PIL import Image

# Quality for photographic sources. Chosen high enough that the difference is
# not visible at the widths the theme renders, low enough to be worth doing.
JPEG_QUALITY = 82
PNG_QUALITY = 85

# Below this, a PNG is almost certainly an icon or logo where lossy artefacts
# around sharp edges would show. Keep those lossless.
PNG_LOSSLESS_MAX_BYTES = 100 * 1024

SOURCE_SUFFIXES = {".jpg", ".jpeg", ".png"}

# Referenced by <link rel="icon"> / apple-touch-icon, which must stay PNG.
KEEP_AS_IS = ("cropped-BA-tamam-",)

# Files whose markup may point at an image.
MARKUP_SUFFIXES = {".html", ".xml", ".css", ".js"}

SKIP_DIRS = {".git", "tools"}

# A whole filename, anchored so it cannot match the tail of a longer name.
# Without the lookbehind, a converted "2.png" would also rewrite the "2.png"
# sitting inside "cropped-BA-tamam-4-1-32x32.png", which is kept as PNG.
FILENAME = re.compile(
    r"(?<![A-Za-z0-9_.\-])[A-Za-z0-9_.\-]+\.(?:png|jpe?g)(?![A-Za-z0-9])",
    re.IGNORECASE,
)


def is_source(path: pathlib.Path) -> bool:
    if any(part in SKIP_DIRS for part in path.parts):
        return False
    if path.suffix.lower() not in SOURCE_SUFFIXES:
        return False
    return not any(marker in path.name for marker in KEEP_AS_IS)


def reference_prefix(text: str, start: int) -> str:
    """The path part sitting directly in front of the filename at `start`."""
    head = -1
    for delimiter in ('"', "'", "(", " ", ">", ",", "\t", "\n"):
        head = max(head, text.rfind(delimiter, 0, start))
    return text[head + 1 : start]


def resolve_reference(
    page: pathlib.Path, root: pathlib.Path, prefix: str, name: str
) -> pathlib.Path | None:
    """The file a reference points at, or None if it is not a local file.

    Old posts still embed images from the previous WordPress server; those are
    not ours to convert, so remote URLs resolve to None.
    """
    if prefix.startswith("//") or "://" in prefix:
        return None
    ref = urllib.parse.unquote(prefix + name)
    base = root if ref.startswith("/") else page.parent
    try:
        return (base / ref.lstrip("/")).resolve()
    except OSError:
        return None


def encode(src: pathlib.Path, dst: pathlib.Path) -> None:
    with Image.open(src) as im:
        if src.suffix.lower() == ".png" and src.stat().st_size <= PNG_LOSSLESS_MAX_BYTES:
            im.save(dst, "WEBP", lossless=True, method=6)
            return
        quality = PNG_QUALITY if src.suffix.lower() == ".png" else JPEG_QUALITY
        # Palette images must be promoted before a lossy save.
        if im.mode == "P":
            im = im.convert("RGBA" if "transparency" in im.info else "RGB")
        im.save(dst, "WEBP", quality=quality, method=6)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="report without writing")
    parser.add_argument("--root", default=".", help="repository root (default: cwd)")
    args = parser.parse_args()

    root = pathlib.Path(args.root)
    sources = sorted(p for p in root.rglob("*") if p.is_file() and is_source(p))

    # "photo.jpg" and "photo.png" in one folder would both target "photo.webp"
    # and silently overwrite each other. Leave such pairs alone entirely.
    by_stem: dict[pathlib.Path, list[pathlib.Path]] = collections.defaultdict(list)
    for path in sources:
        by_stem[path.with_suffix("")].append(path)
    colliding = {p for group in by_stem.values() if len(group) > 1 for p in group}

    if colliding:
        sources = [p for p in sources if p not in colliding]

    converted: list[pathlib.Path] = []
    skipped_larger = 0
    failed: list[tuple[pathlib.Path, str]] = []
    before = after = 0

    for src in sources:
        dst = src.with_suffix(".webp")
        # Encoding the whole uploads folder takes minutes, so a WebP that is
        # already newer than its source is reused instead of re-encoded.
        if not (dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime):
            try:
                encode(src, dst)
            except Exception as exc:  # noqa: BLE001 - report and keep the original
                failed.append((src, str(exc)))
                dst.unlink(missing_ok=True)
                continue

        src_size, dst_size = src.stat().st_size, dst.stat().st_size
        if dst_size >= src_size:
            dst.unlink()
            skipped_larger += 1
            continue

        before += src_size
        after += dst_size
        converted.append(src)

    # Rewriting is decided per resolved path, not per filename: a reference is
    # only changed when the exact file it points at is one we converted. That
    # is what keeps same-named files in different folders, references to images
    # that were never in the repository, and remote URLs from being touched.
    replaced = {p.resolve() for p in converted}

    rewrites = 0
    touched = 0
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in MARKUP_SUFFIXES:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        text = path.read_text(encoding="utf-8", errors="surrogateescape")

        def swap(match: re.Match[str]) -> str:
            name = match.group(0)
            prefix = reference_prefix(text, match.start())
            target = resolve_reference(path, root, prefix, name)
            if target is None or target not in replaced:
                return name
            return pathlib.PurePath(name).with_suffix(".webp").name

        original = text
        text = FILENAME.sub(swap, text)
        if text != original:
            touched += 1
            rewrites += 1
            if not args.dry_run:
                path.write_text(text, encoding="utf-8", errors="surrogateescape")

    if args.dry_run:
        # Nothing should survive a dry run.
        for src in converted:
            src.with_suffix(".webp").unlink(missing_ok=True)
    else:
        for src in converted:
            src.unlink()

    for src, error in failed:
        print(f"FAILED  {src}: {error}")
    if colliding:
        print(f"left {len(colliding)} image(s) alone: same name, different extension")

    verb = "would convert" if args.dry_run else "converted"
    saved = (before - after) / 1048576
    print(
        f"{verb} {len(converted)} image(s): "
        f"{before / 1048576:.1f} MB -> {after / 1048576:.1f} MB "
        f"(saved {saved:.1f} MB, {saved / (before / 1048576) * 100:.0f}%)"
        if before
        else f"{verb} nothing"
    )
    print(f"kept {skipped_larger} image(s) that did not get smaller as WebP")
    print(f"markup updated in {touched} file(s)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
