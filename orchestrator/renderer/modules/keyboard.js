// =============================================================================
// KEYBOARD SHORTCUTS
// =============================================================================

import { state } from './state.js';
import { setStatus } from './ui.js';
import { initTitleAnimation, stopTitleAnimation } from './title.js';
import { showProjectModal, hideProjectModal, confirmProjectSelection, modalVisible } from './modal.js';
import { closeAllWindows } from './windows.js';
import { showFilePicker, hideFilePicker } from './main.js';

let controlPanelWindow, titleOverlay, filePickerOverlay;

export function initKeyboard() {
  controlPanelWindow = document.getElementById('controlPanelWindow');
  titleOverlay = document.getElementById('titleOverlay');
  filePickerOverlay = document.getElementById('filePickerOverlay');

  window.addEventListener('keydown', handleKeydown);
}

export function isFilePickerVisible() {
  return filePickerOverlay && filePickerOverlay.classList.contains('visible');
}

export function showControlPanel() {
  controlPanelWindow.classList.remove('hidden');
}

export function hideControlPanel() {
  controlPanelWindow.classList.add('hidden');
}

function handleKeydown(e) {
  const key = e.key.toLowerCase();

  // Handle file picker keyboard input
  if (isFilePickerVisible()) {
    // Escape: Close file picker
    if (e.key === 'Escape') {
      e.preventDefault();
      hideFilePicker();
      return;
    }
    return;
  }

  // Handle modal keyboard input
  if (modalVisible) {
    // Escape: Close modal
    if (e.key === 'Escape') {
      e.preventDefault();
      hideProjectModal();
      return;
    }

    // Enter: Confirm selection
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmProjectSelection();
      return;
    }
    return;
  }

  // Cmd+O (or Ctrl+O): Open file picker
  if ((e.metaKey || e.ctrlKey) && key === 'o') {
    e.preventDefault();
    showFilePicker();
    return;
  }

  // Cmd+N (or Ctrl+N): Open project selection modal
  if ((e.metaKey || e.ctrlKey) && key === 'n') {
    e.preventDefault();
    showProjectModal();
    return;
  }

  // Cmd+I (or Ctrl+I): Toggle control panel
  if ((e.metaKey || e.ctrlKey) && key === 'i') {
    e.preventDefault();
    controlPanelWindow.classList.toggle('hidden');
    return;
  }

  // Cmd+Shift+S (or Ctrl+Shift+S): Close all windows
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && key === 's') {
    e.preventDefault();
    closeAllWindows();
    setStatus('closed all windows');
    return;
  }

  // Cmd+S (or Ctrl+S): Toggle auto-open mode
  if ((e.metaKey || e.ctrlKey) && key === 's' && !e.shiftKey) {
    e.preventDefault();
    state.autoOpenEnabled = !state.autoOpenEnabled;
    titleOverlay.classList.toggle('hidden', state.autoOpenEnabled);
    if (state.autoOpenEnabled) {
      stopTitleAnimation();
    } else {
      initTitleAnimation();
    }
    setStatus(state.autoOpenEnabled ? 'auto-open on' : 'auto-open off');
  }
}
