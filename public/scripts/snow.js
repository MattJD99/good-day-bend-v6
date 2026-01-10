/**
 * spectacular-snow.js
 * A high-performance canvas-based snow animation for Good Day Bend v5.
 */

class SnowSystem {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.flakes = [];
        this.flakeCount = 50; // Very subtle
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.init();
    }

    init() {
        // Setup Canvas
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none'; // Click-through
        this.canvas.style.zIndex = '9999'; // On top of everything
        document.body.appendChild(this.canvas);

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Create Flakes
        for (let i = 0; i < this.flakeCount; i++) {
            this.flakes.push(this.createFlake());
        }

        // Start Loop
        this.animate();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    createFlake(resetY = false) {
        return {
            x: Math.random() * this.width,
            y: resetY ? -10 : Math.random() * this.height,
            size: Math.random() * 2 + 0.5, // Smaller range: 0.5px to 2.5px
            speed: Math.random() * 0.5 + 0.2, // Slower speed
            opacity: Math.random() * 0.3 + 0.1, // Softer opacity
            sway: Math.random() * 2 - 1 // Left/Right drift
        };
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.flakes.forEach(flake => {
            // Update Position
            flake.y += flake.speed;
            flake.x += Math.sin(flake.y * 0.01) * 0.5 + (flake.sway * 0.1);

            // Draw
            this.ctx.beginPath();
            this.ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
            this.ctx.fill();

            // Reset if out of bounds
            if (flake.y > this.height) {
                Object.assign(flake, this.createFlake(true));
            }
            if (flake.x > this.width) {
                flake.x = 0;
            } else if (flake.x < 0) {
                flake.x = this.width;
            }
        });

        requestAnimationFrame(() => this.animate());
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    new SnowSystem();
});
