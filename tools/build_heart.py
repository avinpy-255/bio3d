import sys, json, os
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glbkit import *

OUT = sys.argv[1] if len(sys.argv) > 1 else "human-heart.glb"

# Frame: Y up, +X = viewer's right (patient's LEFT), +Z toward viewer (anterior).
RES = (44, 60)

lv, lv_s = blob((0.28, -0.22, -0.02), (0.58, 1.0, 0.52), rot_xyz(rz=28, rx=-8), RES,
                amp=0.05, seed=3, taper=0.5)
rv, rv_s = blob((-0.28, -0.12, 0.27), (0.5, 0.86, 0.36), rot_xyz(rz=22, rx=-5), RES,
                amp=0.045, seed=5, taper=0.45)
ra, ra_s = blob((-0.66, 0.42, -0.02), (0.4, 0.46, 0.4), rot_xyz(rz=10), (36, 48), amp=0.06, seed=7)
raa, _ = blob((-0.42, 0.72, 0.3), (0.2, 0.17, 0.12), rot_xyz(rz=-40, ry=20), (22, 30), amp=0.1, seed=8)
la, la_s = blob((0.3, 0.62, -0.42), (0.52, 0.3, 0.32), rot_xyz(rz=8), (36, 48), amp=0.05, seed=9)
laa, _ = blob((0.66, 0.6, 0.12), (0.2, 0.15, 0.12), rot_xyz(rz=40, ry=-20), (22, 30), amp=0.1, seed=10)

C = {  # base colours (material colour; vertex colour adds mottling)
    "muscle": (0.80, 0.17, 0.19), "atrium": (0.88, 0.36, 0.34),
    "artery": (0.86, 0.22, 0.20), "vein_blue": (0.30, 0.38, 0.78),
    "pa": (0.36, 0.46, 0.84), "pv": (0.88, 0.30, 0.28), "coro": (0.92, 0.55, 0.15),
}

parts = []
parts.append(("part_left-ventricle", lv.tint(C["muscle"], 0.10, 1), dict(rough=0.38)))
parts.append(("part_right-ventricle", rv.tint(C["muscle"], 0.10, 2), dict(rough=0.38)))
parts.append(("part_right-atrium", merge([ra.tint(C["atrium"], 0.1, 3), raa.tint(C["atrium"], 0.1, 3)]), dict(rough=0.42)))
parts.append(("part_left-atrium", merge([la.tint(C["atrium"], 0.1, 4), laa.tint(C["atrium"], 0.1, 4)]), dict(rough=0.42)))

# aorta: root -> arch -> descending, with the three arch branches
aorta = [
    tube([(0.1, 0.55, 0.02), (0.08, 0.85, 0.02), (0.1, 1.18, -0.02), (0.28, 1.45, -0.12),
          (0.55, 1.4, -0.28), (0.68, 1.1, -0.42), (0.7, 0.6, -0.5), (0.7, 0.1, -0.52)],
         [0.26, 0.19, 0.18, 0.18, 0.18, 0.17, 0.16, 0.16], seg=18, n=90),
    tube([(0.13, 1.42, -0.08), (0.0, 1.62, -0.06), (-0.1, 1.8, -0.05)], [0.095, 0.085, 0.08], seg=12, n=24),
    tube([(0.3, 1.46, -0.12), (0.28, 1.68, -0.1), (0.28, 1.84, -0.1)], [0.075, 0.07, 0.065], seg=12, n=24),
    tube([(0.46, 1.44, -0.2), (0.58, 1.62, -0.14), (0.72, 1.78, -0.1)], [0.08, 0.075, 0.07], seg=12, n=24),
]
parts.append(("part_aorta", merge(aorta).tint(C["artery"], 0.07, 11), dict(rough=0.35)))

