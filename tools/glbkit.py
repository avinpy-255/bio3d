"""Tiny numpy toolkit: build meshes, write .glb with named part_* nodes."""
import json
import struct
import numpy as np
try:
    from scipy.interpolate import CubicSpline
except ImportError:
    class CubicSpline:
        """Pure-NumPy natural cubic spline fallback when scipy is absent."""
        def __init__(self, x, y, bc_type="natural"):
            x = np.asarray(x, dtype=np.float64)
            y = np.asarray(y, dtype=np.float64)
            n = len(x)
            h = np.diff(x)
            A = np.zeros((n, n), dtype=np.float64)
            B = np.zeros((n, y.shape[1]), dtype=np.float64)
            A[0, 0] = 1.0
            A[-1, -1] = 1.0
            for i in range(1, n - 1):
                A[i, i - 1] = h[i - 1]
                A[i, i] = 2.0 * (h[i - 1] + h[i])
                A[i, i + 1] = h[i]
                B[i] = 3.0 * ((y[i + 1] - y[i]) / h[i] - (y[i] - y[i - 1]) / h[i - 1])
            c = np.linalg.solve(A, B)
            self.x = x
            self.a = y[:-1]
            self.c = c[:-1]
            self.b = (y[1:] - y[:-1]) / h[:, None] - h[:, None] * (2.0 * c[:-1] + c[1:]) / 3.0
            self.d = (c[1:] - c[:-1]) / (3.0 * h[:, None])

        def __call__(self, t):
            t = np.atleast_1d(np.asarray(t, dtype=np.float64))
            idx = np.clip(np.searchsorted(self.x, t, side="right") - 1, 0, len(self.a) - 1)
            dx = (t - self.x[idx])[:, None]
            return self.a[idx] + self.b[idx] * dx + self.c[idx] * dx**2 + self.d[idx] * dx**3


# ---------- basic mesh ops ----------
class Mesh:
    def __init__(self, v, f, c=None):
        self.v = np.asarray(v, dtype=np.float64)
        self.f = np.asarray(f, dtype=np.int64)
        self.c = np.ones((len(self.v), 3)) if c is None else np.asarray(c, dtype=np.float64)

    def copy(self):
        return Mesh(self.v.copy(), self.f.copy(), self.c.copy())

    def tint(self, rgb, jitter=0.0, seed=0):
        """Per-vertex colour multiplier (vertex colours multiply the material colour)."""
        rgb = np.asarray(rgb, dtype=np.float64)
        col = np.tile(rgb, (len(self.v), 1))
        if jitter:
            col = col * (1 + jitter * noise(self.v, seed)[:, None])
        self.c = np.clip(col, 0, 1)
        return self


def merge(meshes):
    vs, fs, cs, off = [], [], [], 0
    for m in meshes:
        vs.append(m.v)
        fs.append(m.f + off)
        cs.append(m.c)
        off += len(m.v)
    return Mesh(np.vstack(vs), np.vstack(fs), np.vstack(cs))


def noise(p, seed=0, freqs=(1.5, 3.0, 6.0), amps=(1.0, 0.5, 0.25)):
    """Smooth deterministic pseudo-noise in about [-1, 1] for points p (N,3)."""
    rng = np.random.RandomState(seed)
    out = np.zeros(len(p))
    for fr, am in zip(freqs, amps):
        for _ in range(3):
            d = rng.randn(3)
            d /= np.linalg.norm(d)
            out += am * np.sin(fr * 3.0 * (p @ d) + rng.rand() * 6.283) / 3.0
    return out / sum(amps)


def vertex_normals(v, f):
    n = np.zeros_like(v)
    a, b, c = v[f[:, 0]], v[f[:, 1]], v[f[:, 2]]
    fn = np.cross(b - a, c - a)
    for i in range(3):
        np.add.at(n, f[:, i], fn)
    ln = np.linalg.norm(n, axis=1, keepdims=True)
    ln[ln == 0] = 1
    return n / ln


def rot(ax, deg):
    t = np.radians(deg)
    c, s = np.cos(t), np.sin(t)
    if ax == "x":
        return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
    if ax == "y":
        return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def rot_xyz(rx=0, ry=0, rz=0):
    return rot("z", rz) @ rot("y", ry) @ rot("x", rx)


