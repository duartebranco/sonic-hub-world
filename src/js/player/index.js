import * as THREE from "three";
import { groundY } from "../world/index.js";
import { updatePhysics, WALK_SPEED } from "./physics.js";
import { updateAnimation } from "./animation.js";
import { bindInput, getPlayerInput } from "./input.js";
import { DustSystem } from "./dust.js";

export class Player {
    constructor(scene, spin) {
        this.scene = scene;
        this._spin = spin;

        this.pos = new THREE.Vector3();
        this.yaw = 0;
        this.speed = 0;

        this._dust = new DustSystem(scene);

        this._vel = new THREE.Vector3();
        this._jumpVel = 0;
        this._groundY = 0;
        this._inAir = false;
        this._airTime = 0;
        this._jumpQueued = false;
        this._jumpHeld = false;

        this.justJumped = false;
        this.justLanded = false;

        this.model = null;
        this._bones = {};
        this._initRot = {};
        this._idleKFs = [];
        this._walkKFs = [];
        this._runKFs = [];
        this._jumpKFs = [];
        this._hitKFs = [];
        this._walkT = 0;
        this._runT = 0;
        this._inHit = false;
        this._hitT = 0;

        this._keys = {};
        bindInput(this);
    }

    setModel(gltfScene) {
        this.model = gltfScene;
        this.model.traverse((n) => {
            if (n.isMesh) n.castShadow = true;
            if (n.isBone) {
                this._initRot[n.name] = {
                    x: n.rotation.x,
                    y: n.rotation.y,
                    z: n.rotation.z,
                };
                this._bones[n.name] = n;
            }
        });
        this.model.scale.setScalar(0.55);

        const gy = groundY(0, 0);
        this.pos.set(0, gy, 0);
        this._groundY = gy;
        this.model.position.copy(this.pos);
        this.scene.add(this.model);
    }

    setIdleKeyframes(kfs) {
        this._idleKFs = kfs;
    }

    setWalkKeyframes(kfs) {
        this._walkKFs = kfs;
    }

    setRunKeyframes(kfs) {
        this._runKFs = kfs;
    }

    setJumpKeyframes(kfs) {
        this._jumpKFs = kfs;
    }

    setHitKeyframes(kfs) {
        this._hitKFs = kfs;
    }

    update(dt, camYaw) {
        if (!this.model) return;

        const { hasInput, inputDir, spinKey } = getPlayerInput(this, camYaw);

        if (this._inAir) {
            this._airTime += dt;
        } else {
            this._airTime = 0;
        }
        const jumpSpin = this._inAir && this._airTime > 0.3;

        // ── Spin dash ────────────────────────────────────────
        this._spin.update(dt, spinKey, this._inAir, this._vel, this.pos, this.yaw, jumpSpin);

        const doJump = this._jumpQueued && !this._spin.charging;
        this._jumpQueued = false;
        const jumpHeld = !!this._keys["Space"];

        // ── Physics ──────────────────────────────────────────
        updatePhysics(this, dt, hasInput, inputDir, doJump, jumpHeld);

        // ── Apply to model ────────────────────────────────────
        const inSpin = this._spin.charging || this._spin.active || jumpSpin;

        this.model.visible = !inSpin;
        this.model.position.copy(this.pos);
        this.model.rotation.y = this._inHit ? this.yaw + Math.PI : this.yaw;
        this.model.rotation.x = 0;

        // ── Animation ────────────────────────────────────────
        updateAnimation(this, dt, inSpin);

        // ── Dust Particles ───────────────────────────────────
        this._dust.update(
            dt,
            this.pos,
            this.speed,
            this.speed >= WALK_SPEED && !this._inAir,
            this.yaw
        );
    }

    get inAir() {
        return this._inAir;
    }
    get jumpVel() {
        return this._jumpVel;
    }
    get inSpin() {
        const jumpSpin = this._inAir && this._airTime > 0.3;
        return this._spin.charging || this._spin.active || jumpSpin;
    }
}
