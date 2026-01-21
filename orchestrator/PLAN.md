# Orchestrator - Implementation Plan

An audio-reactive window orchestrator that opens/closes browser windows displaying other projects based on microphone input.

## Requirements Summary

- Capture microphone audio and analyze it (similar to rotating_gliph)
- Open browser windows showing random projects from the vibe_codes folder
- Max 20 windows, each 400x400px
- Start with 0 windows
- Sound analysis determines when to open/close windows
- Windows can only close if there are at least 5 open

## Technology Choice: Electron

**Why Electron over pure Node.js:**
- Built-in Web Audio API (same as browser)
- Full window management via `BrowserWindow` class (size, position, multiple windows)
- Can load local HTML files directly
- Single runtime for audio analysis + window control

**Alternatives considered:**
- Node.js + Puppeteer: Heavy, complex setup, overkill for this use case
- Node.js + `open` package: No control over window size/position
- Node.js + native audio libs: Complex setup, platform-specific issues

## Architecture

```
orchestrator/
├── package.json
├── main.js              # Electron main process - window management
├── renderer/
│   ├── index.html       # Control panel UI
│   ├── renderer.js      # Audio analysis + IPC to main process
│   └── styles.css       # Simple styling
└── claude.md            # Project documentation
```

### Process Communication

```
┌─────────────────────────────────────────────────────────┐
│  Renderer Process (renderer.js)                         │
│  - Microphone capture via getUserMedia                  │
│  - Audio analysis (FFT, beat detection, energy trends)  │
│  - Decision logic (open/close window)                   │
│  - Send commands via IPC                                │
└──────────────────────┬──────────────────────────────────┘
                       │ ipcRenderer.send('open-window')
                       │ ipcRenderer.send('close-window')
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Main Process (main.js)                                 │
│  - Manage BrowserWindow instances                       │
│  - Track open windows (array of window refs)            │
│  - Random project selection                             │
│  - Window positioning                                   │
└─────────────────────────────────────────────────────────┘
```

## Audio Analysis Strategy

Reuse the approach from `rotating_gliph/main.js`:

### Beat Detection
```javascript
if (currentVolume > averageVolume * BEAT_THRESHOLD && cooldownPassed) {
  // Potential window action
}
```

### Window Open/Close Decision

Two approaches to consider:

#### Option A: Energy-Based (Recommended)
- **High energy spike** → Open a new window
- **Sustained low energy** → Close a window (if >= 5 open)
- Use separate thresholds and cooldowns for open vs close

```javascript
// Open: Quick reaction to energy spike
if (energy > avgEnergy * OPEN_THRESHOLD && windowCount < 20) {
  openWindow();
}

// Close: Sustained quiet period
if (avgEnergy < QUIET_THRESHOLD && quietDuration > QUIET_TIME && windowCount >= 5) {
  closeWindow();
}
```

#### Option B: Frequency-Based
- **Low frequencies dominant (bass)** → Open window
- **High frequencies dominant (hi-hats)** → Close window
- More musical but less intuitive

### Recommended Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `OPEN_THRESHOLD` | 1.3 | Volume spike to open (30% above average) |
| `OPEN_COOLDOWN` | 500ms | Minimum time between opens |
| `QUIET_THRESHOLD` | 0.3 | Energy level considered "quiet" |
| `QUIET_DURATION` | 2000ms | How long quiet before close |
| `CLOSE_COOLDOWN` | 1000ms | Minimum time between closes |
| `MIN_WINDOWS_TO_CLOSE` | 5 | Minimum windows before closing allowed |
| `MAX_WINDOWS` | 20 | Maximum windows |

## Window Management

### Window Creation
```javascript
const win = new BrowserWindow({
  width: 400,
  height: 400,
  frame: true,           // Keep window chrome for user control
  resizable: false,      // Fixed size
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true
  }
});

// Load random project
const projects = ['circling cycle', 'lucid_dream', 'pitchy_soundwave', 'rotating_gliph'];
const randomProject = projects[Math.floor(Math.random() * projects.length)];
win.loadFile(`../${randomProject}/index.html`);
```

### Window Positioning
Scatter windows randomly within screen bounds:
```javascript
const { width, height } = screen.getPrimaryDisplay().workAreaSize;
const x = Math.floor(Math.random() * (width - 400));
const y = Math.floor(Math.random() * (height - 400));
win.setPosition(x, y);
```

### Window Tracking
```javascript
const openWindows = []; // Array of BrowserWindow references

function openWindow() {
  const win = new BrowserWindow({...});
  openWindows.push(win);
  win.on('closed', () => {
    const index = openWindows.indexOf(win);
    if (index > -1) openWindows.splice(index, 1);
  });
}

function closeWindow() {
  if (openWindows.length >= 5) {
    const win = openWindows[Math.floor(Math.random() * openWindows.length)];
    win.close();
  }
}
```

## Control Panel UI

Simple UI showing:
- Current window count (0-20)
- Audio level meter
- Status indicators (listening, opening, closing)
- Manual controls for testing (open/close buttons)

```
┌─────────────────────────────────┐
│  ORCHESTRATOR                   │
│                                 │
│  Windows: ████████░░░░  8/20    │
│  Audio:   ▁▂▃▅▆▇█▆▅▃▂▁          │
│                                 │
│  Status: Listening...           │
│                                 │
│  [Open Window]  [Close Window]  │
└─────────────────────────────────┘
```

## Implementation Steps

### Phase 1: Basic Electron Setup
1. Initialize npm project with Electron dependency
2. Create main.js with basic window creation
3. Create renderer with simple UI
4. Test window opening/closing manually

### Phase 2: Audio Analysis
1. Port audio analysis code from rotating_gliph
2. Implement beat detection in renderer
3. Add visual audio level meter
4. Test audio reactivity

### Phase 3: Window Logic
1. Implement open/close decision algorithm
2. Add IPC communication between renderer and main
3. Implement window tracking in main process
4. Add cooldowns and thresholds

### Phase 4: Window Management
1. Implement random project selection
2. Add random window positioning
3. Handle window close events (user manually closing)
4. Add proper cleanup on app quit

### Phase 5: Polish
1. Add control panel styling
2. Add status indicators
3. Handle edge cases (all projects filtered, screen bounds)
4. Test with actual music

## Dependencies

```json
{
  "devDependencies": {
    "electron": "^28.0.0"
  }
}
```

No other dependencies needed - Electron includes everything.

## Running the App

```bash
cd orchestrator
npm install
npm start
```

## Design Decisions

1. **Microphone sharing:** Each window captures microphone independently. Electron auto-grants permissions via `setPermissionRequestHandler`, so no popups and no project modifications needed.

2. **Window close strategy:** Close the oldest window first (FIFO).

3. **Audio access:** All spawned windows can use the microphone. Projects like `rotating_gliph` and `pitchy_soundwave` will work with their own audio analysis.