# ---------- primitives ----------
def unit_sphere(nlat=40, nlon=56):
    """Closed UV sphere with no duplicated seam vertices (smooth normals everywhere)."""
    verts = [[0, 1, 0]]
    for i in range(1, nlat):
        th = np.pi * i / nlat
        for j in range(nlon):
            ph = 2 * np.pi * j / nlon
            verts.append([np.sin(th) * np.cos(ph), np.cos(th), np.sin(th) * np.sin(ph)])
    verts.append([0, -1, 0])
    verts = np.array(verts)
    S = nlon
    ring = lambda i, j: 1 + (i - 1) * S + (j % S)
    faces = []
    for j in range(S):
        faces.append([0, ring(1, j + 1), ring(1, j)])
    for i in range(1, nlat - 1):
        for j in range(S):
            a, b, c, d = ring(i, j), ring(i, j + 1), ring(i + 1, j + 1), ring(i + 1, j)
            faces += [[a, b, c], [a, c, d]]
    last = len(verts) - 1
    for j in range(S):
        faces.append([last, ring(nlat - 1, j), ring(nlat - 1, j + 1)])
    return verts, np.array(faces)


def blob(center, radii, rotm=None, res=(40, 56), amp=0.0, seed=0, freqs=(1.5, 3.0, 6.0),
         taper=0.0, taper_pow=0.7):
    """Deformed ellipsoid. taper>0 narrows x/z toward -y (used for ventricle apex).
    Returns (Mesh, surf) where surf(unit_dirs, push) maps unit-sphere dirs to the surface."""
    p, f = unit_sphere(*res)
    radii = np.asarray(radii, dtype=np.float64)
    center = np.asarray(center, dtype=np.float64)
    R = np.eye(3) if rotm is None else rotm

    def surf(dirs, push=0.0):
        dirs = np.asarray(dirs, dtype=np.float64)
        dirs = dirs / np.linalg.norm(dirs, axis=1, keepdims=True)
        q = dirs * (1 + amp * noise(dirs, seed, freqs)[:, None])
        q = q * radii
        if taper:
            t = ((dirs[:, 1] + 1) / 2) ** taper_pow
            k = (1 - taper) + taper * t
            q[:, 0] *= k
            q[:, 2] *= k
        x = q @ R.T + center
        if push:
            nrm = (dirs / radii) @ R.T
            nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
            x = x + nrm * push
        return x

    return Mesh(surf(p), f), surf


def path_spline(points, n=40):
    pts = np.asarray(points, dtype=np.float64)
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
    cs = CubicSpline(d, pts, bc_type="natural")
    t = np.linspace(0, d[-1], n)
    return cs(t)


def tube(points, radii, seg=14, n=None, caps=True, wobble=0.0, seed=0):
    """Tube along a smooth path. radii: scalar or list (interpolated along the path)."""
    pts = path_spline(points, n or max(8, int(len(points) * 10)))
    N = len(pts)
    if np.isscalar(radii):
        r = np.full(N, float(radii))
    else:
        r = np.interp(np.linspace(0, 1, N), np.linspace(0, 1, len(radii)), radii)
    tang = np.gradient(pts, axis=0)
    tang /= np.linalg.norm(tang, axis=1, keepdims=True)
    # parallel-transport frames
    ref = np.array([0.0, 0.0, 1.0]) if abs(tang[0, 2]) < 0.9 else np.array([1.0, 0, 0])
    u = np.cross(tang[0], ref)
    u /= np.linalg.norm(u)
    us = []
    for i in range(N):
        if i:
            u = u - tang[i] * (u @ tang[i])
            u /= np.linalg.norm(u)
        us.append(u.copy())
    us = np.array(us)
    ws = np.cross(tang, us)
    ang = np.linspace(0, 2 * np.pi, seg, endpoint=False)
    verts = []
    for i in range(N):
        ring = np.outer(np.cos(ang), us[i]) + np.outer(np.sin(ang), ws[i])
        rr = r[i]
        if wobble:
            rr = rr * (1 + wobble * np.sin(ang * 3 + i * 0.7 + seed))
        verts.append(pts[i] + ring * (rr[:, None] if np.ndim(rr) else rr))
    verts = np.array(verts).reshape(-1, 3)
    faces = []
    for i in range(N - 1):
        for j in range(seg):
            a = i * seg + j
            b = i * seg + (j + 1) % seg
            c = (i + 1) * seg + (j + 1) % seg
            d = (i + 1) * seg + j
            faces += [[a, b, c], [a, c, d]]
    V = [verts]
    off = len(verts)
    if caps:
        for end, idx0, flip in ((0, 0, True), (N - 1, (N - 1) * seg, False)):
            V.append(pts[end][None, :])
            for j in range(seg):
                a, b = idx0 + j, idx0 + (j + 1) % seg
                faces.append([off, b, a] if flip else [off, a, b])
            off += 1
    return Mesh(np.vstack(V), np.array(faces))


