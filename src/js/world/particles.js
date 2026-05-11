import * as THREE from "three";

const COUNT = 8000;

export function buildAmbientParticles(scene) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 300;
        pos[i * 3 + 1] = Math.random() * 14;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 300;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
        color: 0xffd54f,
        size: 0.07,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
    });

    const pts = new THREE.Points(geo, mat);
    scene.add(pts);

    return { pts, geo };
}
