import { buildTerrain, buildPath, groundY } from "./terrain.js";
import { buildCliffs } from "./cliffs.js";
import { buildTrees } from "./trees.js";
import { buildFlowers } from "./flowers.js";
import {
    buildRings,
    buildSparkleSystem,
    buildGoalRing,
    resetRings,
    buildScatterRingSystem,
} from "./rings.js";
import { buildAmbientParticles } from "./particles.js";
import { buildMobs } from "./mobs.js";

export { groundY, resetRings };

export function buildWorld(scene) {
    buildTerrain(scene);
    buildPath(scene);
    buildCliffs(scene);
    buildTrees(scene);

    const flowerSpinners = buildFlowers(scene);
    const rings = buildRings(scene);
    const goalRing = buildGoalRing(scene);
    const sparkleSystem = buildSparkleSystem(scene);
    const scatterRingSystem = buildScatterRingSystem(scene);
    const ambientParticles = buildAmbientParticles(scene);
    const mobs = buildMobs(scene);

    return {
        flowerSpinners,
        rings,
        goalRing,
        sparkleSystem,
        scatterRingSystem,
        ambientParticles,
        mobs,
    };
}
