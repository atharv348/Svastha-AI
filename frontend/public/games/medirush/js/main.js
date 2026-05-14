document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set initial canvas size
    function resizeCanvas() {
        // Calculate scale to fit window while maintaining aspect ratio
        const windowRatio = window.innerWidth / window.innerHeight;
        const targetRatio = CONFIG.CANVAS_WIDTH / CONFIG.CANVAS_HEIGHT;
        
        let scale;
        if (windowRatio < targetRatio) {
            scale = window.innerWidth / CONFIG.CANVAS_WIDTH;
        } else {
            scale = window.innerHeight / CONFIG.CANVAS_HEIGHT;
        }
        
        // Set actual canvas resolution to config constants
        canvas.width = CONFIG.CANVAS_WIDTH;
        canvas.height = CONFIG.CANVAS_HEIGHT;
        
        // Use CSS transform to scale it down/up visually
        canvas.style.transform = `scale(${scale})`;
        canvas.style.transformOrigin = 'center center';
        
        // Center it in the container
        canvas.style.position = 'absolute';
        canvas.style.left = `${(window.innerWidth - CONFIG.CANVAS_WIDTH) / 2}px`;
        canvas.style.top = `${(window.innerHeight - CONFIG.CANVAS_HEIGHT) / 2}px`;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Initialize Game
    const game = new Game(canvas, ctx);

    // UI Elements
    const mainMenu = document.getElementById('main-menu');
    const pauseMenu = document.getElementById('pause-menu');
    const gameOverMenu = document.getElementById('game-over');
    const hud = document.getElementById('hud');
    const startBtn = document.getElementById('startBtn');

    startBtn.innerText = "Loading Assets...";
    startBtn.disabled = true;

    loadAssets(() => {
        startBtn.innerText = "Start Run";
        startBtn.disabled = false;
    });

    // Buttons
    startBtn.addEventListener('click', () => {
        if (!ASSETS.isReady) return;
        mainMenu.classList.add('hidden');
        hud.classList.remove('hidden');
        game.audio.resume(); // Ensure audio context starts on user interaction
        
        const difficulty = document.getElementById('difficultySelect').value;
        const startLevel = parseInt(document.getElementById('levelSelect').value) - 1;
        
        game.start(difficulty, startLevel);
    });

    document.getElementById('resumeBtn').addEventListener('click', () => {
        pauseMenu.classList.add('hidden');
        game.pause(); // Toggles back to playing
    });

    document.getElementById('quitBtn').addEventListener('click', () => {
        pauseMenu.classList.add('hidden');
        hud.classList.add('hidden');
        mainMenu.classList.remove('hidden');
        game.state = 'menu';
    });

    document.getElementById('restartBtn').addEventListener('click', () => {
        gameOverMenu.classList.add('hidden');
        const difficulty = document.getElementById('difficultySelect').value;
        const startLevel = parseInt(document.getElementById('levelSelect').value) - 1;
        game.start(difficulty, startLevel);
    });

    document.getElementById('menuBtn').addEventListener('click', () => {
        gameOverMenu.classList.add('hidden');
        hud.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    });

    // Custom events
    window.addEventListener('gameover', () => {
        gameOverMenu.classList.remove('hidden');
    });

    // Input Handling
    window.addEventListener('keydown', (e) => {
        // Prevent default scrolling for game keys
        if(['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
            e.preventDefault();
        }

        if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            game.handleInput('jump');
        } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            game.handleInput('slide');
        } else if (e.code === 'KeyP' || e.code === 'Escape') {
            if (game.state === 'playing') {
                game.pause();
                pauseMenu.classList.remove('hidden');
            } else if (game.state === 'paused') {
                game.pause();
                pauseMenu.classList.add('hidden');
            }
        } else if (e.code === 'KeyM') {
            game.audio.toggleMute();
        }
    });

    // Touch Support for Mobile
    let touchStartY = 0;
    
    window.addEventListener('touchstart', (e) => {
        if (game.state === 'playing') {
            touchStartY = e.touches[0].clientY;
        }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
        if (game.state === 'playing') {
            const touchEndY = e.changedTouches[0].clientY;
            const dy = touchEndY - touchStartY;
            
            if (dy > 50) { // Swipe down
                game.handleInput('slide');
            } else { // Tap or slight swipe
                game.handleInput('jump');
            }
        }
    }, { passive: false });
    
    // Prevent default touch behaviors (scrolling/zooming)
    document.addEventListener('touchmove', function(e) {
        if (game.state === 'playing') e.preventDefault();
    }, { passive: false });
});
