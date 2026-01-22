# Audio-Reactive Dodecahedron

A simple JavaScript application that displays a wireframe dodecahedron that rotates based on audio input from the microphone.

## Overview

- **Visual**: White wireframe dodecahedron on black background, centered on screen
- **Technology**: Three.js for 3D rendering, Web Audio API for audio analysis
- **Animation**: Smooth rotation with ease-out curve (starts fast, ends slow)

## How It Works

### Beat Detection

The system detects "beats" by comparing current volume to recent average volume:

```
if (currentVolume > averageVolume * BEAT_THRESHOLD)
    → trigger rotation
```

**Parameters:**
- `BEAT_THRESHOLD = 1.25` - Current volume must be 25% above average to trigger
- `BEAT_COOLDOWN = 300ms` - Minimum time between triggers
- `MIN_VOLUME = 5` - Minimum average volume to avoid silence triggering
- `VOLUME_HISTORY_SIZE = 30` - Rolling window for average (~0.5 seconds at 60fps)

Volume is calculated from FFT frequency data, with sub-bass frequencies weighted 2x to better detect EDM kicks.

### Axis Selection (Frequency-Based)

The rotation axis is determined by which frequency band has the most energy:

| Frequency Range | Sound Type | Axis |
|-----------------|------------|------|
| 40-150 Hz       | Kick drums (sub-bass) | X |
| 150-2500 Hz     | Snares, synths, vocals | Y |
| 2500+ Hz        | Hi-hats, cymbals | Z |

These ranges are tuned for EDM music. Kick energy is boosted 1.5x to prioritize bass-driven rotation.

### Rotation Direction (Energy Trend)

Direction is determined by whether the overall energy is building up or dropping:

- **Energy increasing** → rotate forward (+25°)
- **Energy decreasing** → rotate backward (-25°)

To prevent rapid bouncing, the direction uses "sticky" behavior:
1. Compares average of last 5 samples vs older samples
2. Only changes direction if energy differs by at least 10% (`DIRECTION_CHANGE_THRESHOLD = 1.10`)
3. Otherwise, maintains current direction

This makes the shape respond to actual build-ups and drops rather than frame-to-frame noise.

## Tunable Parameters

All parameters are at the top of `main.js`:

| Parameter | Default | Effect |
|-----------|---------|--------|
| `BEAT_THRESHOLD` | 1.25 | Lower = more sensitive to beats |
| `BEAT_COOLDOWN` | 300ms | Lower = can trigger more frequently |
| `MIN_VOLUME` | 5 | Lower = triggers on quieter sounds |
| `DIRECTION_CHANGE_THRESHOLD` | 1.10 | Lower = direction changes more easily |
| `ROTATION_AMOUNT` | 25° | Degrees per rotation |
| `animationDuration` | 500ms | How long each rotation animation takes |

## Audio Setup

- **FFT Size**: 512 (larger for better bass resolution)
- **Smoothing**: 0.3 (lower = more reactive to transients)
- **Sample Rate**: Assumes 44100 Hz

## Fallback Behavior

If microphone access is denied, the app falls back to the original behavior:
- Rotates every 2 seconds
- Random axis selection
- Always rotates forward

## Running the App

Microphone access requires a secure context:

```bash
python3 -m http.server 8000
# Then open http://localhost:8000
```

## Design Decisions

1. **Why Three.js?** - Built-in DodecahedronGeometry, handles WebGL complexity, easy wireframe rendering with EdgesGeometry

2. **Why beat detection over continuous rotation?** - More visually interesting, creates rhythmic movement that syncs with music

3. **Why frequency-based axis selection?** - Creates visual variety based on sound content, different instruments affect different axes

4. **Why sticky direction with threshold?** - Raw frame-by-frame comparison caused excessive "bouncing" back and forth; smoothing creates more intentional-looking movement

5. **Why boost kick frequencies?** - EDM is kick-driven; boosting sub-bass ensures the main beat drives the visualization

6. **Why ease-out animation curve?** - Starts fast (reactive feel) but ends slow (smooth landing), feels more natural than linear or instant
