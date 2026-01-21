// Audio analysis configuration
const CONFIG = {
  // Audio setup
  FFT_SIZE: 2048,            // Larger for better time-domain resolution
  VOLUME_HISTORY_SIZE: 30,   // ~0.5 seconds at 60fps

  // Window open thresholds (volume spike)
  OPEN_THRESHOLD: 1.2,       // Volume spike to open (20% above average)
  OPEN_COOLDOWN: 500,        // ms between opens
  MIN_BASS_LEVEL: 2,         // Minimum average volume to trigger (silence is ~0-1)
  NOISE_GATE: 5,             // Absolute minimum volume (time-domain, silence ~0-1)

  // Window close thresholds
  CLOSE_COOLDOWN: 800,       // ms between closes
  MIN_WINDOWS_TO_CLOSE: 5,   // Minimum windows before closing allowed

  // Limits
  MAX_WINDOWS: 20
};

// Audio state
let audioContext = null;
let analyser = null;
let timeDomainData = null;
let audioEnabled = false;

// Volume tracking (time-domain based)
const volumeHistory = [];

// Timing state
let lastOpenTime = 0;
let lastCloseTime = 0;

// Window count
let windowCount = 0;

// DOM elements
const windowBar = document.getElementById('windowBar');
const windowCountEl = document.getElementById('windowCount');
const audioBar = document.getElementById('audioBar');
const statusEl = document.getElementById('status');
const openBtn = document.getElementById('openBtn');
const closeBtn = document.getElementById('closeBtn');

// Initialize audio
async function initAudio() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = CONFIG.FFT_SIZE;
    analyser.smoothingTimeConstant = 0.3;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    timeDomainData = new Uint8Array(analyser.fftSize);
    audioEnabled = true;

    setStatus('Listening...', 'listening');
    console.log('Audio initialized');

    // Start analysis loop
    requestAnimationFrame(analyzeLoop);
  } catch (err) {
    console.error('Microphone access denied:', err);
    setStatus('Microphone access denied', '');
  }
}

// Get volume from time-domain data (like pitchy_soundwave)
// Returns amplitude as deviation from center (0-128 scale)
function getVolume() {
  analyser.getByteTimeDomainData(timeDomainData);

  let sum = 0;
  for (let i = 0; i < timeDomainData.length; i++) {
    // Data is 0-255, centered at 128. Get absolute deviation.
    const deviation = Math.abs(timeDomainData[i] - 128);
    sum += deviation;
  }

  return sum / timeDomainData.length;
}

// Get average from history array
function getAverageVolume() {
  if (volumeHistory.length === 0) return 0;
  const sum = volumeHistory.reduce((a, b) => a + b, 0);
  return sum / volumeHistory.length;
}

// Update UI
function updateUI(volume) {
  // Audio bar - volume is 0-128 scale, normalize to percentage
  const normalizedVolume = Math.min(volume / 30, 1); // 30 is roughly "loud"
  audioBar.style.width = `${normalizedVolume * 100}%`;

  // Window bar
  const windowPercent = (windowCount / CONFIG.MAX_WINDOWS) * 100;
  windowBar.style.width = `${windowPercent}%`;
  windowCountEl.textContent = `${windowCount}/${CONFIG.MAX_WINDOWS}`;
}

function setStatus(text, className) {
  statusEl.textContent = text;
  statusEl.className = 'status ' + className;
}

// Main analysis loop
function analyzeLoop(currentTime) {
  if (!audioEnabled) return;

  const volume = getVolume();
  const avgVolume = getAverageVolume();

  // Update history
  volumeHistory.push(volume);
  if (volumeHistory.length > CONFIG.VOLUME_HISTORY_SIZE) {
    volumeHistory.shift();
  }

  // Update UI
  updateUI(volume);

  // Decision logic
  const timeSinceOpen = currentTime - lastOpenTime;
  const timeSinceClose = currentTime - lastCloseTime;

  // OPEN condition: volume spike above threshold AND above noise gate
  if (volume > avgVolume * CONFIG.OPEN_THRESHOLD &&
      volume > CONFIG.NOISE_GATE &&
      timeSinceOpen > CONFIG.OPEN_COOLDOWN &&
      avgVolume > CONFIG.MIN_BASS_LEVEL) {

    lastOpenTime = currentTime;

    // If at max, cycle: close oldest first, then open new
    if (windowCount >= CONFIG.MAX_WINDOWS) {
      window.orchestrator.closeWindow();
      window.orchestrator.openWindow();
      setStatus('Loud hit - Cycling...', 'action');
    } else {
      window.orchestrator.openWindow();
      setStatus('Loud hit - Opening...', 'action');
    }

    setTimeout(() => {
      if (audioEnabled) setStatus('Listening...', 'listening');
    }, 500);
  }

  // CLOSE condition: volume drops significantly below average
  if (volume < avgVolume * 0.5 &&
      avgVolume > CONFIG.MIN_BASS_LEVEL &&
      timeSinceClose > CONFIG.CLOSE_COOLDOWN &&
      windowCount >= CONFIG.MIN_WINDOWS_TO_CLOSE) {

    lastCloseTime = currentTime;
    window.orchestrator.closeWindow();
    setStatus('Quiet moment - Closing...', 'action');

    setTimeout(() => {
      if (audioEnabled) setStatus('Listening...', 'listening');
    }, 500);
  }

  requestAnimationFrame(analyzeLoop);
}

// Handle window count updates from main process
window.orchestrator.onWindowCount((count) => {
  windowCount = count;
  updateUI(0, 0);
});

// Get initial window count
window.orchestrator.getWindowCount().then((count) => {
  windowCount = count;
  updateUI(0, 0);
});

// Manual controls
openBtn.addEventListener('click', () => {
  window.orchestrator.openWindow();
});

closeBtn.addEventListener('click', () => {
  window.orchestrator.closeWindow();
});

// Initialize
initAudio();
