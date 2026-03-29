import * as THREE from "three";

const POOL_SIZE = 30;
const EMIT_RATE = 0.03; // seconds between emissions

export class DustSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.emitTimer = 0;

        const geo = new THREE.DodecahedronGeometry(0.4, 0);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x88cc66, // grassy green smoke
            transparent: true,
            opacity: 0,
            depthWrite: false,
        });

        for (let i = 0; i < POOL_SIZE; i++) {
            const mesh = new THREE.Mesh(geo, mat.clone());
            mesh.visible = false;
            this.scene.add(mesh);
            this.particles.push({
                mesh,
                active: false,
                life: 0,
                maxLife: 0.4 + Math.random() * 0.2,
                vel: new THREE.Vector3(),
            });
        }
    }

    update(dt, pos, speed, isRunning, yaw) {
        if (isRunning) {
            this.emitTimer -= dt;
            if (this.emitTimer <= 0) {
                this.emitTimer = EMIT_RATE;
                this._emit(pos, yaw);
            }
        }

        for (const p of this.particles) {
            if (!p.active) continue;

            p.life += dt;
            if (p.life >= p.maxLife) {
                p.active = false;
                p.mesh.visible = false;
                continue;
            }

            const t = p.life / p.maxLife;
            p.mesh.position.addScaledVector(p.vel, dt);

            const scale = 1 + t * 2.0;
            p.mesh.scale.setScalar(scale);
            p.mesh.material.opacity = 0.6 * (1 - t);

            p.mesh.rotation.y += dt * 2;
            p.mesh.rotation.x += dt * 1.5;
        }
    }

    _emit(pos, yaw) {
        const p = this.particles.find((p) => !p.active);
        if (!p) return;

        p.active = true;
        p.life = 0;
        p.maxLife = 0.3 + Math.random() * 0.2;

        const sideOffset = (Math.random() - 0.5) * 0.8;

        p.mesh.position.set(
            pos.x - Math.cos(yaw) * 0.5 + Math.cos(yaw - Math.PI / 2) * sideOffset,
            pos.y + 0.2 + Math.random() * 0.2,
            pos.z + Math.sin(yaw) * 0.5 - Math.sin(yaw - Math.PI / 2) * sideOffset
        );

        p.mesh.visible = true;
        p.mesh.scale.setScalar(0.5);
        p.mesh.material.opacity = 0.6;

        p.vel.set(
            -Math.cos(yaw) * (1 + Math.random() * 2),
            1 + Math.random() * 2,
            Math.sin(yaw) * (1 + Math.random() * 2)
        );
    }
}
