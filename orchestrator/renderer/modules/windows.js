// =============================================================================
// VIRTUAL WINDOW MANAGEMENT & POSITIONING
// =============================================================================

import { CONFIG, PROJECTS } from './config.js';
import { state } from './state.js';
import { updateUI, setStatus } from './ui.js';
import { makeDraggable, bringToFront } from './drag.js';

let windowContainer;

export function initWindowContainer() {
  windowContainer = document.getElementById('windowContainer');

  // Listen for resize requests from iframes
  window.addEventListener('message', handleIframeMessage);
}

function handleIframeMessage(event) {
  if (!event.data || event.data.type !== 'resize') return;

  const { width, height } = event.data;
  if (!width || !height) return;

  // Find which window sent this message
  const win = state.virtualWindows.find(w => w.iframe.contentWindow === event.source);
  if (!win) return;

  resizeWindow(win.id, width, height);
}

export function resizeWindow(id, contentWidth, contentHeight) {
  const win = state.virtualWindows.find(w => w.id === id);
  if (!win) return;

  const windowEl = win.element;
  const totalWidth = contentWidth + CONFIG.CHROME_PADDING;
  const totalHeight = contentHeight + CONFIG.TITLEBAR_HEIGHT + CONFIG.CHROME_PADDING;

  windowEl.style.width = `${totalWidth}px`;
  windowEl.style.height = `${totalHeight}px`;

  // Update iframe size
  const content = windowEl.querySelector('.win98-content');
  if (content) {
    content.style.width = `${contentWidth}px`;
    content.style.height = `${contentHeight}px`;
  }

  // Ensure window stays within bounds
  const containerWidth = windowContainer.clientWidth;
  const containerHeight = windowContainer.clientHeight;
  let x = parseInt(windowEl.style.left);
  let y = parseInt(windowEl.style.top);

  // Clamp position to keep window in bounds
  x = Math.max(CONFIG.WINDOW_GAP, Math.min(x, containerWidth - totalWidth - CONFIG.WINDOW_GAP));
  y = Math.max(CONFIG.WINDOW_GAP, Math.min(y, containerHeight - totalHeight - CONFIG.WINDOW_GAP));

  windowEl.style.left = `${x}px`;
  windowEl.style.top = `${y}px`;
}

// =============================================================================
// GRID CALCULATION
// =============================================================================

export function recalculateGrid() {
  if (!windowContainer) return;

  const containerWidth = windowContainer.clientWidth;
  const containerHeight = windowContainer.clientHeight;

  const totalWindowWidth = CONFIG.WINDOW_WIDTH + CONFIG.CHROME_PADDING;
  const totalWindowHeight = CONFIG.WINDOW_HEIGHT + CONFIG.TITLEBAR_HEIGHT + CONFIG.CHROME_PADDING;

  state.gridCols = Math.floor((containerWidth - CONFIG.WINDOW_GAP) / (totalWindowWidth + CONFIG.WINDOW_GAP));
  state.gridRows = Math.floor((containerHeight - CONFIG.WINDOW_GAP) / (totalWindowHeight + CONFIG.WINDOW_GAP));

  state.gridCols = Math.max(1, state.gridCols);
  state.gridRows = Math.max(1, state.gridRows);

  state.gridCells = new Array(state.gridCols * state.gridRows).fill(null);

  // Re-assign existing windows to grid cells
  state.virtualWindows.forEach((win, idx) => {
    if (idx < state.gridCells.length) {
      state.gridCells[idx] = win.id;
      win.gridIndex = idx;
    }
  });
}

function getGridPosition(index) {
  const totalWindowWidth = CONFIG.WINDOW_WIDTH + CONFIG.CHROME_PADDING;
  const totalWindowHeight = CONFIG.WINDOW_HEIGHT + CONFIG.TITLEBAR_HEIGHT + CONFIG.CHROME_PADDING;

  const col = index % state.gridCols;
  const row = Math.floor(index / state.gridCols);

  return {
    x: CONFIG.WINDOW_GAP + col * (totalWindowWidth + CONFIG.WINDOW_GAP),
    y: CONFIG.WINDOW_GAP + row * (totalWindowHeight + CONFIG.WINDOW_GAP)
  };
}

