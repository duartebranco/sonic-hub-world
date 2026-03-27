import { TOP_SPEED, JUMP_BASE, JUMP_BOOST } from "./physics.js";

const ANIM_WALK = 1.9;
const ANIM_RUN = 5.0;
const RUN_THRESHOLD = 0.65; // fraction of TOP_SPEED where run anim kicks in

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
    } else {
        const isMoving = player.speed > 0.5;
        const isRunning = player.speed >= TOP_SPEED * RUN_THRESHOLD;

        if (isMoving && isRunning && player._runKFs.length >= 2) {
            player._walkT = 0;
            player._runT += dt * ANIM_RUN;
            applyKFInterp(player, player._runT, player._runKFs);
        } else if (isMoving && player._walkKFs.length >= 2) {
            player._runT = 0;
            const t = Math.min(1, player.speed / (TOP_SPEED * RUN_THRESHOLD));
            const animSpd = ANIM_WALK + (ANIM_RUN - ANIM_WALK) * t;
            player._walkT += dt * animSpd;
            applyKFInterp(player, player._walkT, player._walkKFs);
        } else {
            player._walkT = 0;
            player._runT = 0;
            // apply idle pose from idle.json, falling back to rest pose
            if (player._idleKFs.length >= 1) {
                applyKFInterp(player, 0, [player._idleKFs[0], player._idleKFs[0]]);
            } else {
                restPose(player);
            }
            // layer subtle sway on top of idle pose
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

        if (player._inAir) {
            const root = player._bones["GLTF_created_0_rootJoint"];
            if (root) {
                root.rotation.x += Math.max(0, player._jumpVel / (JUMP_BASE + JUMP_BOOST)) * -0.28;
            }
        }
    }
}
