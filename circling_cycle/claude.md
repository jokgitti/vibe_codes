# Circling Cycle - Animated Text Path

An animated visualization that displays repeating words flowing along SVG paths, with an audio-reactive highlight effect.

## Overview

- **Visual**: White text on black background, characters follow geometric shapes
- **Technology**: HTML5 Canvas for rendering, SVG paths for shape definitions, Web Audio API
- **Animation**: Characters flow along the path while a highlight "wave" travels at audio-reactive speed
- **Audio-Reactive**: Highlight speed increases with microphone input volume

## How It Works

### Path System

Characters are positioned along SVG paths using the SVG DOM API:
- `getTotalLength()` - gets the path's total length
- `getPointAtLength(distance)` - gets x,y coordinates at any point along the path

Available shapes (one selected randomly at startup):
- Circle
- S-shape
- Figure 8
- Heart
- Star (5-point)

### Text Generation

The target word is repeated to fill the entire path length:
```
word = "love"
pathText = "lovelovelovelovelove..." (truncated to fit)
```

Character count is calculated based on:
- Path length × scale factor
- Approximate monospace character width (fontSize × 0.6)

### Animation Layers

Two animations run simultaneously:

1. **Path Flow** (`pathSpeed: 0.000075`)
   - All characters move along the path together
   - Creates a continuous flowing effect
   - Constant speed

2. **Highlight Wave** (audio-reactive)
   - A single word-length segment is brightened (opacity 1.0 vs 0.5)
   - Speed varies based on microphone volume
   - Always at least 20% faster than path flow

### Audio-Reactive Highlight Speed

The highlight "scanning" speed responds to microphone input:

```javascript
MIN_HIGHLIGHT_SPEED = pathSpeed * 1.2  // 20% faster in silence
MAX_HIGHLIGHT_SPEED = 0.0004           // ~5x pathSpeed when loud
VOLUME_SCALE = 24                      // Sensitivity (lower = more sensitive)
```

Uses time-domain audio analysis (same approach as `pitchy_soundwave` and `lucid_dream`):
- Captures microphone via `getUserMedia`
- Analyzes amplitude using `getByteTimeDomainData()`
- Maps volume to highlight speed range
- Updates throttled to 100ms intervals for smooth transitions

If microphone access is denied, falls back to minimum highlight speed.

### Startup Behavior

At startup, the app randomly selects:
- One shape from the available paths
- One word from the 20-word pool

These remain fixed for the session (no cycling).

## Configuration

| Parameter | Default | Effect |
|-----------|---------|--------|
| `targetWord` | random | The word to display (selected at startup) |
| `fontSize` | 32 | Text size in pixels |
| `defaultOpacity` | 0.5 | Opacity of non-highlighted text |
| `highlightOpacity` | 1.0 | Opacity of highlighted word |
| `pathSpeed` | 0.000075 | Speed of text flow (constant) |
| `MIN_HIGHLIGHT_SPEED` | pathSpeed × 1.2 | Minimum highlight speed (silence) |
| `MAX_HIGHLIGHT_SPEED` | 0.0004 | Maximum highlight speed (loud) |
| `VOLUME_SCALE` | 24 | Volume value that maps to max speed |
| `SPEED_UPDATE_INTERVAL` | 100ms | Throttle for speed updates |

## Word Pool

20 positive/abstract words, max 6 characters each:
```
love, star, dream, hope, shine, peace, happy, smile, dance, magic,
light, music, heart, sweet, brave, free, wild, calm, joy, glow
```

## Technical Details

- Canvas is responsive and rescales on window resize
- Scale factor targets 80% of the smaller viewport dimension
- Characters remain upright (no rotation with path tangent)
- Animation uses `requestAnimationFrame` for smooth 60fps rendering
- Delta time is used for frame-rate independent animation
- Audio analysis runs every frame, speed updates throttled to 100ms

## Running the App

Simply open `index.html` in a browser. For microphone access, use:
- `file://` protocol (works in most browsers)
- Or serve via local server: `python3 -m http.server 8000`
