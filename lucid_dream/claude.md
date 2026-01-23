# Lucid Dream - Letter Display

A slot-machine-style text animation that cycles through random letters before revealing words, with audio-reactive brightness.

## Overview

- **Visual**: White monospace text on black background, centered on screen
- **Technology**: Pure HTML/CSS/JavaScript, Web Audio API
- **Animation**: Letters cycle rapidly in "off" state, then reveal word left-to-right
- **Audio-Reactive**: Revealed word brightness pulses with microphone input

## How It Works

### State Machine

The display alternates between two states:

**OFF State (1.7 seconds):**
- All letters cycle through the alphabet continuously
- Each digit has an offset (3 positions apart) creating a wave effect
- Letters appear dimmed (40% opacity)

**ON State (7 seconds):**
- Letters are revealed left-to-right with 200ms delay between each
- During reveal, letters appear at 60% opacity (static)
- After all letters revealed, waits 500ms then audio-reactive pulsing begins
- Pulsing stops immediately when hide animation starts
- A new random word is selected when entering ON state

### Audio-Reactive Opacity

After all letters are revealed and a 500ms delay, opacity responds to microphone input:

```javascript
// Volume mapped to opacity range
MIN_ON_OPACITY = 0.6  // Quiet
MAX_ON_OPACITY = 1.0  // Loud
VOLUME_SCALE = 24     // Sensitivity (lower = more sensitive)
```

Uses frequency-domain audio analysis (aligned with `rotating_gliph` and `tlkn_2_mslf`):
- Captures microphone via `getUserMedia`
- Analyzes frequency data using `getByteFrequencyData()`
- Kick frequencies (< 150Hz) boosted 2x for better bass response
- Maps volume to opacity range
- Updates throttled to 100ms intervals for smooth transitions

If microphone access is denied, falls back to static opacity.

### Cycling Animation

In the off state, each digit cycles through the alphabet:
```javascript
currentIndex = (currentIndex + 1) % 26  // Every 50ms
```

The offset between digits (`OFFSET_PER_DIGIT = 3`) creates visual interest - letters appear to "roll" in sequence rather than all showing the same character.

### Reveal/Hide Animation

**Reveal (entering ON state):**
- Characters revealed left-to-right at 60% opacity
- 200ms (`CHAR_TRANSITION_TIME`) between each reveal
- `revealedCount` increments: 0 → 1 → 2 → 3 → 4 → 5
- After last letter: 500ms delay, then audio pulsing enabled

**Hide (entering OFF state):**
- Audio pulsing disabled immediately
- Characters hidden right-to-left
- Same timing, but `revealedCount` decrements: 5 → 4 → 3 → 2 → 1 → 0

## Configuration

| Parameter | Default | Effect |
|-----------|---------|--------|
| `CYCLE_INTERVAL` | 50ms | Speed of letter cycling in off state |
| `OFF_STATE_DURATION` | 1700ms | Time spent in off state |
| `ON_STATE_DURATION` | 7000ms | Time spent in on state |
| `OFFSET_PER_DIGIT` | 3 | Alphabet offset between adjacent digits |
| `CHAR_TRANSITION_TIME` | 200ms | Delay between each character reveal/hide |
| `PULSE_START_DELAY` | 500ms | Delay after full reveal before pulsing starts |
| `MIN_ON_OPACITY` | 0.6 | Minimum opacity when ON (quiet/static) |
| `MAX_ON_OPACITY` | 1.0 | Maximum opacity when ON (loud) |
| `VOLUME_SCALE` | 24 | Volume value that maps to max opacity |
| `OPACITY_UPDATE_INTERVAL` | 100ms | Throttle for opacity updates |
| `FFT_SIZE` | 512 | Audio buffer size (aligned with other projects) |

## Word Pool

20 five-letter words:
```
hello, world, dream, light, flame, stone, ocean, cloud, night, music,
storm, peace, heart, smile, magic, dance, shine, brave, ghost, river
```

## Technical Details

- Uses CSS transitions for smooth opacity changes
- Each digit is a `<span>` with class `digit` and state class `on`/`off`
- Fixed-width characters (`1ch`) ensure alignment
- No canvas - pure DOM manipulation
- `setInterval` for cycling animation
- `setTimeout` for state toggling with different durations
- `requestAnimationFrame` for audio analysis (throttled to 100ms for opacity updates)

## Running the App

Simply open `index.html` in a browser. For microphone access, use:
- `file://` protocol (works in most browsers)
- Or serve via local server: `python3 -m http.server 8000`
