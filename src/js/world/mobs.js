import * as THREE from "three";
import { groundY, MAP_CONFIG } from "./map_design.js";

export class MotoBug {
    constructor(scene, x, z, radius) {
        this.dead = false;
        this.startX = x;
        this.startZ = z;
        this.patrolRadius = radius;
        this.angle = Math.random() * Math.PI * 2;

        this.mesh = new THREE.Group();

        // 1. Wheel (Dark Gray, kept from previous)
        this.wheel = new THREE.Group();
        const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 16);
        wheelGeo.rotateX(Math.PI / 2);
        const wheelMat = new THREE.MeshStandardMaterial({ flatShading: true,
            color: 0x222222,
            roughness: 0.9,
        });
        const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
        wheelMesh.castShadow = true;
        this.wheel.add(wheelMesh);

        const spokeGeo = new THREE.BoxGeometry(0.5, 0.1, 0.45);
        const spokeMat = new THREE.MeshStandardMaterial({ flatShading: true, color: 0xdddddd });
        const spoke = new THREE.Mesh(spokeGeo, spokeMat);
        this.wheel.add(spoke);

        const spoke2 = new THREE.Mesh(spokeGeo, spokeMat);
        spoke2.rotation.z = Math.PI / 2;
        this.wheel.add(spoke2);

        this.wheel.position.y = 0.3;
        this.mesh.add(this.wheel);

        // 2. Body (Red Sphere)
        const bodyGeo = new THREE.SphereGeometry(0.55, 32, 16);
        const bodyMat = new THREE.MeshStandardMaterial({ flatShading: true,
            color: 0xcc0000,
            roughness: 0.5,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(-0.1, 0.8, 0); // Slightly back to balance over the wheel
        body.castShadow = true;
        this.mesh.add(body);

        // 3. Face (Grey Sphere intersecting the body)
        const faceGroup = new THREE.Group();
        const faceGeo = new THREE.SphereGeometry(0.38, 32, 16);
        const faceMat = new THREE.MeshStandardMaterial({ flatShading: true,
            color: 0x999999,
            roughness: 0.4,
            metalness: 0.2,
        });
        const face = new THREE.Mesh(faceGeo, faceMat);
        face.castShadow = true;
        faceGroup.add(face);

        // 4. Eyes (Small intersecting spheres)
        const eyeGeo = new THREE.SphereGeometry(0.07, 16, 16);
        const eyeMat = new THREE.MeshStandardMaterial({ flatShading: true, color: 0x000000 });

        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.31, 0.12, 0.15); // Push forward (x), up (y), and out (z)
        faceGroup.add(eyeR);

        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(0.31, 0.12, -0.15);
        faceGroup.add(eyeL);

        // 5. Ears ("c>" style: cone with a ball at the tip)
        const buildEar = (isRight) => {
            const earGroup = new THREE.Group();

            // Cone base
            const coneGeo = new THREE.ConeGeometry(0.06, 0.25, 16);
            coneGeo.translate(0, 0.125, 0); // Shift so origin is at the base
            const earMesh = new THREE.Mesh(coneGeo, faceMat);
            earMesh.castShadow = true;
            earGroup.add(earMesh);

            // Ball tip
            const tipGeo = new THREE.SphereGeometry(0.06, 16, 16);
            const tipMesh = new THREE.Mesh(tipGeo, faceMat);
            tipMesh.position.set(0, 0.25, 0); // At the top of the cone
            tipMesh.castShadow = true;
            earGroup.add(tipMesh);

            // Position and rotate the ear to point diagonally back, up, and out
            const zDir = isRight ? 1 : -1;
            earGroup.position.set(0.05, 0.25, 0.25 * zDir);
            earGroup.rotation.z = Math.PI / 6; // Tilt back
            earGroup.rotation.x = (Math.PI / 5) * zDir; // Tilt outward

            return earGroup;
        };

        faceGroup.add(buildEar(true));
        faceGroup.add(buildEar(false));

        faceGroup.position.set(0.35, 0.8, 0);
        this.mesh.add(faceGroup);

        scene.add(this.mesh);
        this.update(0);
    }

    update(dt, playerPos) {
        // Patrol speed
        const linearSpeed = 3.0;
        let targetX, targetZ;

        let distToPlayer = Infinity;
        if (playerPos) {
            const px = playerPos.x - this.mesh.position.x;
            const pz = playerPos.z - this.mesh.position.z;
            distToPlayer = Math.sqrt(px * px + pz * pz);
        }

        const AGGRO_RANGE = 15.0;

        if (distToPlayer < AGGRO_RANGE && distToPlayer > 0.1) {
            const dirX = (playerPos.x - this.mesh.position.x) / distToPlayer;
            const dirZ = (playerPos.z - this.mesh.position.z) / distToPlayer;
            targetX = this.mesh.position.x + dirX * linearSpeed * dt;
            targetZ = this.mesh.position.z + dirZ * linearSpeed * dt;

            // Recenter the patrol circle so it resumes smoothly
            this.startX = targetX - Math.cos(this.angle) * this.patrolRadius;
            this.startZ = targetZ - Math.sin(this.angle) * this.patrolRadius;
        } else {
            const angularSpeed = linearSpeed / Math.max(1, this.patrolRadius);
            this.angle += angularSpeed * dt;

            targetX = this.startX + Math.cos(this.angle) * this.patrolRadius;
            targetZ = this.startZ + Math.sin(this.angle) * this.patrolRadius;
        }

        const dx = targetX - this.mesh.position.x;
        const dz = targetZ - this.mesh.position.z;

        if (dx !== 0 || dz !== 0) {
            // Local +X is forward
            this.mesh.rotation.y = Math.atan2(-dz, dx);
        }

        this.mesh.position.x = targetX;
        this.mesh.position.z = targetZ;
        this.mesh.position.y = groundY(targetX, targetZ);

        // Spin the wheel based on movement distance
        const distanceMoved = linearSpeed * dt;
        this.wheel.rotation.z -= distanceMoved / 0.3; // radius is 0.3
    }
}

export function buildMobs(scene) {
    const mobs = [];
    if (MAP_CONFIG.mobs) {
        for (const m of MAP_CONFIG.mobs) {
            if (m.type === "motobug") {
                mobs.push(new MotoBug(scene, m.x, m.z, m.patrolRadius || 5.0));
            }
        }
    }
    return mobs;
}
