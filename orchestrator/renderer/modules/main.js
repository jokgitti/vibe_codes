// =============================================================================
// ORCHESTRATOR v2 - MAIN ENTRY POINT
// =============================================================================

import { CONFIG } from './config.js';
import { state } from './state.js';
import { initAudio, getVolume, getAverageVolume, getBeatThreshold, getMinVolume, broadcastAudioData, playTestAudio, pauseTestAudio, seekTestAudio, isTestMode, getTestAudioTime } from './audio.js';
import { initUI, updateUI, setStatus } from './ui.js';
import { initTitleElements, initTitleAnimation } from './title.js';
import { initWindowContainer, recalculateGrid, createVirtualWindow, closeOldestWindow, closeVirtualWindow } from './windows.js';
import { initModal } from './modal.js';
import { initKeyboard, hideControlPanel } from './keyboard.js';
import { initDrag, makeDraggable } from './drag.js';

// =============================================================================
// DOM ELEMENTS (for event handlers)
// =============================================================================

let openBtn, closeBtn, sensitivitySlider, sensitivityValue, patternSelect;
let controlPanelWindow, controlPanelTitlebar, controlPanelClose;
let testControls, playBtn, restartBtn;
let beatLogSection, beatCountEl, exportLogBtn, clearLogBtn;
let isPlaying = false;

function initDOMElements() {
  openBtn = document.getElementById('openBtn');
  closeBtn = document.getElementById('closeBtn');
  sensitivitySlider = document.getElementById('sensitivitySlider');
  sensitivityValue = document.getElementById('sensitivityValue');
  patternSelect = document.getElementById('patternSelect');
  controlPanelWindow = document.getElementById('controlPanelWindow');
  controlPanelTitlebar = document.getElementById('controlPanelTitlebar');
  controlPanelClose = document.getElementById('controlPanelClose');
  testControls = document.getElementById('testControls');
  playBtn = document.getElementById('playBtn');
  restartBtn = document.getElementById('restartBtn');
  beatLogSection = document.getElementById('beatLogSection');
  beatCountEl = document.getElementById('beatCount');
  exportLogBtn = document.getElementById('exportLogBtn');
  clearLogBtn = document.getElementById('clearLogBtn');
}

function initControlPanel() {
  // Make control panel draggable
  makeDraggable(controlPanelWindow, controlPanelTitlebar);

  // Close button hides the panel
  controlPanelClose.addEventListener('click', () => {
    hideControlPanel();
  });
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

  // Test audio controls
  playBtn.addEventListener('click', () => {
    if (isPlaying) {
      pauseTestAudio();
      playBtn.textContent = 'play';
      isPlaying = false;
    } else {
      playTestAudio();
      playBtn.textContent = 'pause';
      isPlaying = true;
    }
  });

  restartBtn.addEventListener('click', () => {
    seekTestAudio(0);
    clearBeatLog();
    if (!isPlaying) {
      playTestAudio();
      playBtn.textContent = 'pause';
      isPlaying = true;
    }
  });

  exportLogBtn.addEventListener('click', () => {
    exportBeatLog();
  });

  clearLogBtn.addEventListener('click', () => {
    clearBeatLog();
  });
}

function logBeat(volume, recentAvg, onset) {
  const time = isTestMode() ? getTestAudioTime() : performance.now() / 1000;
  const entry = {
    time: time.toFixed(3),
    volume: volume.toFixed(2),
    recentAvg: recentAvg.toFixed(2),
    onset: onset.toFixed(2)
  };
  state.beatLog.push(entry);
  state.beatCount++;
  beatCountEl.textContent = state.beatCount;
  console.log(`beat @ ${entry.time}s - vol: ${entry.volume}, recent: ${entry.recentAvg}, onset: ${entry.onset}`);
}

function clearBeatLog() {
  state.beatLog = [];
  state.beatCount = 0;
  state.onsetHistory = [];
  beatCountEl.textContent = '0';
  console.log('beat log cleared');
}

function exportBeatLog() {
  const header = 'time,volume,recentAvg,onset';
  const rows = state.beatLog.map(b => `${b.time},${b.volume},${b.recentAvg},${b.onset}`);
  const csv = [header, ...rows].join('\n');

  console.log('=== BEAT LOG EXPORT ===');
  console.log(csv);
  console.log('=======================');

  // Copy to clipboard
  navigator.clipboard.writeText(csv).then(() => {
    setStatus(`exported ${state.beatLog.length} beats to clipboard`);
  }).catch(() => {
    setStatus('export logged to console');
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

  // Onset detection - detect sudden increases in volume
  const timeSinceBeat = currentTime - state.lastBeatTime;

  // Update onset history
  state.onsetHistory.push(volume);
  if (state.onsetHistory.length > CONFIG.ONSET_HISTORY) {
    state.onsetHistory.shift();
  }

  // Calculate onset: how much volume increased from recent history
  let recentAvg = 0;
  if (state.onsetHistory.length > 1) {
    // Average of all but the current frame
    const previous = state.onsetHistory.slice(0, -1);
    recentAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
  }
  const onset = volume - recentAvg;
  const onsetThreshold = CONFIG.ONSET_THRESHOLD_BASE / state.sensitivity;

  if (onset > onsetThreshold &&
      timeSinceBeat > CONFIG.BEAT_COOLDOWN &&
      volume > getMinVolume()) {

    state.lastBeatTime = currentTime;
    state.pendingBeat = true; // Will persist until broadcast

    // Log beat for analysis (in test mode)
    if (isTestMode()) {
      logBeat(volume, recentAvg, onset);
    }

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
    broadcastAudioData(volume, state.pendingBeat);
    state.pendingBeat = false; // Reset after broadcast
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
  initControlPanel();
  initEventHandlers();

  // Calculate initial grid
  recalculateGrid();

  // Start audio
  await initAudio();

  // Show test controls if in test mode
  if (isTestMode()) {
    testControls.style.display = 'flex';
    beatLogSection.style.display = 'block';
  }

  // Start title animation
  initTitleAnimation();

  // Set initial status
  setStatus('auto-open off (cmd+s to start)');

  // Start main loop
  requestAnimationFrame(analyzeLoop);
}

// Start the application
init();
