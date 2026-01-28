# draw_m3_like_one_of_your_ZnJlbmNoIGdpcmxz

An audio-reactive ASCII art visualizer that displays images as ASCII characters with per-line opacity controlled by audio.

## Overview

- **Visual**: ASCII art representation of images, each line with independent opacity
- **Technology**: Loads pre-converted ASCII from gallery.json, Web Audio API for audio reactivity
- **Animation**: Line opacities ripple based on time-domain audio data

## How It Works

### ASCII Loading

1. Loads `gallery.json` containing pre-converted ASCII images
2. Picks a random image from the gallery
3. Sends resize request to parent (orchestrator) with exact dimensions
4. Renders each line as a separate DOM element

### Window Sizing

The project calculates exact pixel dimensions based on ASCII size:
- **Width** = columns × 0.455 × FONT_SIZE
- **Height** = lines × FONT_SIZE

It sends `{ type: 'resize', width, height }` via postMessage to the orchestrator, which resizes the window accordingly.

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
| `FONT_SIZE` | 10 | Base font size in pixels |
| `CHAR_WIDTH_RATIO` | 0.455 | Character width ratio (matches ascii_magic) |
| `minOpacity` | 0.15 | Opacity during silence |
| `maxOpacity` | 1.0 | Opacity at peak volume |

## Gallery Format

`gallery.json`:
```json
{
  "images": [
    {
      "id": "image-name",
      "source": "original-file.jpg",
      "columns": 160,
      "lines": ["line1", "line2", ...]
    }
  ]
}
```

Generate with the ascii-service CLI:
```bash
cd ascii-service
./venv/bin/python cli.py image.jpg --mode json --id myimage -c 160 \
  --append-to ../draw_m3_like_one_of_your_ZnJlbmNoIGdpcmxz/gallery.json
```

## Styling

- Monospace font, 10px size
- White text on black background
- CSS transition (0.1s) for smooth opacity changes
- line-height: 1 for compact display

## Running Standalone

```bash
cd draw_m3_like_one_of_your_ZnJlbmNoIGdpcmxz
python3 -m http.server 8000
# Open http://localhost:8000
```

Or open via the orchestrator project selector.
