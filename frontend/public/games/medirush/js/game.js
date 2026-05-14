class Game {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // Systems
        this.audio = new AudioController();
        this.particles = new ParticleSystem();
        this.world = new World();
        this.player = new Player(this.world.yFloor);
        this.entityManager = new EntityManager();
        
        // Game State
        this.state = 'menu'; // menu, playing, paused, gameover
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // Stats
        this.score = 0;
        this.distance = 0;
        this.gameSpeed = CONFIG.BASE_SPEED;
        
        // Vitals
        this.health = CONFIG.MAX_HEALTH;
        this.hydro = CONFIG.MAX_HYDRO;
        this.energy = CONFIG.MAX_ENERGY;
        
        // Combo & Quests
        this.combo = 1;
        this.comboTimer = 0;
        this.questProgress = 0;
        this.questTarget = 20;

        // Screen shake
        this.shakeTime = 0;
        this.shakeIntensity = 0;

        // HUD Elements
        this.dom = {
            score: document.getElementById('scoreVal'),
            dist: document.getElementById('distVal'),
            combo: document.getElementById('comboVal'),
            comboContainer: document.querySelector('.combo-display'),
            health: document.getElementById('healthBar'),
            hydro: document.getElementById('hydroBar'),
            energy: document.getElementById('energyBar'),
            quest: document.getElementById('questDesc')
        };
        
        // Bind loop
        this.loop = this.loop.bind(this);
    }

    start(difficulty = 'medium', startLevel = 0) {
        this.reset();
        
        // Apply difficulty modifiers
        if (difficulty === 'easy') {
            CONFIG.BASE_SPEED = 6;
            CONFIG.SPEED_INCREMENT = 0.0005;
        } else if (difficulty === 'medium') {
            CONFIG.BASE_SPEED = 8;
            CONFIG.SPEED_INCREMENT = 0.001;
        } else if (difficulty === 'hard') {
            CONFIG.BASE_SPEED = 12;
            CONFIG.SPEED_INCREMENT = 0.002;
        }
        
        this.gameSpeed = CONFIG.BASE_SPEED;
        
        // Advance to selected level
        if (CONFIG.ENVIRONMENTS[startLevel]) {
            this.distance = CONFIG.ENVIRONMENTS[startLevel].distanceThreshold;
        }

        this.state = 'playing';
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
    }

    reset() {
        this.player = new Player(this.world.yFloor);
        this.entityManager.reset();
        this.world.reset();
        this.particles.reset();
        
        this.score = 0;
        this.distance = 0;
        this.gameSpeed = CONFIG.BASE_SPEED;
        
        this.health = CONFIG.MAX_HEALTH;
        this.hydro = CONFIG.MAX_HYDRO;
        this.energy = CONFIG.MAX_ENERGY;
        
        this.combo = 1;
        this.comboTimer = 0;
        this.questProgress = 0;
        
        this.shakeTime = 0;
        this.lastTime = 0;
        
        this.updateHUD();
    }

    pause() {
        if (this.state === 'playing') {
            this.state = 'paused';
        } else if (this.state === 'paused') {
            this.state = 'playing';
            this.lastTime = performance.now(); // Prevent large delta
            requestAnimationFrame(this.loop);
        }
    }

    gameOver() {
        this.state = 'gameover';
        
        // Update game over screen
        document.getElementById('finalScore').innerText = Math.floor(this.score);
        document.getElementById('finalDist').innerText = Math.floor(this.distance);
        
        // Calculate XP
        const xp = Math.floor(this.score / 10 + this.distance / 5 + this.questProgress * 10);
        document.getElementById('earnedXP').innerText = `+${xp} XP`;
        
        // Save high score (optional)
        const highScore = localStorage.getItem('vitalRunHighScore') || 0;
        if (this.score > highScore) {
            localStorage.setItem('vitalRunHighScore', this.score);
        }

        // Trigger Event for main.js to show UI
        window.dispatchEvent(new Event('gameover'));
    }

    screenShake(duration, intensity) {
        this.shakeTime = duration;
        this.shakeIntensity = intensity;
    }

    handleInput(action) {
        if (this.state !== 'playing') return;

        if (action === 'jump') {
            const usedEnergy = this.player.jump(this.audio, this.energy);
            if (usedEnergy && this.player.canDoubleJump === false) { // It was a double jump
                this.energy -= 10;
                this.particles.emit(this.player.x + this.player.width/2, this.player.y + this.player.height, 5, ['#eab308'], 'burst');
            }
        } else if (action === 'slide') {
            const usedEnergy = this.player.slide(this.energy);
            if (usedEnergy) {
                this.energy -= 5;
            }
        }
    }

    updateHUD() {
        this.dom.score.innerText = Math.floor(this.score);
        this.dom.dist.innerText = Math.floor(this.distance);
        
        this.dom.health.style.width = `${Math.max(0, (this.health / CONFIG.MAX_HEALTH) * 100)}%`;
        this.dom.hydro.style.width = `${Math.max(0, (this.hydro / CONFIG.MAX_HYDRO) * 100)}%`;
        this.dom.energy.style.width = `${Math.max(0, (this.energy / CONFIG.MAX_ENERGY) * 100)}%`;
        
        if (this.combo > 1) {
            this.dom.comboContainer.classList.remove('hidden');
            this.dom.combo.innerText = this.combo;
        } else {
            this.dom.comboContainer.classList.add('hidden');
        }
        
        this.dom.quest.innerText = `Nutrient Hunter: ${this.questProgress}/${this.questTarget}`;
        if (this.questProgress >= this.questTarget) {
            this.dom.quest.innerText += ' (Completed!)';
        }
    }

    checkCollisions() {
        const playerRect = {
            x: this.player.x,
            y: this.player.y,
            width: this.player.width,
            height: this.player.height
        };

        this.entityManager.entities.forEach(entity => {
            if (entity.markedForDeletion) return;

            const entityRect = {
                x: entity.x,
                y: entity.y,
                width: entity.width,
                height: entity.height
            };

            if (Utils.checkCollision(playerRect, entityRect)) {
                entity.markedForDeletion = true;

                if (entity.type === 'water' || entity.type === 'fruit') {
                    // Collectible
                    this.audio.playCollect(entity.type);
                    this.score += entity.value * this.combo;
                    this.combo = Math.min(this.combo + 1, 16);
                    this.comboTimer = 2000; // 2 seconds to keep combo
                    
                    this.particles.emit(entity.x, entity.y, 10, [entity.color, '#fff'], 'burst');
                    
                    if (entity.type === 'water') {
                        this.hydro = Math.min(this.hydro + 20, CONFIG.MAX_HYDRO);
                    } else if (entity.type === 'fruit') {
                        this.energy = Math.min(this.energy + 25, CONFIG.MAX_ENERGY);
                        if (this.questProgress < this.questTarget) {
                            this.questProgress++;
                        }
                    }
                } else {
                    // Obstacle
                    this.audio.playHit();
                    this.health -= entity.damage;
                    this.combo = 1;
                    this.screenShake(300, 10);
                    
                    this.particles.emit(entity.x, entity.y, 15, [entity.color, '#000'], 'burst');
                    
                    if (this.health <= 0) {
                        this.health = 0;
                        this.gameOver();
                    }
                }
            }
        });
    }

    _update(timestamp) {
        // Fix NaN propagation bug from first frame
        if (this.lastTime === 0) this.lastTime = timestamp;
        
        this.deltaTime = Math.min(timestamp - this.lastTime, 50); // Cap delta time
        if (isNaN(this.deltaTime) || this.deltaTime < 0) this.deltaTime = 16;
        
        this.lastTime = timestamp;

        // Vitals decay & regen
        this.hydro -= CONFIG.HYDRO_DECAY * (this.deltaTime / 16);
        this.energy = Math.min(this.energy + CONFIG.ENERGY_REGEN * (this.deltaTime / 16), CONFIG.MAX_ENERGY);
        
        if (this.hydro <= 0) {
            this.hydro = 0;
            this.health -= 0.05 * (this.deltaTime / 16); // Take damage if dehydrated
            if (this.health <= 0) this.gameOver();
        }

        // Combo logic
        if (this.combo > 1) {
            this.comboTimer -= this.deltaTime;
            if (this.comboTimer <= 0) {
                this.combo = 1;
            }
        }

        // Speed increase
        this.gameSpeed = Math.min(this.gameSpeed + CONFIG.SPEED_INCREMENT * this.deltaTime, CONFIG.MAX_SPEED);
        
        // Distance & Score
        this.distance += (this.gameSpeed / 100) * this.deltaTime;
        this.score += 0.01 * this.deltaTime;

        // Protect against NaN distance before passing to world
        if(isNaN(this.distance)) this.distance = 0;

        // Update Systems
        this.world.update(this.deltaTime, this.gameSpeed, this.distance);
        this.player.update(this.deltaTime, this.particles, this.gameSpeed);
        this.entityManager.update(this.deltaTime, this.gameSpeed, this.world.yFloor);
        this.particles.update(this.deltaTime);

        // Check Collisions
        this.checkCollisions();

        // Update HUD
        this.updateHUD();

        // Screen Shake update
        if (this.shakeTime > 0) {
            this.shakeTime -= this.deltaTime;
        }
    }

    _draw() {
        this.ctx.save();
        
        // Apply screen shake
        if (this.shakeTime > 0) {
            const dx = Utils.randomRange(-this.shakeIntensity, this.shakeIntensity);
            const dy = Utils.randomRange(-this.shakeIntensity, this.shakeIntensity);
            this.ctx.translate(dx, dy);
        }

        this.ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        this.world.draw(this.ctx);
        this.entityManager.draw(this.ctx);
        this.particles.draw(this.ctx);
        this.player.draw(this.ctx, this.gameSpeed);
        
        this.ctx.restore();
    }

    loop(timestamp) {
        if (this.state === 'playing') {
            this._update(timestamp);
            this._draw();
            requestAnimationFrame(this.loop);
        }
    }
}
