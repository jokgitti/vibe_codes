# draw_m3_like_one_of_your_ZnJlbmNoIGdpcmxz

An audio-reactive ASCII art visualizer that displays an image as ASCII characters with per-line opacity controlled by audio.

## Overview

- **Visual**: ASCII art representation of an image, each line with independent opacity
- **Technology**: Fetches ASCII from ascii-service, Web Audio API for audio reactivity
- **Animation**: Line opacities ripple based on time-domain audio data

## How It Works

### ASCII Loading

1. Calls the `ascii-service` API with an image URL
2. Receives plain text ASCII art
3. Splits into lines, each rendered as a separate DOM element

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
| `IMAGE_URL` | Gabibbo image | Source image to convert |
| `ASCII_SERVICE` | localhost:3002 | ASCII service endpoint |
| `COLUMNS` | 60 | ASCII art width in characters |
| `minOpacity` | 0.15 | Opacity during silence |
| `maxOpacity` | 1.0 | Opacity at peak volume |

## Dependencies

Requires the `ascii-service` to be running:

```bash
make ascii  # or make start
```

## Styling

- Monospace font, 8px size
- White text on black background
- CSS transition (0.1s) for smooth opacity changes
- No letter-spacing, line-height: 1 for compact display

## Running Standalone

```bash
# Start ASCII service first
make ascii

# Serve the project
cd draw_m3_like_one_of_your_ZnJlbmNoIGdpcmxz
python3 -m http.server 8000
# Open http://localhost:8000
```

Or open via the orchestrator project selector.
