#!/usr/bin/env python3
"""Prepare the Meet the Chef portrait.

Chef.tsx loads:
  public/people/marsaun-portrait-d.{jpg,webp}   2:3 desktop
  public/people/marsaun-portrait-m.{jpg,webp}   4:5 mobile

Those four files are committed (see the gitignore exception) because
PORTRAIT.ready is true and a publish from this repo must be able to serve them.

usage:
  python3 tools/prepare-portrait.py <source.png> [--d x,y,w,h] [--m x,y,w,h] [--top 0.3]

Without --d/--m, each frame is a centered cover-crop. --top (0..1) slides that
window vertically when the source is taller than the frame. --d and --m are
explicit pixel boxes (left, top, width, height) and must already match 2:3 and 4:5.

The committed crops came from the chef-coat portrait (1145x1373):
  --d 490,40,654,981 --m 24,1,1096,1370
"""
import os
import sys
from PIL import Image


def box_arg(flag):
    if flag not in sys.argv:
        return None
    parts = sys.argv[sys.argv.index(flag) + 1].split(',')
    if len(parts) != 4:
        raise SystemExit(f'{flag} needs x,y,w,h')
    return tuple(int(p) for p in parts)


def cover(im, tw, th, top):
    """Largest exact tw:th crop that fits. --top slides it when height is left over."""
    w, h = im.size
    ch = (min(h, (w * th) // tw) // th) * th
    cw = ch * tw // th
    if cw < 2 or ch < 2:
        raise SystemExit(f'source {im.size} is too small for a {tw}:{th} crop')
    x = (w - cw) // 2
    y = round((h - ch) * top)
    y = max(0, min(h - ch, y))
    return im.crop((x, y, x + cw, y + ch))


def save_pair(im, path_base):
    im.save(path_base + '.jpg', quality=86, optimize=True, progressive=True)
    im.save(path_base + '.webp', quality=84, method=6)


def main():
    if len(sys.argv) < 2 or sys.argv[1].startswith('-'):
        raise SystemExit(__doc__.strip())
    top = float(sys.argv[sys.argv.index('--top') + 1]) if '--top' in sys.argv else 0.3
    src = Image.open(sys.argv[1]).convert('RGB')
    out = os.path.join(os.path.dirname(__file__), '..', 'public', 'people')
    os.makedirs(out, exist_ok=True)

    d = box_arg('--d')
    m = box_arg('--m')
    desktop = src.crop((d[0], d[1], d[0] + d[2], d[1] + d[3])) if d else cover(src, 2, 3, top)
    mobile = src.crop((m[0], m[1], m[0] + m[2], m[1] + m[3])) if m else cover(src, 4, 5, top)
    if desktop.size[0] * 3 != desktop.size[1] * 2:
        raise SystemExit(f'desktop crop {desktop.size} is not 2:3')
    if mobile.size[0] * 5 != mobile.size[1] * 4:
        raise SystemExit(f'mobile crop {mobile.size} is not 4:5')

    save_pair(desktop, os.path.join(out, 'marsaun-portrait-d'))
    save_pair(mobile, os.path.join(out, 'marsaun-portrait-m'))
    print(f'wrote {out} desktop {desktop.size} mobile {mobile.size}')


if __name__ == '__main__':
    main()
