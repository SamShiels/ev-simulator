# Car Sim — EV Scenario Simulator

An interactive 3D scene editor for scripting autonomous EV testing scenarios. Design road layouts, choreograph actor movements, and export depth/edge-conditioned videos that get enhanced into photorealistic dashcam footage via ComfyUI — producing synthetic training data for self-driving car models.

**This is a hobby project**

## Demo

### Path Editing
[path.webm](https://github.com/user-attachments/assets/8240a6a0-f881-40bd-84ba-0ac7769d94c7)

### Rendering
[rendering.webm](https://github.com/user-attachments/assets/c114d1f4-3f82-45a4-ade0-a6bb78f0abd5)

### Example Output
https://github.com/user-attachments/assets/66c05525-7114-4be3-bfe7-4d3c1120a995

## How It Works

1. **Design** — Paint road tiles on a grid, place buildings, and define actor waypoints (pedestrians, strollers, vehicles).
2. **Simulate** — Play back the scenario to verify timing and physics. Actors follow speed profiles computed with realistic acceleration and braking.
3. **Render** — Capture depth and edge passes from the ego car's dashcam, then send them to the backend where ComfyUI (WAN2.1 14B) generates photorealistic video conditioned on those passes and a text prompt.

## Features

- **Road grid editor** — Straight, corner, and pavement tiles with rotation support
- **Actor system** — Pedestrians, strollers, and vehicles with configurable acceleration, braking, and top speed
- **Waypoint paths** — Catmull-Rom spline interpolation with physically accurate speed profiles
- **Ego car dashcam** — First-person camera with suspension simulation (pitch, roll, road rumble)
- **Multi-pass rendering** — Depth, edge, and RGB passes for AI conditioning
- **Timeline** — Visual waypoint editor with per-actor lanes
- **Scene I/O** — Save and load scenes as JSON
- **ComfyUI backend** — Automated depth/edge-conditioned video generation

## Tech Stack

| Layer | Tools |
|-------|-------|
| Frontend | React 19, Three.js, React Three Fiber, Rapier physics, Zustand, Tailwind CSS |
| Backend | FastAPI, ComfyUI, WAN2.1 (14B GGUF), PyAV |
| Build | Vite 6, TypeScript 5.7 |

## Getting Started

### Frontend

```bash
npm install
npm run dev        # http://localhost:5173
```

### Backend

```bash
cd backend
pip install -r requirements.txt
python server.py   # http://localhost:8000
```

Requires a running ComfyUI instance at `http://127.0.0.1:8188`. See [backend/api.json](backend/api.json) for the workflow and models used.

Alternatively, use Docker:

```bash
cd backend
docker-compose up
```

## Project Structure

```
src/
├── store/          # Zustand slices (road, scenario, scenery, playback)
├── ui/             # Toolbar, Sidebar, Timeline, Inspector
├── visuals/        # 3D meshes, textures, gizmos
├── hooks/          # Mouse controls, physics loop, rendering, recording
├── scenario/       # Actor types, speed interpolation
├── road/           # Pathfinding, spline curves
└── io/             # Scene save/load

backend/
├── server.py       # FastAPI render endpoint
├── api.json        # ComfyUI workflow definition
└── Dockerfile
```
