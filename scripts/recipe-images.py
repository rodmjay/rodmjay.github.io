#!/usr/bin/env python3
"""Copies recipe photos into the site, self-hosted (Designer's recipes spec, "Photos").

    python3 scripts/recipe-images.py <folder with <slug>.jpg> <slug> [<slug> ...]

For each slug it writes public/recipes/images/<slug>-<w>.webp at 1600 and 800 px wide (never wider than the source)
and <slug>-800.jpg as the fallback. The recipes zone finds them by slug, reads their sizes, and shows a flat title card
when a recipe has none. Needs Pillow. Only dish photos go in: never a cookbook page, a recipe card scan or a person.
"""
import sys
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "public" / "recipes" / "images"
WIDTHS = (1600, 800)


def main(src: str, slugs: list[str]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for slug in slugs:
        with Image.open(Path(src) / f"{slug}.jpg") as im:
            im = im.convert("RGB")
            done = set()
            for w in WIDTHS:
                w = min(w, im.width)
                if w in done:
                    continue
                done.add(w)
                h = round(im.height * w / im.width)
                im.resize((w, h), Image.LANCZOS).save(OUT / f"{slug}-{w}.webp", "WEBP", quality=80, method=6)
            fw = min(800, im.width)
            im.resize((fw, round(im.height * fw / im.width)), Image.LANCZOS).save(OUT / f"{slug}-{fw}.jpg", "JPEG", quality=82, optimize=True, progressive=True)
            print(f"{slug}: {sorted(done)} webp + {fw} jpg")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2:])
