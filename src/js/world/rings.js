import * as THREE from "three";
import { groundY } from "./terrain.js";

const RING_GEO = new THREE.TorusGeometry(0.3, 0.065, 14, 32);
const RING_MAT = new THREE.MeshStandardMaterial({
    color: 0xffd54f,
    emissive: 0xff8f00,
    emissiveIntensity: 0.5,
    roughness: 0.15,
    metalness: 0.75,
});

// rings guide the player around the Blue Ridge Speedway circuit:
// hub → north ramp → NE highland → east straight → east lake → SE mound → south → west → hub
const RING_SPOTS = [
    // hub north exit — encourages the player to go north toward the ramp
    [5, -15],
    [5, -26],
    // north launch area — floating above the ramp to reward clean launches
    [5, -50],
    // NE highland approach and top
    [30, -65],
    [50, -65],
    // east straight (north to south)
    [70, -50],
    [72, -30],
    [72, -10],
    [72, 10],
    // east lake approach — draw attention to the jump ramp
    [50, 22],
    // shortcut reward ring past the east lake
    [95, 15],
    // SE bend and mound
    [70, 50],
    [55, 65],
    // south section heading west
    [30, 75],
    [10, 80],
    [-15, 78],
    // SW curve
    [-40, 72],
    [-58, 50],
    // west section heading north
    [-72, 15],
    [-72, -10],
    // NW return
    [-68, -35],
    [-48, -52],
];

export function buildRings(scene) {
    return RING_SPOTS.map(([x, z]) => {
        const mesh = new THREE.Mesh(RING_GEO, RING_MAT.clone());
        mesh.position.set(x, groundY(x, z) + 1.0, z);
        mesh.castShadow = true;
        scene.add(mesh);
        return { mesh, collected: false, phase: Math.random() * Math.PI * 2 };
    });
}

export function buildGoalRing(scene) {
    const geo = new THREE.TorusGeometry(4.0, 0.8, 16, 64);
    const mesh = new THREE.Mesh(geo, RING_MAT.clone());
    // start/finish arch at the north edge of the hub plaza
    mesh.position.set(0, groundY(0, -28) + 4.0, -28);
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
}

export function buildSparkleSystem(scene) {
    const sparkles = [];

    function spawn(pos) {
        const N = 14;
        const geo = new THREE.BufferGeometry();
        const v = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) {
            v[i * 3] = pos.x;
            v[i * 3 + 1] = pos.y;
            v[i * 3 + 2] = pos.z;
        }
        geo.setAttribute("position", new THREE.BufferAttribute(v, 3));

        const mat = new THREE.PointsMaterial({
            color: 0xffd54f,
            size: 0.22,
            transparent: true,
            opacity: 1,
            depthWrite: false,
        });

        const pts = new THREE.Points(geo, mat);
        scene.add(pts);

        const dirs = Array.from({ length: N }, () =>
            new THREE.Vector3(
                Math.random() * 2 - 1,
                Math.random() * 1.1 + 0.3,
                Math.random() * 2 - 1
            )
                .normalize()
                .multiplyScalar(Math.random() * 2 + 2)
        );

        sparkles.push({ pts, geo, dirs, life: 1.0 });
    }

    function update(dt) {
        for (let i = sparkles.length - 1; i >= 0; i--) {
            const s = sparkles[i];
            s.life -= dt * 2.2;
            if (s.life <= 0) {
                scene.remove(s.pts);
                sparkles.splice(i, 1);
                continue;
            }
            const p = s.geo.attributes.position;
            for (let j = 0; j < s.dirs.length; j++) {
                p.setXYZ(
                    j,
                    p.getX(j) + s.dirs[j].x * dt,
                    p.getY(j) + s.dirs[j].y * dt,
                    p.getZ(j) + s.dirs[j].z * dt
                );
            }
            p.needsUpdate = true;
            s.pts.material.opacity = Math.max(0, s.life);
        }
    }

    return { spawn, update };
}
