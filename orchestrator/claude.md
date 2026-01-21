# Orchestrator

An audio-reactive window orchestrator that opens/closes browser windows displaying other vibe_codes projects based on microphone input.

## Overview

- **Technology**: Electron (Node.js + Chromium)
- **Audio**: Web Audio API with time-domain analysis
- **Window Management**: Electron BrowserWindow API

## How It Works

### Audio Analysis

Uses time-domain waveform analysis (same approach as `pitchy_soundwave`):
- Captures microphone via `getUserMedia`
- Analyzes amplitude using `getByteTimeDomainData()`
- Calculates volume as average deviation from center (128)
- Rolling volume history for average calculation

This approach accurately reflects actual sound levels - silence shows ~0, loud sounds show higher values.

### Window Open Logic

Opens a new window when:
- Current volume > average × 1.2 (20% spike)
- Volume > 5 (noise gate)
- Cooldown of 500ms has passed since last open
- Average volume > 2 (not silence)

When at max windows (20), bass hits trigger **cycling**: close oldest + open new.

### Window Close Logic

Closes oldest window when:
- Volume drops to < 50% of average (quiet moment)
- Cooldown of 800ms has passed since last close
- Window count >= 5 (minimum to allow closing)

### Project Limits

- Maximum 7 windows per project for better variety
- Randomly selects from available projects that haven't reached max

### Microphone Permissions

Electron auto-grants microphone permissions to all windows via `setPermissionRequestHandler`. Each project window captures audio independently.

## Configuration

Parameters in `renderer/renderer.js`:

| Parameter | Default | Effect |
|-----------|---------|--------|
| `OPEN_THRESHOLD` | 1.2 | Volume spike multiplier to open (20% above avg) |
| `OPEN_COOLDOWN` | 500ms | Time between opens |
| `NOISE_GATE` | 5 | Absolute minimum volume to trigger |
| `MIN_BASS_LEVEL` | 2 | Minimum average volume |
| `CLOSE_COOLDOWN` | 800ms | Time between closes |
| `MIN_WINDOWS_TO_CLOSE` | 5 | Minimum windows before closing |
| `MAX_WINDOWS` | 20 | Maximum windows |
| `MAX_PER_PROJECT` | 7 | Maximum windows per project |

## Project Structure

```
orchestrator/
├── main.js           # Electron main process - window management
├── preload.js        # Secure IPC bridge
├── renderer/
│   ├── index.html    # Control panel UI
│   ├── renderer.js   # Audio analysis + decision logic
│   └── styles.css    # Styling
├── package.json
└── PLAN.md           # Implementation plan
```

## Running

```bash
cd orchestrator
npm install
npm start
```

## Available Projects

The orchestrator randomly selects from:
- `circling_cycle` - Text animation along SVG paths (audio-reactive highlight speed)
- `lucid_dream` - Slot-machine style letter display
- `pitchy_soundwave` - Microphone waveform visualizer
- `rotating_gliph` - Audio-reactive 3D dodecahedron

## Controls

- **Open Window**: Manually open a random project window
- **Close Window**: Manually close the oldest window
- Audio visualization and window count displayed in control panel
