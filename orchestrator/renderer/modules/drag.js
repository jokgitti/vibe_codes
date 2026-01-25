// =============================================================================
// WINDOW DRAGGING
// =============================================================================

import { state } from './state.js';

// Drag state
let isDragging = false;
let dragTarget = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

export function initDrag() {
  // Use document-level listeners for smooth dragging
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

// Bring window to front without starting a drag
export function bringToFront(windowEl) {
  if (windowEl.classList.contains('control-panel-window')) return;
  if (windowEl.classList.contains('audio-controller-window')) return;

  state.currentZIndex++;
  windowEl.style.zIndex = state.currentZIndex;
}

// Call this when creating a draggable window
export function makeDraggable(windowEl, titleBarEl) {
  titleBarEl.addEventListener('mousedown', (e) => {
    // Don't drag if clicking title bar buttons
    if (e.target.closest('.win98-btn')) return;

    e.preventDefault();
    startDrag(windowEl, e.clientX, e.clientY);
  });
}

function startDrag(windowEl, mouseX, mouseY) {
  isDragging = true;
  dragTarget = windowEl;

  // Calculate offset from mouse to window corner
  const rect = windowEl.getBoundingClientRect();
  dragOffsetX = mouseX - rect.left;
  dragOffsetY = mouseY - rect.top;

  // Bring to front (but not for control panel - it's always on top)
  if (!windowEl.classList.contains('control-panel-window')) {
    state.currentZIndex++;
    windowEl.style.zIndex = state.currentZIndex;
  }

  // Disable pointer events on all iframes during drag
  document.querySelectorAll('iframe').forEach(iframe => {
    iframe.style.pointerEvents = 'none';
  });

  // Add dragging class for visual feedback
  windowEl.classList.add('dragging');
}

function handleMouseMove(e) {
  if (!isDragging || !dragTarget) return;

  const newX = e.clientX - dragOffsetX;
  const newY = e.clientY - dragOffsetY;

  dragTarget.style.left = `${newX}px`;
  dragTarget.style.top = `${newY}px`;
}

function handleMouseUp() {
  if (!isDragging) return;

  // Re-enable pointer events on iframes
  document.querySelectorAll('iframe').forEach(iframe => {
    iframe.style.pointerEvents = '';
  });

  // Remove dragging class
  if (dragTarget) {
    dragTarget.classList.remove('dragging');
  }

  isDragging = false;
  dragTarget = null;
}
