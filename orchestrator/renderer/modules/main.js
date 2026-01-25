// =============================================================================
// ORCHESTRATOR v2 - MAIN ENTRY POINT
// =============================================================================

import { CONFIG } from './config.js';
import { state } from './state.js';
import { initAudio, getVolume, getAverageVolume, getBeatThreshold, getMinVolume, broadcastAudioData } from './audio.js';
import { setPlaybackCallbacks, loadAudioFile, unloadAudioFile, playAudio, pauseAudio, stopAudio, seekRelative, setRepeat, isRepeatEnabled, isAudioFileLoaded, isAudioPlaying, getAudioTime, getAudioDuration } from './playback.js';
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
let beatCountEl;

// File picker modal
let filePickerOverlay, filePickerModal, filePickerTitlebar, filePickerClose;
let fileInput, dropZone, filePickerCancelBtn;

// Audio controller window
let audioControllerWindow, audioControllerTitlebar, audioControllerClose;
let audioTrackName, audioArtistAlbum, audioProgress, audioTimeDisplay;
let audioPlayPauseBtn, audioStopBtn, audioBackBtn, audioForwardBtn, audioRepeatBtn;

function initDOMElements() {
  openBtn = document.getElementById('openBtn');
  closeBtn = document.getElementById('closeBtn');
  sensitivitySlider = document.getElementById('sensitivitySlider');
  sensitivityValue = document.getElementById('sensitivityValue');
  patternSelect = document.getElementById('patternSelect');
  controlPanelWindow = document.getElementById('controlPanelWindow');
  controlPanelTitlebar = document.getElementById('controlPanelTitlebar');
  controlPanelClose = document.getElementById('controlPanelClose');
  beatCountEl = document.getElementById('beatCount');

  // File picker modal
  filePickerOverlay = document.getElementById('filePickerOverlay');
  filePickerModal = document.getElementById('filePickerModal');
  filePickerTitlebar = document.getElementById('filePickerTitlebar');
  filePickerClose = document.getElementById('filePickerClose');
  fileInput = document.getElementById('fileInput');
  dropZone = document.getElementById('dropZone');
  filePickerCancelBtn = document.getElementById('filePickerCancelBtn');

  // Audio controller window
  audioControllerWindow = document.getElementById('audioControllerWindow');
  audioControllerTitlebar = document.getElementById('audioControllerTitlebar');
  audioControllerClose = document.getElementById('audioControllerClose');
  audioTrackName = document.getElementById('audioTrackName');
  audioArtistAlbum = document.getElementById('audioArtistAlbum');
  audioProgress = document.getElementById('audioProgress');
  audioTimeDisplay = document.getElementById('audioTimeDisplay');
  audioPlayPauseBtn = document.getElementById('audioPlayPauseBtn');
  audioStopBtn = document.getElementById('audioStopBtn');
  audioBackBtn = document.getElementById('audioBackBtn');
  audioForwardBtn = document.getElementById('audioForwardBtn');
  audioRepeatBtn = document.getElementById('audioRepeatBtn');
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
// FILE PICKER
// =============================================================================

export function showFilePicker() {
  filePickerOverlay.classList.add('visible');
}

export function hideFilePicker() {
  filePickerOverlay.classList.remove('visible');
  fileInput.value = '';
}

function initFilePicker() {
  // Make file picker modal draggable
  makeDraggable(filePickerModal, filePickerTitlebar);

  // Close button
  filePickerClose.addEventListener('click', hideFilePicker);
  filePickerCancelBtn.addEventListener('click', hideFilePicker);

  // File input change
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      await handleFileSelection(file);
    }
  });

  // Drag and drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.name.match(/\.(mp3|wav|flac)$/i)) {
      await handleFileSelection(file);
    } else {
      setStatus('please drop an mp3, wav, or flac file');
    }
  });

  // Click on drop zone triggers file input
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });
}

async function handleFileSelection(file) {
  hideFilePicker();
  const success = await loadAudioFile(file);
  if (success) {
    showAudioController();
    playAudio();
    updatePlayPauseButton();
  }
}

// =============================================================================
// AUDIO CONTROLLER
// =============================================================================

function showAudioController() {
  audioControllerWindow.classList.remove('hidden');
}

function hideAudioController() {
  audioControllerWindow.classList.add('hidden');
}

function initAudioController() {
  // Make audio controller draggable
  makeDraggable(audioControllerWindow, audioControllerTitlebar);

  // Close button - unloads audio and hides controller
  audioControllerClose.addEventListener('click', () => {
    unloadAudioFile();
    hideAudioController();
    setStatus('audio unloaded');
  });

  // Play/Pause button
  audioPlayPauseBtn.addEventListener('click', () => {
    if (isAudioPlaying()) {
      pauseAudio();
    } else {
      playAudio();
    }
    updatePlayPauseButton();
  });

  // Stop button
  audioStopBtn.addEventListener('click', () => {
    stopAudio();
    updatePlayPauseButton();
    resetBeatCount();
  });

  // Back 10s button
  audioBackBtn.addEventListener('click', () => {
    seekRelative(-10);
  });

  // Forward 10s button
  audioForwardBtn.addEventListener('click', () => {
    seekRelative(10);
  });

  // Repeat button
  audioRepeatBtn.addEventListener('click', () => {
    setRepeat(!isRepeatEnabled());
    updateRepeatButton();
  });

  // Progress bar click to seek
  audioProgress.parentElement.addEventListener('click', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const duration = getAudioDuration();
    if (duration > 0) {
      const time = percent * duration;
      seekRelative(time - getAudioTime());
    }
  });

  // Set up playback callbacks
  setPlaybackCallbacks({
    onTimeUpdate: ({ currentTime, duration }) => {
      updateProgressDisplay(currentTime, duration);
    },
    onAudioLoaded: ({ name, duration, metadata }) => {
      // Reset beat count on new file
      resetBeatCount();

      // Display track name (from metadata or filename)
      const trackName = metadata?.title || name.replace(/\.[^/.]+$/, '');
      audioTrackName.textContent = trackName;

      // Display artist and album if available
      const parts = [];
      if (metadata?.artist) parts.push(metadata.artist);
      if (metadata?.album) parts.push(metadata.album);
      audioArtistAlbum.textContent = parts.join(' - ');

      updateProgressDisplay(0, duration);
    },
    onAudioEnded: () => {
      updatePlayPauseButton();
    },
    onAudioUnloaded: () => {
      resetBeatCount();
      audioTrackName.textContent = 'no file loaded';
      audioArtistAlbum.textContent = '';
      updateProgressDisplay(0, 0);
    }
  });
}

function updatePlayPauseButton() {
  audioPlayPauseBtn.textContent = isAudioPlaying() ? '||' : '>';
}

function updateRepeatButton() {
  audioRepeatBtn.classList.toggle('active', isRepeatEnabled());
}

function updateProgressDisplay(currentTime, duration) {
  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
  audioProgress.style.width = `${percent}%`;
  audioTimeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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

function incrementBeatCount() {
  state.beatCount++;
  if (beatCountEl) {
    beatCountEl.textContent = state.beatCount;
  }
}

function resetBeatCount() {
  state.beatCount = 0;
  if (beatCountEl) {
    beatCountEl.textContent = '0';
  }
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
    incrementBeatCount();

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
  initFilePicker();
  initAudioController();
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
