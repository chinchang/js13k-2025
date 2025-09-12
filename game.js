class Game {
    constructor() {
        this.gameState = 'playing';
        this.score = 0;
        this.plankPercent = 20; // Start with some gate percentage
        this.catPosition = 0;
        this.combo = 0;
        this.rightLaneUnlocked = false;
        this.showingWarning = false;
        
        this.beatInterval = 1000; // 1 second = 60 BPM
        this.perfectWindow = 200; // ±200ms - more lenient
        this.okayWindow = 350; // ±350ms - new middle tier
        this.missWindow = 500; // ±500ms - anything beyond this is miss
        
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
        const currentTime = Date.now() - this.startTime;
        const beats = lane === 'left' ? this.leftBeats : this.rightBeats;
        
        if (lane === 'right' && !this.rightLaneUnlocked) {
            return; // Can't hit right lane until unlocked
        }
        
        let closestBeat = null;
        let closestDistance = Infinity;
        
        for (const beat of beats) {
            if (beat.hit) continue;
            
            const distance = Math.abs(currentTime - beat.time);
            if (distance < closestDistance && distance <= this.okayWindow) {
                closestDistance = distance;
                closestBeat = beat;
            }
        }
        
        if (closestBeat) {
            closestBeat.hit = true;
            closestBeat.processed = true;
            const timing = this.getTimingRating(closestDistance);
            this.processBeatHit(lane, timing);
        }
        // If no beat found within window, do nothing - let the circle pass naturally
    }
    
    getTimingRating(distance) {
        if (distance <= this.perfectWindow) return 'perfect';
        if (distance <= this.okayWindow) return 'okay';
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
                this.elements.leftLane.classList.add('shake');
                this.flashTarget('left', 'miss');
                setTimeout(() => this.elements.leftLane.classList.remove('shake'), 300);
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
        
        const targetEl = lane === 'left' ? 
            document.getElementById('left-target') : 
            document.getElementById('right-target');
        
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
        
        // Update plank color
        this.elements.plankFill.className = '';
        if (this.plankPercent >= 60) {
            this.elements.plankFill.classList.add('green');
        } else if (this.plankPercent >= 20) {
            this.elements.plankFill.classList.add('amber');
        }
        
        // Show warning if plank is low
        if (this.plankPercent < 25 && this.plankPercent > 0) {
            if (!this.showingWarning) {
                this.showingWarning = true;
                this.showWarning('GATE DROPPING!');
                setTimeout(() => { this.showingWarning = false; }, 1000);
            }
        }
        
        // Update cat position
        this.elements.cat.style.left = this.catPosition + '%';
        
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
                this.createNoteElement('left', beat.key);
            }
        });
        
        // Spawn right notes (only if unlocked)
        if (this.rightLaneUnlocked) {
            this.rightBeats.forEach(beat => {
                if (!beat.spawned && currentTime >= beat.time - spawnTime && currentTime < beat.time - spawnTime + 100) {
                    beat.spawned = true;
                    this.createNoteElement('right', beat.key);
                }
            });
        }
    }
    
    createNoteElement(lane, key, delay) {
        const noteEl = document.createElement('div');
        noteEl.className = 'note-circle';
        noteEl.textContent = key;
        
        const container = lane === 'left' ? this.elements.leftNotes : this.elements.rightNotes;
        container.appendChild(noteEl);
        
        // Remove the circle after animation completes
        setTimeout(() => {
            if (noteEl.parentNode) {
                noteEl.parentNode.removeChild(noteEl);
            }
        }, 4000);
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
        
        this.scheduleBeats();
        this.updateDisplay();
    }
    
    checkMissedBeats() {
        const currentTime = Date.now() - this.startTime;
        
        // Check left beats for misses - only after okay window has passed
        this.leftBeats.forEach(beat => {
            if (!beat.hit && !beat.processed && currentTime > beat.time + this.okayWindow) {
                beat.processed = true;
                this.processBeatHit('left', 'miss');
            }
        });
        
        // Check right beats for misses (only if unlocked)
        if (this.rightLaneUnlocked) {
            this.rightBeats.forEach(beat => {
                if (!beat.hit && !beat.processed && currentTime > beat.time + this.okayWindow) {
                    beat.processed = true;
                    this.processBeatHit('right', 'miss');
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