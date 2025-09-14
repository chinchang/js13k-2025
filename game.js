class Game {
    constructor() {
        this.gameState = 'playing';
        this.score = 0;
        this.plankPercent = 20; // Start with some gate percentage
        this.catPosition = 0;
        this.combo = 0;
        this.rightLaneUnlocked = false;
        this.showingWarning = false;
        
        this.beatInterval = 2000; // 2 seconds = 30 BPM
        
        // Overlap-based detection thresholds (percentage overlap)
        this.perfectOverlap = 50; // 50% overlap for perfect hit
        this.okayOverlap = 25;    // 25% overlap for okay hit
        
        // Visual dimensions for overlap calculation
        this.targetCircleSize = 60;
        this.noteCircleSize = 50;
        this.targetPosition = 80; // bottom: 80px from CSS
        this.laneHeight = 400;
        
        this.plankDecayRate = 6; // 6% per second
        this.plankGainPerfect = 15;
        this.plankGainOkay = 8; // new middle tier
        this.moveGainPerfect = 12;
        this.moveGainOkay = 6; // new middle tier
        this.unlockThreshold = 60;
        
        this.leftBeats = [];
        this.rightBeats = [];
        this.startTime = Date.now();
        this.lastDecayTime = this.startTime;
        this.graceTime = 6000; // 6 second grace period - 4s for first circle + 2s buffer
        
        this.elements = {
            scoreValue: document.getElementById('score-value'),
            plankPercent: document.getElementById('plank-percent'),
            plankFill: document.getElementById('plank-fill'),
            gatePlank: document.getElementById('gate-plank'),
            cat: document.getElementById('cat'),
            door: document.getElementById('door'),
            leftLane: document.getElementById('left-lane'),
            rightLane: document.getElementById('right-lane'),
            leftNotes: document.getElementById('left-notes'),
            rightNotes: document.getElementById('right-notes'),
            feedback: document.getElementById('feedback'),
            gateStableBanner: document.getElementById('gate-stable-banner'),
            gameOver: document.getElementById('game-over'),
            gameResult: document.getElementById('game-result')
        };
        
        this.init();
    }
    
    init() {
        this.scheduleBeats();
        this.setupEventListeners();
        this.gameLoop();
    }
    
    scheduleBeats() {
        const currentTime = Date.now() - this.startTime;
        const startDelay = 4000; // Start beats 4 seconds in, when first visual appears
        
        // Schedule left beats (continuous A presses every 1s)
        for (let i = 0; i < 60; i++) {
            const beatTime = startDelay + (i * this.beatInterval);
            if (beatTime > currentTime - 1000) {
                this.leftBeats.push({
                    time: beatTime,
                    key: 'A',
                    hit: false,
                    spawned: false,
                    processed: false
                });
            }
        }
        
        // Schedule right beats (only when unlocked)
        for (let i = 0; i < 60; i++) {
            const beatTime = startDelay + (i * this.beatInterval);
            if (beatTime > currentTime - 1000) {
                this.rightBeats.push({
                    time: beatTime,
                    key: 'L',
                    hit: false,
                    spawned: false,
                    processed: false
                });
            }
        }
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.gameState !== 'playing') {
                if (e.key.toLowerCase() === 'r') {
                    this.restart();
                }
                return;
            }
            
            const key = e.key.toLowerCase();
            if (key === 'a') {
                this.handleHit('left');
            } else if (key === 'l') {
                this.handleHit('right');
            } else if (key === 'r') {
                this.restart();
            }
        });
    }
    
    handleHit(lane) {
        const beats = lane === 'left' ? this.leftBeats : this.rightBeats;
        
        if (lane === 'right' && !this.rightLaneUnlocked) {
            return; // Can't hit right lane until unlocked
        }
        
        let bestBeat = null;
        let bestOverlap = 0;
        
        // Find the beat with the highest overlap that hasn't been hit
        for (const beat of beats) {
            if (beat.hit || !beat.spawned) continue;
            
            const notePos = this.calculateNotePosition(beat);
            const overlap = this.calculateOverlap(notePos);
            
            // Only consider beats with meaningful overlap (at least 20%)
            if (overlap >= 20 && overlap > bestOverlap) {
                bestOverlap = overlap;
                bestBeat = beat;
            }
        }
        
        if (bestBeat && bestOverlap > 0) {
            bestBeat.hit = true;
            bestBeat.processed = true;
            const timing = this.getOverlapRating(bestOverlap);
            bestBeat.hitTiming = timing;
            this.processBeatHit(lane, timing);
            this.updateCircleAppearance(bestBeat, timing);
        }
        // If no beat found with sufficient overlap, do nothing
    }
    
    calculateNotePosition(beat) {
        const currentTime = Date.now() - this.startTime;
        const elapsed = currentTime - (beat.time - 4000); // 4000ms animation duration
        const progress = Math.max(0, Math.min(1, elapsed / 4000)); // 0 to 1
        
        // Calculate position: from top: -50px to bottom of lane + 50px
        const startPos = -50;
        const endPos = this.laneHeight + 50;
        const currentPos = startPos + (progress * (endPos - startPos));
        
        return currentPos;
    }
    
    calculateOverlap(notePos) {
        // Target is at bottom: 80px, which means top of target is at (laneHeight - 80px)
        const targetTop = this.laneHeight - this.targetPosition - this.targetCircleSize;
        const targetCenter = targetTop + (this.targetCircleSize / 2);
        
        // Note circle position (notePos is the top of the circle)
        const noteCenter = notePos + (this.noteCircleSize / 2);
        
        // Calculate vertical overlap using circle centers and radii
        const targetRadius = this.targetCircleSize / 2;
        const noteRadius = this.noteCircleSize / 2;
        const centerDistance = Math.abs(targetCenter - noteCenter);
        const maxDistance = targetRadius + noteRadius;
        
        if (centerDistance >= maxDistance) {
            return 0; // No overlap
        }
        
        // Calculate overlap percentage based on how close centers are
        const overlapDistance = maxDistance - centerDistance;
        const maxOverlap = Math.min(targetRadius * 2, noteRadius * 2);
        const overlapPercent = (overlapDistance / maxOverlap) * 100;
        
        
        return overlapPercent;
    }
    
    getOverlapRating(overlapPercent) {
        if (overlapPercent >= this.perfectOverlap) return 'perfect';
        if (overlapPercent >= this.okayOverlap) return 'okay';
        return 'miss';
    }
    
    processBeatHit(lane, timing) {
        if (lane === 'left') {
            if (timing === 'perfect') {
                this.plankPercent = Math.min(100, this.plankPercent + this.plankGainPerfect);
                this.score += 20;
                this.combo++;
                this.flashTarget('left', 'perfect');
            } else if (timing === 'okay') {
                this.plankPercent = Math.min(100, this.plankPercent + this.plankGainOkay);
                this.score += 5;
                this.combo++;
                this.flashTarget('left', 'okay');
            } else {
                this.combo = 0;
                this.flashTarget('left', 'miss');
            }
        } else if (lane === 'right') {
            if (timing === 'perfect') {
                this.catPosition = Math.min(100, this.catPosition + this.moveGainPerfect);
                this.score += 20;
                this.combo++;
                this.flashTarget('right', 'perfect');
            } else if (timing === 'okay') {
                this.catPosition = Math.min(100, this.catPosition + this.moveGainOkay);
                this.score += 5;
                this.combo++;
                this.flashTarget('right', 'okay');
            } else {
                this.combo = 0;
                this.flashTarget('right', 'miss');
            }
        }
        
        this.showFeedback(timing, lane);
        this.updateDisplay();
        this.checkWinCondition();
    }
    
    flashTarget(lane, timing) {
        const target = lane === 'left' ? 
            document.getElementById('left-target') : 
            document.getElementById('right-target');
        
        target.classList.remove('flash-perfect', 'flash-okay', 'flash-miss');
        target.classList.add(`flash-${timing}`);
        
        setTimeout(() => {
            target.classList.remove(`flash-${timing}`);
        }, 200);
    }
    
    showFeedback(timing, lane) {
        // Create a temporary feedback element near the target
        const feedbackEl = document.createElement('div');
        feedbackEl.textContent = timing.toUpperCase();
        feedbackEl.className = `lane-feedback ${timing}`;
        
        
        const laneEl = lane === 'left' ? 
            document.getElementById('left-lane') : 
            document.getElementById('right-lane');
        
        // Position it near the target
        feedbackEl.style.position = 'absolute';
        feedbackEl.style.bottom = '120px'; // Just above the target
        feedbackEl.style.left = '50%';
        feedbackEl.style.transform = 'translateX(-50%)';
        feedbackEl.style.zIndex = '15';
        
        laneEl.appendChild(feedbackEl);
        
        // Remove after animation
        setTimeout(() => {
            if (feedbackEl.parentNode) {
                feedbackEl.parentNode.removeChild(feedbackEl);
            }
        }, 800);
    }
    
    showWarning(message) {
        this.elements.feedback.textContent = message;
        this.elements.feedback.className = 'feedback';
        this.elements.feedback.style.color = '#f39c12';
        this.elements.feedback.style.fontSize = '36px';
        this.elements.feedback.style.opacity = '1';
        
        setTimeout(() => {
            this.elements.feedback.style.opacity = '0';
        }, 1000);
    }
    
    updateDisplay() {
        this.elements.scoreValue.textContent = this.score;
        this.elements.plankPercent.textContent = Math.floor(this.plankPercent);
        this.elements.plankFill.style.width = this.plankPercent + '%';
        
        // Update plank color and visual gate
        this.elements.plankFill.className = '';
        if (this.plankPercent >= 60) {
            this.elements.plankFill.classList.add('green');
        } else if (this.plankPercent >= 20) {
            this.elements.plankFill.classList.add('amber');
        }
        
        // Update visual gate plank height
        this.elements.gatePlank.style.height = this.plankPercent + '%';
        
        // Show warning if plank is low
        if (this.plankPercent < 25 && this.plankPercent > 0) {
            if (!this.showingWarning) {
                this.showingWarning = true;
                this.showWarning('GATE DROPPING!');
                setTimeout(() => { this.showingWarning = false; }, 1000);
            }
        }
        
        // Update cat position - move smoothly across the entire game scene
        // Position cat relative to the game scene container (0% = left edge, 100% = right edge)
        const gameScene = document.getElementById('game-scene');
        if (this.elements.cat.parentElement !== gameScene) {
            gameScene.appendChild(this.elements.cat);
        }
        
        // Cat moves continuously across the 500px wide game scene
        const sceneWidth = 500; // matches CSS width
        const catOffset = (this.catPosition / 100) * (sceneWidth - 40); // -40 to account for cat width
        this.elements.cat.style.left = catOffset + 'px';
        this.elements.cat.style.position = 'absolute';
        this.elements.cat.style.bottom = '50px';
        
        // Check right lane unlock
        if (!this.rightLaneUnlocked && this.plankPercent >= this.unlockThreshold) {
            this.rightLaneUnlocked = true;
            this.elements.rightLane.classList.remove('hidden');
            this.elements.gateStableBanner.classList.remove('hidden');
            setTimeout(() => {
                this.elements.gateStableBanner.classList.add('hidden');
            }, 2000);
        }
        
        // Update door glow
        if (this.plankPercent >= this.unlockThreshold && this.catPosition >= 80) {
            this.elements.door.classList.add('glowing');
        } else {
            this.elements.door.classList.remove('glowing');
        }
    }
    
    spawnVisualNotes() {
        const currentTime = Date.now() - this.startTime;
        const spawnTime = 4000; // 4 seconds ahead - this matches CSS animation duration
        
        // Spawn left notes
        this.leftBeats.forEach(beat => {
            if (!beat.spawned && currentTime >= beat.time - spawnTime && currentTime < beat.time - spawnTime + 100) {
                beat.spawned = true;
                this.createNoteElement('left', beat.key, beat);
            }
        });
        
        // Spawn right notes (only if unlocked)
        if (this.rightLaneUnlocked) {
            this.rightBeats.forEach(beat => {
                if (!beat.spawned && currentTime >= beat.time - spawnTime && currentTime < beat.time - spawnTime + 100) {
                    beat.spawned = true;
                    this.createNoteElement('right', beat.key, beat);
                }
            });
        }
    }
    
    createNoteElement(lane, key, beat) {
        const noteEl = document.createElement('div');
        noteEl.className = 'note-circle';
        noteEl.textContent = key;
        
        const container = lane === 'left' ? this.elements.leftNotes : this.elements.rightNotes;
        container.appendChild(noteEl);
        
        // Force animation to start immediately by setting initial position
        noteEl.style.top = '-50px';
        noteEl.style.animationDelay = '0s';
        noteEl.style.animationPlayState = 'running';
        
        // Store reference to beat data for later updates
        if (beat) {
            beat.noteElement = noteEl;
        }
        
        // Remove the circle after extended animation (6 seconds total now)
        setTimeout(() => {
            if (noteEl.parentNode) {
                noteEl.parentNode.removeChild(noteEl);
            }
        }, 6000);
    }
    
    updatePlankDecay() {
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastDecayTime) / 1000;
        this.lastDecayTime = currentTime;
        
        // Only start decay after grace period
        if (currentTime - this.startTime > this.graceTime) {
            this.plankPercent = Math.max(0, this.plankPercent - (this.plankDecayRate * deltaTime));
        }
        
        if (this.plankPercent <= 0) {
            this.gameOver(false);
        }
        
        // Lock right lane if plank drops below threshold
        if (this.rightLaneUnlocked && this.plankPercent < this.unlockThreshold) {
            this.rightLaneUnlocked = false;
            this.elements.rightLane.classList.add('hidden');
        }
    }
    
    checkWinCondition() {
        if (this.catPosition >= 100 && this.plankPercent >= this.unlockThreshold) {
            this.gameOver(true);
        }
    }
    
    gameOver(won) {
        this.gameState = 'gameOver';
        this.elements.gameResult.textContent = won ? 'YOU WIN!' : 'GAME OVER';
        this.elements.gameOver.classList.remove('hidden');
        
        if (won) {
            this.score += 200; // Win bonus
            this.elements.scoreValue.textContent = this.score;
        }
    }
    
    restart() {
        this.gameState = 'playing';
        this.score = 0;
        this.plankPercent = 20; // Start with some gate percentage
        this.catPosition = 0;
        this.combo = 0;
        this.rightLaneUnlocked = false;
        this.showingWarning = false;
        this.startTime = Date.now();
        this.lastDecayTime = this.startTime;
        
        this.leftBeats = [];
        this.rightBeats = [];
        
        this.elements.gameOver.classList.add('hidden');
        this.elements.rightLane.classList.add('hidden');
        this.elements.gateStableBanner.classList.add('hidden');
        this.elements.door.classList.remove('glowing');
        this.elements.leftNotes.innerHTML = '';
        this.elements.rightNotes.innerHTML = '';
        
        // Reset cat to start position in game scene
        const gameScene = document.getElementById('game-scene');
        if (this.elements.cat.parentElement !== gameScene) {
            gameScene.appendChild(this.elements.cat);
        }
        this.elements.cat.style.left = '0px';
        this.elements.cat.style.position = 'absolute';
        this.elements.cat.style.bottom = '50px';
        
        this.scheduleBeats();
        this.updateDisplay();
    }
    
    updateCircleAppearance(beat, timing) {
        if (beat.noteElement) {
            const circle = beat.noteElement;
            
            // Remove existing hit classes
            circle.classList.remove('hit-perfect', 'hit-okay', 'hit-miss');
            
            // Add the appropriate hit class - preserve existing animation
            circle.classList.add(`hit-${timing}`);
            
            // Make sure the circle animation continues uninterrupted
            const currentTime = Date.now() - this.startTime;
            const elapsed = currentTime - (beat.time - 4000);
            const remainingTime = Math.max(100, 4000 - elapsed);
            
            // Start fade out near the end of the animation
            setTimeout(() => {
                if (circle.parentNode) {
                    circle.classList.add('fading-out');
                }
            }, Math.max(1000, remainingTime - 1000));
        }
    }
    
    checkMissedBeats() {
        // Check left beats for misses - when circle has passed the target area
        this.leftBeats.forEach(beat => {
            if (!beat.hit && !beat.processed && beat.spawned) {
                const notePos = this.calculateNotePosition(beat);
                const targetBottom = this.laneHeight - this.targetPosition;
                
                // If note has passed well beyond the target, it's a miss
                if (notePos > targetBottom + this.noteCircleSize + 20) {
                    beat.processed = true;
                    beat.hitTiming = 'miss';
                    this.processBeatHit('left', 'miss');
                    this.updateCircleAppearance(beat, 'miss');
                }
            }
        });
        
        // Check right beats for misses (only if unlocked)
        if (this.rightLaneUnlocked) {
            this.rightBeats.forEach(beat => {
                if (!beat.hit && !beat.processed && beat.spawned) {
                    const notePos = this.calculateNotePosition(beat);
                    const targetBottom = this.laneHeight - this.targetPosition;
                    
                    // If note has passed well beyond the target, it's a miss
                    if (notePos > targetBottom + this.noteCircleSize + 20) {
                        beat.processed = true;
                        beat.hitTiming = 'miss';
                        this.processBeatHit('right', 'miss');
                        this.updateCircleAppearance(beat, 'miss');
                    }
                }
            });
        }
    }
    
    gameLoop() {
        if (this.gameState === 'playing') {
            this.updatePlankDecay();
            this.spawnVisualNotes();
            this.checkMissedBeats();
            this.updateDisplay();
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new Game();
});