# pulmonary trunk -> left & right pulmonary arteries
pa = [
    tube([(-0.12, 0.45, 0.34), (-0.04, 0.8, 0.34), (0.06, 1.05, 0.2), (0.14, 1.15, 0.0)],
         [0.19, 0.17, 0.16, 0.15], seg=16, n=40),
    tube([(0.14, 1.15, 0.0), (0.4, 1.12, -0.16), (0.65, 1.04, -0.28), (0.82, 0.98, -0.34)],
         [0.13, 0.115, 0.1, 0.09], seg=12, n=36),
    tube([(0.14, 1.15, 0.0), (-0.1, 1.12, -0.25), (-0.3, 1.04, -0.4), (-0.5, 0.98, -0.45)],
         [0.13, 0.115, 0.1, 0.09], seg=12, n=36),
]
parts.append(("part_pulmonary-artery", merge(pa).tint(C["pa"], 0.07, 12), dict(rough=0.35)))

parts.append(("part_superior-vena-cava",
              tube([(-0.7, 1.6, -0.08), (-0.69, 1.25, -0.06), (-0.67, 0.85, -0.04)], [0.15, 0.15, 0.16],
                   seg=16, n=40).tint(C["vein_blue"], 0.07, 13), dict(rough=0.38)))
parts.append(("part_inferior-vena-cava",
              tube([(-0.62, -0.55, -0.18), (-0.62, -0.2, -0.14), (-0.62, 0.12, -0.08)], [0.17, 0.17, 0.18],
                   seg=16, n=36).tint(C["vein_blue"], 0.07, 14), dict(rough=0.38)))

pv = [
    tube([(-0.2, 0.88, -0.7), (-0.08, 0.76, -0.6), (0.02, 0.68, -0.5)], 0.07, seg=12, n=24),
    tube([(-0.22, 0.52, -0.74), (-0.08, 0.52, -0.62), (0.02, 0.56, -0.5)], 0.07, seg=12, n=24),
    tube([(0.95, 0.9, -0.58), (0.84, 0.76, -0.48), (0.7, 0.68, -0.42)], 0.07, seg=12, n=24),
    tube([(0.95, 0.5, -0.64), (0.84, 0.52, -0.5), (0.7, 0.56, -0.42)], 0.07, seg=12, n=24),
]
parts.append(("part_pulmonary-veins", merge(pv).tint(C["pv"], 0.07, 15), dict(rough=0.4)))

# coronary arteries run on the real ventricle surfaces (so they never float or sink)
ys = np.linspace(0.6, -0.9, 16)
lad = lv_s(np.array([(-0.4, y, 0.85) for y in ys]), push=0.02)
circ = lv_s(np.array([(x, 0.6, z) for x, z in zip(np.linspace(0.1, 0.95, 10), np.linspace(0.8, -0.5, 10))]), push=0.02)
rca = rv_s(np.array([(x, 0.55, z) for x, z in zip(np.linspace(-0.2, -0.95, 10), np.linspace(0.9, -0.1, 10))]), push=0.02)
rca2 = ra_s(np.array([(-0.2, y, z) for y, z in zip(np.linspace(-0.4, -0.9, 6), np.linspace(0.95, 0.1, 6))]), push=0.02)
cor = [tube(lad, [0.035, 0.03, 0.025, 0.02, 0.012], seg=8, n=50),
       tube(circ, [0.032, 0.026, 0.02], seg=8, n=30),
       tube(rca, [0.032, 0.028, 0.022], seg=8, n=30)]
parts.append(("part_coronary-arteries", merge(cor).tint(C["coro"], 0.05, 16), dict(rough=0.35)))

# materials
mats = {"part_coronary-arteries": dict(rough=0.35)}
final = []
for name, m, mt in parts:
    mt = dict(mt)
    final.append((name, m, mt))

fit_unit_sphere(final, 1.0)
for name, m, mt in final:
    # base colour white so the vertex colours carry the look
    mt["color"] = [1, 1, 1, 1]
info = write_glb(OUT, final)
anchors = {}
for name, m, _ in final:
    lo, hi = m.v.min(0), m.v.max(0)
    anchors[name] = np.round((lo + hi) / 2, 3).tolist()
print(json.dumps({"file": OUT, **info, "anchors": anchors}, indent=1))
