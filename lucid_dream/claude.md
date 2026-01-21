# Lucid Dream - Letter Display

A slot-machine-style text animation that cycles through random letters before revealing words.

## Overview

- **Visual**: White monospace text on black background, centered on screen
- **Technology**: Pure HTML/CSS/JavaScript, no dependencies
- **Animation**: Letters cycle rapidly in "off" state, then reveal word left-to-right

## How It Works

### State Machine

The display alternates between two states every 10 seconds:

**OFF State:**
- All letters cycle through the alphabet continuously
- Each digit has an offset (3 positions apart) creating a wave effect
- Letters appear dimmed (60% opacity)

**ON State:**
- Letters are revealed left-to-right with 200ms delay between each
- Revealed letters show the target word at 80% opacity
- A new random word is selected when entering ON state

### Cycling Animation

In the off state, each digit cycles through the alphabet:
```javascript
currentIndex = (currentIndex + 1) % 26  // Every 50ms
```

The offset between digits (`OFFSET_PER_DIGIT = 3`) creates visual interest - letters appear to "roll" in sequence rather than all showing the same character.

### Reveal/Hide Animation

**Reveal (entering ON state):**
- Characters revealed left-to-right
- 200ms (`CHAR_TRANSITION_TIME`) between each reveal
- `revealedCount` increments: 0 → 1 → 2 → 3 → 4 → 5

**Hide (entering OFF state):**
- Characters hidden right-to-left
- Same timing, but `revealedCount` decrements: 5 → 4 → 3 → 2 → 1 → 0

## Configuration

| Parameter | Default | Effect |
|-----------|---------|--------|
| `CYCLE_INTERVAL` | 50ms | Speed of letter cycling in off state |
| `STATE_DURATION` | 10000ms | Time spent in each state |
| `OFFSET_PER_DIGIT` | 3 | Alphabet offset between adjacent digits |
| `CHAR_TRANSITION_TIME` | 200ms | Delay between each character reveal/hide |

## Word Pool

20 five-letter words:
```
hello, world, dream, light, flame, stone, ocean, cloud, night, music,
storm, peace, heart, smile, magic, dance, shine, brave, ghost, river
```

## Technical Details

- Uses CSS transitions for smooth opacity changes
- Each digit is a `<span>` with class `digit` and state class `on`/`off`
- Fixed-width characters (`1ch`) ensure alignment
- No canvas - pure DOM manipulation
- `setInterval` for both cycling and state toggling

## Running the App

Simply open `index.html` in a browser - no server required.
