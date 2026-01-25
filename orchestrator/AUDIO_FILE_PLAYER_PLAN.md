# Audio File Player Feature Plan

Branch: `audio-file-player`

## Feature Requirements

Users can load an audio file (mp3, wav) via cmd+o, which opens a file picker modal. After loading, the orchestrator plays the file and shows an audio controller window with playback controls.

## Completed

- [x] Created `playback.js` module with all playback functions:
  - `loadAudioFile(file)` / `unloadAudioFile()`
  - `playAudio()` / `pauseAudio()` / `stopAudio()`
  - `seekAudio()` / `seekRelative()`
  - `setRepeat()` / `isRepeatEnabled()`
  - Progress tracking via callbacks

- [x] Cleaned up `audio.js`:
  - Removed `TEST_AUDIO_FILE` import and all test file code
  - Removed `playTestAudio`, `pauseTestAudio`, `seekTestAudio`, `getTestAudioTime`, `isTestMode`
  - Kept only mic capture and analysis functions

- [x] Updated `main.js` imports to use new playback module

- [x] Updated `main.js` DOM elements section for new UI components

- [x] Added file picker functions to `main.js`:
  - `showFilePicker()` / `hideFilePicker()` (exported)
  - `initFilePicker()` with drag & drop support
  - `handleFileSelection()`

- [x] Added audio controller functions to `main.js`:
  - `showAudioController()` / `hideAudioController()`
  - `initAudioController()` with all button handlers
  - `updatePlayPauseButton()`, `updateRepeatButton()`, `updateProgressDisplay()`
  - `formatTime()` helper

- [x] Replaced `logBeat()` with simple `incrementBeatCount()`

- [x] Updated analyze loop to use `incrementBeatCount()` instead of `logBeat()`

## Completed - Implementation Tasks

- [x] Updated `main.js` init function - Added `initFilePicker()` and `initAudioController()` calls, removed test mode check

- [x] Updated `keyboard.js` - Added cmd+o shortcut to open file picker, escape key to close file picker

- [x] Updated `index.html`:
  - Removed test controls section
  - Simplified beat log section (removed export/clear buttons, removed display:none)
  - Added file picker modal with Win98 titlebar style
  - Added audio controller window

- [x] Updated `styles.css` - Added styles for drop zone, file picker, and audio controller window

- [x] Updated `state.js` - Removed `beatLog` array (no longer needed)

- [x] Used Win98-style ASCII characters for playback controls: `|<` `>` `||` `[ ]` `>|` `[R]`

## Testing Checklist

- [ ] cmd+o opens file picker modal
- [ ] File picker stays on top of other windows
- [ ] Drag & drop works for audio files
- [ ] Click to browse works
- [ ] Cancel button closes modal
- [ ] X button closes modal
- [ ] Escape key closes modal
- [ ] Loading a file shows audio controller
- [ ] Audio plays automatically after loading
- [ ] Play/pause button toggles correctly
- [ ] Stop button resets to beginning
- [ ] Back 10s button works
- [ ] Forward 10s button works
- [ ] Repeat button toggles and loops audio
- [ ] Progress bar updates during playback
- [ ] Clicking progress bar seeks
- [ ] Time display shows current/total
- [ ] Closing controller unloads audio and stops playback
- [ ] Beat detection still works with file audio
- [ ] Mic mode still works when no file loaded
