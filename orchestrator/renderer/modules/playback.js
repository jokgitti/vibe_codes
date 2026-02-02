// =============================================================================
// AUDIO FILE PLAYBACK
// =============================================================================

import { state } from './state.js';
import { setStatus } from './ui.js';

// Audio element and source
let audioElement = null;
let audioSource = null;
let audioFileLoaded = false;
let repeatEnabled = false;

// Event callbacks (set by main.js)
let onAudioEnded = null;
let onTimeUpdate = null;
let onAudioLoaded = null;
let onAudioUnloaded = null;

// =============================================================================
// ID3 METADATA PARSER
// =============================================================================

async function parseID3Metadata(file) {
  try {
    const buffer = await file.slice(0, 128 * 1024).arrayBuffer(); // Read first 128KB
    const view = new DataView(buffer);

    // Check for ID3v2 header
    if (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
      return parseID3v2(view);
    }

    // Check for ID3v1 at end of file (last 128 bytes)
    const endBuffer = await file.slice(-128).arrayBuffer();
    const endView = new DataView(endBuffer);
    if (endView.getUint8(0) === 0x54 && endView.getUint8(1) === 0x41 && endView.getUint8(2) === 0x47) {
      return parseID3v1(endView);
    }

    return null;
  } catch (err) {
    console.warn('Failed to parse metadata:', err);
    return null;
  }
}

