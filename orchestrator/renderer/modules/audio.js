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

export function getBeatThreshold() {
  return 1.0 + (CONFIG.BEAT_THRESHOLD_BASE - 1.0) / state.sensitivity;
}

export function getMinVolume() {
  return CONFIG.MIN_VOLUME_BASE / state.sensitivity;
}

export function broadcastAudioData(volume, beat) {
  // Get time-domain data for waveform visualizers
  if (state.analyser && state.timeDomainData) {
    state.analyser.getByteTimeDomainData(state.timeDomainData);
  }

  const avgVolume = getAverageVolume();
  // Normalize volume to 0-1 range (time-domain typically 0-30)
  const normalizedVolume = Math.min(volume / 15, 1);

  // Compress loud signals to prevent clipping, but keep quiet signals quiet
  let normalizedTimeDomain = [];
  if (state.timeDomainData) {
    // Find max deviation from center (128)
    let maxDeviation = 0;
    for (let i = 0; i < state.timeDomainData.length; i++) {
      maxDeviation = Math.max(maxDeviation, Math.abs(state.timeDomainData[i] - 128));
    }

    // Only compress if signal is too hot (max deviation > 50)
    // Don't boost quiet signals - preserve dynamic range
    const maxAllowed = 50;
    const scale = maxDeviation > maxAllowed ? maxAllowed / maxDeviation : 1;

    normalizedTimeDomain = new Array(state.timeDomainData.length);
    for (let i = 0; i < state.timeDomainData.length; i++) {
      const deviation = state.timeDomainData[i] - 128;
      normalizedTimeDomain[i] = Math.round(128 + deviation * scale);
    }
  }

  // Get frequency data for spectrum visualizers
  let frequencyData = [];
  if (state.analyser && state.frequencyData) {
    state.analyser.getByteFrequencyData(state.frequencyData);
    frequencyData = Array.from(state.frequencyData);
  }

  const data = {
    type: 'audio',
    volume,
    normalizedVolume,
    avgVolume,
    beat,
    timeDomainData: normalizedTimeDomain,
    frequencyData: frequencyData,
    timestamp: performance.now()
  };

  state.virtualWindows.forEach(win => {
    try {
      win.iframe.contentWindow.postMessage(data, '*');
    } catch (e) {
      // Iframe might not be ready
    }
  });
}
