"""Minimal GLB (binary glTF) loader using only struct + numpy.

GLB format:
  Header (12 bytes): "glTF" magic, version u32, total length u32
  Chunk N: length u32, type fourcc (b"JSON" or b"BIN\0"), data of `length`
  Typically chunk 0 = JSON (scene), chunk 1 = BIN (geometry).

We extract all triangle positions across all mesh primitives in the
file, concatenate them, and apply each node's world transform. Returns
an (N, 3) numpy array of vertices and an (M, 3) array of triangle
indices into it.

This is deliberately bare-bones — we only need POSITION attributes,
TRIANGLES topology, and node transforms. We ignore materials, textures,
animations, skinning, etc.
"""
from __future__ import annotations
import json
import struct
import numpy as np


COMPONENT_TYPE = {
    5120: ("b", 1),   # BYTE
    5121: ("B", 1),   # UNSIGNED_BYTE
    5122: ("h", 2),   # SHORT
    5123: ("H", 2),   # UNSIGNED_SHORT
    5125: ("I", 4),   # UNSIGNED_INT
    5126: ("f", 4),   # FLOAT
}

TYPE_SIZES = {
    "SCALAR": 1,
    "VEC2": 2,
    "VEC3": 3,
    "VEC4": 4,
    "MAT2": 4,
    "MAT3": 9,
    "MAT4": 16,
}


def _read_accessor(gltf, bin_blob, accessor_index):
    a = gltf["accessors"][accessor_index]
    bv = gltf["bufferViews"][a["bufferView"]]
    fmt, sz = COMPONENT_TYPE[a["componentType"]]
    n = TYPE_SIZES[a["type"]]
    count = a["count"]
    offset = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    stride = bv.get("byteStride", sz * n)
    if stride == sz * n:
        # Tight packing — read everything at once.
        end = offset + count * sz * n
        arr = np.frombuffer(bin_blob, dtype=np.dtype(f"<{fmt}"), count=count * n,
                            offset=offset)
        return arr.reshape(count, n) if n > 1 else arr
    # Strided — read element by element.
    out = np.empty((count, n), dtype=np.dtype(f"<{fmt}"))
    for i in range(count):
        off = offset + i * stride
        out[i] = struct.unpack_from(f"<{n}{fmt}", bin_blob, off)
    return out if n > 1 else out.reshape(-1)


def _node_matrix(node):
    if "matrix" in node:
        m = np.array(node["matrix"], dtype=np.float64).reshape(4, 4).T  # glTF is column-major
        return m
    # Compose from T/R/S
    T = node.get("translation", [0.0, 0.0, 0.0])
    R = node.get("rotation", [0.0, 0.0, 0.0, 1.0])   # quaternion x,y,z,w
    S = node.get("scale", [1.0, 1.0, 1.0])
    qx, qy, qz, qw = R
    # Quaternion → rotation matrix
    xx, yy, zz = qx * qx, qy * qy, qz * qz
    xy, xz, yz = qx * qy, qx * qz, qy * qz
    wx, wy, wz = qw * qx, qw * qy, qw * qz
    rot = np.array([
        [1 - 2*(yy + zz),     2*(xy - wz),     2*(xz + wy)],
        [    2*(xy + wz), 1 - 2*(xx + zz),     2*(yz - wx)],
        [    2*(xz - wy),     2*(yz + wx), 1 - 2*(xx + yy)],
    ], dtype=np.float64)
    mat = np.eye(4)
    mat[:3, :3] = rot * np.array(S)
    mat[:3, 3] = T
    return mat


def load_glb(path):
    """Load a GLB file → (vertices Nx3 float32, triangles Mx3 uint32)."""
    with open(path, "rb") as f:
        header = f.read(12)
        magic, version, total_len = struct.unpack("<4sII", header)
        if magic != b"glTF":
            raise ValueError(f"{path}: not a GLB (magic={magic})")
        json_chunk = None
        bin_chunk = b""
        # Read chunks
        while f.tell() < total_len:
            chunk_header = f.read(8)
            if len(chunk_header) < 8:
                break
            ch_len, ch_type = struct.unpack("<I4s", chunk_header)
            ch_data = f.read(ch_len)
            if ch_type == b"JSON":
                # JSON chunk is ASCII; trailing nulls are padding
                json_chunk = json.loads(ch_data.rstrip(b"\x00 ").decode("utf-8"))
            elif ch_type[:3] == b"BIN":
                bin_chunk = ch_data
    if json_chunk is None:
        raise ValueError(f"{path}: no JSON chunk")
    gltf = json_chunk

    # Walk the scene tree, accumulating world transforms for each node.
    def collect_meshes(node_idx, parent_mat, out):
        node = gltf["nodes"][node_idx]
        m = _node_matrix(node)
        world = parent_mat @ m
        if "mesh" in node:
            out.append((node["mesh"], world))
        for child in node.get("children", []):
            collect_meshes(child, world, out)

    mesh_refs = []  # list of (mesh_index, 4x4 world)
    scenes = gltf.get("scenes", [{}])
    default_scene = gltf.get("scene", 0)
    root_nodes = scenes[default_scene].get("nodes", list(range(len(gltf.get("nodes", [])))))
    for n in root_nodes:
        collect_meshes(n, np.eye(4), mesh_refs)
    if not mesh_refs:
        # Fallback: some files don't declare a scene — just iterate meshes.
        for i in range(len(gltf.get("meshes", []))):
            mesh_refs.append((i, np.eye(4)))

    all_verts = []
    all_tris = []
    vert_offset = 0
    for mesh_idx, world in mesh_refs:
        mesh = gltf["meshes"][mesh_idx]
        for prim in mesh["primitives"]:
            if prim.get("mode", 4) != 4:   # 4 = TRIANGLES
                continue
            pos_acc = prim["attributes"].get("POSITION")
            if pos_acc is None:
                continue
            verts = _read_accessor(gltf, bin_chunk, pos_acc).astype(np.float64)
            # Apply world transform
            h = np.concatenate([verts, np.ones((verts.shape[0], 1))], axis=1)
            verts = (h @ world.T)[:, :3]
            if "indices" in prim:
                idx = _read_accessor(gltf, bin_chunk, prim["indices"]).astype(np.uint32)
                tris = idx.reshape(-1, 3) + vert_offset
            else:
                n_verts = verts.shape[0]
                tris = (np.arange(n_verts, dtype=np.uint32).reshape(-1, 3) + vert_offset)
            all_verts.append(verts.astype(np.float32))
            all_tris.append(tris)
            vert_offset += verts.shape[0]

    if not all_verts:
        raise ValueError(f"{path}: no triangle primitives found")
    V = np.concatenate(all_verts, axis=0)
    T = np.concatenate(all_tris, axis=0)
    return V, T


if __name__ == "__main__":
    import sys
    for p in sys.argv[1:]:
        V, T = load_glb(p)
        print(f"{p}: {V.shape[0]} verts, {T.shape[0]} tris, bbox = "
              f"[{V.min(0)} .. {V.max(0)}]")
