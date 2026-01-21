# Pitchy Soundwave

A real-time audio waveform visualizer using a dot-matrix display style.

## Overview

- **Visual**: 20×20 grid of white dots on black background
- **Technology**: Web Audio API for microphone input, CSS Grid for display
- **Animation**: Waveform rendered as connected dots, updates every 50ms

## How It Works

### Audio Pipeline

```
Microphone → MediaStream → AudioContext → AnalyserNode → Time Domain Data → Display
```

1. `getUserMedia()` requests microphone access
2. Audio stream connects to Web Audio API
3. `AnalyserNode` performs FFT analysis
4. `getByteTimeDomainData()` returns waveform samples (0-255, center at 128)

### Waveform Rendering

For each of the 20 columns:

1. **Sample Selection**: Pick evenly-spaced samples from the audio buffer
   ```javascript
   sample = dataArray[x * step]  // step = bufferLength / 20
   ```

2. **Amplification**: Boost the signal for visibility
   ```javascript
   deviation = (sample - 128) * sensitivity  // sensitivity = 3
   amplified = 128 + deviation
   ```

3. **Grid Mapping**: Convert 0-255 range to 0-19 row index (inverted so louder = higher)
   ```javascript
   y = Math.floor((1 - amplified / 255) * 19)
   ```

4. **Line Connection**: Fill in dots between consecutive columns to create continuous line
   ```javascript
   for (fillY = min(prevY, y); fillY <= max(prevY, y); fillY++)
       dots[fillY][x].classList.add('on')
   ```

### Display Grid

- 20×20 CSS Grid of circular `<div>` elements
- Off state: 30% opacity
- On state: 90% opacity
- 6px gap between dots, 12px dot diameter
- CSS transition (50ms) for smooth opacity changes

## Configuration

| Parameter | Default | Effect |
|-----------|---------|--------|
| `GRID_SIZE` | 20 | Grid dimensions (20×20) |
| `sensitivity` | 3 | Waveform amplification factor |
| `fftSize` | 1024 | Audio buffer size |
| Update interval | 50ms | Refresh rate (~20fps) |

## Technical Details

- **FFT Size**: 1024 samples provides 512 frequency bins
- **Time Domain**: Uses `getByteTimeDomainData()` not frequency data
- **Centering**: Audio data centers at 128; silence shows flat line at middle
- **Clamping**: Amplified values are clamped to 0-255 to prevent out-of-bounds

## Error Handling

If microphone access is denied:
- Error logged to console
- Alert shown to user with instructions to allow access and reload

## Running the App

Microphone access requires a secure context (HTTPS or localhost):

```bash
python3 -m http.server 8000
# Then open http://localhost:8000
```

Or simply open `index.html` directly in some browsers (Chrome allows file:// microphone access).
