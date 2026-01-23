// =============================================================================
// UI UPDATES
// =============================================================================

import { CONFIG } from './config.js';
import { state } from './state.js';

// DOM Elements (cached on module load)
let windowBar, windowCountEl, audioBar, statusEl;

export function initUI() {
  windowBar = document.getElementById('windowBar');
  windowCountEl = document.getElementById('windowCount');
  audioBar = document.getElementById('audioBar');
  statusEl = document.getElementById('status');
}

export function updateUI() {
  if (!state.analyser || !windowBar) return;

  // Get current volume for audio bar
  let volume = 0;
  if (state.timeDomainData) {
    state.analyser.getByteTimeDomainData(state.timeDomainData);
    let sum = 0;
    for (let i = 0; i < state.timeDomainData.length; i++) {
      sum += Math.abs(state.timeDomainData[i] - 128);
    }
    volume = sum / state.timeDomainData.length;
  }

  const normalizedVolume = Math.min(volume / 50, 1);
  audioBar.style.width = `${normalizedVolume * 100}%`;

  const windowPercent = (state.virtualWindows.length / CONFIG.MAX_WINDOWS) * 100;
  windowBar.style.width = `${windowPercent}%`;
  windowCountEl.textContent = `${state.virtualWindows.length}/${CONFIG.MAX_WINDOWS}`;
}

export function setStatus(text) {
  if (statusEl) {
    statusEl.textContent = text;
  }
}
