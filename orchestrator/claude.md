# Orchestrator v2

## UI Guidelines

- **Always use lowercase** for all UI labels, buttons, status messages, and text

---

An audio-reactive window orchestrator that displays browser windows (iframes) showing other vibe_codes projects based on microphone input.

## Overview

- **Technology**: Electron (single window) + Virtual Windows (iframes)
- **Audio**: Web Audio API with frequency-domain analysis, single capture shared with all windows
- **Window Management**: DOM-based virtual windows with Windows 98 style chrome

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Electron Main Window (Full Screen)                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Renderer Process                                  │  │
│  │  ┌─────────────────┐  ┌─────────────────────────┐ │  │
│  │  │ Control Panel   │  │ Virtual Window Container│ │  │
│  │  │ - Audio capture │  │ ┌───────┐ ┌───────┐    │ │  │
│  │  │ - Beat detection│  │ │iframe │ │iframe │ ...│ │  │
│  │  │ - UI controls   │  │ │proj1  │ │proj2  │    │ │  │
│  │  │ - Pattern select│  │ └───────┘ └───────┘    │ │  │
│  │  └─────────────────┘  └─────────────────────────┘ │  │
│  │            │                      ▲                │  │
│  │            │    postMessage       │                │  │
│  │            └──────────────────────┘                │  │
│  │         { volume, beat, frequencyData }            │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Key Benefits (vs v1)

- **No stream limit**: Single audio capture, unlimited virtual windows (was limited to 16)
- **Better performance**: One AudioContext, no IPC overhead
- **Simpler code**: DOM manipulation instead of Electron window management
- **More visual possibilities**: Overlapping, z-ordering, animations

## How It Works

### Audio Analysis

Uses frequency-domain analysis (aligned with other projects):
- Captures microphone via `getUserMedia`
- Analyzes frequency data using `getByteFrequencyData()`
- Kick frequencies (< 150Hz) boosted 2x for better bass response
- Rolling volume history for average calculation

### Audio Broadcast

The orchestrator captures audio once and broadcasts to all iframes via `postMessage`:

```javascript
{
  type: 'audio',
  volume: 12.5,              // Calculated volume (0-128)
  beat: true,                // Beat detected this frame
  frequencyData: [...],      // For projects that need frequency data
  timeDomainData: [...],     // For waveform visualizers
  timestamp: performance.now()
}
```

Each project has been adapted to receive this external audio data when running in the orchestrator.

### Window Open Logic

Opens a new window when:
- Current volume > average × threshold (adjusted by sensitivity slider)
- Minimum volume threshold met (adjusted by sensitivity slider)
- Cooldown of 300ms has passed since last open

### Window Close Logic

Closes oldest window when:
- Volume drops to < 40% of average (relative quiet) OR volume below minimum threshold (absolute quiet)
- Adaptive cooldown has passed (800ms at moderate quiet, down to 100ms at total silence)
- At least one window is open

### Positioning Patterns

5 patterns available (selectable via dropdown):

1. **Grid Fill** (default): Fill empty grid cells left-to-right, top-to-bottom
2. **Spiral**: Start from center, spiral outward
3. **Random**: Random positions avoiding overlaps
4. **Cascade**: Stack diagonally like classic OS windows
5. **Center Burst**: Spawn from center using golden angle distribution

## Configuration

Parameters in `renderer/renderer.js`:

| Parameter | Default | Effect |
|-----------|---------|--------|
| `WINDOW_WIDTH` | 350 | Virtual window width |
| `WINDOW_HEIGHT` | 350 | Virtual window height |
| `MAX_WINDOWS` | 50 | Maximum windows (much higher now!) |
| `MAX_PER_PROJECT` | 15 | Maximum windows per project |
| `BEAT_THRESHOLD_BASE` | 1.25 | Base volume spike multiplier |
| `BEAT_COOLDOWN` | 300ms | Time between window opens |
| `MIN_VOLUME_BASE` | 5 | Base minimum volume to trigger |
| `CLOSE_COOLDOWN` | 800ms | Base time between closes (adaptive based on quietness) |

### Sensitivity Slider

The UI has a sensitivity slider (0.5x to 2.0x) that adjusts:
- Beat threshold: `1.0 + (BEAT_THRESHOLD_BASE - 1.0) / sensitivity`
- Minimum volume: `MIN_VOLUME_BASE / sensitivity`

Higher sensitivity = triggers more easily.

## Project Structure

```
orchestrator/
├── main.js           # Electron main process - single window
├── preload.js        # Minimal IPC bridge
├── renderer/
│   ├── index.html    # Control panel + window container
│   ├── styles.css    # Windows 98 style chrome
│   ├── assets/       # SVG icons (close.svg, maximize.svg)
│   └── modules/      # JS modules (main, windows, drag, audio, etc.)
├── package.json
└── CLAUDE.md         # This file
```

## Running

```bash
cd orchestrator
npm install
npm start
```

## Available Projects

The orchestrator randomly selects from:
- `draw_m3_like_one_of_your_ZnJlbmNoIGdpcmxz` - ASCII art display (audio-reactive line opacity)
- `circling_cycle` - Text animation along SVG paths (audio-reactive highlight speed)
- `lucid_dream` - Slot-machine style letter display (audio-reactive brightness)
- `pitchy_soundwave` - Microphone waveform visualizer
- `rotating_gliph` - Audio-reactive 3D dodecahedron
- `rotating_wireframe` - 3D wireframe model renderer
- `tlkn_2_mslf` - Auto-playing base64 chat (audio-reactive message timing)

### Projects with Asset Selection

Some projects support selecting specific assets instead of random selection:

**draw_m3_like_one_of_your_ZnJlbmNoIGdpcmxz** (`gallery.json`):
- Displays ASCII art versions of images (static or animated GIFs)
- Assets: cell-tower variants, dancing-miku, earth (animated), etc.
- URL parameter: `?image=<id>` (e.g., `?image=earth`)

**circling_cycle** (`shapes.json`):
- Text flowing along geometric SVG paths
- Assets: circle, s-shape, figure8, heart, star
- URL parameter: `?shape=<id>` (e.g., `?shape=heart`)

### Manual Project Opening

Press `Cmd+O` (macOS) or `Ctrl+O` (Windows/Linux) to open the project selection modal:

1. **Project dropdown**: Select which project to open
2. **Asset dropdown**: For projects with assets, choose a specific asset or "random" (default)
   - Only appears for projects that support asset selection
   - Defaults to "random" for auto-opened windows
3. Click "open" to create the window

Auto-opened windows (triggered by audio) always use random asset selection.

## Controls

- **Cmd+I**: Toggle control panel visibility
- **Cmd+O**: Open project selection modal
- **Cmd+S**: Toggle auto-open windows (vibe mode)
- **Windows bar**: Shows current/max windows
- **Audio bar**: Shows current audio level
- **BPM display**: Shows calculated tempo from detected beats (averages last 8 beats)
- **Sensitivity slider**: Adjust beat detection sensitivity
- **Pattern dropdown**: Select window positioning pattern

## Windows 98 Style

Virtual windows have Windows 98 style chrome:
- Blue gradient title bar (#000080 to #1084d0)
- 3D beveled borders (outset/inset)
- Title bar buttons with SVG icons (maximize, close)
- Maximize button to toggle fullscreen (fills main window)
- Teal desktop background (#008080)
