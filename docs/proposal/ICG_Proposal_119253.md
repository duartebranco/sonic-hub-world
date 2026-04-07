**Sonic Hub World \- Project Proposal**

This document is the required project proposal for **ICG**, made by **Duarte Branco** (nº **119253**).

**Project Overview**

This project proposes the development of an open 3D hub world inspired by the known character *Sonic the Hedgehog*. This concept was already implemented in the original *Sonic Jam* (1997) game for the Sega Saturn, so this project will be heavily inspired by it.

In the original game, the hub world served merely as a place where the player could roam around and enter the rooms where he would play the actual games. Yet, in this project, the hub will only allow the player to roam around and explore the scenery, without any particular goal. I might add "checkpoints" throughout the map, so the player could play mini-races (go from checkpoint A to checkpoint B), but it would not be the main/sole purpose of the game.

**Scene & 3D Modeling**

The world will be a typical Sonic environment, resembling the Green Hill Zone (most iconic Sonic zone). It will have varied terrain, including grassy hills, paths and water zones. Key necessary models include: trees, rings, flowers, walls, water, enemies and Sonic. For these models, everyone but Sonic will be made entirely by me using only three.js (not blender). The Sonic model will be one made by someone else (I will give credit to the original author), but, the animations (running, walking, jumping, rolling) and the facial emotions (smiling, amazed, serious) will still be done by me.

**Animation**

Sonic will be animated by changing the skeleton of the model, using stored JSON keyframes, while the other model's animations use the three.js animation system, since they are simpler and don't require such complex motions. The camera will smoothly follow Sonic using interpolated tracking, reacting to his speed and movement direction.

**Illumination & Textures**

The scene will use a combination of ambient and directional lighting to simulate natural sunlight. Textures will be applied to the terrain, water, and props, and a skybox will frame the scene with a sky consistent with the Green Hill Zone aesthetic.

**User Interactivity**

The user will be able to control Sonic with these controls:

\- **WASD** \- move Sonic around the world  
\- **Mouse** \- move the camera around the character  
\- **Space** \- jump  
\- **Shift** \- spin dash