// =============================================================================
// POSITIONING PATTERNS
// =============================================================================

export function getNextPosition() {
  switch (state.currentPattern) {
    case 'grid': return getGridFillPosition();
    case 'spiral': return getSpiralPosition();
    case 'random': return getRandomPosition();
    case 'cascade': return getCascadePosition();
    case 'burst': return getCenterBurstPosition();
    default: return getGridFillPosition();
  }
}

function getGridFillPosition() {
  // Find first empty cell
  for (let i = 0; i < state.gridCells.length; i++) {
    if (state.gridCells[i] === null) {
      return { ...getGridPosition(i), gridIndex: i };
    }
  }
  // All full, return last position
  return { ...getGridPosition(state.gridCells.length - 1), gridIndex: -1 };
}

function getSpiralPosition() {
  // Generate spiral order from center
  const centerCol = Math.floor(state.gridCols / 2);
  const centerRow = Math.floor(state.gridRows / 2);
  const spiralOrder = generateSpiralOrder(centerCol, centerRow, state.gridCols, state.gridRows);

  for (const idx of spiralOrder) {
    if (state.gridCells[idx] === null) {
      return { ...getGridPosition(idx), gridIndex: idx };
    }
  }
  return { ...getGridPosition(0), gridIndex: -1 };
}

function generateSpiralOrder(cx, cy, cols, rows) {
  const order = [];
  const visited = new Set();
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // right, down, left, up
  let x = cx, y = cy;
  let dirIdx = 0;
  let steps = 1;
  let stepCount = 0;
  let turnCount = 0;

  const maxCells = cols * rows;
  while (order.length < maxCells) {
    if (x >= 0 && x < cols && y >= 0 && y < rows) {
      const idx = y * cols + x;
      if (!visited.has(idx)) {
        visited.add(idx);
        order.push(idx);
      }
    }

    x += dirs[dirIdx][0];
    y += dirs[dirIdx][1];
    stepCount++;

    if (stepCount >= steps) {
      stepCount = 0;
      dirIdx = (dirIdx + 1) % 4;
      turnCount++;
      if (turnCount >= 2) {
        turnCount = 0;
        steps++;
      }
    }
  }
  return order;
}

function getRandomPosition() {
  const containerWidth = windowContainer.clientWidth;
  const containerHeight = windowContainer.clientHeight;
  const totalWidth = CONFIG.WINDOW_WIDTH + CONFIG.CHROME_PADDING;
  const totalHeight = CONFIG.WINDOW_HEIGHT + CONFIG.TITLEBAR_HEIGHT + CONFIG.CHROME_PADDING;

  // Try to find non-overlapping position
  for (let attempt = 0; attempt < 50; attempt++) {
    const x = Math.random() * (containerWidth - totalWidth - CONFIG.WINDOW_GAP) + CONFIG.WINDOW_GAP;
    const y = Math.random() * (containerHeight - totalHeight - CONFIG.WINDOW_GAP) + CONFIG.WINDOW_GAP;

    let overlaps = false;
    for (const win of state.virtualWindows) {
      const wx = parseInt(win.element.style.left);
      const wy = parseInt(win.element.style.top);
      if (Math.abs(x - wx) < totalWidth && Math.abs(y - wy) < totalHeight) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      return { x, y, gridIndex: -1 };
    }
  }

  // Fallback to random
  return {
    x: Math.random() * (containerWidth - totalWidth),
    y: Math.random() * (containerHeight - totalHeight),
    gridIndex: -1
  };
}

function getCascadePosition() {
  const offset = 30;
  const idx = state.virtualWindows.length;
  const x = CONFIG.WINDOW_GAP + (idx * offset) % 300;
  const y = CONFIG.WINDOW_GAP + (idx * offset) % 200;
  return { x, y, gridIndex: -1 };
}

