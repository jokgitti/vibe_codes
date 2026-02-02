# draw_m3_like_one_of_your_ZnJlbmNoIGdpcmxz

An audio-reactive ASCII art visualizer that displays an image as ASCII characters with per-line opacity controlled by audio.

## Overview

- **Visual**: ASCII art representation of an image, each line with independent opacity
- **Technology**: Canvas-based rendering, Web Audio API for audio reactivity
- **Animation**: Line opacities ripple based on time-domain audio data

## How It Works

### ASCII Loading

ASCII art is pre-generated and stored in `gallery.json`:
- **Standalone mode**: Fetches `gallery.json` and selects image by URL parameter or random
- **Orchestrator mode**: Receives image data directly via `postMessage` (no fetch needed, instant render)

### Canvas Rendering

All lines are rendered to a single `<canvas>` element in one pass per frame:
- Uses `ctx.fillText()` with varying `rgba()` alpha values per line
- Device pixel ratio scaling for sharp text on retina displays
- Debounced rendering via `requestAnimationFrame`

This is significantly faster than DOM-based rendering (which would require N style mutations per frame).

### Audio Reactivity

Each line's opacity is controlled by a sample from the time-domain audio buffer:

```
Line 0 → Sample 0
Line 1 → Sample N
Line 2 → Sample 2N
...
```

Where N = buffer length / number of lines.

The mapping:
- **Silence** (sample = 128): Low opacity (0.15)
- **Loud** (sample near 0 or 255): High opacity (1.0)

This creates a vertical wave/ripple effect as sound passes through.

### Audio Sources

1. **Orchestrator mode**: Receives `timeDomainData` via `postMessage`
2. **Standalone mode**: Falls back to local microphone after 2 second delay

## Configuration

In `index.html`:

| Parameter | Default | Effect |
|-----------|---------|--------|
| `DEFAULT_FONT_SIZE` | 10 | Maximum font size in pixels |
| `MIN_FONT_SIZE` | 4 | Minimum font size |
| `CHAR_WIDTH_RATIO` | 0.6 | Monospace character width ratio for canvas |
| `MIN_OPACITY` | 0.15 | Opacity during silence |
| `OPACITY_RANGE` | 0.85 | Range from min to max (1.0 - 0.15) |

## Gallery Format

`gallery.json` contains pre-generated ASCII art:

```json
{
  "images": [
    {
      "id": "image-name",
      "columns": 160,
      "lines": ["line1", "line2", ...],
      "frames": [["frame1-line1", ...], ...]  // For animated GIFs
    }
  ]
}
```

- `lines`: Static images
- `frames`: Animated GIFs (advances on beat detection)

## Styling

- Monospace font, dynamically sized to fit constraints
- White text on black background
- Canvas-based rendering (no CSS transitions needed)

## Running Standalone

```bash
cd draw_m3_like_one_of_your_ZnJlbmNoIGdpcmxz
python3 -m http.server 8000
# Open http://localhost:8000
```

Or open via the orchestrator project selector.
