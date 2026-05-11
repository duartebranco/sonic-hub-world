import * as THREE from "three";
import { groundY } from "./terrain.js";
import { MAP_CONFIG } from "./map_design.js";

const RING_GEO = new THREE.TorusGeometry(0.3, 0.065, 14, 32);
const RING_MAT = new THREE.MeshStandardMaterial({
    flatShading: true,
    color: 0xffd54f,
    emissive: 0xff8f00,
    emissiveIntensity: 0.5,
    roughness: 0.15,
    metalness: 0.75,
});

export function buildRings(scene) {
    return MAP_CONFIG.rings.map(({ x, z }) => {
        const mesh = new THREE.Mesh(RING_GEO, RING_MAT.clone());
        mesh.position.set(x, groundY(x, z) + 1.0, z);
        mesh.castShadow = true;
        scene.add(mesh);
        return { mesh, collected: false, phase: Math.random() * Math.PI * 2 };
    });
}

const GOAL_MAT = new THREE.MeshStandardMaterial({
    flatShading: true,
    color: 0xffd54f,
    emissive: 0xff8f00,
    emissiveIntensity: 0.5,
    roughness: 0.15,
    metalness: 0.75,
});

export function buildGoalRing(scene) {
    const { x, z } = MAP_CONFIG.goalRing[0];
    const geo = new THREE.TorusGeometry(4.0, 0.8, 16, 64);
    const mesh = new THREE.Mesh(geo, GOAL_MAT.clone());
    mesh.position.set(x, groundY(x, z) + 4.0, z);
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
}

export function resetRings(scene, rings) {
    rings.forEach((r) => {
        r.collected = false;
        scene.add(r.mesh);
    });
}

const SCATTER_MAT = new THREE.MeshStandardMaterial({
    flatShading: true,
    color: 0xffd54f,
    emissive: 0xff8f00,
    emissiveIntensity: 0.6,
    roughness: 0.15,
    metalness: 0.75,
    transparent: true,
    opacity: 1,
});

const GRAVITY = 14;
const MAX_SCATTER = 20;
const LIFETIME = 4.0;
const BLINK_START = 1.5;
const PICKUP_DELAY = 1.1;
const PICKUP_RADIUS_SQ = 1.4 * 1.4;

export function buildScatterRingSystem(scene) {
    const active = [];

    function spawn(pos, count) {
        const n = Math.min(count, MAX_SCATTER);
        for (let i = 0; i < n; i++) {
            const angle = (i / n) * Math.PI * 2;
            // alternate two arc tiers like classic sonic
            const outer = i % 2 === 0;
            const hSpeed = outer ? 5.5 : 4.0;
            const vSpeed = outer ? 7.0 : 5.0;

            const mesh = new THREE.Mesh(RING_GEO, SCATTER_MAT.clone());
            mesh.position.set(pos.x, pos.y + 0.5, pos.z);
            mesh.castShadow = true;
            scene.add(mesh);

            active.push({
                mesh,
                vel: new THREE.Vector3(Math.cos(angle) * hSpeed, vSpeed, Math.sin(angle) * hSpeed),
                rotSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 4,
                    Math.random() * 6 + 3
                ),
                life: LIFETIME,
                bounced: false,
                pickupT: PICKUP_DELAY,
            });
        }
    }

    function update(dt, playerPos) {
        let collected = 0;
        for (let i = active.length - 1; i >= 0; i--) {
            const r = active[i];
            r.life -= dt;
            r.pickupT -= dt;

            if (r.life <= 0) {
                scene.remove(r.mesh);
                r.mesh.material.dispose();
                active.splice(i, 1);
                continue;
            }

            if (playerPos && r.pickupT <= 0) {
                const dx = playerPos.x - r.mesh.position.x;
                const dy = playerPos.y + 0.5 - r.mesh.position.y;
                const dz = playerPos.z - r.mesh.position.z;
                if (dx * dx + dy * dy + dz * dz < PICKUP_RADIUS_SQ) {
                    scene.remove(r.mesh);
                    r.mesh.material.dispose();
                    active.splice(i, 1);
                    collected++;
                    continue;
                }
            }

            r.vel.y -= GRAVITY * dt;
            r.mesh.position.addScaledVector(r.vel, dt);
            r.mesh.rotation.x += r.rotSpeed.x * dt;
            r.mesh.rotation.y += r.rotSpeed.y * dt;
            r.mesh.rotation.z += r.rotSpeed.z * dt;

            const floor = groundY(r.mesh.position.x, r.mesh.position.z) + 0.3;
            if (r.mesh.position.y < floor) {
                r.mesh.position.y = floor;
                if (!r.bounced) {
                    r.bounced = true;
                    r.vel.y = Math.abs(r.vel.y) * 0.45;
                    r.vel.x *= 0.6;
                    r.vel.z *= 0.6;
                } else {
                    r.vel.y = 0;
                    r.vel.x *= 0.9;
                    r.vel.z *= 0.9;
                }
            }

            // blink out in the last BLINK_START seconds
            if (r.life < BLINK_START) {
                const blinkRate = 8 + (1 - r.life / BLINK_START) * 16;
                r.mesh.visible = Math.sin(r.life * blinkRate) > 0;
            }
        }
        return collected;
    }

    return { spawn, update };
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
