class Player {
    constructor(yFloor) {
        this.width = CONFIG.PLAYER_WIDTH;
        this.originalHeight = CONFIG.PLAYER_HEIGHT;
        this.height = this.originalHeight;
        this.x = CONFIG.PLAYER_X;
        this.yFloor = yFloor;
        this.y = this.yFloor - this.height;
        
        this.vy = 0;
        this.isJumping = false;
        this.canDoubleJump = false;
        this.isSliding = false;
        
        this.slideTimer = 0;
        this.maxSlideTime = 600; // ms
        
        this.color = '#f8fafc'; // Default player color
        
        // Animation
        this.runCycle = 0;
    }

    jump(audio, energy) {
        if (!this.isJumping) {
            if (this.isSliding) {
                this.isSliding = false;
                this.height = this.originalHeight;
                this.y = this.yFloor - this.height;
            }
            this.vy = CONFIG.PLAYER_JUMP_FORCE;
            this.isJumping = true;
            this.canDoubleJump = true;
            audio.playJump(false);
            return true;
        } else if (this.canDoubleJump && energy >= 10) {
            if (this.isSliding) {
                this.isSliding = false;
                this.height = this.originalHeight;
                this.y -= this.originalHeight / 2;
            }
            this.vy = CONFIG.PLAYER_DOUBLE_JUMP_FORCE;
            this.canDoubleJump = false;
            audio.playJump(true);
            return true; // Used energy
        }
        return false;
    }

    slide(energy) {
        if (!this.isSliding && energy >= 5) {
            if (this.isJumping) {
                this.vy = 15; // Fast fall!
            }
            this.isSliding = true;
            this.height = this.originalHeight / 2;
            if (!this.isJumping) {
                this.y = this.yFloor - this.height;
            }
            this.slideTimer = this.maxSlideTime;
            return true; // Used energy
        }
        return false;
    }

    update(deltaTime, particles, gameSpeed) {
        // Physics
        this.vy += CONFIG.GRAVITY * (deltaTime / 16);
        this.y += this.vy * (deltaTime / 16);

        // Floor collision
        if (this.y + this.height >= this.yFloor) {
            this.y = this.yFloor - this.height;
            this.vy = 0;
            this.isJumping = false;
            this.canDoubleJump = false;
            
            // Trail particles when running
            if (!this.isSliding && Math.random() > 0.5) {
                particles.emit(this.x, this.y + this.height, 1, ['#e2e8f0', '#94a3b8'], 'trail');
            }
        }

        // Sliding logic
        if (this.isSliding) {
            this.slideTimer -= deltaTime;
            
            // Slide particles
            particles.emit(this.x + this.width/2, this.y + this.height, 1, ['#e2e8f0'], 'trail');

            if (this.slideTimer <= 0) {
                this.isSliding = false;
                this.height = this.originalHeight;
                this.y -= this.originalHeight / 2; // Adjust position up
            }
        }
        
        // Animation cycle - slowed down for better visibility of motion
        if (!this.isJumping && !this.isSliding) {
            const speedFactor = gameSpeed ? gameSpeed / CONFIG.BASE_SPEED : 1;
            this.runCycle += (deltaTime * 0.008) * speedFactor;
        }
    }

