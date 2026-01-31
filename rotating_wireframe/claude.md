# Rotating Wireframe

Simple 3D wireframe renderer with constant rotation.

## Features

- **Black background** with **white wireframe** rendering
- **Turntable rotation**: Constant horizontal (Y-axis) rotation at 0.01 rad/frame

## Setup

1. The 3D model is included as `model.glb`
2. See `LICENSE.txt` for model attribution

## Model Requirements

- **Format**: GLB (binary glTF)
- **Polygon count**: Low poly recommended (< 10k faces)
- **Materials**: Will be replaced with white wireframe automatically

## How It Works

### Rendering

- Loads 3D model from GLB file
- Converts all materials to white wireframe
- Auto-scales model to 40% of viewport height
- Centers horizontally and positions at bottom with buffer
- Constantly rotates on Y-axis (turntable effect)

## Technology

- Three.js r170 (via CDN)
- GLTFLoader for model loading
- Pure JavaScript (no build process)

## Running

Open `index.html` in a browser or let the orchestrator load it automatically.
