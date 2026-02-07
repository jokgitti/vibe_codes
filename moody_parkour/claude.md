# Moody Parkour

A pixel art dot LED display that shows kaomoji (Japanese text emoticons) that change on beat detection.

## Overview

- **Visual**: Pixel art style with black background and white "on" pixels
- **Technology**: Canvas rendering with pixelation effect, Web Audio API
- **Animation**: Kaomoji changes on detected beats
- **Emotions**: 8 emotion categories, one randomly selected at startup

## How It Works

### Emotion System

At startup, the app randomly selects one emotion category and displays kaomoji only from that group:

| Emotion | Example Kaomoji |
|---------|-----------------|
| happy | (^ω^) (*^▽^*) (´∀`) |
| sad | ( ; ω ; ) (T_T) (ಥ﹏ಥ) |
| angry | (╯°□°)╯ (`Д´) (>_<) |
| love | (♡´▽`♡) (◕‿◕)♡ |
| surprised | (゜o゜) Σ(°△°|||) |
| confused | (・・？) (？_？) |
| sleepy | (－ω－) (-.-)zzZ |
| excited | ＼(◎o◎)／ ヽ(>∀<☆)☆ |

Each category has 15 kaomoji that cycle through sequentially on beats.

### Pixel Art Rendering

The display uses canvas to create a pixelated dot LED effect:

1. Render kaomoji text to an offscreen canvas at small size
2. Read pixel data and threshold for brightness
3. Draw each "on" pixel as a white square with a 1px gap
4. Gap between pixels creates the LED matrix look

```javascript
// Each pixel is PIXEL_SIZE x PIXEL_SIZE with 1px gap
ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE - 1, PIXEL_SIZE - 1);
```

### Beat Detection

Uses frequency-domain analysis (aligned with other projects):
- Calculates volume from frequency data
- Boosts kick frequencies (< 150Hz) 2x for better bass response
- Compares current volume to rolling average
- When volume spikes above threshold, triggers kaomoji change
- Cooldown prevents rapid-fire changes

### Audio Sources

Supports both standalone and orchestrator modes:
- **Standalone**: Captures microphone via `getUserMedia`
- **Orchestrator**: Receives audio data via `postMessage`

When orchestrator sends audio, local capture stops automatically.

## Configuration

| Parameter | Default | Effect |
|-----------|---------|--------|
| `PIXEL_SIZE` | 4 | Size of each display pixel |
| `FONT_SIZE` | 16 | Base font size for kaomoji |
| `PADDING` | 20 | Padding around kaomoji |
| `MIN_BEAT_INTERVAL` | 200ms | Minimum time between changes |
| `BEAT_THRESHOLD` | 1.3 | Volume spike multiplier |
| `MIN_VOLUME` | 3 | Minimum volume to trigger |
| `VOLUME_HISTORY_SIZE` | 20 | Rolling window for average |
| `FFT_SIZE` | 512 | Audio buffer size |

## Running

Open `index.html` in a browser and grant microphone permission.

```bash
cd moody_parkour
open index.html  # macOS
# or serve via local server
python3 -m http.server 8000
```

## Project Structure

```
moody_parkour/
├── index.html    # All code (HTML, CSS, JS)
└── claude.md     # This file
```

## Orchestrator Integration

The project receives audio data via `postMessage`:

```javascript
{
  type: 'audio',
  beat: true,        // Used to advance to next kaomoji in current mood
  mood: 'happy',     // Current detected mood (updates every 1 second)
  timestamp: number
}
```

### Audio-Reactive Behavior

When running in the orchestrator:

1. **Beat detected** → Advance to next kaomoji in current mood's set
2. **Mood changes** → Switch to the new mood's kaomoji set (continuing from where that mood left off)
3. **Initialization** → All kaomoji sets are shuffled so each window displays different sequences

Each emotion maintains its own index, so switching between moods resumes where you left off rather than restarting from the beginning.

### Music-Based Emotion Detection

The orchestrator tracks energy over time and maps trends to emotions:

| Trend | Energy | Emotion |
|-------|--------|---------|
| Erratic | high | excited |
| Erratic | med+ | confused |
| Erratic | med/low | surprised |
| Rising | high | excited |
| Rising | med+/med | happy |
| Rising | low | love |
| Falling | high | excited |
| Falling | med+ | happy |
| Falling | med | sad |
| Falling | low | sleepy |
| Stable | high | excited |
| Stable | med+ | happy |
| Stable | med | love |
| Stable | low | sleepy |

Rare emotions (confused, surprised) only trigger on sustained erratic patterns (50%+ of samples in a 1-second window must have high variance).

No special init handling is required. The canvas auto-sizes based on kaomoji content.
