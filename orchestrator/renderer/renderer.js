// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // Window sizing
  WINDOW_WIDTH: 350,
  WINDOW_HEIGHT: 350,
  WINDOW_GAP: 10,
  TITLEBAR_HEIGHT: 18,
  CHROME_PADDING: 8, // borders + margins

  // Limits
  MAX_WINDOWS: 50,
  MAX_PER_PROJECT: 15,

  // Audio
  FFT_SIZE: 512,
  SAMPLE_RATE: 44100,
  VOLUME_HISTORY_SIZE: 30,

  // Beat detection (base values, adjusted by sensitivity)
  BEAT_THRESHOLD_BASE: 1.25,
  BEAT_COOLDOWN: 300,
  MIN_VOLUME_BASE: 5,

  // Close detection
  CLOSE_COOLDOWN: 800,
  MIN_WINDOWS_TO_CLOSE: 3,

  // Audio broadcast
  BROADCAST_RATE: 60
};

// Frequency analysis
const BIN_WIDTH = CONFIG.SAMPLE_RATE / CONFIG.FFT_SIZE;
const KICK_HIGH = 150;

// Available projects
const PROJECTS = [
  'circling_cycle',
  'lucid_dream',
  'pitchy_soundwave',
  'rotating_gliph',
  'tlkn_2_mslf'
];

// =============================================================================
// STATE
// =============================================================================

// Audio
let audioContext = null;
let analyser = null;
let frequencyData = null;
let timeDomainData = null;
let audioEnabled = false;
const volumeHistory = [];
let lastBeatTime = 0;
let lastCloseTime = 0;

// Sensitivity
let sensitivity = 1.0;

// Windows
const virtualWindows = []; // { id, element, iframe, project, gridIndex }
let windowIdCounter = 0;
const projectCounts = {};
PROJECTS.forEach(p => projectCounts[p] = 0);

// Pattern
let currentPattern = 'grid';

// Grid state (for grid pattern)
let gridCells = [];
let gridCols = 0;
let gridRows = 0;

// =============================================================================
// DOM ELEMENTS
// =============================================================================

const windowContainer = document.getElementById('windowContainer');
const windowBar = document.getElementById('windowBar');
const windowCountEl = document.getElementById('windowCount');
const audioBar = document.getElementById('audioBar');
const statusEl = document.getElementById('status');
const openBtn = document.getElementById('openBtn');
const closeBtn = document.getElementById('closeBtn');
const sensitivitySlider = document.getElementById('sensitivitySlider');
const sensitivityValue = document.getElementById('sensitivityValue');
const patternSelect = document.getElementById('patternSelect');

// =============================================================================
// SENSITIVITY
// =============================================================================

function getBeatThreshold() {
  return 1.0 + (CONFIG.BEAT_THRESHOLD_BASE - 1.0) / sensitivity;
}

function getMinVolume() {
  return CONFIG.MIN_VOLUME_BASE / sensitivity;
}

sensitivitySlider.addEventListener('input', (e) => {
  sensitivity = parseFloat(e.target.value);
  sensitivityValue.textContent = sensitivity.toFixed(1) + 'x';
});

patternSelect.addEventListener('change', (e) => {
  currentPattern = e.target.value;
  recalculateGrid();
});

// =============================================================================
// AUDIO
// =============================================================================

async function initAudio() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = CONFIG.FFT_SIZE;
    analyser.smoothingTimeConstant = 0.3;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    frequencyData = new Uint8Array(analyser.frequencyBinCount);
    timeDomainData = new Uint8Array(analyser.fftSize);
    audioEnabled = true;

    setStatus('Listening...');
  } catch (err) {
    console.error('Microphone access denied:', err);
    setStatus('Microphone access denied');
  }
}

function getVolume() {
  if (!analyser) return 0;

  analyser.getByteFrequencyData(frequencyData);
  let sum = 0;
  const kickEnd = Math.floor(KICK_HIGH / BIN_WIDTH);

  for (let i = 0; i < frequencyData.length; i++) {
    if (i < kickEnd) {
      sum += frequencyData[i] * 2;
    } else {
      sum += frequencyData[i];
    }
  }
  return sum / frequencyData.length;
}

function getAverageVolume() {
  if (volumeHistory.length === 0) return 0;
  return volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length;
}

