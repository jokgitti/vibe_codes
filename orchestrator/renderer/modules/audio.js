// =============================================================================
// AUDIO CAPTURE & ANALYSIS
// =============================================================================

import { CONFIG } from './config.js';
import { state } from './state.js';
import { setStatus } from './ui.js';

export async function initAudio() {
  try {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = CONFIG.FFT_SIZE;
    state.analyser.smoothingTimeConstant = 0.3;

    // Microphone capture
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.micSource = state.audioContext.createMediaStreamSource(stream);
    state.micSource.connect(state.analyser);

    state.frequencyData = new Uint8Array(state.analyser.frequencyBinCount);
    state.timeDomainData = new Uint8Array(state.analyser.fftSize);
    state.audioEnabled = true;

    setStatus('mic ready (cmd+s to start)');
  } catch (err) {
    console.error('Audio init failed:', err);
    setStatus('audio init failed: ' + err.message);
  }
}

export function getVolume() {
  if (!state.analyser) return 0;

  // Time-domain analysis: average deviation from center (128)
  state.analyser.getByteTimeDomainData(state.timeDomainData);
  let sum = 0;
  for (let i = 0; i < state.timeDomainData.length; i++) {
    sum += Math.abs(state.timeDomainData[i] - 128);
  }
  return sum / state.timeDomainData.length;
}

export function getAverageVolume() {
  if (state.volumeHistory.length === 0) return 0;
  return state.volumeHistory.reduce((a, b) => a + b, 0) / state.volumeHistory.length;
}

export function getOnsetThreshold() {
  return CONFIG.ONSET_THRESHOLD_BASE / state.sensitivity;
}

export function getMinVolume() {
  return CONFIG.MIN_VOLUME_BASE / state.sensitivity;
}

// Pre-allocated arrays for broadcast (avoid GC pressure)
let normalizedTimeDomainBuffer = null;
let frequencyDataBuffer = null;

// Reusable data object for postMessage
const broadcastData = {
  type: 'audio',
  volume: 0,
  normalizedVolume: 0,
  avgVolume: 0,
  beat: false,
  timeDomainData: null,
  frequencyData: null,
  timestamp: 0
};

export function broadcastAudioData(volume, beat) {
  // Get time-domain data for waveform visualizers
  if (state.analyser && state.timeDomainData) {
    state.analyser.getByteTimeDomainData(state.timeDomainData);
  }

  const avgVolume = getAverageVolume();
  // Normalize volume to 0-1 range (time-domain typically 0-30)
  const normalizedVolume = Math.min(volume / 15, 1);

  // Compress loud signals to prevent clipping, but keep quiet signals quiet
  if (state.timeDomainData) {
    // Initialize buffer once
    if (!normalizedTimeDomainBuffer || normalizedTimeDomainBuffer.length !== state.timeDomainData.length) {
      normalizedTimeDomainBuffer = new Array(state.timeDomainData.length);
    }

    // Find max deviation from center (128)
    let maxDeviation = 0;
    for (let i = 0; i < state.timeDomainData.length; i++) {
      const dev = state.timeDomainData[i] - 128;
      if (dev > maxDeviation) maxDeviation = dev;
      else if (-dev > maxDeviation) maxDeviation = -dev;
    }

    // Only compress if signal is too hot (max deviation > 50)
    // Don't boost quiet signals - preserve dynamic range
    const maxAllowed = 50;
    const scale = maxDeviation > maxAllowed ? maxAllowed / maxDeviation : 1;

    for (let i = 0; i < state.timeDomainData.length; i++) {
      const deviation = state.timeDomainData[i] - 128;
      normalizedTimeDomainBuffer[i] = (128 + deviation * scale) | 0; // Bitwise floor
    }
  }

  // Get frequency data for spectrum visualizers
  if (state.analyser && state.frequencyData) {
    state.analyser.getByteFrequencyData(state.frequencyData);
    // Initialize buffer once
    if (!frequencyDataBuffer || frequencyDataBuffer.length !== state.frequencyData.length) {
      frequencyDataBuffer = new Array(state.frequencyData.length);
    }
    // Copy without creating new array
    for (let i = 0; i < state.frequencyData.length; i++) {
      frequencyDataBuffer[i] = state.frequencyData[i];
    }
  }

  // Update reusable data object
  broadcastData.volume = volume;
  broadcastData.normalizedVolume = normalizedVolume;
  broadcastData.avgVolume = avgVolume;
  broadcastData.beat = beat;
  broadcastData.timeDomainData = normalizedTimeDomainBuffer;
  broadcastData.frequencyData = frequencyDataBuffer;
  broadcastData.timestamp = performance.now();

  // Use for loop instead of forEach for better performance
  const windows = state.virtualWindows;
  for (let i = 0; i < windows.length; i++) {
    try {
      windows[i].iframe.contentWindow.postMessage(broadcastData, '*');
    } catch (_e) {
      // Iframe might not be ready
    }
  }
}
