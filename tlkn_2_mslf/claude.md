# tlkn_2_mslf

An auto-playing chat interface where messages transform to base64 as they age. Message speed is audio-reactive.

## Overview

- **Technology**: Vanilla JavaScript, Web Audio API
- **Audio**: Time-domain RMS volume analysis
- **Display**: CSS Flexbox with column-reverse flow

## How It Works

### Chat System

Two participants (A and B) exchange messages automatically in alternating turns. Each has 20 pre-defined sentences that cycle indefinitely.

- **Participant A** (right, blue): Asks introspective questions
- **Participant B** (left, grey): Provides cryptic responses

### Base64 Transformation

Only the **2 freshest messages** display in plain English. All older messages automatically transform to their base64 representation, creating a visual trail of encoded conversation history.

### Message Flow

Messages appear at the bottom and push older messages upward. When messages exit the viewport at the top, they are automatically removed from the DOM (checked via `getBoundingClientRect`).

### Opacity Fading

Messages fade from 100% opacity (newest) to 20% opacity (oldest) over a configurable number of messages (`FADE_OVER_MESSAGES`). This creates a visual depth effect.

### Animations

- **Entry**: Messages slide in from left/right with fade and subtle scale
- **Expansion**: Height animates to smoothly push older messages up
- **Opacity**: Smooth transitions when opacity changes

### Audio Reactivity

Microphone input controls the speed at which messages appear:
- **Loud** → Fast messages (800ms interval)
- **Quiet** → Slow messages (3000ms interval)

Volume is calculated using time-domain RMS analysis (same approach as other vibe_codes projects).

## Configuration

Parameters in `index.html`:

| Parameter | Default | Effect |
|-----------|---------|--------|
| `MIN_INTERVAL` | 800ms | Fastest message speed (loud) |
| `MAX_INTERVAL` | 3000ms | Slowest message speed (quiet) |
| `VOLUME_SCALE` | 24 | Audio normalization factor |
| `FRESH_MESSAGE_COUNT` | 2 | Messages shown in plain text |
| `FADE_OVER_MESSAGES` | 12 | Messages to fade from 100% to 20% opacity |
| `FFT_SIZE` | 2048 | Audio buffer size |
| `AUDIO_UPDATE_MS` | 100ms | Audio analysis throttle |

## Styling

- **Background**: Black
- **Font**: Courier New (monospace), white
- **Right bubble**: Apple blue (#0b84fe)
- **Left bubble**: Apple dark grey (#3a3a3c)
- **Max width**: 820px, centered on larger screens

## Running

Open `index.html` in a browser and grant microphone permission.

```bash
cd tlkn_2_mslf
open index.html  # macOS
# or just double-click the file
```

## Project Structure

```
tlkn_2_mslf/
├── index.html    # All code (HTML, CSS, JS)
└── claude.md     # This file
```
