// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera setup
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 3;

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Create dodecahedron wireframe
const geometry = new THREE.DodecahedronGeometry(1);
const edges = new THREE.EdgesGeometry(geometry);
const material = new THREE.LineBasicMaterial({ color: 0xffffff });
const dodecahedron = new THREE.LineSegments(edges, material);
scene.add(dodecahedron);

// Rotation state
const currentRotation = { x: 0, y: 0, z: 0 };
const targetRotation = { x: 0, y: 0, z: 0 };
let animationProgress = 1; // 1 = animation complete
const animationDuration = 500; // ms
let animationStartTime = 0;
const startRotation = { x: 0, y: 0, z: 0 };

// Ease-out cubic function (starts fast, ends slow)
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

// Convert degrees to radians
const DEG_TO_RAD = Math.PI / 180;
const ROTATION_AMOUNT = 25 * DEG_TO_RAD;

// Audio analysis state
let audioContext = null;
let analyser = null;
let frequencyData = null;
let audioEnabled = false;
let mediaStream = null;  // Keep reference to stop on close

// External audio (from orchestrator via postMessage)
let externalAudio = null;

// Listen for external audio data from orchestrator
window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'audio') {
        externalAudio = e.data;
        audioEnabled = true; // Enable audio processing
        // Convert frequency array back to Uint8Array if needed
        if (e.data.frequencyData && !frequencyData) {
            frequencyData = new Uint8Array(e.data.frequencyData.length);
        }
        if (e.data.frequencyData) {
            frequencyData.set(e.data.frequencyData);
        }
    }
});

// Beat detection state
const volumeHistory = [];
const VOLUME_HISTORY_SIZE = 30; // ~0.5 seconds at 60fps
const BEAT_THRESHOLD = 1.25; // Current volume must be 1.25x average to trigger
const BEAT_COOLDOWN = 300; // ms between beats
const MIN_VOLUME = 5; // Minimum average volume to avoid silence triggering
let lastBeatTime = 0;

// EDM-optimized: Larger FFT for better bass resolution
const FFT_SIZE = 512;
const SAMPLE_RATE = 44100;
const BIN_WIDTH = SAMPLE_RATE / FFT_SIZE;

// EDM frequency bands (tuned for kick/snare/hi-hat)
const KICK_LOW = 40;    // Sub-bass starts
const KICK_HIGH = 150;  // Kick drum range
const SNARE_HIGH = 2500; // Snare/mid range
// Above SNARE_HIGH = hi-hats/cymbals

// Energy trend tracking for rotation direction
const energyHistory = { kick: [], snare: [], hihat: [] };
const ENERGY_HISTORY_SIZE = 10;
const totalEnergyHistory = [];
const TOTAL_ENERGY_HISTORY_SIZE = 20; // Longer window for trend detection
let currentDirection = 1; // Sticky direction - doesn't flip easily
const DIRECTION_CHANGE_THRESHOLD = 1.10; // Energy must change by 10% to flip direction

// Initialize audio
async function initAudio() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = 0.3; // Less smoothing = more reactive

        const source = audioContext.createMediaStreamSource(mediaStream);
        source.connect(analyser);

        frequencyData = new Uint8Array(analyser.frequencyBinCount);
        audioEnabled = true;

        console.log('EDM mode enabled! Kick → X axis, Snare → Y axis, Hi-hats → Z axis');
    } catch (err) {
        console.log('Microphone access denied - falling back to timed rotation');
        document.body.style.backgroundColor = 'red';
        scene.background = new THREE.Color(0xff0000);
        startFallbackRotation();
    }
}

// Clean up audio stream on window close
window.addEventListener('beforeunload', () => {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }
    if (audioContext) {
        audioContext.close();
    }
});

// Fallback to original timed rotation
function startFallbackRotation() {
    setInterval(() => {
        const axes = ['x', 'y', 'z'];
        const randomAxis = axes[Math.floor(Math.random() * 3)];
        triggerRotation(randomAxis, 1);
    }, 2000);
}

// Calculate weighted volume (boosted sub-bass for EDM)
function getVolume() {
    // Use external audio data if available (orchestrator mode)
    if (externalAudio && externalAudio.volume !== undefined) {
        return externalAudio.volume;
    }

    // Fallback to local audio (standalone mode)
    if (!analyser) return 0;
    analyser.getByteFrequencyData(frequencyData);
    let sum = 0;
    const kickEnd = Math.floor(KICK_HIGH / BIN_WIDTH);

    for (let i = 0; i < frequencyData.length; i++) {
        // Boost kick frequencies by 2x for EDM
        if (i < kickEnd) {
            sum += frequencyData[i] * 2;
        } else {
            sum += frequencyData[i];
        }
    }
    return sum / frequencyData.length;
}

// Get average volume from history
function getAverageVolume() {
    if (volumeHistory.length === 0) return 0;
    const sum = volumeHistory.reduce((a, b) => a + b, 0);
    return sum / volumeHistory.length;
}

