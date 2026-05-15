import { WALK_SPEED, RUN_SPEED } from "./physics.js";

const ANIM_WALK = 1.8;
const ANIM_RUN = 5.5;
const HIT_DURATION = 0.55;
const DEATH_HOLD = 1.8;

const smooth = (t) => t * t * (3 - 2 * t);

export function applyKFInterp(bones, t, kfs) {
    if (kfs.length < 2) return;
    const n = kfs.length;
    const fi = Math.floor(t) % n;
    const ni = (fi + 1) % n;
    const a = smooth(t - Math.floor(t));
    const A = kfs[fi];
    const B = kfs[ni];
    for (const name in bones) {
        const bone = bones[name];
        const rA = A.rotations[name];
        const rB = B.rotations[name];
        if (!rA || !rB) continue;
        bone.rotation.x = rA.x + (rB.x - rA.x) * a;
        bone.rotation.y = rA.y + (rB.y - rA.y) * a;
        bone.rotation.z = rA.z + (rB.z - rA.z) * a;
    }
}

export function restPose(bones, initRot) {
    for (const name in bones) {
        const b = bones[name];
        const r = initRot[name];
        if (r) b.rotation.set(r.x, r.y, r.z);
    }
}

export function updateAnimation(player, dt, inSpin) {
    const useAmazed = (player._inHit || player._inDead) && player._amazedBones;
    const bones = useAmazed ? player._amazedBones : player._bones;
    const initRot = useAmazed ? player._amazedInitRot : player._initRot;

    if (inSpin) {
        player._walkT = 0;
        player._runT = 0;
        restPose(bones, initRot);
        return;
    }

    if (player._inHit) {
        player._hitT += dt;
        if (player._hitT >= HIT_DURATION) {
            player._inHit = false;
        } else if (player._hitKFs.length >= 1) {
            applyKFInterp(bones, 0, [player._hitKFs[0], player._hitKFs[0]]);
        }
        return;
    }

    if (player._inDead) {
        player._deadT += dt;
        if (player._deathKFs.length >= 1) {
            applyKFInterp(bones, 0, [player._deathKFs[0], player._deathKFs[0]]);
        }
        if (player._deadT >= DEATH_HOLD) {
            player._deadAnimDone = true;
        }
        return;
    }

    if (player._inAir && player._jumpKFs && player._jumpKFs.length >= 2) {
        player._walkT = 0;
        player._runT = 0;
        const t = Math.min(1, (player._airTime || 0) * 15.0);
        applyKFInterp(bones, t, [player._jumpKFs[0], player._jumpKFs[1]]);
    } else {
        const isMoving = player.speed > 0.5;
        const isRunning = player.speed >= WALK_SPEED;

        if (isMoving && isRunning && player._runKFs.length >= 2) {
            player._walkT = 0;
            const speedRatio = Math.min(1, player.speed / RUN_SPEED);
            player._runT += dt * ANIM_RUN * (0.5 + speedRatio * 0.5);
            applyKFInterp(bones, player._runT, player._runKFs);
        } else if (isMoving && player._walkKFs.length >= 2) {
            player._runT = 0;
            const t = Math.min(1, player.speed / WALK_SPEED);
            player._walkT += dt * (ANIM_WALK + (ANIM_RUN - ANIM_WALK) * t);
            applyKFInterp(bones, player._walkT, player._walkKFs);
        } else {
            player._walkT = 0;
            player._runT = 0;
            if (player._idleKFs.length >= 1) {
                applyKFInterp(bones, 0, [player._idleKFs[0], player._idleKFs[0]]);
            } else {
                restPose(bones, initRot);
            }
            // subtle idle sway
            const now = performance.now() / 1000;
            const root = bones["GLTF_created_0_rootJoint"];
            if (root) {
                root.rotation.z += Math.sin(now * 1.3) * 0.022;
                root.rotation.x += Math.sin(now * 0.85) * 0.016;
            }
            const head = bones["Bone001_23"];
            if (head) {
                head.rotation.y += Math.sin(now * 0.55) * 0.14;
                head.rotation.x += Math.sin(now * 0.38) * 0.04;
            }
        }
    }
}
