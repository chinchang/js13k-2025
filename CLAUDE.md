# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a JS13K 2025 game entry called "The Black Cat's Passage" - a rhythm game where players use two hands to control a gate mechanism and guide a cat to safety. The project is in its initial setup phase with empty implementation files.

## Architecture

The game follows a minimal JS13K structure:
- `index.html` - Main HTML entry point
- `game.js` - Core game logic and systems
- `style.css` - Visual styling
- `spec.md` - Detailed game specification and mechanics

### Core Game Systems (per spec.md)

1. **Dual-hand rhythm mechanics**: Left hand maintains gate/plank, right hand moves cat
2. **Gate/Plank System**: Percentage-based (0-100%) with decay and hit bonuses
3. **Cat Movement**: Position-based progression with unlock threshold at plank ≥ 60%
4. **Timing Engine**: 60 BPM base with configurable judgment windows (±120ms Perfect, ±200ms Good)
5. **Scoring System**: Combo-based with accuracy tracking

### Key Game Parameters

- Beat interval: 1.0s (60 BPM starting level)
- Plank decay: 6%/second continuous
- Hit gains: Perfect +12%/+9%, Good +7%/+5% (gate/movement respectively)
- Judgment windows: Perfect ±120ms, Good ±200ms
- Unlock threshold: 60% plank for right-hand lane

## Development Commands

This is a minimal HTML/CSS/JS project with no build system. Development workflow:
- Open `index.html` directly in browser for testing
- Use browser developer tools for debugging
- No package manager or build tools configured

## JS13K Constraints

- Total file size must be ≤ 13,312 bytes (13KB) when zipped
- Pure HTML5/CSS3/JavaScript only (no external libraries)
- Code golf techniques and minification will be essential
- Consider using canvas for rendering efficiency

## Implementation Priority

Based on spec.md, implement in this order:
1. Basic HTML structure with game lanes
2. Core timing engine with beat detection
3. Input handling for left (A) and right (L) keys
4. Gate/plank percentage system with visual feedback
5. Cat movement mechanics with unlock logic
6. Audio feedback system (WebAudio)
7. Visual polish and animations

## Key Design Constraints

- Maintain exactly 1.0s beat intervals for starting level
- Preserve left/right hand separation in controls
- Visual lanes must scroll at 1s per note (cosmetic only)
- Judgment based on scheduled timestamps, not visual timing
- Concurrent rhythm requirement once right lane unlocks