// Get energy in a specific frequency range
function getBandEnergy(lowHz, highHz) {
    const lowBin = Math.floor(lowHz / BIN_WIDTH);
    const highBin = Math.floor(highHz / BIN_WIDTH);
    let energy = 0;

    for (let i = lowBin; i < highBin && i < frequencyData.length; i++) {
        energy += frequencyData[i];
    }

    return energy / (highBin - lowBin || 1);
}

// Determine dominant frequency band and rotation direction
// Returns { axis: 'x'|'y'|'z', direction: 1|-1 }
function getRotationParams() {
    // Get energy for each EDM band
    const kickEnergy = getBandEnergy(KICK_LOW, KICK_HIGH) * 1.5; // Boost kick importance
    const snareEnergy = getBandEnergy(KICK_HIGH, SNARE_HIGH);
    const hihatEnergy = getBandEnergy(SNARE_HIGH, 8000);

    // Update energy history
    energyHistory.kick.push(kickEnergy);
    energyHistory.snare.push(snareEnergy);
    energyHistory.hihat.push(hihatEnergy);

    if (energyHistory.kick.length > ENERGY_HISTORY_SIZE) {
        energyHistory.kick.shift();
        energyHistory.snare.shift();
        energyHistory.hihat.shift();
    }

    // Determine dominant band → axis
    let axis;
    if (kickEnergy >= snareEnergy && kickEnergy >= hihatEnergy) {
        axis = 'x';
    } else if (snareEnergy >= kickEnergy && snareEnergy >= hihatEnergy) {
        axis = 'y';
    } else {
        axis = 'z';
    }

    // Track total energy history for smoother trend detection
    const totalEnergy = kickEnergy + snareEnergy + hihatEnergy;
    totalEnergyHistory.push(totalEnergy);
    if (totalEnergyHistory.length > TOTAL_ENERGY_HISTORY_SIZE) {
        totalEnergyHistory.shift();
    }

    // Only change direction if there's a significant sustained trend
    if (totalEnergyHistory.length >= 5) {
        const recentAvg = totalEnergyHistory.slice(-5).reduce((a, b) => a + b, 0) / 5;
        const olderAvg = totalEnergyHistory.slice(0, -5).reduce((a, b) => a + b, 0) / (totalEnergyHistory.length - 5) || recentAvg;

        // Only flip direction if energy changed significantly
        if (recentAvg > olderAvg * DIRECTION_CHANGE_THRESHOLD) {
            currentDirection = 1; // Building up
        } else if (recentAvg < olderAvg / DIRECTION_CHANGE_THRESHOLD) {
            currentDirection = -1; // Dropping
        }
        // Otherwise keep current direction (sticky)
    }

    return { axis, direction: currentDirection };
}

// Analyze audio and detect beats
function analyzeAudio(currentTime) {
    if (!audioEnabled) return;

    const volume = getVolume();
    const avgVolume = getAverageVolume();

    // Update volume history
    volumeHistory.push(volume);
    if (volumeHistory.length > VOLUME_HISTORY_SIZE) {
        volumeHistory.shift();
    }

    // Beat detection
    const timeSinceLastBeat = currentTime - lastBeatTime;
    if (volume > avgVolume * BEAT_THRESHOLD &&
        timeSinceLastBeat > BEAT_COOLDOWN &&
        avgVolume > MIN_VOLUME) {

        lastBeatTime = currentTime;
        const { axis, direction } = getRotationParams();
        triggerRotation(axis, direction);
    }
}

// Trigger rotation on specified axis with direction
function triggerRotation(axis, direction = 1) {
    // Save start position
    startRotation.x = currentRotation.x;
    startRotation.y = currentRotation.y;
    startRotation.z = currentRotation.z;

    // Set new target (direction determines positive/negative rotation)
    targetRotation[axis] += ROTATION_AMOUNT * direction;

    // Start animation
    animationProgress = 0;
    animationStartTime = performance.now();
}

// Animation loop
function animate(currentTime) {
    requestAnimationFrame(animate);

    // Analyze audio for beat detection
    analyzeAudio(currentTime);

    // Update animation progress
    if (animationProgress < 1) {
        const elapsed = currentTime - animationStartTime;
        animationProgress = Math.min(elapsed / animationDuration, 1);
        const easedProgress = easeOutCubic(animationProgress);

        // Interpolate rotation
        currentRotation.x = startRotation.x + (targetRotation.x - startRotation.x) * easedProgress;
        currentRotation.y = startRotation.y + (targetRotation.y - startRotation.y) * easedProgress;
        currentRotation.z = startRotation.z + (targetRotation.z - startRotation.z) * easedProgress;

        // Apply rotation to dodecahedron
        dodecahedron.rotation.x = currentRotation.x;
        dodecahedron.rotation.y = currentRotation.y;
        dodecahedron.rotation.z = currentRotation.z;
    }

    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize audio and start animation
initAudio();
animate(performance.now());
