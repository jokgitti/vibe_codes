// =============================================================================
// UI UPDATES
// =============================================================================

import { CONFIG } from './config.js';
import { state } from './state.js';

// DOM Elements (cached on module load)
let windowBar, windowCountEl, audioBar, statusEl, thresholdLine;

// Cache previous values to avoid unnecessary DOM updates
let prevAudioWidth = -1;
let prevThresholdLeft = -1;
let prevWindowWidth = -1;
let prevWindowCount = '';

export function initUI() {
  windowBar = document.getElementById('windowBar');
  windowCountEl = document.getElementById('windowCount');
  audioBar = document.getElementById('audioBar');
  statusEl = document.getElementById('status');
  thresholdLine = document.getElementById('thresholdLine');
}

export function updateUI() {
  if (!state.analyser || !windowBar) return;

  // Use cached volume from state (already calculated in analyzeLoop)
  const volume = state.currentVolume || 0;
  const normalizedVolume = Math.min(volume / 50, 1);
  const audioWidth = Math.round(normalizedVolume * 100);

  // Only update DOM if value changed
  if (audioWidth !== prevAudioWidth) {
    audioBar.style.width = `${audioWidth}%`;
    prevAudioWidth = audioWidth;
  }

  // Update threshold line position (onset detection)
  // Use cached recentAvg from state to avoid array operations
  const recentAvg = state.cachedRecentAvg || 0;
  const onsetThreshold = CONFIG.ONSET_THRESHOLD_BASE / state.sensitivity;
  const triggerLevel = recentAvg + onsetThreshold;
  const normalizedThreshold = Math.min(triggerLevel / 50, 1);
  const thresholdLeft = Math.round(normalizedThreshold * 100);

  if (thresholdLeft !== prevThresholdLeft) {
    thresholdLine.style.left = `${thresholdLeft}%`;
    prevThresholdLeft = thresholdLeft;
  }

  const windowPercent = Math.round((state.virtualWindows.length / CONFIG.MAX_WINDOWS) * 100);
  if (windowPercent !== prevWindowWidth) {
    windowBar.style.width = `${windowPercent}%`;
    prevWindowWidth = windowPercent;
  }

  const windowCount = `${state.virtualWindows.length}/${CONFIG.MAX_WINDOWS}`;
  if (windowCount !== prevWindowCount) {
    windowCountEl.textContent = windowCount;
    prevWindowCount = windowCount;
  }
}

export function setStatus(text) {
  if (statusEl) {
    statusEl.textContent = text;
  }
}
