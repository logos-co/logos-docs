#!/usr/bin/env python3
"""Build the doc banner images in static/img/banners/ from their sources.

Reads plugins/doc-banners/banners.js (through Node), downloads each banner's
photographer original when one is recorded, otherwise the logos.co image,
crops it to 2:1 around its focal point and writes a WebP no wider than
MAX_WIDTH. Re-run after changing banners.js:

    python3 scripts/doc-banners/build.py

Needs Pillow with WebP support.
"""

import io
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'static' / 'img' / 'banners'
ASPECT = 2.0  # width / height of the stored crop; CSS trims it further
MAX_WIDTH = 2400
QUALITY = 80
UA = 'Mozilla/5.0 (X11; Linux x86_64) logos-docs banner build'


def load_banners():
    js = "console.log(JSON.stringify(require('./plugins/doc-banners/banners.js').banners))"
    return json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return Image.open(io.BytesIO(r.read())).convert('RGB')


def crop(im, focus):
    w, h = im.size
    if w / h > ASPECT:  # too wide: trim the sides, keep the centre
        cw = round(h * ASPECT)
        x = (w - cw) // 2
        return im.crop((x, 0, x + cw, h))
    ch = round(w / ASPECT)
    y = round((h - ch) * focus)
    return im.crop((0, y, w, y + ch))


def main(only):
    OUT.mkdir(parents=True, exist_ok=True)
    for bid, b in load_banners().items():
        if only and bid not in only:
            continue
        src = (b.get('original') or b['logos'])['image']
        im = crop(fetch(src), b['focus'])
        if im.width > MAX_WIDTH:
            im = im.resize((MAX_WIDTH, round(MAX_WIDTH / ASPECT)), Image.LANCZOS)
        dest = OUT / f'{bid}.webp'
        im.save(dest, 'WEBP', quality=QUALITY, method=6)
        print(f'{bid:18} {im.width}x{im.height} {dest.stat().st_size // 1024}KB  <- {src}')


if __name__ == '__main__':
    main(set(sys.argv[1:]))
