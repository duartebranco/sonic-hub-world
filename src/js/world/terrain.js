import * as THREE from "three";
import { groundY as mapGroundY, buildMapObjects } from "./map_design.js";

export function groundY(x, z) {
    return mapGroundY(x, z);
}

export function buildTerrain(scene) {
    const geo = new THREE.PlaneGeometry(300, 300, 300, 300);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const y = groundY(x, z);
        pos.setY(i, y);

        const cx = Math.floor(x / 4);
        const cz = Math.floor(z / 4);
        const even = (cx + cz) % 2 === 0;

        const dx = groundY(x + 0.5, z) - y;
        const dz = groundY(x, z + 0.5) - y;
        const slope = Math.sqrt(dx * dx + dz * dz) / 0.5;

        const t = Math.max(0, Math.min(1, y / 20));

        if (slope > 0.8) {
            cols[i * 3] = 0.55 + t * 0.1;
            cols[i * 3 + 1] = 0.35 + t * 0.1;
            cols[i * 3 + 2] = 0.15 + t * 0.1;
        } else if (even) {
            cols[i * 3] = 0.2;
            cols[i * 3 + 1] = 0.65 + t * 0.1;
            cols[i * 3 + 2] = 0.15;
        } else {
            cols[i * 3] = 0.15;
            cols[i * 3 + 1] = 0.55 + t * 0.1;
            cols[i * 3 + 2] = 0.1;
        }
    }

    geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    scene.add(mesh);
}

// circuit waypoints [x, z] — traced counter-clockwise around the full loop
const TRACK_PATH = [
    [5, -13], [5, -26], [5, -38], [5, -47],
    [10, -57], [22, -66], [38, -70], [50, -70],
    [60, -65], [68, -54], [72, -42],
    [72, -28], [72, -12], [72, 4], [72, 18],
    [65, 24], [52, 25],
    [66, 42], [68, 56], [60, 67], [50, 72],
    [35, 77], [18, 80], [0, 80], [-14, 79], [-28, 75],
    [-42, 68], [-56, 56], [-64, 43],
    [-72, 28], [-72, 14], [-72, 0], [-72, -14],
    [-69, -28], [-62, -43], [-52, -54], [-38, -61],
    [-22, -60], [-10, -52], [2, -40],
];

function resamplePath(pts, spacing) {
    const out = [[pts[0][0], pts[0][1]]];
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
        const ax = pts[i - 1][0], az = pts[i - 1][1];
        const bx = pts[i][0], bz = pts[i][1];
        const dx = bx - ax, dz = bz - az;
        const segLen = Math.sqrt(dx * dx + dz * dz);
        let d = carry;
        while (d < segLen) {
            const t = d / segLen;
            out.push([ax + dx * t, az + dz * t]);
            d += spacing;
        }
        carry = d - segLen;
    }
    return out;
}

function buildTrack(scene) {
    const pts = resamplePath(TRACK_PATH, 2.0);
    const N = pts.length;
    const HALF = 5.0;
    const TILE_STEP = 2; // alternate color every 2 samples (4 world units)

    const positions = new Float32Array(N * 2 * 3);
    const vertColors = new Float32Array(N * 2 * 3);
    const indices = [];

    for (let i = 0; i < N; i++) {
        const [cx, cz] = pts[i];
        const [nx, nz] = pts[(i + 1) % N];
        const dx = nx - cx, dz = nz - cz;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        const px = -dz / len, pz = dx / len;

        const lx = cx - px * HALF, lz = cz - pz * HALF;
        const rx = cx + px * HALF, rz = cz + pz * HALF;

        const vi = i * 6;
        positions[vi] = lx;     positions[vi + 1] = groundY(lx, lz) + 0.08; positions[vi + 2] = lz;
        positions[vi + 3] = rx; positions[vi + 4] = groundY(rx, rz) + 0.08; positions[vi + 5] = rz;

        const even = Math.floor(i / TILE_STEP) % 2 === 0;
        const r = even ? 1.0 : 0.18;
        const g = even ? 1.0 : 0.72;
        const b = even ? 1.0 : 0.92;
        vertColors[vi] = r;     vertColors[vi + 1] = g; vertColors[vi + 2] = b;
        vertColors[vi + 3] = r; vertColors[vi + 4] = g; vertColors[vi + 5] = b;

        if (i < N - 1) {
            const a = i * 2;
            indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
    }
    // close the loop
    const last = (N - 1) * 2;
    indices.push(last, 0, last + 1, last + 1, 0, 1);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(vertColors, 3));
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    scene.add(mesh);
}

export function buildPath(scene) {
    buildTrack(scene);
    buildMapObjects(scene);

    // start/finish checkered strip at the goal ring position
    const sfW = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const sfB = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    const sfGeo = new THREE.BoxGeometry(1.5, 0.12, 1.5);
    for (let i = -4; i <= 4; i++) {
        for (let j = -2; j <= 2; j++) {
            const x = 5 + i * 1.5;
            const z = -28 + j * 1.5;
            const m = new THREE.Mesh(sfGeo, (i + j) % 2 === 0 ? sfW : sfB);
            m.position.set(x, groundY(x, z) + 0.09, z);
            m.receiveShadow = true;
            scene.add(m);
        }
    }

    // hub plaza
    const matA = new THREE.MeshStandardMaterial({ color: 0xfff9e6, roughness: 0.55 });
    const matB = new THREE.MeshStandardMaterial({ color: 0x26c6da, roughness: 0.55 });
    const S = 2.0;
    const geo = new THREE.BoxGeometry(S, 0.14, S);
    const RADIUS = 6;

    for (let r = -RADIUS; r <= RADIUS; r++) {
        for (let c = -RADIUS; c <= RADIUS; c++) {
            if (r * r + c * c > RADIUS * RADIUS) continue;
            const x = c * S;
            const z = r * S;
            const mat = (Math.abs(r) + Math.abs(c)) % 2 === 0 ? matA : matB;
            const m = new THREE.Mesh(geo, mat);
            m.position.set(x, groundY(x, z) + 0.05, z);
            m.receiveShadow = true;
            scene.add(m);
        }
    }
}
