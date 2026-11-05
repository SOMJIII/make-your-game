# Five Nights at Freddy's — JavaScript Fan Remake

A faithful recreation of **Five Nights at Freddy's 1** built with plain **HTML, CSS and JavaScript**.
No game engine, no framework, no `<canvas>` — every screen, overlay and animation is a DOM element styled with CSS and driven by a `requestAnimationFrame` game loop.

> Fan project made for learning purposes. Five Nights at Freddy's and all related characters, images and sounds are © Scott Cawthon. This project is not affiliated with or endorsed by the original creator.

---

## Requirements

- [Node.js](https://nodejs.org/) (any recent version) — only used to run a small local web server
- A modern browser (Chrome, Edge, Firefox)

No `npm install` is needed. The server uses only Node's built-in modules.

---

## How to Run

```bash
node start.js
```

Then open **http://localhost:8080** (on Windows it opens automatically).

**Why a server?** Browsers block some features (like loading audio and images reliably) when a page is opened directly as a file. `start.js` serves the project folder over `http://` so everything loads correctly.

If you see `Port 8080 in use`, close the other program using that port (or a previous server window) and run it again.

---

## Controls

| Action | How |
|---|---|
| Look left / right | Move the mouse to the left or right edge of the screen |
| Open / close cameras | Move the mouse over the bar at the bottom-center of the screen |
| Switch camera | Click a room on the map |
| Close / open a door | Click the **DOOR** button |
| Turn on a hall light | Hold the **LIGHT** button |
| Pause | `ESC` |
| Mute the phone call | **MUTE CALL** button (top-left) |

---

## Features

**Gameplay**
- Nights 1–5, 6th Night, and Custom Night (AI 0–20 for each animatronic)
- Authentic movement system: every 5 seconds each animatronic rolls 1–20 and moves if the roll is ≤ its AI level
- AI levels increase at 2 AM and 4 AM following each night's schedule
- Power system: 0–999 internal units shown as 0–100%, drained by usage level plus a passive drain from Night 2 onward
- Power outage sequence: lights out → Freddy appears with the music box → you survive only if 6 AM arrives within 20 seconds

**Animatronics**
- **Bonnie** — approaches from the left and can skip rooms
- **Chica** — approaches from the right, one room at a time; heard in the Kitchen
- **Freddy** — follows Chica's route, cannot move while you are watching him on camera
- **Foxy** — advances through 4 stages in Pirate's Cove, stalls whenever the cameras are up, and drains more power each time he hits a closed door (1%, 6%, 11%, 16%…)

**Presentation**
- Pixel font, camera static, room map, recording dot, usage bars
- Kitchen camera is audio-only, as in the original
- Phone calls for Nights 1–5 (pause with the game)
- Stars and progress saved in the browser (`localStorage`), with a confirmation before New Game overwrites a save
- Office view scales to any screen size so you can always pan left and right
- Easter egg: set Custom Night to **1 / 9 / 8 / 7**

---

## Project Structure

```
fnaf/
├── index.html        All screens: menu, custom night, office, cameras, game over, 6 AM
├── start.js          Local Node.js HTTP server
├── README.md
├── css/
│   └── style.css     All styling and CSS animations
├── fonts/
│   └── silkscreen.ttf  Pixel font
├── js/               Loaded in this order (each depends on the ones above it)
│   ├── save.js       localStorage save/load, stars stored as a bitmask
│   ├── sound.js      Audio preloading, loops, phone calls, title music
│   ├── power.js      Power drain and outage
│   ├── ai.js         Animatronic movement, door attacks, Foxy, power-out Freddy
│   ├── office.js     Office view, doors, lights, panning and scaling
│   ├── cameras.js    Camera open/close, room switching, static, map
│   ├── ui.js         Clock, HUD, night intro, jumpscare, game over, 6 AM screen
│   ├── menu.js       Main menu, custom night, transitions, confirm dialog
│   └── game.js       Game loop and night start/end — the entry point
├── graphics/
│   ├── cameras/      Camera room images and map
│   ├── jumpscares/
│   ├── menu/         Menu Freddy images and static
│   ├── office/       Office state images
│   └── ui/           Custom night portraits, victory animation
└── sounds/           Sound effects, music and phone calls
```

---

## How It Works (Short Version)

- **Modules:** each file (except `save.js`) is an IIFE — `const Name = (() => { ... return {...}; })();` — so its variables are private and only the returned functions are public.
- **Game loop:** `game.js` calls `requestAnimationFrame` every frame, calculates delta time (`dt`, capped at 100 ms), and updates Power → AI → Office → Cameras → Clock in that order.
- **Frame-rate independence:** timers use accumulators (`timer += dt; if (timer >= interval) {...}`) so the game runs at the same speed at any FPS and freezes naturally when paused.
- **Screens:** every screen is a `<div class="screen">`; only the one with `.active` is shown.
- **Sequences:** intros, jumpscares and the 6 AM screen return Promises, so they are chained with `async/await`.
- **Saving:** progress is stored as JSON in `localStorage`; the six stars are packed into one integer using bitwise operators.

---

## Known Limitations

- Timers created with `setTimeout` (door attacks, Foxy's run, Freddy's power-out countdown) keep counting while the game is paused.
- After **Restart Night** from the pause menu, press `ESC` once if the game appears frozen.
- Custom Night uses the passive power drain of the last night played.
- Browsers block audio until the first interaction, so the title music starts when you first move the mouse or click.
