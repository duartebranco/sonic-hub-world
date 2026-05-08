import * as THREE from "three";

const CLOUD_MAT = new THREE.MeshStandardMaterial({
    flatShading: true,
    color: 0xffffff,
    roughness: 1,
});

function makeCloud(scene, x, y, z) {
    const g = new THREE.Group();

    const blobs = [
        { r: 2.2, ox: 0.0, oy: 0.0 },
        { r: 1.7, ox: 2.4, oy: -0.3 },
        { r: 1.5, ox: -2.2, oy: -0.3 },
        { r: 1.6, ox: 1.1, oy: 0.9 },
        { r: 1.3, ox: -0.9, oy: 0.8 },
        { r: 1.1, ox: 3.2, oy: 0.3 },
        { r: 1.0, ox: -3.0, oy: 0.2 },
    ];

    blobs.forEach(({ r, ox, oy }) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), CLOUD_MAT);
        m.position.set(ox, oy, 0);
        g.add(m);
    });

    const rnd = (a, b) => Math.random() * (b - a) + a;
    g.position.set(x, y, z);
    g.scale.set(rnd(0.7, 1.5), rnd(0.55, 0.9), rnd(0.6, 1.1));
    scene.add(g);
    return g;
}

export function buildClouds(scene) {
    const drifters = [];
    const rnd = (a, b) => Math.random() * (b - a) + a;

    for (let i = 0; i < 20; i++) {
        const mesh = makeCloud(scene, rnd(-100, 100), rnd(16, 30), rnd(-100, 100));
        drifters.push({ mesh, speed: rnd(0.8, 2.5) });
    }

    return drifters;
}
