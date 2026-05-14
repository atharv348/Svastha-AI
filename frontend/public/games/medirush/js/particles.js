class Particle {
    constructor(x, y, color, size, velocityX, velocityY, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.vx = velocityX;
        this.vy = velocityY;
        this.life = life;
        this.maxLife = life;
        this.alpha = 1;
    }

    update(deltaTime) {
        this.x += this.vx * (deltaTime / 16);
        this.y += this.vy * (deltaTime / 16);
        this.life -= deltaTime;
        this.alpha = Math.max(0, this.life / this.maxLife);
    }

    draw(ctx) {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, count, colors, type = 'burst') {
        for (let i = 0; i < count; i++) {
            const color = Utils.randomChoice(colors);
            let vx, vy, size, life;

            if (type === 'burst') {
                const angle = Math.random() * Math.PI * 2;
                const speed = Utils.randomRange(2, 8);
                vx = Math.cos(angle) * speed;
                vy = Math.sin(angle) * speed;
                size = Utils.randomRange(2, 6);
                life = Utils.randomRange(300, 800);
            } else if (type === 'trail') {
                vx = Utils.randomRange(-2, 0);
                vy = Utils.randomRange(-1, 1);
                size = Utils.randomRange(1, 4);
                life = Utils.randomRange(200, 500);
            }

            this.particles.push(new Particle(x, y, color, size, vx, vy, life));
        }
    }

    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update(deltaTime);
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }
    
    reset() {
        this.particles = [];
    }
}
