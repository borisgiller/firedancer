class MandalaLayer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.audioProcessor = null;
        this.isActive = false;
        this.rotation = 0;
        this.scale = 1;
        this.colorHue = 0;
        this.blendMode = 'soft-light'; // Default blend mode as specified
        this.complexity = 8; // Number of symmetry points
        this.layers = 5; // Number of nested mandala layers
        this.baseSize = 0.4; // Base size relative to canvas
        this.animationSpeed = 0.01;
        
        // Audio reactivity settings
        this.sensitivity = {
            bass: 1.0,
            lowMid: 1.0,
            highMid: 1.0,
            treble: 1.0
        };
        
        // Fractal parameters
        this.fractalDepth = 3;
        this.fractalScale = 0.5;
        this.fractalRotation = Math.PI / 6;
    }

    setAudioProcessor(audioProcessor) {
        this.audioProcessor = audioProcessor;
    }
    
    updateSensitivity(band, value) {
        if (this.sensitivity.hasOwnProperty(band)) {
            this.sensitivity[band] = value;
        }
    }
    
    updateConfig(config) {
        if (config.blendMode) this.blendMode = config.blendMode;
        if (config.complexity) this.complexity = config.complexity;
        if (config.layers) this.layers = config.layers;
        if (config.baseSize) this.baseSize = config.baseSize;
        if (config.animationSpeed) this.animationSpeed = config.animationSpeed;
        if (config.fractalDepth) this.fractalDepth = config.fractalDepth;
        if (config.fractalScale) this.fractalScale = config.fractalScale;
        if (config.fractalRotation) this.fractalRotation = config.fractalRotation;
    }

    update() {
        if (!this.audioProcessor || !this.isActive) return;
        
        // Get audio data
        const audioData = this.audioProcessor.getFrequencyData();
        if (!audioData) return;
        
        // Calculate overall intensity from all frequency bands
        const bassIntensity = audioData.bass.average * this.sensitivity.bass;
        const lowMidIntensity = audioData.lowMid.average * this.sensitivity.lowMid;
        const highMidIntensity = audioData.highMid.average * this.sensitivity.highMid;
        const trebleIntensity = audioData.treble.average * this.sensitivity.treble;
        
        // Use different frequency bands to control different aspects of the mandala
        this.rotation += this.animationSpeed * (1 + bassIntensity * 0.5);
        this.scale = 0.8 + (lowMidIntensity * 0.5);
        this.complexity = 6 + Math.floor(highMidIntensity * 6); // Between 6-12 points
        this.colorHue = (this.colorHue + trebleIntensity) % 360;
        
        // Adjust fractal parameters based on audio
        this.fractalDepth = 2 + Math.floor(bassIntensity * 2); // Between 2-4
        this.fractalScale = 0.4 + (highMidIntensity * 0.3); // Between 0.4-0.7
        this.fractalRotation += 0.01 * trebleIntensity;
    }

    render() {
        if (!this.isActive) return;
        
        // Save the current context state
        this.ctx.save();
        
        // Set blend mode
        this.ctx.globalCompositeOperation = this.blendMode;
        
        // Center the mandala
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(this.rotation);
        this.ctx.scale(this.scale, this.scale);
        
        // Calculate base size relative to canvas
        const size = Math.min(this.canvas.width, this.canvas.height) * this.baseSize;
        
        // Draw the mandala
        this.drawMandala(0, 0, size, this.fractalDepth);
        
        // Restore the context
        this.ctx.restore();
    }
    
    drawMandala(x, y, size, depth) {
        // Base case for recursion
        if (depth <= 0) return;
        
        // Draw the main mandala shape
        this.drawSymmetricalPattern(x, y, size);
        
        // Recursive fractal pattern
        if (depth > 1) {
            const newSize = size * this.fractalScale;
            const angleStep = (Math.PI * 2) / this.complexity;
            
            for (let i = 0; i < this.complexity; i++) {
                const angle = i * angleStep;
                const newX = x + Math.cos(angle) * size * 0.7;
                const newY = y + Math.sin(angle) * size * 0.7;
                
                this.ctx.save();
                this.ctx.translate(newX, newY);
                this.ctx.rotate(angle + this.fractalRotation);
                this.drawMandala(0, 0, newSize, depth - 1);
                this.ctx.restore();
            }
        }
    }
    
    drawSymmetricalPattern(x, y, size) {
        const angleStep = (Math.PI * 2) / this.complexity;
        
        // Draw multiple layers of the mandala
        for (let layer = 0; layer < this.layers; layer++) {
            const layerSize = size * (1 - layer * 0.15);
            const hue = (this.colorHue + layer * 30) % 360;
            const saturation = 80 + layer * 4;
            const lightness = 50 + layer * 5;
            
            this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.7)`;
            this.ctx.strokeStyle = `hsla(${(hue + 180) % 360}, ${saturation}%, ${lightness}%, 0.8)`;
            this.ctx.lineWidth = 1;
            
            // Draw petals
            this.ctx.beginPath();
            for (let i = 0; i < this.complexity; i++) {
                const angle = i * angleStep;
                const petalSize = layerSize * 0.5;
                
                // Create petal shape
                this.ctx.save();
                this.ctx.rotate(angle);
                
                // Draw a petal
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.bezierCurveTo(
                    petalSize * 0.5, petalSize * 0.3,
                    petalSize * 0.5, petalSize * 0.7,
                    0, petalSize
                );
                this.ctx.bezierCurveTo(
                    -petalSize * 0.5, petalSize * 0.7,
                    -petalSize * 0.5, petalSize * 0.3,
                    0, 0
                );
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                
                this.ctx.restore();
            }
            
            // Draw connecting circles
            this.ctx.beginPath();
            this.ctx.arc(0, 0, layerSize * 0.2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            
            // Draw outer circle
            this.ctx.beginPath();
            this.ctx.arc(0, 0, layerSize * 0.8, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }
}