function getCenterBurstPosition() {
  const containerWidth = windowContainer.clientWidth;
  const containerHeight = windowContainer.clientHeight;
  const totalWidth = CONFIG.WINDOW_WIDTH + CONFIG.CHROME_PADDING;
  const totalHeight = CONFIG.WINDOW_HEIGHT + CONFIG.TITLEBAR_HEIGHT + CONFIG.CHROME_PADDING;

  // Start from center, spread out
  const centerX = (containerWidth - totalWidth) / 2;
  const centerY = (containerHeight - totalHeight) / 2;

  const idx = state.virtualWindows.length;
  const angle = (idx * 137.5) * (Math.PI / 180); // Golden angle
  const radius = Math.sqrt(idx) * 80;

  const x = Math.max(CONFIG.WINDOW_GAP, Math.min(containerWidth - totalWidth - CONFIG.WINDOW_GAP,
    centerX + Math.cos(angle) * radius));
  const y = Math.max(CONFIG.WINDOW_GAP, Math.min(containerHeight - totalHeight - CONFIG.WINDOW_GAP,
    centerY + Math.sin(angle) * radius));

  return { x, y, gridIndex: -1 };
}

// =============================================================================
// WINDOW CREATION & DESTRUCTION
// =============================================================================

export function getRandomProject() {
  const available = PROJECTS.filter(p => state.projectCounts[p] < CONFIG.MAX_PER_PROJECT);
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export function createVirtualWindow() {
  if (state.virtualWindows.length >= CONFIG.MAX_WINDOWS) {
    return null;
  }

  const project = getRandomProject();
  if (!project) return null;

  return createVirtualWindowWithProject(project);
}

export function createVirtualWindowWithProject(project) {
  if (state.virtualWindows.length >= CONFIG.MAX_WINDOWS) {
    setStatus('max windows reached');
    return null;
  }

  if (state.projectCounts[project] >= CONFIG.MAX_PER_PROJECT) {
    setStatus(`max ${project} windows reached`);
    return null;
  }

  const { x, y, gridIndex } = getNextPosition();
  const id = state.windowIdCounter++;

  // Create window element
  const windowEl = document.createElement('div');
  windowEl.className = 'win98-window spawning';
  windowEl.style.left = `${x}px`;
  windowEl.style.top = `${y}px`;
  windowEl.style.width = `${CONFIG.WINDOW_WIDTH + CONFIG.CHROME_PADDING}px`;
  windowEl.style.height = `${CONFIG.WINDOW_HEIGHT + CONFIG.TITLEBAR_HEIGHT + CONFIG.CHROME_PADDING}px`;

  // Title bar
  const titleBar = document.createElement('div');
  titleBar.className = 'win98-titlebar';

  const title = document.createElement('span');
  title.className = 'win98-title';
  title.textContent = project;

  const buttons = document.createElement('div');
  buttons.className = 'win98-buttons';

  const closeButton = document.createElement('button');
  closeButton.className = 'win98-btn win98-btn-close';
  closeButton.onclick = () => closeVirtualWindow(id);

  // Add maximize button only for projects that support it
  if (project !== 'draw_m3_like_one_of_your_ZnJlbmNoIGdpcmxz') {
    const maximizeButton = document.createElement('button');
    maximizeButton.className = 'win98-btn win98-btn-maximize';
    maximizeButton.onclick = (e) => {
      e.stopPropagation();
      toggleMaximize(id);
    };
    buttons.appendChild(maximizeButton);
  }
  buttons.appendChild(closeButton);
  titleBar.appendChild(title);
  titleBar.appendChild(buttons);

  // Content area with iframe
  const content = document.createElement('div');
  content.className = 'win98-content';

  const iframe = document.createElement('iframe');
  iframe.src = `../../${project}/index.html`;
  iframe.allow = 'microphone'; // Allow microphone for standalone mode

  content.appendChild(iframe);
  windowEl.appendChild(titleBar);
  windowEl.appendChild(content);
  windowContainer.appendChild(windowEl);

  // Make window draggable by title bar
  makeDraggable(windowEl, titleBar);

  // Bring to front when clicking anywhere on window
  windowEl.addEventListener('mousedown', () => bringToFront(windowEl));

  // Track window
  const win = { id, element: windowEl, iframe, project, gridIndex };
  state.virtualWindows.push(win);
  state.projectCounts[project]++;

  if (gridIndex >= 0 && gridIndex < state.gridCells.length) {
    state.gridCells[gridIndex] = id;
  }

  // Send init message with max dimensions when iframe loads
  iframe.addEventListener('load', () => {
    const maxWidth = windowContainer.clientWidth - CONFIG.CHROME_PADDING - CONFIG.WINDOW_GAP * 2;
    const maxHeight = windowContainer.clientHeight - CONFIG.TITLEBAR_HEIGHT - CONFIG.CHROME_PADDING - CONFIG.WINDOW_GAP * 2;
    iframe.contentWindow.postMessage({
      type: 'init',
      maxWidth,
      maxHeight
    }, '*');
  });

  // Remove spawning class after animation
  setTimeout(() => windowEl.classList.remove('spawning'), 300);

  updateUI();
  return win;
}

export function closeVirtualWindow(id) {
  const idx = state.virtualWindows.findIndex(w => w.id === id);
  if (idx === -1) return;

  const win = state.virtualWindows[idx];
  win.element.classList.add('closing');

  // Clear grid cell
  if (win.gridIndex >= 0 && win.gridIndex < state.gridCells.length) {
    state.gridCells[win.gridIndex] = null;
  }

  // Update state immediately so new windows can be created
  state.virtualWindows.splice(idx, 1);
  state.projectCounts[win.project]--;
  updateUI();

  // Remove DOM element after animation completes
  setTimeout(() => {
    win.element.remove();
  }, 200);
}

export function closeOldestWindow() {
  if (state.virtualWindows.length < CONFIG.MIN_WINDOWS_TO_CLOSE) return;
  if (state.virtualWindows.length === 0) return;

  closeVirtualWindow(state.virtualWindows[0].id);
}

export function closeAllWindows() {
  // Close from newest to oldest to avoid index issues
  while (state.virtualWindows.length > 0) {
    const win = state.virtualWindows[state.virtualWindows.length - 1];
    win.element.remove();
    if (win.gridIndex >= 0 && win.gridIndex < state.gridCells.length) {
      state.gridCells[win.gridIndex] = null;
    }
    state.projectCounts[win.project]--;
    state.virtualWindows.pop();
  }
  updateUI();
}

// =============================================================================
// WINDOW MAXIMIZE
// =============================================================================

export function toggleMaximize(id) {
  const win = state.virtualWindows.find(w => w.id === id);
  if (!win) return;

  const windowEl = win.element;

  if (win.isMaximized) {
    // Restore to previous position and size
    windowEl.classList.remove('maximized');
    windowEl.style.left = `${win.prevPosition.x}px`;
    windowEl.style.top = `${win.prevPosition.y}px`;
    windowEl.style.width = `${win.prevPosition.width}px`;
    windowEl.style.height = `${win.prevPosition.height}px`;
    win.isMaximized = false;
  } else {
    // Save current position and size
    win.prevPosition = {
      x: parseInt(windowEl.style.left),
      y: parseInt(windowEl.style.top),
      width: parseInt(windowEl.style.width),
      height: parseInt(windowEl.style.height)
    };

    // Maximize to fill window container
    windowEl.classList.add('maximized');
    windowEl.style.left = '0px';
    windowEl.style.top = '0px';
    windowEl.style.width = `${windowContainer.clientWidth}px`;
    windowEl.style.height = `${windowContainer.clientHeight}px`;
    win.isMaximized = true;

    // Bring to front
    bringToFront(windowEl);
  }
}
