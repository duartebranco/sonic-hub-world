# Sonic Hub World

**Author:** Duarte Branco — 119253  
**GitHub:** https://github.com/duartebranco/sonic-hub-world  
**Live Demo:** https://duartebranco.github.io/sonic-hub-world/src/index.html

---

## Objectives

Recreate the **Sonic Jam (1997, Sega Saturn)** hub world as a browser-based 3D interactive experience built with **Three.js** (no build step — pure static ES6 modules). Sonic Jam was one of the first Sonic compilations, and its standout feature was a free-roaming open world where the player could explore, collect rings, and race around the map. This project reimplements that concept with custom design choices:

- A **procedurally generated terrain** with hills, plateaus, ramps, a loop-de-loop, lakes, and bridges — all authored directly in Three.js without external 3D software.
- A **physically expressive Sonic character** with momentum-based movement, spin-dash, slope physics, surface-normal jumping, and distinct speed tiers (walk / run / max).
- A custom **skeletal animation pipeline**: a standalone keyframe editor tool (`animator.html`) was built specifically for this project to pose the GLTF model bone-by-bone in the browser, export keyframes to JSON, and have the engine interpolate them frame-by-frame.
- Classic Sonic-style **HUD** with ring counter, race timer, lives, and spin-dash charge bar.

---

## What Is Already Done

### Player & Physics
- Full momentum physics: tangential-drag turning, slope acceleration, surface-normal jumping, air inertia, variable jump height.
- Speed tiers: WALK = 10, RUN = 24, MAX = 42 units/s.
- **Spin-dash**: hold Shift/X to charge, release to launch at TOP_SPEED = 44 for 1.8 s.
- Ground dust particles emitted at run speed and above.

### Animation System
- Custom keyframe interpolation engine (not Three.js AnimationMixer).
- Three authored animations: idle, walk, and run — each crafted with the custom `animator.html` tool.
- Facial expression switching via separate GLTF model variants (normal, no-mouth, amazed).
- Lean animation on jump.

### World
- Procedural terrain (280×280 plane, 160×160 subdivisions) using 6 layered sine functions.
- Map features: plateaus, ramps, lakes, trenches, a bridge, cliffs, trees, flowers, clouds, animated waterfall/cascade particles, and animated water surface.
- **Loop-de-loop**: circular track geometry with gravity/normal override while the player traverses it.
- Checkerboard path tiles along the intended route.
- 22 collectible rings with proximity detection (0.9 units), sparkle particles, and HUD counter.
- Badnik mob meshes placed in the world (patrol AI not yet implemented).

### Camera & HUD
- Third-person camera with spherical coordinates, mouse drag / pointer lock, and scroll zoom (3–18 units).
- HUD: ring counter, race timer, lives counter, spin-dash charge bar, Sonic-style font and loading screen.

### Tooling
- `animator.html` — standalone single-file bone-pose keyframe editor, built specifically for this project to author all character animations.

---

## What Still Needs to Be Done

| Area | Task |
|---|---|
| Animations | `spin.json` — Sonic curls into a ball during spin-dash |
| Animations | `death.json` — death pose, triggered on player death |
| World | Deliberate track layout replacing the current placeholder checkerboard path |
| World | Water zone with buoyancy / wading physics |
| Game Logic | Checkpoint trigger volumes + respawn position save |
| Game Logic | Badnik patrol AI (back-and-forth movement) |
| Game Logic | Kill logic — enemy dies on spin attack, drops rings |
| Game Logic | Player damage on enemy contact (ring loss, invincibility frames) |
| Game Logic | Player death → death animation → respawn at last checkpoint |
| Game Logic | Game over / respawn flow |