// =============================================================================
// GRID CALCULATION
// =============================================================================

function recalculateGrid() {
  const containerWidth = windowContainer.clientWidth;
  const containerHeight = windowContainer.clientHeight;

  const totalWindowWidth = CONFIG.WINDOW_WIDTH + CONFIG.CHROME_PADDING;
  const totalWindowHeight = CONFIG.WINDOW_HEIGHT + CONFIG.TITLEBAR_HEIGHT + CONFIG.CHROME_PADDING;

  gridCols = Math.floor((containerWidth - CONFIG.WINDOW_GAP) / (totalWindowWidth + CONFIG.WINDOW_GAP));
  gridRows = Math.floor((containerHeight - CONFIG.WINDOW_GAP) / (totalWindowHeight + CONFIG.WINDOW_GAP));

  gridCols = Math.max(1, gridCols);
  gridRows = Math.max(1, gridRows);

  gridCells = new Array(gridCols * gridRows).fill(null);

  // Re-assign existing windows to grid cells
  virtualWindows.forEach((win, idx) => {
    if (idx < gridCells.length) {
      gridCells[idx] = win.id;
      win.gridIndex = idx;
    }
  });
}

function getGridPosition(index) {
  const totalWindowWidth = CONFIG.WINDOW_WIDTH + CONFIG.CHROME_PADDING;
  const totalWindowHeight = CONFIG.WINDOW_HEIGHT + CONFIG.TITLEBAR_HEIGHT + CONFIG.CHROME_PADDING;

  const col = index % gridCols;
  const row = Math.floor(index / gridCols);

  return {
    x: CONFIG.WINDOW_GAP + col * (totalWindowWidth + CONFIG.WINDOW_GAP),
    y: CONFIG.WINDOW_GAP + row * (totalWindowHeight + CONFIG.WINDOW_GAP)
  };
}

// =============================================================================
// POSITIONING PATTERNS
// =============================================================================