function parseID3v2(view) {
  const metadata = {};

  // ID3v2 header: "ID3" + version (2 bytes) + flags (1 byte) + size (4 bytes syncsafe)
  const version = view.getUint8(3);
  const size = ((view.getUint8(6) & 0x7f) << 21) |
               ((view.getUint8(7) & 0x7f) << 14) |
               ((view.getUint8(8) & 0x7f) << 7) |
               (view.getUint8(9) & 0x7f);

  let offset = 10;
  const end = Math.min(10 + size, view.byteLength);

  // Frame IDs differ between ID3v2.2 and ID3v2.3/2.4
  const frameMap = version === 2
    ? { TT2: 'title', TP1: 'artist', TAL: 'album' }
    : { TIT2: 'title', TPE1: 'artist', TALB: 'album' };

  const frameIdLength = version === 2 ? 3 : 4;
  const frameHeaderSize = version === 2 ? 6 : 10;

  while (offset + frameHeaderSize < end) {
    // Read frame ID
    let frameId = '';
    for (let i = 0; i < frameIdLength; i++) {
      const char = view.getUint8(offset + i);
      if (char === 0) break;
      frameId += String.fromCharCode(char);
    }

    if (!frameId || frameId[0] === '\0') break;

    // Read frame size
    let frameSize;
    if (version === 2) {
      frameSize = (view.getUint8(offset + 3) << 16) |
                  (view.getUint8(offset + 4) << 8) |
                  view.getUint8(offset + 5);
    } else {
      frameSize = (view.getUint8(offset + 4) << 24) |
                  (view.getUint8(offset + 5) << 16) |
                  (view.getUint8(offset + 6) << 8) |
                  view.getUint8(offset + 7);
    }

    if (frameSize <= 0 || offset + frameHeaderSize + frameSize > end) break;

    // Check if this is a text frame we care about
    const metaKey = frameMap[frameId];
    if (metaKey) {
      const textStart = offset + frameHeaderSize;
      const encoding = view.getUint8(textStart);
      const textData = new Uint8Array(view.buffer, textStart + 1, frameSize - 1);
      metadata[metaKey] = decodeID3Text(textData, encoding);
    }

    offset += frameHeaderSize + frameSize;
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
}

function parseID3v1(view) {
  // ID3v1: TAG + title(30) + artist(30) + album(30) + year(4) + comment(30) + genre(1)
  const decoder = new TextDecoder('iso-8859-1');

  const title = decoder.decode(new Uint8Array(view.buffer, 3, 30)).replace(/\0+$/, '').trim();
  const artist = decoder.decode(new Uint8Array(view.buffer, 33, 30)).replace(/\0+$/, '').trim();
  const album = decoder.decode(new Uint8Array(view.buffer, 63, 30)).replace(/\0+$/, '').trim();

  const metadata = {};
  if (title) metadata.title = title;
  if (artist) metadata.artist = artist;
  if (album) metadata.album = album;

  return Object.keys(metadata).length > 0 ? metadata : null;
}

function decodeID3Text(data, encoding) {
  let decoder;
  let text;

  switch (encoding) {
    case 0: // ISO-8859-1
      decoder = new TextDecoder('iso-8859-1');
      text = decoder.decode(data);
      break;
    case 1: // UTF-16 with BOM
    case 2: // UTF-16BE
      decoder = new TextDecoder('utf-16');
      text = decoder.decode(data);
      break;
    case 3: // UTF-8
    default:
      decoder = new TextDecoder('utf-8');
      text = decoder.decode(data);
      break;
  }

  return text.replace(/\0+$/, '').trim();
}

export function setPlaybackCallbacks(callbacks) {
  onAudioEnded = callbacks.onAudioEnded || null;
  onTimeUpdate = callbacks.onTimeUpdate || null;
  onAudioLoaded = callbacks.onAudioLoaded || null;
  onAudioUnloaded = callbacks.onAudioUnloaded || null;
}

export async function loadAudioFile(file) {
  try {
    // Unload any previous audio file
    unloadAudioFile();

    // Parse metadata while loading
    const metadataPromise = parseID3Metadata(file);

    // Resume audio context if suspended
    if (state.audioContext.state === 'suspended') {
      await state.audioContext.resume();
    }

    // Create audio element
    audioElement = new Audio();
    audioElement.crossOrigin = 'anonymous';

    // Set up event listeners
    audioElement.addEventListener('ended', handleAudioEnded);
    audioElement.addEventListener('timeupdate', handleTimeUpdate);

    // Load file
    const url = URL.createObjectURL(file);
    audioElement.src = url;

    await new Promise((resolve, reject) => {
      audioElement.addEventListener('canplaythrough', resolve, { once: true });
      audioElement.addEventListener('error', () => reject(new Error('failed to load audio file')), { once: true });
    });

    // Disconnect mic from analyser during file playback (prevents mic feeding to speakers)
    if (state.micSource) {
      state.micSource.disconnect();
    }

    // Connect to analyser
    audioSource = state.audioContext.createMediaElementSource(audioElement);
    audioSource.connect(state.analyser);
    state.analyser.connect(state.audioContext.destination);

    audioFileLoaded = true;

    // Get metadata result
    const metadata = await metadataPromise;

    if (onAudioLoaded) {
      onAudioLoaded({
        name: file.name,
        duration: audioElement.duration,
        metadata
      });
    }

    setStatus(`loaded: ${file.name}`);
    return true;
  } catch (err) {
    console.error('Failed to load audio file:', err);
    setStatus('failed to load audio file');
    return false;
  }
}

export function unloadAudioFile() {
  if (audioElement) {
    audioElement.pause();
    audioElement.removeEventListener('ended', handleAudioEnded);
    audioElement.removeEventListener('timeupdate', handleTimeUpdate);
    audioElement.src = '';
    audioElement = null;
  }

  if (audioSource) {
    audioSource.disconnect();
    audioSource = null;
  }

  // Disconnect analyser from destination (only connected for file playback)
  if (state.analyser) {
    try {
      state.analyser.disconnect(state.audioContext.destination);
    } catch (_e) {
      // May not be connected
    }
  }

  // Reconnect mic to analyser for mic-based analysis
  if (state.micSource && state.analyser) {
    state.micSource.connect(state.analyser);
  }

  audioFileLoaded = false;
  repeatEnabled = false;

  if (onAudioUnloaded) {
    onAudioUnloaded();
  }
}

function handleAudioEnded() {
  if (repeatEnabled) {
    audioElement.currentTime = 0;
    audioElement.play();
  } else if (onAudioEnded) {
    onAudioEnded();
  }
}

function handleTimeUpdate() {
  if (onTimeUpdate && audioElement) {
    onTimeUpdate({
      currentTime: audioElement.currentTime,
      duration: audioElement.duration
    });
  }
}

export function playAudio() {
  if (audioElement) {
    audioElement.play();
    return true;
  }
  return false;
}

export function pauseAudio() {
  if (audioElement) {
    audioElement.pause();
    return true;
  }
  return false;
}

export function stopAudio() {
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
    return true;
  }
  return false;
}

export function seekAudio(time) {
  if (audioElement) {
    audioElement.currentTime = Math.max(0, Math.min(time, audioElement.duration));
    return true;
  }
  return false;
}

export function seekRelative(delta) {
  if (audioElement) {
    seekAudio(audioElement.currentTime + delta);
    return true;
  }
  return false;
}

export function setRepeat(enabled) {
  repeatEnabled = enabled;
}

export function isRepeatEnabled() {
  return repeatEnabled;
}

export function isAudioFileLoaded() {
  return audioFileLoaded;
}

export function isAudioPlaying() {
  return audioElement && !audioElement.paused;
}

export function getAudioTime() {
  return audioElement ? audioElement.currentTime : 0;
}

export function getAudioDuration() {
  return audioElement ? audioElement.duration : 0;
}
