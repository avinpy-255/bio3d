import sys, json, os
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glbkit import *

OUT = sys.argv[1] if len(sys.argv) > 1 else "animal-cell.glb"
rng = np.random.RandomState(42)
NUC = np.array([-0.08, 0.04, 0.0])


def grid_surface(fn, nu, nv):
    u = np.linspace(0, 1, nu)
    v = np.linspace(0, 1, nv)
    U, V = np.meshgrid(u, v, indexing="ij")
    P = fn(U, V).reshape(-1, 3)
    f = []
    for i in range(nu - 1):
        for j in range(nv - 1):
            a, b, c, d = i * nv + j, i * nv + j + 1, (i + 1) * nv + j + 1, (i + 1) * nv + j
            f += [[a, b, c], [a, c, d]]
    return Mesh(P, np.array(f))


def sphere_mesh(c, r, res=(10, 14), amp=0.0, seed=0):
    return blob(c, (r, r, r), None, res, amp=amp, seed=seed)[0]


parts = []

# --- plasma membrane (translucent shell) ---
mem, _ = blob((0, 0, 0), (1.0, 0.94, 0.96), None, (32, 48), amp=0.02, seed=1)
parts.append(("part_membrane", mem.tint((1, 1, 1), 0.04, 1),
              dict(color=[0.98, 0.72, 0.62, 0.20], rough=0.25, double=True)))

# --- nucleus: envelope (translucent), chromatin, nucleolus ---
env, _ = blob(NUC, (0.34, 0.33, 0.34), None, (26, 40), amp=0.012, seed=2, freqs=(4, 9, 16))
env.tint((1, 1, 1), 0.35, 5)  # darker/lighter spots read as nuclear pores
parts.append(("part_nuclear_envelope", env, dict(color=[0.60, 0.52, 0.90, 0.38], rough=0.3, double=True)))
chrom, _ = blob(NUC, (0.285, 0.28, 0.285), None, (24, 36), amp=0.06, seed=3, freqs=(3, 7, 14))
parts.append(("part_nucleus", chrom.tint((1, 1, 1), 0.25, 6),
              dict(color=[0.52, 0.34, 0.82, 0.55], rough=0.6, double=True)))
nl = sphere_mesh(NUC + np.array([0.06, 0.04, 0.09]), 0.09, (14, 20), amp=0.12, seed=4)
parts.append(("part_nucleolus", nl.tint((1, 1, 1), 0.2, 7), dict(color=[0.22, 0.10, 0.42, 1], rough=0.7)))

# --- rough ER: folded sheets wrapped around the nucleus, studded with ribosomes ---
er_sheets, rib_pts = [], []
for k in range(3):
    r0 = 0.40 + 0.055 * k

    def sheet(U, V, k=k, r0=r0):
        th = np.pi * (0.30 + 0.42 * U)
        ph = np.pi * (0.30 + 0.95 * V)
        r = r0 + 0.030 * np.sin(7 * th + k) * np.sin(9 * ph + 2 * k) + 0.014 * np.sin(21 * ph + 3 * th)
        return np.stack([NUC[0] + r * np.sin(th) * np.cos(ph), NUC[1] + r * np.cos(th),
                         NUC[2] + r * np.sin(th) * np.sin(ph)], -1)

    m = grid_surface(sheet, 18, 40)
    er_sheets.append(m)
    pts = m.v.reshape(18, 40, 3)[1:-1:2, 1:-1:3].reshape(-1, 3)
    rib_pts.append(pts[rng.rand(len(pts)) < 0.8])
er = merge(er_sheets).tint((1, 1, 1), 0.12, 8)
parts.append(("part_er_rough", er, dict(color=[0.34, 0.66, 0.78, 1], rough=0.55, double=True)))

# --- ribosomes: on the rough ER + free in cytoplasm ---
free = []
while len(free) < 70:
    p = rng.randn(3)
    p = p / np.linalg.norm(p) * rng.uniform(0.45, 0.85)
    if np.linalg.norm(p - NUC) > 0.7:
        free.append(p)
rpts = np.vstack(rib_pts + [np.array(free)])
rs, rf = unit_sphere(3, 5)
ribs = []
for p in rpts:
    ribs.append(Mesh(rs * rng.uniform(0.024, 0.032) + p, rf))
parts.append(("part_ribosomes", merge(ribs).tint((1, 1, 1), 0.2, 9),
              dict(color=[0.22, 0.22, 0.58, 1], rough=0.5)))

# --- smooth ER: branching tubules growing out from the rough ER ---
tubs = []
for i in range(14):
    d = rng.randn(3); d /= np.linalg.norm(d)
    p = NUC + d * 0.52
    pts = [p]
    vel = d * 0.06
    for _ in range(7):
        vel = vel * 0.92 + rng.randn(3) * 0.018
        p = p + vel
        if np.linalg.norm(p) > 0.8:
            vel = -vel * 0.5
            p = p * 0.8 / np.linalg.norm(p)
        pts.append(p.copy())
    tubs.append(tube(pts, [0.024, 0.02, 0.017], seg=6, n=18, wobble=0.1, seed=i))
parts.append(("part_er_smooth", merge(tubs).tint((1, 1, 1), 0.1, 10),
              dict(color=[0.50, 0.82, 0.58, 1], rough=0.5)))