function getNextPosition() {
  switch (currentPattern) {
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
  for (let i = 0; i < gridCells.length; i++) {
    if (gridCells[i] === null) {
      return { ...getGridPosition(i), gridIndex: i };
    }
  }
  // All full, return last position
  return { ...getGridPosition(gridCells.length - 1), gridIndex: -1 };
}

function getSpiralPosition() {
  // Generate spiral order from center
  const centerCol = Math.floor(gridCols / 2);
  const centerRow = Math.floor(gridRows / 2);
  const spiralOrder = generateSpiralOrder(centerCol, centerRow, gridCols, gridRows);

  for (const idx of spiralOrder) {
    if (gridCells[idx] === null) {
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
    for (const win of virtualWindows) {
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
  const idx = virtualWindows.length;
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

  const idx = virtualWindows.length;
  const angle = (idx * 137.5) * (Math.PI / 180); // Golden angle
  const radius = Math.sqrt(idx) * 80;

  const x = Math.max(CONFIG.WINDOW_GAP, Math.min(containerWidth - totalWidth - CONFIG.WINDOW_GAP,
    centerX + Math.cos(angle) * radius));
  const y = Math.max(CONFIG.WINDOW_GAP, Math.min(containerHeight - totalHeight - CONFIG.WINDOW_GAP,
    centerY + Math.sin(angle) * radius));

  return { x, y, gridIndex: -1 };
}

// =============================================================================
// VIRTUAL WINDOW MANAGEMENT
// =============================================================================

function getRandomProject() {
  const available = PROJECTS.filter(p => projectCounts[p] < CONFIG.MAX_PER_PROJECT);
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

function createVirtualWindow() {
  if (virtualWindows.length >= CONFIG.MAX_WINDOWS) {
    return null;
  }

  const project = getRandomProject();
  if (!project) return null;

  const { x, y, gridIndex } = getNextPosition();
  const id = windowIdCounter++;

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
  closeButton.textContent = '×';
  closeButton.onclick = () => closeVirtualWindow(id);

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

  // Track window
  const win = { id, element: windowEl, iframe, project, gridIndex };
  virtualWindows.push(win);
  projectCounts[project]++;

  if (gridIndex >= 0 && gridIndex < gridCells.length) {
    gridCells[gridIndex] = id;
  }

  // Remove spawning class after animation
  setTimeout(() => windowEl.classList.remove('spawning'), 300);

  updateUI();
  return win;
}

function closeVirtualWindow(id) {
  const idx = virtualWindows.findIndex(w => w.id === id);
  if (idx === -1) return;

  const win = virtualWindows[idx];
  win.element.classList.add('closing');

  // Clear grid cell
  if (win.gridIndex >= 0 && win.gridIndex < gridCells.length) {
    gridCells[win.gridIndex] = null;
  }

  setTimeout(() => {
    win.element.remove();
    virtualWindows.splice(idx, 1);
    projectCounts[win.project]--;
    updateUI();
  }, 200);
}

function closeOldestWindow() {
  if (virtualWindows.length < CONFIG.MIN_WINDOWS_TO_CLOSE) return;
  if (virtualWindows.length === 0) return;

  closeVirtualWindow(virtualWindows[0].id);
}

// =============================================================================
// AUDIO BROADCAST
// =============================================================================

function broadcastAudioData(volume, beat) {
  // Get time-domain data for waveform visualizers
  if (analyser && timeDomainData) {
    analyser.getByteTimeDomainData(timeDomainData);
  }

  const data = {
    type: 'audio',
    volume,
    beat,
    frequencyData: frequencyData ? Array.from(frequencyData) : [],
    timeDomainData: timeDomainData ? Array.from(timeDomainData) : [],
    timestamp: performance.now()
  };

  virtualWindows.forEach(win => {
    try {
      win.iframe.contentWindow.postMessage(data, '*');
    } catch (e) {
      // Iframe might not be ready
    }
  });
}

// =============================================================================
// UI
// =============================================================================

function updateUI() {
  const volume = getVolume();
  const normalizedVolume = Math.min(volume / 50, 1);
  audioBar.style.width = `${normalizedVolume * 100}%`;

  const windowPercent = (virtualWindows.length / CONFIG.MAX_WINDOWS) * 100;
  windowBar.style.width = `${windowPercent}%`;
  windowCountEl.textContent = `${virtualWindows.length}/${CONFIG.MAX_WINDOWS}`;
}

function setStatus(text) {
  statusEl.textContent = text;
}

// =============================================================================
// MAIN LOOP
// =============================================================================

function analyzeLoop(currentTime) {
  if (!audioEnabled) {
    requestAnimationFrame(analyzeLoop);
    return;
  }

  const volume = getVolume();
  const avgVolume = getAverageVolume();

  // Update history
  volumeHistory.push(volume);
  if (volumeHistory.length > CONFIG.VOLUME_HISTORY_SIZE) {
    volumeHistory.shift();
  }

  // Beat detection
  const timeSinceBeat = currentTime - lastBeatTime;
  let beat = false;

  if (volume > avgVolume * getBeatThreshold() &&
      timeSinceBeat > CONFIG.BEAT_COOLDOWN &&
      avgVolume > getMinVolume()) {

    lastBeatTime = currentTime;
    beat = true;

    if (virtualWindows.length < CONFIG.MAX_WINDOWS) {
      createVirtualWindow();
      setStatus('Beat - Opening window...');
      setTimeout(() => setStatus('Listening...'), 500);
    }
  }

  // Close on quiet
  const timeSinceClose = currentTime - lastCloseTime;
  if (volume < avgVolume * 0.4 &&
      avgVolume > getMinVolume() &&
      timeSinceClose > CONFIG.CLOSE_COOLDOWN &&
      virtualWindows.length >= CONFIG.MIN_WINDOWS_TO_CLOSE) {

    lastCloseTime = currentTime;
    closeOldestWindow();
    setStatus('Quiet - Closing window...');
    setTimeout(() => setStatus('Listening...'), 500);
  }

  // Broadcast audio to iframes
  broadcastAudioData(volume, beat);

  // Update UI
  updateUI();

  requestAnimationFrame(analyzeLoop);
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

openBtn.addEventListener('click', () => {
  createVirtualWindow();
});

closeBtn.addEventListener('click', () => {
  if (virtualWindows.length > 0) {
    closeVirtualWindow(virtualWindows[virtualWindows.length - 1].id);
  }
});

window.addEventListener('resize', () => {
  recalculateGrid();
});

// =============================================================================
// INIT
// =============================================================================

async function init() {
  recalculateGrid();
  await initAudio();
  requestAnimationFrame(analyzeLoop);
}

init();
