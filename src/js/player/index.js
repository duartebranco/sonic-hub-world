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
        1;
        this.model = null;
        this.amazedModel = null;
        this._bones = {};
        this._initRot = {};
        this._idleKFs = [];
        this._walkKFs = [];
        this._runKFs = [];
        this._jumpKFs = [];
        this._hitKFs = [];
        this._deathKFs = [];
        this._walkT = 0;
        this._runT = 0;
        this._inHit = false;
        this._hitT = 0;
        this._inDead = false;
        this._deadT = 0;
        this._deadAnimDone = false;

        this._keys = {};
        bindInput(this);

        // Homing attack reticle
        this.reticle = new THREE.Mesh(
            new THREE.RingGeometry(0.6, 0.8, 16),
            new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide,
            })
        );
        this.reticle.rotation.x = Math.PI / 2;
        this.reticle.visible = false;
        this.scene.add(this.reticle);

        // Reusable objects for homing attack frustum culling
        this._frustum = new THREE.Frustum();
        this._frustumMatrix = new THREE.Matrix4();
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

    setAmazedModel(gltfScene) {
        this.amazedModel = gltfScene;
        this.amazedModel.traverse((n) => {
            if (n.isMesh) n.castShadow = true;
        });
        this.amazedModel.scale.setScalar(0.55);
        this.amazedModel.visible = false;
        this.scene.add(this.amazedModel);
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

    setDeathKeyframes(kfs) {
        this._deathKFs = kfs;
    }

    update(dt, camYaw, mobs, camera) {
        if (!this.model) return;

        // freeze everything after hit anim ends on death
        if (this._inDead && !this._inHit) {
            this._vel.set(0, 0, 0);
            this._jumpVel = 0;
            updateAnimation(this, dt, false);
            this.model.visible = false;
            if (this.amazedModel) {
                this.amazedModel.visible = true;
                this.amazedModel.position.copy(this.pos);
                this.amazedModel.rotation.y = this.yaw + Math.PI;
                this.amazedModel.rotation.x = 0;
            }
            this._dust.update(dt, this.pos, 0, false, this.yaw);
            return;
        }

        const { hasInput, inputDir, spinKey } = getPlayerInput(this, camYaw);

        if (this._inAir) {
            this._airTime += dt;
        } else {
            this._airTime = 0;
        }
        const jumpSpin = this._inAir && this._airTime > 0.3;

        // ── Homing Attack Logic ──────────────────────────────
        this.homingTarget = null;
        let closestDist = 15; // Max targeting range

        if (this._inAir && jumpSpin && mobs) {
            if (camera) {
                this._frustumMatrix.multiplyMatrices(
                    camera.projectionMatrix,
                    camera.matrixWorldInverse
                );
                this._frustum.setFromProjectionMatrix(this._frustumMatrix);
            }
            for (const mob of mobs) {
                if (mob.dead) continue;
                if (camera && !this._frustum.containsPoint(mob.mesh.position)) continue;
                const dist = this.pos.distanceTo(mob.mesh.position);
                if (dist < closestDist) {
                    closestDist = dist;
                    this.homingTarget = mob;
                }
            }
        }

        if (this.homingTarget) {
            this.reticle.visible = true;
            this.reticle.position.copy(this.homingTarget.mesh.position);
            this.reticle.position.y += 1.0; // Center of the mob roughly

            // Make it always face the camera/player like a billboard
            this.reticle.lookAt(this.pos);
        } else {
            this.reticle.visible = false;
        }

        if (this._inAir && this._jumpQueued && this.homingTarget) {
            // Transport directly to the mob
            this.pos.copy(this.homingTarget.mesh.position);
            this.pos.y += 1.0;
            this._groundY = this.pos.y;

            // Kill mob
            // reassure. since this is probably not needed
            this.homingTarget.dead = true;
            this.homingTarget.mesh.visible = false;

            // Bounce up
            this._jumpVel = 15;

            this._jumpQueued = false;
        }

        // ── Spin dash ────────────────────────────────────────
        this._spin.update(dt, spinKey, this._inAir, this._vel, this.pos, this.yaw, jumpSpin);

        const doJump = this._jumpQueued && !this._spin.charging;
        this._jumpQueued = false;
        const jumpHeld = !!this._keys["Space"];

        // ── Physics ──────────────────────────────────────────
        updatePhysics(this, dt, hasInput, inputDir, doJump, jumpHeld);

        // ── Apply to model ────────────────────────────────────
        const inSpin = this._spin.charging || this._spin.active || jumpSpin;
        const showAmazed = this._inHit && !!this.amazedModel;

        this.model.visible = !inSpin && !showAmazed;
        this.model.position.copy(this.pos);
        this.model.rotation.y = this._inHit ? this.yaw + Math.PI : this.yaw;
        this.model.rotation.x = 0;

        if (this.amazedModel) {
            this.amazedModel.visible = showAmazed && !inSpin;
            this.amazedModel.position.copy(this.pos);
            this.amazedModel.rotation.y = this.yaw + Math.PI;
            this.amazedModel.rotation.x = 0;
        }

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
