class World {
    constructor() {
        this.yFloor = CONFIG.CANVAS_HEIGHT - 100;
        this.currentEnvIndex = 0;
        this.targetEnvIndex = 0;
        this.envTransitionProgress = 1; // 0 to 1
        
        this.bgElements = [];
        this.initBgElements();
    }

    initBgElements() {
        this.bgElements = [];
        for (let i = 0; i < 20; i++) {
            this.bgElements.push({
                x: Utils.randomRange(0, CONFIG.CANVAS_WIDTH),
                y: Utils.randomRange(0, this.yFloor - 50),
                size: Utils.randomRange(10, 40),
                speedMultiplier: Utils.randomRange(0.1, 0.5),
                opacity: Utils.randomRange(0.1, 0.4)
            });
        }
    }

    update(deltaTime, gameSpeed, distance) {
        // Environment transition logic
        // Need to protect against NaN distance due to potential loop bugs
        let safeDist = isNaN(distance) ? 0 : distance;

        // Check if we need to transition
        const nextEnvIndex = this.currentEnvIndex + 1;
        if (nextEnvIndex < CONFIG.ENVIRONMENTS.length && safeDist >= CONFIG.ENVIRONMENTS[nextEnvIndex].distanceThreshold) {
            if (this.targetEnvIndex !== nextEnvIndex) {
                this.targetEnvIndex = nextEnvIndex;
                this.envTransitionProgress = 0;
            }
        }

        if (this.envTransitionProgress < 1) {
            this.envTransitionProgress += deltaTime * 0.001; // Transition takes 1 second
            if (this.envTransitionProgress >= 1) {
                this.envTransitionProgress = 1;
                this.currentEnvIndex = this.targetEnvIndex;
            }
        }

        // Update bg elements (parallax)
        this.bgElements.forEach(el => {
            el.x -= gameSpeed * el.speedMultiplier * (deltaTime / 16);
            if (el.x + el.size < 0) {
                el.x = CONFIG.CANVAS_WIDTH + el.size;
                el.y = Utils.randomRange(0, this.yFloor - 50);
            }
        });
    }

    getCurrentColor(propName) {
        // Protect against invalid indices
        if (isNaN(this.currentEnvIndex) || this.currentEnvIndex < 0 || this.currentEnvIndex >= CONFIG.ENVIRONMENTS.length) {
            this.currentEnvIndex = 0;
        }

        const currEnv = CONFIG.ENVIRONMENTS[this.currentEnvIndex];
        
        if (this.envTransitionProgress === 1) {
            return currEnv[propName];
        }

        // Handle transitioning colors
        if (isNaN(this.targetEnvIndex) || this.targetEnvIndex < 0 || this.targetEnvIndex >= CONFIG.ENVIRONMENTS.length) {
            return currEnv[propName];
        }

        const targetEnv = CONFIG.ENVIRONMENTS[this.targetEnvIndex];
        
        if (Array.isArray(currEnv[propName])) {
            // Blend array of colors
            return currEnv[propName].map((color, i) => this.blendColors(color, targetEnv[propName][i], this.envTransitionProgress));
        } else {
            // Blend single color
            return this.blendColors(currEnv[propName], targetEnv[propName], this.envTransitionProgress);
        }
    }

    blendColors(color1, color2, progress) {
        const rgb1 = Utils.hexToRgb(color1);
        const rgb2 = Utils.hexToRgb(color2);
        
        if (!rgb1 || !rgb2) return color1;

        const r = Math.round(Utils.lerp(rgb1.r, rgb2.r, progress));
        const g = Math.round(Utils.lerp(rgb1.g, rgb2.g, progress));
        const b = Math.round(Utils.lerp(rgb1.b, rgb2.b, progress));

        return `rgb(${r}, ${g}, ${b})`;
    }

    draw(ctx) {
        const bgColors = this.getCurrentColor('bgColors');
        const floorColor = this.getCurrentColor('floorColor');
        const particleColors = this.getCurrentColor('particleColors'); // We use this for drawing bg shapes

        // Gradient Background
        ctx.globalAlpha = 0.6; // Let HTML background shine through
        const grad = ctx.createLinearGradient(0, 0, 0, this.yFloor);
        grad.addColorStop(0, bgColors[0]);
        grad.addColorStop(1, bgColors[1]);
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        ctx.globalAlpha = 1;

        // Background Elements (Parallax)
        this.bgElements.forEach((el, index) => {
            ctx.fillStyle = particleColors[index % particleColors.length];
            ctx.globalAlpha = el.opacity;
            ctx.beginPath();
            
            // Draw different shapes based on environment
            if (this.currentEnvIndex === 0) { // Bloodstream - circles
                ctx.arc(el.x, el.y, el.size, 0, Math.PI * 2);
            } else if (this.currentEnvIndex === 1) { // Neural - connected nodes
                ctx.arc(el.x, el.y, el.size/2, 0, Math.PI * 2);
                if (index > 0 && index % 3 === 0) {
                    const prev = this.bgElements[index - 1];
                    ctx.moveTo(el.x, el.y);
                    ctx.lineTo(prev.x, prev.y);
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = ctx.fillStyle;
                    ctx.stroke();
                }
            } else { // Respiratory - bubbles
                ctx.arc(el.x, el.y, el.size, 0, Math.PI * 2);
                ctx.stroke(); // Hollow circles
            }
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Floor
        ctx.fillStyle = floorColor;
        ctx.fillRect(0, this.yFloor, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT - this.yFloor);

        // Floor Grid/Texture for speed illusion
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, this.yFloor);
        ctx.lineTo(CONFIG.CANVAS_WIDTH, this.yFloor);
        ctx.stroke();
    }
    
    reset() {
        this.currentEnvIndex = 0;
        this.targetEnvIndex = 0;
        this.envTransitionProgress = 1;
        this.initBgElements();
    }
}