def transform(m, rotm=None, scale=1.0, shift=(0, 0, 0)):
    out = m.copy()
    R = np.eye(3) if rotm is None else rotm
    out.v = (out.v * scale) @ R.T + np.asarray(shift)
    return out


# ---------- GLB writer ----------
def bounds(parts):
    allv = np.vstack([m.v for _, m, _ in parts])
    lo, hi = allv.min(0), allv.max(0)
    return lo, hi


def fit_unit_sphere(parts, radius=1.0):
    """Centre on bbox centre and scale so the bounding sphere has the given radius."""
    lo, hi = bounds(parts)
    ctr = (lo + hi) / 2
    maxr = max(np.linalg.norm(m.v - ctr, axis=1).max() for _, m, _ in parts)
    s = radius / maxr
    for _, m, _ in parts:
        m.v = (m.v - ctr) * s
    return s


def write_glb(path, parts, generator="glbkit"):
    """parts: list of (name, Mesh, material dict). One mesh/primitive/node per part."""
    bin_chunks, bviews, accessors, meshes, nodes, materials = [], [], [], [], [], []
    offset = 0

    def add_view(data: bytes, target):
        nonlocal offset
        pad = (-len(data)) % 4
        bviews.append({"buffer": 0, "byteOffset": offset, "byteLength": len(data), "target": target})
        bin_chunks.append(data + b"\0" * pad)
        offset += len(data) + pad
        return len(bviews) - 1

    for name, m, mat in parts:
        n = vertex_normals(m.v, m.f)
        pos = m.v.astype(np.float32)
        nrm = n.astype(np.float32)
        col = np.clip(np.c_[m.c, np.ones(len(m.c))] * 255, 0, 255).round().astype(np.uint8)
        idx_dtype = np.uint16 if len(pos) < 65535 else np.uint32
        idx = m.f.astype(idx_dtype).ravel()

        vp = add_view(pos.tobytes(), 34962)
        vn = add_view(nrm.tobytes(), 34962)
        vc = add_view(col.tobytes(), 34962)
        vi = add_view(idx.tobytes(), 34963)
        a0 = len(accessors)
        accessors += [
            {"bufferView": vp, "componentType": 5126, "count": len(pos), "type": "VEC3",
             "min": pos.min(0).tolist(), "max": pos.max(0).tolist()},
            {"bufferView": vn, "componentType": 5126, "count": len(pos), "type": "VEC3"},
            {"bufferView": vc, "componentType": 5121, "normalized": True, "count": len(pos), "type": "VEC4"},
            {"bufferView": vi, "componentType": 5125 if idx_dtype == np.uint32 else 5123,
             "count": int(idx.size), "type": "SCALAR"},
        ]
        mt = {
            "name": name + "_mat",
            "pbrMetallicRoughness": {
                "baseColorFactor": list(mat.get("color", [1, 1, 1, 1])),
                "metallicFactor": mat.get("metal", 0.0),
                "roughnessFactor": mat.get("rough", 0.5),
            },
            "doubleSided": bool(mat.get("double", False)),
        }
        if mat.get("color", [1, 1, 1, 1])[3] < 1:
            mt["alphaMode"] = "BLEND"
        if "emissive" in mat:
            mt["emissiveFactor"] = list(mat["emissive"])
        materials.append(mt)
        meshes.append({"name": name, "primitives": [{
            "attributes": {"POSITION": a0, "NORMAL": a0 + 1, "COLOR_0": a0 + 2},
            "indices": a0 + 3, "material": len(materials) - 1, "mode": 4}]})
        nodes.append({"name": name, "mesh": len(meshes) - 1})

    gltf = {
        "asset": {"version": "2.0", "generator": generator},
        "scene": 0,
        "scenes": [{"name": "Scene", "nodes": list(range(len(nodes)))}],
        "nodes": nodes, "meshes": meshes, "materials": materials,
        "accessors": accessors, "bufferViews": bviews,
        "buffers": [{"byteLength": offset}],
    }
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((-len(js)) % 4)
    binb = b"".join(bin_chunks)
    total = 12 + 8 + len(js) + 8 + len(binb)
    with open(path, "wb") as fh:
        fh.write(struct.pack("<4sII", b"glTF", 2, total))
        fh.write(struct.pack("<I4s", len(js), b"JSON") + js)
        fh.write(struct.pack("<I4s", len(binb), b"BIN\0") + binb)
    return {"bytes": total, "tris": int(sum(len(m.f) for _, m, _ in parts))}
