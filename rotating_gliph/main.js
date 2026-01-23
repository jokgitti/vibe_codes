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

// Rotation tracking
let beatCount = 0;

// =============================================================================
// EXTERNAL AUDIO (from orchestrator)
// =============================================================================

let externalAudio = null;
let fallbackInterval = null;

window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'audio') {
        externalAudio = e.data;
        // Stop fallback rotation if running
        if (fallbackInterval) {
            clearInterval(fallbackInterval);
            fallbackInterval = null;
        }
        // React to beat from orchestrator
        if (e.data.beat) {
            beatCount++;
            const axis = getRotationAxis();
            const direction = getRotationDirection();
            triggerRotation(axis, direction);
        }
    }
});

// =============================================================================
// LOCAL AUDIO (standalone mode)
// =============================================================================

let audioContext = null;
let analyser = null;
let timeDomainData = null;
let mediaStream = null;

// Beat detection (standalone mode only)
const volumeHistory = [];
const VOLUME_HISTORY_SIZE = 30;
const BEAT_THRESHOLD = 1.3;
const BEAT_COOLDOWN = 300;
const MIN_VOLUME = 2;
const FFT_SIZE = 512;
let lastBeatTime = 0;

async function initAudio() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = 0.3;

        const source = audioContext.createMediaStreamSource(mediaStream);
        source.connect(analyser);
        timeDomainData = new Uint8Array(analyser.fftSize);
    } catch (err) {
        console.log('Microphone access denied - will use external audio or fallback');
        startFallbackRotation();
    }
}

window.addEventListener('beforeunload', () => {
    if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
    if (audioContext) audioContext.close();
});

function startFallbackRotation() {
    fallbackInterval = setInterval(() => {
        if (externalAudio) return;
        const axes = ['x', 'y', 'z'];
        triggerRotation(axes[Math.floor(Math.random() * 3)], 1);
    }, 2000);
}

function getVolume() {
    if (!analyser) return 0;
    analyser.getByteTimeDomainData(timeDomainData);
    let sum = 0;
    for (let i = 0; i < timeDomainData.length; i++) {
        sum += Math.abs(timeDomainData[i] - 128);
    }
    return sum / timeDomainData.length;
}

function getAverageVolume() {
    if (volumeHistory.length === 0) return 0;
    return volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length;
}

// Local beat detection (only when no external audio)
function analyzeLocalAudio(currentTime) {
    if (externalAudio || !analyser) return;

    const volume = getVolume();
    const avgVolume = getAverageVolume();

    volumeHistory.push(volume);
    if (volumeHistory.length > VOLUME_HISTORY_SIZE) volumeHistory.shift();

    const timeSinceLastBeat = currentTime - lastBeatTime;
    if (volume > avgVolume * BEAT_THRESHOLD &&
        timeSinceLastBeat > BEAT_COOLDOWN &&
        avgVolume > MIN_VOLUME) {
        lastBeatTime = currentTime;
        beatCount++;
        triggerRotation(getRotationAxis(), getRotationDirection());
    }
}

// =============================================================================
// ROTATION LOGIC
// =============================================================================

function getRotationAxis() {
    const axes = ['x', 'y', 'z'];
    return axes[beatCount % 3];
}

function getRotationDirection() {
    return (Math.floor(beatCount / 3) % 2 === 0) ? 1 : -1;
}

function triggerRotation(axis, direction = 1) {
    startRotation.x = currentRotation.x;
    startRotation.y = currentRotation.y;
    startRotation.z = currentRotation.z;
    targetRotation[axis] += ROTATION_AMOUNT * direction;
    animationProgress = 0;
    animationStartTime = performance.now();
}

// =============================================================================
// ANIMATION LOOP
// =============================================================================

function animate(currentTime) {
    requestAnimationFrame(animate);

    // Local beat detection (standalone mode)
    analyzeLocalAudio(currentTime);

    // Update animation
    if (animationProgress < 1) {
        const elapsed = currentTime - animationStartTime;
        animationProgress = Math.min(elapsed / animationDuration, 1);
        const easedProgress = easeOutCubic(animationProgress);

        currentRotation.x = startRotation.x + (targetRotation.x - startRotation.x) * easedProgress;
        currentRotation.y = startRotation.y + (targetRotation.y - startRotation.y) * easedProgress;
        currentRotation.z = startRotation.z + (targetRotation.z - startRotation.z) * easedProgress;

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

// Initialize
initAudio();
animate(performance.now());
