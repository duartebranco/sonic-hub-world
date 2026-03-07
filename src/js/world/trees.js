import * as THREE from "three";
import { groundY } from "./terrain.js";

const TRUNK_MAT = new THREE.MeshStandardMaterial({
    color: 0x8d6e63,
    roughness: 0.9,
});
const COCO_MAT = new THREE.MeshStandardMaterial({
    color: 0x6d4c41,
    roughness: 0.9,
});
const CANOPY_MAT = new THREE.MeshStandardMaterial({
    color: 0x43a047,
    roughness: 0.82,
});
const CANOPY_MAT2 = new THREE.MeshStandardMaterial({
    color: 0x66bb6a,
    roughness: 0.82,
});

function makePalmTree(scene, x, z, sc = 1) {
    const ty = groundY(x, z);
    const g = new THREE.Group();
    g.position.set(x, ty, z);

    const SEGS = 6;
    const segH = 0.7 * sc;
    for (let i = 0; i < SEGS; i++) {
        const r0 = Math.max(0.01, (0.14 - i * 0.012) * sc);
        const r1 = Math.max(0.01, (0.12 - i * 0.012) * sc);
        const seg = new THREE.Mesh(
            new THREE.CylinderGeometry(r1, r0, segH, 7),
            TRUNK_MAT,
        );
        const lean = Math.sin(i * 0.5) * 0.055 * sc;
        seg.position.set(lean, i * segH + segH / 2, 0);
        seg.rotation.z = -lean * 0.18;
        seg.castShadow = true;
        g.add(seg);
    }

    const trunkTopY = SEGS * segH;
    const leanOffset = Math.sin(SEGS * 0.5) * 0.055 * sc;

    [
        { r: 1.05 * sc, y: trunkTopY, mat: CANOPY_MAT },
        { r: 0.78 * sc, y: trunkTopY + 0.7 * sc, mat: CANOPY_MAT2 },
        { r: 0.52 * sc, y: trunkTopY + 1.3 * sc, mat: CANOPY_MAT },
    ].forEach(({ r, y, mat }) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
        m.position.set(leanOffset, y, 0);
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
    });

    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const c = new THREE.Mesh(
            new THREE.SphereGeometry(0.09 * sc, 6, 5),
            COCO_MAT,
        );
        c.position.set(
            Math.sin(a) * 0.28 * sc + leanOffset,
            trunkTopY - 0.06 * sc,
            Math.cos(a) * 0.28 * sc,
        );
        g.add(c);
    }

    g.rotation.y = Math.random() * Math.PI * 2;
    scene.add(g);
}

const TREE_SPOTS = [
    [-7, -7],
    [7, -7],
    [-10, 2],
    [10, 2],
    [-6, 11],
    [6, 11],
    [-13, 0],
    [13, 0],
    [-5, -15],
    [5, -15],
    [-13, 9],
    [13, 9],
    [3, 18],
    [-7, 20],
    [9, 19],
    [-4, -21],
    [7, -20],
    [0, -18],
    [-18, -6],
    [18, -6],
    [-17, 11],
    [17, 11],
    [-9, -10],
    [9, -10],
    [0, 14],
    [-11, 14],
    [11, 14],
    [-20, 0],
    [20, 0],
    [0, -25],
    [0, 25],
    [-14, -14],
    [14, -14],
    [-14, 14],
    [14, 14],
];

export function buildTrees(scene) {
    const rnd = (a, b) => Math.random() * (b - a) + a;
    TREE_SPOTS.forEach(([x, z]) => makePalmTree(scene, x, z, rnd(0.8, 1.45)));
}