    draw(ctx, gameSpeed = 10) {
        ctx.save();
        
        const pX = this.x + this.width / 2;
        const pY = this.y;
        const pH = this.originalHeight;
        
        // Classic Stickman Style - Blue like the video
        ctx.shadowBlur = 0; // The video stickman is flat, no glow
        ctx.strokeStyle = '#2563eb'; // Deep blue color
        ctx.fillStyle = '#2563eb'; // Filled head
        ctx.lineWidth = 12; // Thicker lines like the video
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Proportions matching the video's sturdy stickman
        const hipHeight = pH * 0.55;
        const torsoLen = pH * 0.38;
        const thighLen = pH * 0.28;
        const shinLen = pH * 0.28;
        const upperArmLen = pH * 0.22;
        const lowerArmLen = pH * 0.22;
        const headRadius = 14;

        // Keyframes for the run cycle matched exactly to the video frames
        // The video shows a very bouncy, dynamic run with arms pumping high
        const RUN_FRAMES = [
            // 0: Contact (Right foot forward, leg straight, left leg bent back, left arm forward high, right arm back)
            { rh: 0.5, rk: 0.0, lh: -0.6, lk: -1.8, rs: -1.0, re: 1.5, ls: 1.0, le: 1.5, b: 0, lean: 0.3 },
            // 1: Down (Right foot plants, knee bends, left leg swings through)
            { rh: 0.1, rk: -0.8, lh: -0.2, lk: -1.8, rs: -1.2, re: 1.5, ls: 1.2, le: 1.5, b: 12, lean: 0.35 },
            // 2: Pass (Right leg pushing back, left leg swinging forward high knee)
            { rh: -0.4, rk: -0.2, lh: 0.6, lk: -2.0, rs: -0.5, re: 1.5, ls: 0.5, le: 1.5, b: 4, lean: 0.3 },
            // 3: Up (Right toe push off, left knee very high in front, flight phase)
            { rh: -0.8, rk: -0.1, lh: 0.9, lk: -1.5, rs: 0.2, re: 1.5, ls: -0.2, le: 1.5, b: -8, lean: 0.25 },
            // 4: Contact (Left foot forward, right leg bent back)
            { rh: -0.6, rk: -1.8, lh: 0.5, lk: 0.0, rs: 1.0, re: 1.5, ls: -1.0, le: 1.5, b: 0, lean: 0.3 },
            // 5: Down (Left foot plants, knee bends, right leg swings through)
            { rh: -0.2, rk: -1.8, lh: 0.1, lk: -0.8, rs: 1.2, re: 1.5, ls: -1.2, le: 1.5, b: 12, lean: 0.35 },
            // 6: Pass (Left leg pushing back, right leg swinging forward high knee)
            { rh: 0.6, rk: -2.0, lh: -0.4, lk: -0.2, rs: 0.5, re: 1.5, ls: -0.5, le: 1.5, b: 4, lean: 0.3 },
            // 7: Up (Left toe push off, right knee very high in front, flight phase)
            { rh: 0.9, rk: -1.5, lh: -0.8, lk: -0.1, rs: -0.2, re: 1.5, ls: 0.2, le: 1.5, b: -8, lean: 0.25 }
        ];

        let state = {};
        
        if (this.isJumping) {
            // Jump Pose
            state = { rh: 0.5, rk: -1.2, lh: -0.3, lk: -0.5, rs: -2.2, re: 0.5, ls: -2.0, le: 0.7, b: -10, lean: -0.1 };
        } else if (this.isSliding) {
            // Slide Pose (Fixed to stay on the ground)
            // When sliding, the original height is halved (this.height = pH / 2). 
            // So we need to ensure the bounce 'b' offsets properly so the hips stay above the new ground level.
            state = { rh: 1.2, rk: -1.5, lh: 1.5, lk: -1.5, rs: -1.0, re: 0.2, ls: -1.2, le: 0.2, b: -25, lean: 1.2 };
        } else {
            // Lerp between run frames
            let speedFactor = Math.max(1, gameSpeed / CONFIG.BASE_SPEED);
            let cycle = (this.runCycle * 4 * speedFactor) % 8; // Slowed down cycle multiplier to 4 for much slower speed
            let f1 = Math.floor(cycle);
            let f2 = (f1 + 1) % 8;
            let progress = cycle - f1;

            const lerp = (a, b, t) => a + (b - a) * t;
            for (let key in RUN_FRAMES[0]) {
                state[key] = lerp(RUN_FRAMES[f1][key], RUN_FRAMES[f2][key], progress);
            }
        }

        // --- DRAWING ---
        const hipX = pX;
        const hipY = pY + hipHeight + state.b;
        
        const shoulderX = hipX + Math.sin(state.lean) * torsoLen;
        const shoulderY = hipY - Math.cos(state.lean) * torsoLen;

        const headX = shoulderX + Math.sin(state.lean) * headRadius;
        const headY = shoulderY - Math.cos(state.lean) * headRadius;

        // Draw segmented limb helper
        const drawLimb = (startX, startY, angle1, angle2, len1, len2, isFoot = false) => {
            const jointX = startX + Math.sin(angle1) * len1;
            const jointY = startY + Math.cos(angle1) * len1;
            const endX = jointX + Math.sin(angle1 + angle2) * len2;
            const endY = jointY + Math.cos(angle1 + angle2) * len2;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(jointX, jointY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // The video shows small "feet" extensions at the end of the leg
            if (isFoot) {
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(endX + 10, endY + 2); // Small horizontal foot
                ctx.stroke();
            }
        };

        // Darken back limbs slightly for depth
        ctx.strokeStyle = '#1e40af'; // Darker blue for back limbs
        
        // Left (Back) Arm
        drawLimb(shoulderX, shoulderY, state.ls + state.lean, state.le, upperArmLen, lowerArmLen);
        // Left (Back) Leg
        drawLimb(hipX, hipY, state.lh, state.lk, thighLen, shinLen, true);

        // Core
        ctx.strokeStyle = '#2563eb'; // Main blue
        // Torso
        ctx.beginPath();
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(shoulderX, shoulderY);
        ctx.stroke();
        // Head (Filled circle)
        ctx.beginPath();
        ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
        ctx.fill();

        // Right (Front) Arm
        drawLimb(shoulderX, shoulderY, state.rs + state.lean, state.re, upperArmLen, lowerArmLen);
        // Right (Front) Leg
        drawLimb(hipX, hipY, state.rh, state.rk, thighLen, shinLen, true);

        ctx.restore();
    }
}
