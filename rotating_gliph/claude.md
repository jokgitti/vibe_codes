# Audio-Reactive Dodecahedron

A simple JavaScript application that displays a wireframe dodecahedron that rotates on each detected beat.

## Overview

- **Visual**: White wireframe dodecahedron on black background, centered on screen
- **Technology**: Three.js for 3D rendering, Web Audio API for audio analysis
- **Animation**: Smooth rotation with ease-out curve (starts fast, ends slow)

## How It Works

### Beat Detection

**Orchestrator mode**: Receives beat signals from the orchestrator via postMessage.

**Standalone mode**: Detects beats by comparing current volume to recent average:
```
if (currentVolume > averageVolume * BEAT_THRESHOLD)
    → trigger rotation
```

**Parameters (standalone):**
- `BEAT_THRESHOLD = 1.3` - Current volume must be 30% above average to trigger
- `BEAT_COOLDOWN = 300ms` - Minimum time between triggers
- `MIN_VOLUME = 2` - Minimum average volume to avoid silence triggering
- `VOLUME_HISTORY_SIZE = 30` - Rolling window for average (~0.5 seconds at 60fps)

### Axis Selection (Beat Count)

The rotation axis cycles through X, Y, Z based on beat count:

```javascript
axis = ['x', 'y', 'z'][beatCount % 3]
```

### Rotation Direction (Beat Count)

Direction alternates every 3 beats:

```javascript
direction = (Math.floor(beatCount / 3) % 2 === 0) ? 1 : -1
```

This creates a pattern: 3 forward rotations, 3 backward, repeat.

## Tunable Parameters

All parameters are at the top of `main.js`:

| Parameter | Default | Effect |
|-----------|---------|--------|
| `BEAT_THRESHOLD` | 1.3 | Lower = more sensitive to beats (standalone only) |
| `BEAT_COOLDOWN` | 300ms | Lower = can trigger more frequently |
| `MIN_VOLUME` | 2 | Lower = triggers on quieter sounds |
| `ROTATION_AMOUNT` | 25° | Degrees per rotation |
| `animationDuration` | 250ms | How long each rotation animation takes |

## Audio Setup

- **FFT Size**: 512
- **Smoothing**: 0.3 (lower = more reactive to transients)

## Fallback Behavior

If microphone access is denied and no orchestrator connection:
- Rotates every 2 seconds
- Random axis selection
- Always rotates forward

## Running the App

**Standalone**: Microphone access requires a secure context:
```bash
python3 -m http.server 8000
# Then open http://localhost:8000
```

**With orchestrator**: Run from the orchestrator app, which broadcasts beat signals.

## Design Decisions

1. **Why Three.js?** - Built-in DodecahedronGeometry, handles WebGL complexity, easy wireframe rendering with EdgesGeometry

2. **Why beat detection over continuous rotation?** - More visually interesting, creates rhythmic movement that syncs with music

3. **Why cycle axes by beat count?** - Simple, predictable pattern that creates visual variety without complex frequency analysis

4. **Why ease-out animation curve?** - Starts fast (reactive feel) but ends slow (smooth landing), feels more natural than linear or instant
