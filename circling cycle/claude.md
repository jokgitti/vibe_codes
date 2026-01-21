# Animated Text Path

An animated visualization that displays repeating words flowing along SVG paths, with a traveling highlight effect.

## Overview

- **Visual**: White text on black background, characters follow geometric shapes
- **Technology**: HTML5 Canvas for rendering, SVG paths for shape definitions
- **Animation**: Characters flow along the path while a highlight "wave" travels independently

## How It Works

### Path System

Characters are positioned along SVG paths using the SVG DOM API:
- `getTotalLength()` - gets the path's total length
- `getPointAtLength(distance)` - gets x,y coordinates at any point along the path

Available shapes:
- Circle
- S-shape
- Figure 8
- Heart (default)
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

Two independent animations run simultaneously:

1. **Path Flow** (`pathSpeed: 0.000075`)
   - All characters move along the path together
   - Creates a continuous flowing effect

2. **Highlight Wave** (`highlightSpeed: 0.0002`)
   - A single word-length segment is brightened (opacity 1.0 vs 0.5)
   - Moves faster than the text, creating a "scanning" effect

### Auto-Rotation

Every 15 seconds (`changeInterval`), the system randomly selects:
- A new shape from the paths object
- A new word from the 20-word pool

## Configuration

All parameters are in the `config` object:

| Parameter | Default | Effect |
|-----------|---------|--------|
| `targetWord` | 'love' | The word to display |
| `fontSize` | 32 | Text size in pixels |
| `defaultOpacity` | 0.5 | Opacity of non-highlighted text |
| `highlightOpacity` | 1.0 | Opacity of highlighted word |
| `pathSpeed` | 0.000075 | Speed of text flow |
| `highlightSpeed` | 0.0002 | Speed of highlight travel |
| `changeInterval` | 15000 | Ms between shape/word changes |

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

## Running the App

Simply open `index.html` in a browser - no server required.
