# Shared Audio Stream Plan

## Problem

The OS limits simultaneous audio input streams to 16. With each project window capturing its own microphone stream, we hit this limit quickly.

## Solution Overview

Capture a single audio stream in the orchestrator's main process or control panel, analyze it centrally, and broadcast the results to all project windows via IPC.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Orchestrator (Main Process / Control Panel)                │
│                                                             │
│  ┌─────────────┐    ┌──────────────────────────────────┐   │
│  │ getUserMedia │───▶│ Single AudioContext + Analyser   │   │
│  │ (1 stream)   │    │                                  │   │
│  └─────────────┘    │ - Time-domain data (waveform)    │   │
│                      │ - Frequency data (FFT)           │   │
│                      │ - Calculated volume              │   │
│                      └──────────────────────────────────┘   │
│                                   │                         │
│                                   ▼                         │
│                      ┌──────────────────────────────────┐   │
│                      │ Broadcast via IPC to all windows │   │
│                      └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  lucid_dream    │      │  circling_cycle │      │  pitchy_soundwave│
│                 │      │                 │      │                  │
│ Receives:       │      │ Receives:       │      │ Receives:        │
│ - volume        │      │ - volume        │      │ - timeDomainData │
│                 │      │                 │      │   (full array)   │
└─────────────────┘      └─────────────────┘      └──────────────────┘
```

## Implementation Steps

### 1. Orchestrator Changes (main.js)

- Move audio capture from renderer to main process (or keep in renderer but don't duplicate)
- Create shared AudioContext with analyser
- Set up periodic audio analysis (e.g., every 16ms for 60fps)
- Broadcast analysis results to all BrowserWindows via `webContents.send()`

### 2. Preload Script Changes (preload.js)

- Expose IPC listener for receiving audio data
- `window.audioData.onUpdate(callback)` - projects register to receive updates

### 3. Project Changes (each project)

- Remove `getUserMedia()` calls
- Remove local AudioContext creation
- Add listener for external audio data
- Use received data instead of local analysis

Example for lucid_dream:
```javascript
// OLD: Local audio capture
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
// ... local analysis

// NEW: Receive from orchestrator
window.audioData.onUpdate((data) => {
  currentVolume = data.volume;
});
```

### 4. Standalone Mode Support

Projects should still work when opened directly (not via orchestrator):
```javascript
// Check if running in orchestrator
if (window.audioData) {
  // Use shared audio
  window.audioData.onUpdate((data) => { ... });
} else {
  // Fallback to local audio capture
  initLocalAudio();
}
```

## Data to Broadcast

Different projects need different audio data:

| Project | Needs |
|---------|-------|
| lucid_dream | volume (single number) |
| circling_cycle | volume (single number) |
| pitchy_soundwave | timeDomainData (Uint8Array, 512+ samples) |
| rotating_gliph | frequencyData (Uint8Array) + volume |

**Recommendation:** Broadcast all data types, let projects use what they need:
```javascript
{
  volume: 12.5,                    // Calculated amplitude
  timeDomainData: Uint8Array[],    // Raw waveform (for pitchy_soundwave)
  frequencyData: Uint8Array[],     // FFT data (for rotating_gliph)
  timestamp: 1234567890            // For synchronization
}
```

## Potential Pitfalls

### 1. IPC Performance / Latency
- **Risk:** Sending large arrays (2048 bytes) 60 times per second could be slow
- **Mitigation:**
  - Use `SharedArrayBuffer` if possible (requires specific Electron flags)
  - Reduce update frequency (30fps instead of 60fps)
  - Send only the data each project needs (volume for most, full arrays only when needed)
  - Consider sending deltas or compressed data

### 2. Data Serialization Overhead
- **Risk:** Uint8Array doesn't serialize efficiently over IPC by default
- **Mitigation:**
  - Convert to regular arrays for IPC: `Array.from(timeDomainData)`
  - Or use `Buffer` which Electron handles more efficiently
  - Benchmark to find optimal approach

### 3. Synchronization Issues
- **Risk:** Audio data arrives at different windows at slightly different times
- **Mitigation:**
  - Include timestamp in broadcast
  - Projects can interpolate or ignore stale data
  - For most visual effects, slight desync is imperceptible

### 4. Window Registration/Cleanup
- **Risk:** Need to track which windows want audio updates
- **Mitigation:**
  - Have windows send "subscribe" message on load
  - Clean up listeners when windows close
  - Use broadcast to all windows (simpler, slight overhead for non-audio windows)

### 5. Main Process Blocking
- **Risk:** Audio analysis in main process could block UI
- **Mitigation:**
  - Keep analysis in renderer process (control panel)
  - Control panel sends to main, main broadcasts to other windows
  - Or use a dedicated hidden renderer just for audio

### 6. Project Compatibility
- **Risk:** Projects need significant refactoring
- **Mitigation:**
  - Create adapter pattern that mimics getUserMedia API
  - Gradual migration: projects can check for shared audio, fallback to local
  - Clear abstraction layer

### 7. AudioContext State
- **Risk:** If control panel is minimized/hidden, AudioContext might suspend
- **Mitigation:**
  - Keep control panel visible or use `audioContext.resume()`
  - Move audio capture to main process using Electron's desktopCapturer (more complex)
  - Use a dedicated hidden BrowserWindow just for audio

### 8. Different FFT Sizes
- **Risk:** rotating_gliph uses FFT_SIZE=512, pitchy_soundwave uses 1024
- **Mitigation:**
  - Use the larger FFT size centrally (2048)
  - Projects can subsample as needed
  - Or maintain multiple analysers (still just 1 stream)

### 9. Error Handling
- **Risk:** If orchestrator loses mic access, all windows fail
- **Mitigation:**
  - Implement reconnection logic
  - Broadcast error state to windows so they can show appropriate UI
  - Consider periodic "health check" messages

### 10. Testing Complexity
- **Risk:** Harder to test projects in isolation
- **Mitigation:**
  - Maintain standalone mode with local audio
  - Create mock audio data source for testing
  - Clear separation between audio input and visualization logic

## Estimated Effort

| Task | Complexity |
|------|------------|
| Orchestrator audio broadcast | Medium |
| Preload/IPC setup | Low |
| Update lucid_dream | Low |
| Update circling_cycle | Low |
| Update pitchy_soundwave | Medium (needs full array) |
| Update rotating_gliph | Medium (needs frequency data) |
| Standalone mode support | Low |
| Testing & debugging | Medium |

## Alternative Approaches

### A. Lower MAX_WINDOWS to 12-14
- Simpler, no code changes to projects
- Leaves headroom for stream cleanup latency
- Limits visual impact

### B. Not All Projects Need Audio
- Make some projects audio-optional
- circling_cycle could work without audio (static highlight speed)
- Reduces stream usage

### C. Audio Capture in Main Process
- Use Electron's `desktopCapturer` to capture system audio
- More complex setup
- Would capture all system audio, not just mic

## Recommendation

Start with the shared audio approach for the following reasons:
1. Removes the 16-stream hard limit entirely
2. More efficient (1 stream vs N streams)
3. Enables future expansion (more projects, more windows)
4. Projects become lighter (no audio setup overhead)

Begin with a proof-of-concept:
1. Add audio broadcast to orchestrator
2. Update one simple project (lucid_dream) to receive shared audio
3. Verify latency and performance are acceptable
4. Roll out to other projects
