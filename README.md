# Lakefront — First-Person Hunt

A procedural Three.js FPS set in a floating boat on a mountain lake. The 360-degree shoreline, instanced forest, terrain, animated shader water, birds, boat, and weapons are generated from code—there are no external model, image, or texture assets. Audio files are supplied locally under `public/audio/`.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Install and run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

For a production build, run `npm run build`. To serve that build locally, run `npm run preview`.

## Controls

- **PC:** Start the hunt, use W/S to accelerate or reverse, A/D to steer, mouse to look, left-click or Space to shoot, R for the reload animation, and 1–4 to switch weapons.
- **Mobile:** Use the left joystick to move, drag the scene to look, tap FIRE to shoot, and use the numbered buttons to switch weapons.
- Use **Aim Assist** in the HUD to toggle aim assistance. Every weapon has unlimited ammunition.
- Use **Sound** in the HUD to mute or unmute game audio.

If the browser does not grant pointer lock, move the mouse to look around; click-drag also works.

## Audio assets

Add these MP3 files under `public/audio/`. Playback starts after **Start Hunt** is clicked:

- `gunshot-1.mp3` — Trail Carbine
- `gunshot-2.mp3` — Lake Revolver
- `gunshot-3.mp3` — Ranger Shotgun
- `gunshot-4.mp3` — Longscope
- `reload.mp3` — reload
- `bird-hit.mp3` — bird hit
- `water-wind-loop.mp3` — looping lake water and light wind ambience

Free sound effects can be downloaded from [Pixabay Sound Effects](https://pixabay.com/sound-effects/) or [Freesound](https://freesound.org/). Check the individual asset's license and attribution requirements before using it; Freesound files have varying licenses.
