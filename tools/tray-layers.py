#!/usr/bin/env python3
"""Builds the Tray Builder fill layers: public/photos/tray/base.jpg + transparent layers (protein-1, protein-2, veg, starch).
Composite from crops of the real tray photo (public/photos/real-trays-1920.jpg) perspective-warped into the empty tray's
compartments. There are NO per-item photos yet, so the fill is a generic stand-in per category (real photos needed).
usage: python3 tools/tray-layers.py [empty-tray.png]   (default: design/art/plates/empty-tray-charcoal.png)"""
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
root = os.path.join(os.path.dirname(__file__), '..')
tray = Image.open(sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'design/art/plates/empty-tray-charcoal.png')).convert('RGB')
src = Image.open(os.path.join(root, 'public/photos/real-trays-1920.jpg')).convert('RGB')
CROP = (560, 340, 1800, 1040)  # 1240x700 view of the tray
k = src.width / 819
def crop(x0, y0, x1, y1): return src.crop((int(x0*k), int(y0*k), int(x1*k), int(y1*k)))
def persp(q, W, H):
    s = [(0, 0), (W, 0), (W, H), (0, H)]; A = []; B = []
    for (x, y), (u, v) in zip(q, s):
        A.append([x, y, 1, 0, 0, 0, -u*x, -u*y]); B.append(u)
        A.append([0, 0, 0, x, y, 1, -v*x, -v*y]); B.append(v)
    return tuple(np.linalg.solve(np.array(A, float), np.array(B, float)))
def lerp(a, b, t): return (a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t)
def layer(tile, q, inset=0.04, feather=9, rad=0.18):
    """returns an RGBA layer (full tray size) holding the warped tile with a feathered rounded mask"""
    W, H = tile.size
    p = persp(q, W, H)
    warped = tile.transform(tray.size, Image.PERSPECTIVE, p, Image.BICUBIC)
    ix, iy = W*inset, H*inset
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).rounded_rectangle((ix, iy, W-ix, H-iy), radius=int(min(W, H)*rad), fill=255)
    mw = m.transform(tray.size, Image.PERSPECTIVE, p, Image.BICUBIC).filter(ImageFilter.GaussianBlur(feather))
    m2 = Image.new('L', (W, H), 0); ImageDraw.Draw(m2).rounded_rectangle((ix+W*.04, iy+H*.04, W-ix-W*.04, H-iy-H*.04), radius=int(min(W, H)*rad), fill=255)
    m2 = m2.transform(tray.size, Image.PERSPECTIVE, p, Image.BICUBIC).filter(ImageFilter.GaussianBlur(feather*2.2))
    w = np.array(warped, float) * (0.62 + 0.38*np.array(m2, float)[..., None]/255)
    w[..., 0] *= 1.03; w[..., 2] *= 0.90
    out = Image.fromarray(np.clip(w, 0, 255).astype('uint8')).convert('RGBA')
    out.putalpha(mw)
    return out
def D(dx, dy): return (640 + dx/.931, 340 + dy/.931)   # displayed grid coords of the 1100x700 reference crop -> tray px
LEFT = [(722, 563), (926, 534), (1096, 848), (852, 880)]
MID = [D(295, 155), D(480, 105), D(700, 385), D(462, 462)]
RIGHT = [D(520, 95), D(720, 75), D(915, 330), D(705, 380)]
def sub(q, t0, t1):
    TL, TR, BR, BL = q
    return [lerp(TL, BL, t0), lerp(TR, BR, t0), lerp(TR, BR, t1), lerp(TL, BL, t1)]
meat = crop(42, 282, 150, 372).resize((540, 450), Image.LANCZOS)      # turkey meatballs
chick = crop(322, 303, 404, 362).resize((540, 390), Image.LANCZOS)    # chicken in sauce
veg = crop(262, 208, 410, 290).resize((600, 400), Image.LANCZOS)      # broccoli
starch = crop(150, 245, 275, 385).resize((450, 560), Image.LANCZOS)   # sweet potato
layers = {
    'protein-1': layer(meat, sub(LEFT, 0.02, 0.98)),
    'protein-2': Image.alpha_composite(layer(meat, sub(LEFT, 0.02, 0.50)), layer(chick, sub(LEFT, 0.53, 0.98))),
    'veg': layer(veg, sub(MID, 0.03, 0.97)),
    'starch': layer(starch, sub(RIGHT, 0.03, 0.97)),
}
outdir = os.path.join(root, 'public/photos/tray'); os.makedirs(outdir, exist_ok=True)
tray.crop(CROP).save(os.path.join(outdir, 'base.jpg'), quality=82, optimize=True, progressive=True)
tray.crop(CROP).save(os.path.join(outdir, 'base.webp'), quality=80)
for n, im in layers.items():
    im.crop(CROP).save(os.path.join(outdir, n + '.webp'), quality=82, method=6)
print(sorted(os.listdir(outdir)))
