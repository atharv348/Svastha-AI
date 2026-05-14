const CONFIG = {
    // Canvas config
    CANVAS_WIDTH: 1280,
    CANVAS_HEIGHT: 720,
    
    // Physics
    GRAVITY: 0.6,
    BASE_SPEED: 40,
    MIN_SPEED: 40,
    MAX_SPEED: 40,
    SPEED_INCREMENT: 0, // Added per frame

    // Player
    PLAYER_X: 150,
    PLAYER_WIDTH: 60,
    PLAYER_HEIGHT: 100,
    PLAYER_JUMP_FORCE: -14,
    PLAYER_DOUBLE_JUMP_FORCE: -12,
    
    // Vitals
    MAX_HEALTH: 100,
    MAX_HYDRO: 100,
    MAX_ENERGY: 100,
    HYDRO_DECAY: 0.03, // Per frame
    ENERGY_REGEN: 0.05,
    
    // Entities
    SPAWN_RATE: 20, // Faster spawn rate for high speed
    OBSTACLE_TYPES: {
        JUNK_FOOD: { type: 'junk', width: 50, height: 50, damage: 20, color: '#f43f5e', yOffset: 0 },
        VIRUS: { type: 'virus', width: 60, height: 60, damage: 30, color: '#84cc16', yOffset: 120 }
    },
    COLLECTIBLE_TYPES: {
        WATER: { type: 'water', width: 40, height: 40, value: 30, color: '#0ea5e9', yOffset: 0 },
        FRUIT: { type: 'fruit', width: 40, height: 40, value: 20, color: '#eab308', yOffset: 80 }
    },

    // Environments
    ENVIRONMENTS: [
        {
            name: 'Bloodstream',
            bgColors: ['#4c0519', '#7f1d1d'],
            floorColor: '#9f1239',
            particleColors: ['#e11d48', '#fb7185'],
            distanceThreshold: 0
        },
        {
            name: 'Neural Network',
            bgColors: ['#0f172a', '#1e1b4b'],
            floorColor: '#312e81',
            particleColors: ['#60a5fa', '#818cf8', '#a78bfa'],
            distanceThreshold: 1000 // Transition at 1000m
        },
        {
            name: 'Digestive System',
            bgColors: ['#422006', '#713f12'],
            floorColor: '#ca8a04',
            particleColors: ['#fde047', '#fef08a'],
            distanceThreshold: 4500
        },
        {
            name: 'Immune System',
            bgColors: ['#022c22', '#064e3b'],
            floorColor: '#059669',
            particleColors: ['#34d399', '#6ee7b7'],
            distanceThreshold: 7000
        }
    ]
};
