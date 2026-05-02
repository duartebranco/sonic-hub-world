import * as THREE from "three";

const PITCH_MIN = 0.05;
const PITCH_MAX = 1.1;
const DIST_MIN = 3.0;
const DIST_MAX = 18.0;

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

        this._camPos.set(
            this.target.x + Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist,
            this.target.y + Math.sin(this.pitch) * this.dist,
            this.target.z + Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist
        );

        this.camera.position.lerp(this._camPos, Math.min(1, dt * 10));
        this.camera.lookAt(this.target);
    }
}
