// =============================================================================
// ORCHESTRATOR v2 - MAIN ENTRY POINT
// =============================================================================

import { CONFIG } from './config.js';
import { state } from './state.js';
import { initAudio, getVolume, getAverageVolume, getBeatThreshold, getMinVolume, broadcastAudioData } from './audio.js';
import { initUI, updateUI, setStatus } from './ui.js';
import { initTitleElements, initTitleAnimation } from './title.js';
import { initWindowContainer, recalculateGrid, createVirtualWindow, closeOldestWindow, closeVirtualWindow } from './windows.js';
import { initModal } from './modal.js';
import { initKeyboard } from './keyboard.js';
import { initDrag } from './drag.js';

// =============================================================================
// DOM ELEMENTS (for event handlers)
// =============================================================================

let openBtn, closeBtn, sensitivitySlider, sensitivityValue, patternSelect;

function initDOMElements() {
  openBtn = document.getElementById('openBtn');
  closeBtn = document.getElementById('closeBtn');
  sensitivitySlider = document.getElementById('sensitivitySlider');
  sensitivityValue = document.getElementById('sensitivityValue');
  patternSelect = document.getElementById('patternSelect');
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

function initEventHandlers() {
  openBtn.addEventListener('click', () => {
    createVirtualWindow();
  });

  closeBtn.addEventListener('click', () => {
    if (state.virtualWindows.length > 0) {
      closeVirtualWindow(state.virtualWindows[state.virtualWindows.length - 1].id);
    }
  });

  sensitivitySlider.addEventListener('input', (e) => {
    state.sensitivity = parseFloat(e.target.value);
    sensitivityValue.textContent = state.sensitivity.toFixed(1) + 'x';
  });

  patternSelect.addEventListener('change', (e) => {
    state.currentPattern = e.target.value;
    recalculateGrid();
  });

  window.addEventListener('resize', () => {
    recalculateGrid();
  });
}

// =============================================================================
// MAIN LOOP
// =============================================================================

function analyzeLoop(currentTime) {
  if (!state.audioEnabled) {
    requestAnimationFrame(analyzeLoop);
    return;
  }

  const volume = getVolume();
  const avgVolume = getAverageVolume();

  // Update history
  state.volumeHistory.push(volume);
  if (state.volumeHistory.length > CONFIG.VOLUME_HISTORY_SIZE) {
    state.volumeHistory.shift();
  }

  // Beat detection
  const timeSinceBeat = currentTime - state.lastBeatTime;
  let beat = false;

  if (volume > avgVolume * getBeatThreshold() &&
      timeSinceBeat > CONFIG.BEAT_COOLDOWN &&
      avgVolume > getMinVolume()) {

    state.lastBeatTime = currentTime;
    beat = true;

    // Only auto-open windows when enabled
    if (state.autoOpenEnabled && state.virtualWindows.length < CONFIG.MAX_WINDOWS) {
      createVirtualWindow();
      setStatus('beat - opening window...');
      setTimeout(() => setStatus(state.autoOpenEnabled ? 'auto-open on' : 'auto-open off'), 500);
    }
  }

  // Close on quiet (only when auto-open is enabled)
  const timeSinceClose = currentTime - state.lastCloseTime;
  if (state.autoOpenEnabled &&
      volume < avgVolume * 0.4 &&
      avgVolume > getMinVolume() &&
      timeSinceClose > CONFIG.CLOSE_COOLDOWN &&
      state.virtualWindows.length >= CONFIG.MIN_WINDOWS_TO_CLOSE) {

    state.lastCloseTime = currentTime;
    closeOldestWindow();
    setStatus('quiet - closing window...');
    setTimeout(() => setStatus(state.autoOpenEnabled ? 'auto-open on' : 'auto-open off'), 500);
  }

  // Broadcast audio to iframes (throttled to 30fps)
  if (currentTime - state.lastBroadcastTime >= CONFIG.BROADCAST_INTERVAL) {
    state.lastBroadcastTime = currentTime;
    broadcastAudioData(volume, beat);
  }

  // Update UI
  updateUI();

  requestAnimationFrame(analyzeLoop);
}

// =============================================================================
// INIT
// =============================================================================

async function init() {
  // Initialize all modules
  initDOMElements();
  initUI();
  initTitleElements();
  initWindowContainer();
  initDrag();
  initModal();
  initKeyboard();
  initEventHandlers();

  // Calculate initial grid
  recalculateGrid();

  // Start audio
  await initAudio();

  // Start title animation
  initTitleAnimation();

  // Set initial status
  setStatus('auto-open off (cmd+s to start)');

  // Start main loop
  requestAnimationFrame(analyzeLoop);
}

// Start the application
init();
