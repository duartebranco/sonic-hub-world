import * as THREE from "three";
import { groundY } from "./world/index.js";
import { CYLINDER_COLLIDERS, WORLD_RADIUS } from "./world/colliders.js";

const PITCH_MIN = 0.05;
const PITCH_MAX = 1.1;
const DIST_MIN = 3.0;
const DIST_MAX = 18.0;

const CAM_PAD = 0.4;
const CAM_MIN_DIST = 0.6;
// world/cliffs.js builds the border out of boxes centered at worldRadius with
// radial depth BTILE * 0.55. The camera must stay inside the wall's inner face,
// or the near plane shows through to the outside.
const BORDER_INNER_R = WORLD_RADIUS - (6.6 * 0.55) / 2 - CAM_PAD;

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

        // touch camera — drag anywhere on the canvas (joystick/buttons intercept their own touches)
        let camTouchId = null;
        let camLast = { x: 0, y: 0 };

        el.addEventListener("touchstart", (e) => {
            for (const t of e.changedTouches) {
                if (camTouchId === null) {
                    camTouchId = t.identifier;
                    camLast = { x: t.clientX, y: t.clientY };
                }
            }
        }, { passive: true });

        window.addEventListener("touchmove", (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier === camTouchId) {
                    this.yaw -= (t.clientX - camLast.x) * 0.005;
                    this.pitch += (t.clientY - camLast.y) * 0.005;
                    this.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, this.pitch));
                    camLast = { x: t.clientX, y: t.clientY };
                    this.idleTime = 0;
                }
            }
        }, { passive: true });

        window.addEventListener("touchend", (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier === camTouchId) camTouchId = null;
            }
        });
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

        const safeDist = this._safeOrbitDistance();
        this._camPos.set(
            this.target.x + Math.sin(this.yaw) * Math.cos(this.pitch) * safeDist,
            this.target.y + Math.sin(this.pitch) * safeDist,
            this.target.z + Math.cos(this.yaw) * Math.cos(this.pitch) * safeDist
        );
        this.camera.position.lerp(this._camPos, Math.min(1, dt * 10));
        this.camera.lookAt(this.target);
    }

    // Largest distance along the orbit direction that doesn't clip the camera
    // through trees, bridge rails, the world border, or the terrain.
    _safeOrbitDistance() {
        const dx = Math.sin(this.yaw) * Math.cos(this.pitch);
        const dy = Math.sin(this.pitch);
        const dz = Math.cos(this.yaw) * Math.cos(this.pitch);
        const { x: ox, y: oy, z: oz } = this.target;
        const a2d = dx * dx + dz * dz;
        let t = this.dist;

        if (a2d > 1e-6) {
            for (const c of CYLINDER_COLLIDERS) {
                t = Math.min(t, enterCircle(ox - c.x, oz - c.z, dx, dz, a2d, c.radius + CAM_PAD));
            }
            t = Math.min(t, exitCircle(ox, oz, dx, dz, a2d, BORDER_INNER_R));
        }

        // Stop where the ray dips below ground (catches hills, plateau walls,
        // and the radial soft-wall ramp around worldRadius).
        const STEPS = 12;
        for (let i = 1; i <= STEPS; i++) {
            const s = (t * i) / STEPS;
            if (oy + dy * s < groundY(ox + dx * s, oz + dz * s) + CAM_PAD) {
                t = (t * (i - 1)) / STEPS;
                break;
            }
        }

        return Math.max(CAM_MIN_DIST, t - CAM_PAD * 0.5);
    }
}

// Distance along (dx,dz) from origin to *enter* a circle of radius r centered at origin.
// Returns Infinity when the ray misses or starts inside.
function enterCircle(ox, oz, dx, dz, a2d, r) {
    const c = ox * ox + oz * oz - r * r;
    if (c <= 0) return Infinity;
    const b = 2 * (ox * dx + oz * dz);
    const disc = b * b - 4 * a2d * c;
    if (disc < 0) return Infinity;
    const t = (-b - Math.sqrt(disc)) / (2 * a2d);
    return t >= 0 ? t : Infinity;
}

// Distance along (dx,dz) from origin to *exit* a circle of radius r centered at origin.
function exitCircle(ox, oz, dx, dz, a2d, r) {
    const b = 2 * (ox * dx + oz * dz);
    const c = ox * ox + oz * oz - r * r;
    const disc = b * b - 4 * a2d * c;
    if (disc < 0) return Infinity;
    const t = (-b + Math.sqrt(disc)) / (2 * a2d);
    return t >= 0 ? t : Infinity;
}
