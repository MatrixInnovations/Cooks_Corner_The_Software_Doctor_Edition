#!/usr/bin/env python3
"""Prepare Marsaun's portrait for the web. The output is git-ignored (public/people/): it is a client photo of a person.
usage: python3 tools/prepare-portrait.py <source.png> [--top 0.0]
Crops to 4:5 with the face kept whole (crop is anchored near the top; --top 0..1 moves the window), resizes to 800x1000,
mild tonal match only (a touch of contrast), writes public/people/marsaun-portrait.{jpg,webp}. Then set PORTRAIT.ready = true
in src/config/photos.ts. Never commit the output to a public repo."""
import sys, os
from PIL import Image, ImageEnhance
src = sys.argv[1]
top = float(sys.argv[sys.argv.index('--top') + 1]) if '--top' in sys.argv else 0.12
im = Image.open(src).convert('RGB')
w, h = im.size
tw, th = (w, round(w * 5 / 4)) if w * 5 / 4 <= h else (round(h * 4 / 5), h)
x = (w - tw) // 2
y = round((h - th) * top)
im = im.crop((x, y, x + tw, y + th)).resize((800, 1000), Image.LANCZOS)
im = ImageEnhance.Contrast(im).enhance(1.04)
out = os.path.join(os.path.dirname(__file__), '..', 'public', 'people')
os.makedirs(out, exist_ok=True)
im.save(os.path.join(out, 'marsaun-portrait.jpg'), quality=84, optimize=True, progressive=True)
im.save(os.path.join(out, 'marsaun-portrait.webp'), quality=82, method=6)
print('wrote', out)
