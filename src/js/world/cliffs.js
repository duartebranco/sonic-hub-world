import * as THREE from "three";
import { groundY } from "./terrain.js";

const MAT_A = new THREE.MeshStandardMaterial({
    color: 0xb5835a,
    roughness: 0.85,
});
const MAT_B = new THREE.MeshStandardMaterial({
    color: 0x8b5e3c,
    roughness: 0.85,
});

function makeCliffWall(scene, cx, cz, width, height, rotY, tileSize = 1.0) {
    const group = new THREE.Group();
    const cols = Math.ceil(width / tileSize);
    const rows = Math.ceil(height / tileSize);
    const geo = new THREE.BoxGeometry(tileSize, tileSize, tileSize * 0.55);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const mat = (r + c) % 2 === 0 ? MAT_A : MAT_B;
            const m = new THREE.Mesh(geo, mat);
            m.position.set((c - cols / 2 + 0.5) * tileSize, r * tileSize + tileSize / 2, 0);
            m.castShadow = true;
            m.receiveShadow = true;
            group.add(m);
        }
    }

    const ty = groundY(cx, cz);
    group.position.set(cx, ty - tileSize * 0.5, cz);
    group.rotation.y = rotY;
    scene.add(group);
}

export function buildCliffs(scene) {
    makeCliffWall(scene, -22, 0, 10, 4, Math.PI / 2, 1.1);
    makeCliffWall(scene, 22, 0, 10, 4, Math.PI / 2, 1.1);
    makeCliffWall(scene, 0, -22, 12, 5, 0, 1.1);
    makeCliffWall(scene, 0, 22, 12, 4, 0, 1.1);
    makeCliffWall(scene, -16, -16, 8, 3, Math.PI / 4, 1.0);
    makeCliffWall(scene, 16, -16, 8, 3, -Math.PI / 4, 1.0);
    makeCliffWall(scene, -16, 16, 8, 3, -Math.PI / 4, 1.0);
    makeCliffWall(scene, 16, 16, 8, 3, Math.PI / 4, 1.0);
}
