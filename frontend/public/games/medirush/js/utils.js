class Utils {
    static randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    static randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    static checkCollision(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }

    // Hex to RGB for canvas effects
    static hexToRgb(hex) {
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
}
