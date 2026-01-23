// =============================================================================
// AUDIO CAPTURE & ANALYSIS
// =============================================================================

import { CONFIG } from './config.js';
import { state } from './state.js';
import { setStatus } from './ui.js';

export async function initAudio() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = CONFIG.FFT_SIZE;
    state.analyser.smoothingTimeConstant = 0.3;

    const source = state.audioContext.createMediaStreamSource(stream);
    source.connect(state.analyser);

    state.frequencyData = new Uint8Array(state.analyser.frequencyBinCount);
    state.timeDomainData = new Uint8Array(state.analyser.fftSize);
    state.audioEnabled = true;
  } catch (err) {
    console.error('Microphone access denied:', err);
    setStatus('microphone access denied');
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

  const data = {
    type: 'audio',
    volume,
    normalizedVolume,
    avgVolume,
    beat,
    timeDomainData: state.timeDomainData ? Array.from(state.timeDomainData) : [],
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