# --- Golgi apparatus: stacked, curved cisternae + vesicles ---
GC = np.array([0.42, -0.22, 0.22])
gR = rot_xyz(rx=12, rz=-25)
gol = []
for i in range(5):
    a = 0.26 - 0.022 * i
    m, _ = blob((0, 0, 0), (a, 0.022, a * 0.72), None, (14, 26), amp=0.12, seed=20 + i, freqs=(5, 9, 14))
    m.v[:, 1] += -0.9 * (m.v[:, 0] ** 2) + (i - 2) * 0.062
    gol.append(transform(m, gR, 1.0, GC))
for i in range(9):
    side = rng.choice([-1, 1])
    loc = np.array([side * rng.uniform(0.3, 0.4), rng.uniform(-0.16, 0.16), rng.uniform(-0.15, 0.15)])
    gol.append(sphere_mesh(GC + gR @ loc, rng.uniform(0.022, 0.034), (8, 12)))
parts.append(("part_golgi", merge(gol).tint((1, 1, 1), 0.1, 11), dict(color=[0.96, 0.80, 0.24, 1], rough=0.45, double=True)))


# --- mitochondria: ribbed outer membrane with a cut-away window onto the cristae ---
def mitochondrion(seed):
    outer, _ = blob((0, 0, 0), (0.20, 0.085, 0.08), None, (20, 28), amp=0.03, seed=seed)
    cen = outer.v[outer.f].mean(1)
    keep = ~((cen[:, 2] > 0.008) & (np.abs(cen[:, 0]) < 0.15))  # window
    outer = Mesh(outer.v, outer.f[keep])
    outer.tint((1.0, 0.62, 0.22), 0.08, seed)
    inner = []
    for i, x in enumerate(np.linspace(-0.14, 0.14, 8)):
        side = 1 if i % 2 == 0 else -1
        pl, _ = blob((x, 0.0, 0), (0.011, 0.055, 0.048), None, (10, 14), amp=0.18, seed=seed + i, freqs=(3, 6, 10))
        pl.v[:, 1] += side * 0.018
        inner.append(pl.tint((0.78, 0.26, 0.16), 0.15, seed + i))
    return merge([outer, merge(inner)])


mito_pos = [((0.58, 0.34, -0.22), (10, 30, 20)), ((-0.56, -0.52, 0.22), (-15, 100, 40)),
            ((0.12, -0.66, -0.40), (0, 0, -30)), ((-0.62, 0.46, -0.32), (25, 60, 10)),
            ((0.50, -0.50, -0.38), (0, 160, 55))]
for i, (c, ang) in enumerate(mito_pos):
    m = mitochondrion(30 + i)
    # window should face outward-ish toward the camera: keep as modelled, rotate whole organelle
    m = transform(m, rot_xyz(*ang), 1.0, c)
    parts.append((f"part_mitochondria_{i + 1}", m, dict(color=[1, 1, 1, 1], rough=0.45, double=True)))

# --- lysosomes ---
lys_pos = [(0.18, 0.62, 0.38), (-0.30, -0.62, 0.4), (0.68, -0.05, 0.35), (-0.72, 0.1, 0.42)]
for i, c in enumerate(lys_pos):
    m = sphere_mesh(c, 0.055, (14, 20), amp=0.05, seed=50 + i)
    parts.append((f"part_lysosome_{i + 1}", m.tint((1, 1, 1), 0.3, 50 + i),
                  dict(color=[0.52, 0.82, 0.30, 1], rough=0.35)))

# --- centrioles: pair of 9-triplet barrels at right angles ---
cen = []
CC = np.array([0.30, 0.58, 0.20])
for k, R in enumerate((np.eye(3), rot("z", 90))):
    for j in range(9):
        a = 2 * np.pi * j / 9
        pts = [(-0.05, 0.028 * np.cos(a), 0.028 * np.sin(a)), (0.05, 0.028 * np.cos(a), 0.028 * np.sin(a))]
        t = tube(pts, 0.0075, seg=6, n=4)
        cen.append(transform(t, R @ rot_xyz(ry=0) , 1.0, (0, 0, 0)))
c1 = merge(cen[:9]); c2 = merge(cen[9:])
c2 = transform(c2, rot("y", 90), 1.0, (0, -0.0, 0))
c2 = transform(c2, None, 1.0, (0.0, 0.0, 0.0))
c2 = transform(c2, None, 1.0, (0.0, -0.0, 0.0))
c1 = transform(c1, None, 1.0, CC)
c2 = transform(c2, None, 1.0, CC + np.array([0.0, -0.08, 0.0]))
parts.append(("part_centrioles", merge([c1, c2]).tint((1, 1, 1), 0.1, 60),
              dict(color=[0.92, 0.38, 0.60, 1], rough=0.45)))

final = [(n, m, dict(mt)) for n, m, mt in parts]
for n, m, mt in final:
    if "color" not in mt:
        mt["color"] = [1, 1, 1, 1]
fit_unit_sphere(final, 1.0)
info = write_glb(OUT, final)
anchors = {n: np.round((m.v.min(0) + m.v.max(0)) / 2, 3).tolist() for n, m, _ in final}
print(json.dumps({"file": OUT, **info, "anchors": anchors}, indent=1))
