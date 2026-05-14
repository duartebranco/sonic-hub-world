import * as THREE from "three";
import { groundY } from "./world/index.js";
import { CYLINDER_COLLIDERS, BOX_COLLIDERS, WORLD_RADIUS } from "./world/colliders.js";

const PITCH_MIN = 0.05;
const PITCH_MAX = 1.1;
const DIST_MIN = 3.0;
const DIST_MAX = 18.0;
const CAM_PAD = 0.4;
const CAM_MIN_DIST = 0.6;
// World border wall (see world/cliffs.js): boxes centered at worldRadius with
// radial depth BTILE * 0.55 = 6.6 * 0.55 = 3.63. Inner face is half that inward.
const WORLD_WALL_HALF_DEPTH = (6.6 * 0.55) / 2;

export class ThirdPersonCamera {
    constructor(camera, domElement) {
        this.camera = camera;
        this.yaw = 0;
        this.pitch = 0.3;
        this.dist = 8.5;
        this.target = new THREE.Vector3();
        this._camPos = new THREE.Vector3();

        this._mouseHeld = false;
        this._lmx = 0;
        this._lmy = 0;
        this.idleTime = 0;

        this._bindEvents(domElement);
    }

    _bindEvents(el) {
        el.addEventListener("mousedown", (e) => {
            if (e.button === 0 || e.button === 2) {
                this._mouseHeld = true;
                this._lmx = e.clientX;
                this._lmy = e.clientY;
                el.requestPointerLock?.();
            }
        });

        window.addEventListener("mouseup", () => {
            this._mouseHeld = false;
        });

        window.addEventListener("mousemove", (e) => {
            if (document.pointerLockElement === el) {
                this.yaw -= e.movementX * 0.0028;
                this.pitch += e.movementY * 0.0028;
                this.idleTime = 0;
            } else if (this._mouseHeld) {
                this.yaw -= (e.clientX - this._lmx) * 0.004;
                this.pitch += (e.clientY - this._lmy) * 0.004;
                this._lmx = e.clientX;
                this._lmy = e.clientY;
                this.idleTime = 0;
            }
            this.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, this.pitch));
        });

        el.addEventListener(
            "wheel",
            (e) => {
                this.dist = Math.max(DIST_MIN, Math.min(DIST_MAX, this.dist + e.deltaY * 0.018));
            },
            { passive: true }
        );

        el.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    update(dt, playerPos, playerYaw) {
        this.idleTime += dt;

        if (this.idleTime > 1.0 && playerYaw !== undefined) {
            // The model's default orientation makes playerYaw target the left side
            // Offset by +90 degrees (+Math.PI / 2) to target the back
            const targetYaw = playerYaw + Math.PI / 2;
            let diff = ((targetYaw - this.yaw + Math.PI) % (Math.PI * 2)) - Math.PI;
            if (diff < -Math.PI) diff += Math.PI * 2;

            // Only auto-adjust if there's a significant difference, and do it smoothly
            this.yaw += diff * Math.min(1, dt * 2.0);
        }

        const desired = new THREE.Vector3(playerPos.x, playerPos.y + 1.5, playerPos.z);
        this.target.lerp(desired, Math.min(1, dt * 7));

        const desiredCam = new THREE.Vector3(
            this.target.x + Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist,
            this.target.y + Math.sin(this.pitch) * this.dist,
            this.target.z + Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist
        );

        this._resolveCollision(this.target, desiredCam, this._camPos);
        this.camera.position.lerp(this._camPos, Math.min(1, dt * 10));

        // final guard so the lerp can't leave us inside a wall
        const guard = this._resolveCollision(this.target, this.camera.position, new THREE.Vector3());
        this.camera.position.copy(guard);

        this.camera.lookAt(this.target);
    }

    // Casts a segment from target → desired and returns the furthest safe point.
    // Considers tree cylinders, bridge-rail boxes, terrain, and world radius.
    _resolveCollision(target, desired, out) {
        const dx = desired.x - target.x;
        const dy = desired.y - target.y;
        const dz = desired.z - target.z;
        const maxDist = Math.hypot(dx, dy, dz);
        if (maxDist < 1e-4) return out.copy(desired);
        const vx = dx / maxDist;
        const vy = dy / maxDist;
        const vz = dz / maxDist;
        const a2d = vx * vx + vz * vz;
        let tHit = maxDist;

        if (a2d > 1e-6) {
            for (const c of CYLINDER_COLLIDERS) {
                const r = c.radius + CAM_PAD;
                const ox = target.x - c.x;
                const oz = target.z - c.z;
                const cc = ox * ox + oz * oz - r * r;
                if (cc <= 0) continue; // already inside in XZ — don't yank
                const b = 2 * (ox * vx + oz * vz);
                const disc = b * b - 4 * a2d * cc;
                if (disc < 0) continue;
                const t = (-b - Math.sqrt(disc)) / (2 * a2d);
                if (t >= 0 && t < tHit) tHit = t;
            }

            for (const bx of BOX_COLLIDERS) {
                const minX = bx.x - bx.hw - CAM_PAD;
                const maxX = bx.x + bx.hw + CAM_PAD;
                const minZ = bx.z - bx.hl - CAM_PAD;
                const maxZ = bx.z + bx.hl + CAM_PAD;
                if (
                    target.x > minX &&
                    target.x < maxX &&
                    target.z > minZ &&
                    target.z < maxZ
                )
                    continue;
                const invX = Math.abs(vx) > 1e-6 ? 1 / vx : Infinity;
                const invZ = Math.abs(vz) > 1e-6 ? 1 / vz : Infinity;
                let t1x = (minX - target.x) * invX;
                let t2x = (maxX - target.x) * invX;
                if (t1x > t2x) {
                    const tmp = t1x;
                    t1x = t2x;
                    t2x = tmp;
                }
                let t1z = (minZ - target.z) * invZ;
                let t2z = (maxZ - target.z) * invZ;
                if (t1z > t2z) {
                    const tmp = t1z;
                    t1z = t2z;
                    t2z = tmp;
                }
                const tEnter = Math.max(t1x, t1z);
                const tExit = Math.min(t2x, t2z);
                if (tEnter <= tExit && tEnter >= 0 && tEnter < tHit) tHit = tEnter;
            }

            // world radius: keep camera inside the *inner face* of the border wall
            const R = WORLD_RADIUS - WORLD_WALL_HALF_DEPTH - CAM_PAD;
            const b = 2 * (target.x * vx + target.z * vz);
            const cc = target.x * target.x + target.z * target.z - R * R;
            const disc = b * b - 4 * a2d * cc;
            if (disc >= 0) {
                const t = (-b + Math.sqrt(disc)) / (2 * a2d);
                if (t >= 0 && t < tHit) tHit = t;
            }
        }

        // terrain march: stop where the ray dips below ground
        const steps = 12;
        for (let i = 1; i <= steps; i++) {
            const t = (tHit * i) / steps;
            const px = target.x + vx * t;
            const py = target.y + vy * t;
            const pz = target.z + vz * t;
            if (py < groundY(px, pz) + CAM_PAD) {
                tHit = (tHit * (i - 1)) / steps;
                break;
            }
        }

        tHit = Math.max(CAM_MIN_DIST, tHit - CAM_PAD * 0.5);
        out.set(target.x + vx * tHit, target.y + vy * tHit, target.z + vz * tHit);
        return out;
    }
}
