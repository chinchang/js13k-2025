# Game: The Black Cat’s Passage

## 1. Core Loop

- **Left hand (Gate Maintenance):** Repeat the shown rhythm to lift/hold a plank (gate).
- **Right hand (Progress):** After the plank is high enough, a second rhythm appears; repeat it to move the cat toward the door.
- **Win:** Cat reaches the door while plank is above threshold.
- **Lose:** Plank drops to zero (fully closed) before reaching the door, or timer (if enabled) expires.

## 2. Controls

- **Left hand keys:** default `A` (starting level uses only `A`).
- **Right hand keys:** default `L` (starting level uses only `L`).
- **Optional meta:** `P` pause, `R` restart level, `M` mute.

## 3. Timing Model

- **Beat interval (starting level):** 1.0s between notes (i.e., 60 BPM).
- **Judgment windows (tunable):**
  - **Perfect:** within ±120 ms of the scheduled beat.
  - **Good:** within ±200 ms.
  - **Miss:** outside ±200 ms.
- **Scrolling/UI timing:** Visual lanes scroll at 1s per note; visuals are cosmetic—judgment uses scheduled timestamps.

## 4. Systems

### 4.1 Gate/Plank System

- **State variable:** `plank% ∈ [0, 100]`.
- **Effects of left-hand hits:**
  - **Perfect:** +12%
  - **Good:** +7%
  - **Miss:** 0%
- **Passive decay:** −6% per second (continuous).
- **Unlock threshold for right-hand lane:** `plank% ≥ 60`.
- **Fail condition:** `plank% ≤ 0`.

### 4.2 Cat Movement

- **Position:** `catX% ∈ [0, 100]` (0 = start, 100 = door).
- **Movement per right-hand hit (only when plank% ≥ 60):**
  - **Perfect:** +9%
  - **Good:** +5%
  - **Miss:** 0%
- **No passive drift.**
- **Win condition:** `catX% ≥ 100` while `plank% ≥ 60`.

### 4.3 Sequences (Starting Level)

- **Left sequence:** `[A, A, A, …]` (continuous quarter-notes at 1.0s).
- **Right sequence:** `[L, L, L, …]` (appears only after plank ≥ 60; also 1.0s interval).
- **Concurrency:** Player must keep left rhythm going while also matching the right rhythm once it appears.

### 4.4 Scoring & Feedback

- **Combo:** +1 per Good/Perfect; resets on Miss.
- **Score per hit:** Perfect 20, Good 10, Miss 0.
- **Bonus:** +200 on level clear; +100 for never dropping plank below 40%.
- **Accuracy summary:** %Perfect, %Good, Max Combo.

## 5. UI/UX

### 5.1 Layout

- **Left lane (gate):** note prompts above/near the plank.
- **Center:** plank with live percentage and a subtle tilt animation; cat visible on a platform.
- **Right lane (movement):** initially hidden; revealed with a “Gate Stable” cue when plank ≥ 60.
- **Door:** at far right with an “EXIT” sign; glows when reachable.
- **HUD:** LIVES (if used), LEVEL, BPM (60), Hit Window, Score, Accuracy.

### 5.2 Visual Feedback

- **Perfect:** small white flash on lane; cat’s eyes blink bright.
- **Good:** dimmer flash.
- **Miss:** red blip; brief plank shake if left-lane miss; cat stumble if right-lane miss.
- **Plank bar:** fills from 0→100 with color shift (red <20%, amber 20–59%, green ≥60%).
- **Right-lane unlock:** banner “GATE STABLE — ADVANCE!”

### 5.3 Audio Feedback (tiny/WebAudio-friendly)

- **Left lane:** closed hi-hat tick; pitch up on Perfect.
- **Right lane:** snare/clap; pitch up on Perfect.
- **Miss:** short low thud.
- **Gate creak:** volume scales with plank%.
- **Exit chime** on win.

## 6. Difficulty & Progression

### 6.1 Start Level (Tutorial/Easy)

- **Keys:** Left `A` only; Right `L` only.
- **Beat gap:** 1.0s (60 BPM) for both lanes.
- **Windows:** Perfect ±120 ms, Good ±200 ms.
- **Gate decay:** 6%/s; Gains L: +12%/+7%.
- **Movement gains R:** +9%/+5%.
- **Goal:** Demonstrate sustaining left while beginning right; total playtime ~30–45s.

### 6.2 Subsequent Levels (examples)

- **Level 2:** Slightly faster decay (7%/s); same keys; introduces occasional visual off-beats (but notes still land each second).
- **Level 3:** Left lane adds a two-key loop (`A S`) still at 1.0s spacing; right remains `L`.
- **Level 4:** Right lane becomes (`K L`) with the same 1.0s spacing; left remains (`A S`).
- **Level 5+:**
  - Reduce hit windows (Perfect ±90 ms, Good ±160 ms).
  - Increase decay (8–10%/s).
  - Add short burst patterns on right (still honoring 1.0s spacing by default; optional later levels can mix 0.5s spacing).

## 7. Content Structure (data, no code)

- **Level params:**
  - `bpm` (start 60), `beatInterval` (derived),
  - `leftKeys` (array of symbols), `rightKeys` (array),
  - `unlockPlank%` (60 default),
  - `plankDecayPerSec`, `plankGainPerfect`, `plankGainGood`,
  - `moveGainPerfect`, `moveGainGood`,
  - `hitWindowPerfectMs`, `hitWindowGoodMs`,
  - `targetDistance%` (100), `startPlank%` (0 or 20 for friendlier start).
- **Level goals:** win/lose conditions, optional time cap.

## 8. Game Modes

- **Arcade:** sequential levels, rising difficulty.
- **Endless:** seeded patterns at 60 BPM, gradually increasing decay/window strictness.
- **Practice:** left or right lane alone; adjustable windows for training.

## 9. Accessibility & Options

- **Remap keys** (left-hand cluster vs right-hand cluster; preserve spread across keyboard).
- **Color-blind safe palette** (use shape/brightness alongside color).
- **Latency calibration:** on first launch, tap test to offset global timing.
- **Vibration (optional):** if mobile/desktop gamepads later.

## 10. Tuning & Balancing (starting targets)

- Average player hitting **Good** on left every second nets ~+1% per second after decay (+7 − 6). Occasional Perfects lift buffer.
- Right lane expects ~14 Good hits (5% × 14 = 70%) plus a few Perfects to reach 100%; with early buffer, finish in ~30–45s.
- If playtests show plank yo-yoing too much, either:
  - lower decay to 5%/s, or
  - raise Good gain to +8%, or
  - reveal right lane at 50% instead of 60%.

## 11. Fail/Warn States

- **Low plank warning:** at <25%, show “GATE DROPPING!” + amber plank bar.
- **Miss spam guard:** three consecutive left misses triggers a brief slow-down cue (visual only) to re-center attention.
- **Soft fail:** if door reached but plank <60%, cat stalls at the threshold until plank recovers.

## 12. Juice & Polish (byte-light)

- **Screen shake** on near-close (plank dips <15%).
- **Cat eye flicker** on Perfect right hits.
- **Door light bloom** increases as cat nears.
- **Subtle background pulse** on every beat to help pacing.
