"""Render a .glb (as produced by glbkit) from several angles with a painter's-algorithm shader."""
import sys, json, struct
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection


def load_glb(path):
    b = open(path, "rb").read()
    jl, _ = struct.unpack("<I4s", b[12:20])
    g = json.loads(b[20:20 + jl])
    bin0 = 20 + jl + 8
    data = b[bin0:]
    out = []
    for node in g["nodes"]:
        mesh = g["meshes"][node["mesh"]]["primitives"][0]
        def acc(i):
            a = g["accessors"][i]
            bv = g["bufferViews"][a["bufferView"]]
            ct = {5126: np.float32, 5121: np.uint8, 5123: np.uint16, 5125: np.uint32}[a["componentType"]]
            nc = {"SCALAR": 1, "VEC3": 3, "VEC4": 4}[a["type"]]
            arr = np.frombuffer(data, ct, a["count"] * nc, bv["byteOffset"])
            return arr.reshape(-1, nc) if nc > 1 else arr
        pos = acc(mesh["attributes"]["POSITION"]).astype(float)
        col = acc(mesh["attributes"]["COLOR_0"]).astype(float)[:, :3] / 255
        idx = acc(mesh["indices"]).reshape(-1, 3).astype(int)
        mat = g["materials"][mesh["material"]]["pbrMetallicRoughness"]["baseColorFactor"]
        out.append((node["name"], pos, col, idx, mat))
    return out


def render(path, png, views=((20, 20), (20, 160), (80, 20), (-20, 90)), skip=()):
    parts = load_glb(path)
    fig, axs = plt.subplots(1, len(views), figsize=(5 * len(views), 5.2), dpi=110)
    L = np.array([0.4, 0.7, 0.6]); L /= np.linalg.norm(L)
    for ax, (el, az) in zip(axs, views):
        e, a = np.radians(el), np.radians(az)
        # camera basis: view dir d from camera to origin
        cam = np.array([np.cos(e) * np.sin(a), np.sin(e), np.cos(e) * np.cos(a)])
        right = np.cross([0, 1, 0], cam); right /= np.linalg.norm(right)
        up = np.cross(cam, right)
        polys, cols, depth = [], [], []
        for name, pos, col, idx, mat in parts:
            if any(s in name for s in skip):
                continue
            tri = pos[idx]
            n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
            ln = np.linalg.norm(n, axis=1, keepdims=True); ln[ln == 0] = 1
            n /= ln
            facing = n @ cam
            n = n * np.sign(facing)[:, None]  # two-sided shading
            lam = np.clip(n @ L, 0, 1) * 0.75 + 0.28
            rim = (1 - np.abs(facing)) ** 2 * 0.15
            base = col[idx].mean(1) * np.array(mat[:3])
            c = np.clip(base * lam[:, None] + rim[:, None], 0, 1)
            alpha = mat[3]
            keep = np.ones(len(tri), bool)
            if alpha < 1:
                c = np.c_[c, np.full(len(c), alpha * 0.6)]
            else:
                keep = facing > -0.0  # back-face cull opaque
                c = np.c_[c, np.ones(len(c))]
            proj = np.stack([tri @ right, tri @ up], axis=-1)
            dz = (tri.mean(1) @ cam)
            polys.append(proj[keep]); cols.append(c[keep]); depth.append(dz[keep])
        polys = np.concatenate(polys); cols = np.concatenate(cols); depth = np.concatenate(depth)
        o = np.argsort(depth)
        ax.add_collection(PolyCollection(polys[o], facecolors=cols[o], edgecolors="none", linewidths=0, antialiaseds=False))
        ax.set_xlim(-1.05, 1.05); ax.set_ylim(-1.05, 1.05); ax.set_aspect("equal"); ax.axis("off")
        ax.set_facecolor("#10151c")
    fig.patch.set_facecolor("#10151c")
    plt.tight_layout(pad=0.2)
    plt.savefig(png, facecolor=fig.get_facecolor())


if __name__ == "__main__":
    skip = tuple(sys.argv[3].split(",")) if len(sys.argv) > 3 else ()
    render(sys.argv[1], sys.argv[2], skip=skip)
