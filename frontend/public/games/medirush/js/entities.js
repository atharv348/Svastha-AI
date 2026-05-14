class Entity {
    constructor(x, yFloor, configInfo) {
        this.type = configInfo.type;
        this.width = configInfo.width;
        this.height = configInfo.height;
        this.x = x;
        this.y = yFloor - this.height - configInfo.yOffset;
        this.color = configInfo.color;
        
        this.markedForDeletion = false;
        
        // For collectibles
        this.value = configInfo.value || 0;
        // For obstacles
        this.damage = configInfo.damage || 0;
        
        this.bobCycle = Math.random() * Math.PI * 2;
    }

    update(deltaTime, gameSpeed) {
        this.x -= gameSpeed * (deltaTime / 16);
        
        if (this.x + this.width < 0) {
            this.markedForDeletion = true;
        }
        
        // Collectibles bob up and down
        if (this.type === 'water' || this.type === 'fruit') {
            this.bobCycle += deltaTime * 0.005;
            this.y += Math.sin(this.bobCycle) * 0.5;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        
        if (ASSETS.isReady && ASSETS.images[this.type]) {
            ctx.globalCompositeOperation = 'screen';
            const img = ASSETS.images[this.type];
            if (this.type === 'virus' || this.type === 'fruit' || this.type === 'water') {
                ctx.rotate(this.bobCycle * 0.2);
            }
            // Scale up slightly for better visibility
            ctx.drawImage(img, -this.width/1.5, -this.height/1.5, this.width * 1.33, this.height * 1.33);
            ctx.globalCompositeOperation = 'source-over';
        } else {
            if (this.type === 'water') {
                // Draw drop shape
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.moveTo(0, -this.height/2);
                ctx.bezierCurveTo(this.width/2, -this.height/4, this.width/2, this.height/2, 0, this.height/2);
                ctx.bezierCurveTo(-this.width/2, this.height/2, -this.width/2, -this.height/4, 0, -this.height/2);
                ctx.fill();
                
                // Highlight
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath();
                ctx.arc(-5, 5, 4, 0, Math.PI*2);
                ctx.fill();
            } 
            else if (this.type === 'fruit') {
                // Draw apple-like shape
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, this.width/2, 0, Math.PI*2);
                ctx.fill();
                // Leaf
                ctx.fillStyle = '#22c55e';
                ctx.beginPath();
                ctx.ellipse(5, -this.height/2 + 2, 6, 3, Math.PI/4, 0, Math.PI*2);
                ctx.fill();
            }
            else if (this.type === 'junk') {
                // Draw burger-like shape
                ctx.fillStyle = '#d97706'; // Bun
                ctx.beginPath();
                ctx.arc(0, -10, this.width/2, Math.PI, 0);
                ctx.fill();
                
                ctx.fillStyle = '#451a03'; // Patty
                ctx.fillRect(-this.width/2, -5, this.width, 10);
                
                ctx.fillStyle = '#22c55e'; // Lettuce
                ctx.fillRect(-this.width/2 - 2, 5, this.width + 4, 4);
                
                ctx.fillStyle = '#d97706'; // Bottom bun
                ctx.beginPath();
                ctx.roundRect(-this.width/2, 9, this.width, 10, [0, 0, 5, 5]);
                ctx.fill();
            }
            else if (this.type === 'virus') {
                // Draw spiky virus shape
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, this.width/2 - 5, 0, Math.PI*2);
                ctx.fill();
                
                // Spikes
                ctx.strokeStyle = '#4d7c0f';
                ctx.lineWidth = 4;
                for(let i=0; i<8; i++) {
                    const angle = (Math.PI * 2 / 8) * i + this.bobCycle; // rotate slightly over time
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(angle) * (this.width/2 - 5), Math.sin(angle) * (this.width/2 - 5));
                    ctx.lineTo(Math.cos(angle) * (this.width/2 + 2), Math.sin(angle) * (this.width/2 + 2));
                    ctx.stroke();
                }
                
                // Evil eyes
                ctx.fillStyle = '#000';
                ctx.fillRect(-10, -5, 6, 6);
                ctx.fillRect(4, -5, 6, 6);
                ctx.fillStyle = '#f43f5e';
                ctx.fillRect(-8, -3, 2, 2);
                ctx.fillRect(6, -3, 2, 2);
            }
        }
        
        ctx.restore();
    }
}

class EntityManager {
    constructor() {
        this.entities = [];
        this.spawnTimer = 0;
    }

    update(deltaTime, gameSpeed, yFloor) {
        // Spawning logic
        this.spawnTimer -= deltaTime * (gameSpeed / CONFIG.BASE_SPEED);
        
        if (this.spawnTimer <= 0) {
            this.spawnEntity(yFloor);
            // Randomize next spawn time slightly based on speed
            const baseRate = (CONFIG.SPAWN_RATE / 60) * 1000; // ~1000ms at 60fps spawn rate
            this.spawnTimer = Utils.randomRange(baseRate * 0.8, baseRate * 1.5) / (gameSpeed / 10);
        }

        // Update entities
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            entity.update(deltaTime, gameSpeed);
            if (entity.markedForDeletion) {
                this.entities.splice(i, 1);
            }
        }
    }

    spawnEntity(yFloor) {
        const rand = Math.random();
        let configInfo;
        
        // 60% chance obstacle, 40% collectible
        if (rand < 0.6) {
            configInfo = Math.random() < 0.6 ? CONFIG.OBSTACLE_TYPES.JUNK_FOOD : CONFIG.OBSTACLE_TYPES.VIRUS;
        } else {
            configInfo = Math.random() < 0.6 ? CONFIG.COLLECTIBLE_TYPES.WATER : CONFIG.COLLECTIBLE_TYPES.FRUIT;
        }

        // Spawn off-screen right
        const x = CONFIG.CANVAS_WIDTH + 100;
        this.entities.push(new Entity(x, yFloor, configInfo));
    }

    draw(ctx) {
        this.entities.forEach(e => e.draw(ctx));
    }
    
    reset() {
        this.entities = [];
        this.spawnTimer = 0;
    }
}
