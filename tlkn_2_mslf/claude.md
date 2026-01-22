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

### Audio Reactivity (Beat Detection)

Messages are triggered by audio beats, similar to `rotating_gliph`:
- Compares current volume to rolling average
- When volume spikes above threshold, a new message appears
- Cooldown prevents rapid-fire messages

This creates a reactive conversation that responds to sound - claps, music beats, or voice will trigger new messages.

## Configuration

Parameters in `index.html`:

| Parameter | Default | Effect |
|-----------|---------|--------|
| `BEAT_THRESHOLD` | 1.08 | Volume spike multiplier (8% above average) |
| `BEAT_COOLDOWN` | 300ms | Minimum time between messages |
| `VOLUME_HISTORY_SIZE` | 30 | Rolling window for average (~0.5s) |
| `MIN_VOLUME` | 2 | Minimum average to avoid silence triggering |
| `FRESH_MESSAGE_COUNT` | 2 | Messages shown in plain text |
| `FADE_OVER_MESSAGES` | 12 | Messages to fade from 100% to 20% opacity |
| `FFT_SIZE` | 512 | Audio buffer size (smaller = more responsive) |

Volume is calculated from frequency data with kick frequencies (< 150Hz) boosted 2x for better beat detection.

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
