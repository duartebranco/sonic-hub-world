import * as THREE from "three";
import { MAP_CONFIG } from "./map_design.js";

const textureLoader = new THREE.TextureLoader();
const walTex = textureLoader.load("../textures/wal.png");
walTex.colorSpace = THREE.SRGBColorSpace;
walTex.magFilter = THREE.NearestFilter;
const walTopTex = textureLoader.load("../textures/wal_top.png");
walTopTex.colorSpace = THREE.SRGBColorSpace;
walTopTex.magFilter = THREE.NearestFilter;

const MAT_WAL = new THREE.MeshStandardMaterial({
    map: walTex,
    roughness: 0.85,
});
const MAT_WAL_TOP = new THREE.MeshStandardMaterial({
    map: walTopTex,
    roughness: 0.85,
});

// Procedural walls around plateaus and the world border, rendered via InstancedMesh.
// rotY = -π/2 - angle makes local-X span tangentially so tiles tile correctly around circles.
function buildProceduralWalls(scene) {
    const BTILE = 6.6; // much larger tiles for the distant world border

    const dummy = new THREE.Object3D();

    const matricesWal = [];
    const matricesWalTop = [];

    // ── World border ────────────────────────────────────────────────────────[...]
    {
        const R = MAP_CONFIG.worldRadius;
        const WALL_H = 4; // rows (4 × 6.6 = 26.4 units)
        const N = Math.max(12, Math.ceil((2 * Math.PI * R) / BTILE));
        const dAngle = (2 * Math.PI) / N;

        for (let si = 0; si < N; si++) {
            const angle = si * dAngle;
            const rotY = -Math.PI / 2 - angle;
            const wx = R * Math.cos(angle);
            const wz = R * Math.sin(angle);

            for (let r = 0; r < WALL_H; r++) {
                dummy.position.set(wx, r * BTILE, wz);
                dummy.rotation.set(0, rotY, 0);
                dummy.updateMatrix();

                if (r === WALL_H - 1) {
                    matricesWalTop.push(dummy.matrix.clone());
                } else {
                    matricesWal.push(dummy.matrix.clone());
                }
            }
        }
    }

    // ── Spawn InstancedMeshes ─────────────────────────────────────────────────
    const borderGeo = new THREE.BoxGeometry(BTILE, BTILE, BTILE * 0.55);

    function spawn(geo, mat, matrices) {
        if (!matrices.length) return;
        const inst = new THREE.InstancedMesh(geo, mat, matrices.length);
        matrices.forEach((m, i) => inst.setMatrixAt(i, m));
        inst.instanceMatrix.needsUpdate = true;
        inst.castShadow = true;
        inst.receiveShadow = true;
        scene.add(inst);
    }

    spawn(borderGeo, MAT_WAL, matricesWal);
    spawn(borderGeo, MAT_WAL_TOP, matricesWalTop);
}

export function buildCliffs(scene) {
    buildProceduralWalls(scene);
}
