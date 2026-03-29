import { WALK_SPEED, RUN_SPEED, MAX_JUMP_SPEED } from "./physics.js";

const ANIM_WALK = 1.8;
const ANIM_RUN = 5.5;

const smooth = (t) => t * t * (3 - 2 * t);

export function applyKFInterp(player, t, kfs) {
    if (!player.model || kfs.length < 2) return;
    const n = kfs.length;
    const fi = Math.floor(t) % n;
    const ni = (fi + 1) % n;
    const a = smooth(t - Math.floor(t));
    const A = kfs[fi];
    const B = kfs[ni];
    for (const name in player._bones) {
        const bone = player._bones[name];
        const rA = A.rotations[name];
        const rB = B.rotations[name];
        if (!rA || !rB) continue;
        bone.rotation.x = rA.x + (rB.x - rA.x) * a;
        bone.rotation.y = rA.y + (rB.y - rA.y) * a;
        bone.rotation.z = rA.z + (rB.z - rA.z) * a;
    }
}

export function restPose(player) {
    for (const name in player._bones) {
        const b = player._bones[name];
        const r = player._initRot[name];
        if (r) b.rotation.set(r.x, r.y, r.z);
    }
}

export function updateAnimation(player, dt, inSpin) {
    if (inSpin) {
        player._walkT = 0;
        player._runT = 0;
        restPose(player);
        return;
    }

    const isMoving = player.speed > 0.5;
    // run animation kicks in at WALK_SPEED, scales speed up to RUN_SPEED
    const isRunning = player.speed >= WALK_SPEED;

    if (isMoving && isRunning && player._runKFs.length >= 2) {
        player._walkT = 0;
        const speedRatio = Math.min(1, player.speed / RUN_SPEED);
        player._runT += dt * ANIM_RUN * (0.5 + speedRatio * 0.5);
        applyKFInterp(player, player._runT, player._runKFs);
    } else if (isMoving && player._walkKFs.length >= 2) {
        player._runT = 0;
        const t = Math.min(1, player.speed / WALK_SPEED);
        player._walkT += dt * (ANIM_WALK + (ANIM_RUN - ANIM_WALK) * t);
        applyKFInterp(player, player._walkT, player._walkKFs);
    } else {
        player._walkT = 0;
        player._runT = 0;
        if (player._idleKFs.length >= 1) {
            applyKFInterp(player, 0, [player._idleKFs[0], player._idleKFs[0]]);
        } else {
            restPose(player);
        }
        // subtle idle sway
        const now = performance.now() / 1000;
        const root = player._bones["GLTF_created_0_rootJoint"];
        if (root) {
            root.rotation.z += Math.sin(now * 1.3) * 0.022;
            root.rotation.x += Math.sin(now * 0.85) * 0.016;
        }
        const head = player._bones["Bone001_23"];
        if (head) {
            head.rotation.y += Math.sin(now * 0.55) * 0.14;
            head.rotation.x += Math.sin(now * 0.38) * 0.04;
        }
    }

    // lean forward during airtime
    if (player._inAir) {
        const root = player._bones["GLTF_created_0_rootJoint"];
        if (root) {
            root.rotation.x += Math.max(0, player._jumpVel / MAX_JUMP_SPEED) * -0.28;
        }
    }
}
