class TrianglesLayer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.isActive = false;
        this.audioProcessor = null;
        this.lastFrameTime = performance.now();
        
        // Triangle configuration
        this.config = {
            size: 170,               // Base size of triangles
            outlineWidth: 10,         // Width of triangle outlines (1-40px)
            expansionRange: 9.9,     // Maximum expansion factor (1-10x)
            rotationSpeed: 0,        // Base rotation speed (0-5x)
            opacity: 0.8,           // Base opacity (0-1)
            blendMode: 'overlay', // Blend mode
        };
        
        // Initialize triangles array with one for each frequency band
        this.triangles = [
            { 
                band: 'bass',
                color: 'rgba(0,0,0,0)',    // Transparent fill
                outlineColor: '#ff1e00',
                angle: 0,
                scale: 1,
                opacity: 0 // Start with zero opacity when quiet
            },
            { 
                band: 'lowMid',
                color: 'rgba(0,0,0,0)',    // Transparent fill
                outlineColor: '#ff6c00',
                angle: Math.PI/2,    // 90 degrees offset
                scale: 1,
                opacity: 0 // Start with zero opacity when quiet
            },
            { 
                band: 'highMid',
                color: 'rgba(0,0,0,0)',    // Transparent fill
                outlineColor: '#ffde00',
                angle: Math.PI,      // 180 degrees offset
                scale: 1,
                opacity: 0 // Start with zero opacity when quiet
            },
            { 
                band: 'treble',
                color: 'rgba(0,0,0,0)',    // Transparent fill
                outlineColor: '#fffddd',
                angle: Math.PI*3/2,  // 270 degrees offset
                scale: 1,
                opacity: 0 // Start with zero opacity when quiet
            }
        ];
    }
    
    setAudioProcessor(audioProcessor) {
        this.audioProcessor = audioProcessor;
    }
    
    update() {
        if (!this.isActive || !this.audioProcessor || !this.audioProcessor.isInitialized) {
            return;
        }
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = currentTime;
        
        // Update each triangle based on its frequency band
        for (const triangle of this.triangles) {
            // Get the frequency range for this band from the global config
            const bandConfig = config.frequencyBands[triangle.band];
            
            // Get energy in this frequency band
            const energy = this.audioProcessor.getBandEnergy(
                bandConfig.min, 
                bandConfig.max
            );
            
            // Update triangle properties based on energy
            
            // Scale and opacity based purely on energy
            const enhancedEnergy = Math.pow(energy, 0.3);
            
            // Scale from 0 to expansionRange based on energy
            const targetScale = enhancedEnergy * this.config.expansionRange;
            triangle.scale = triangle.scale * 0.3 + targetScale * 0.7;
            
            // Opacity from 0 to 1 based on energy - increases with loudness
            triangle.opacity = enhancedEnergy * this.config.opacity;
            
            // Rotation speed proportional to energy
            const rotationSpeed = this.config.rotationSpeed * enhancedEnergy;
            triangle.angle += deltaTime * rotationSpeed * Math.PI / 2;
        }
    }
    
    render() {
        if (!this.isActive) {
            return;
        }
        
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Save context state
        ctx.save();
        
        // Set blend mode
        ctx.globalCompositeOperation = this.config.blendMode;
        
        // Draw each triangle
        for (const triangle of this.triangles) {
            ctx.save();
            
            // Set opacity
            ctx.globalAlpha = triangle.opacity;
            
            // Move to center, then apply rotation and scale
            ctx.translate(centerX, centerY);
            ctx.rotate(triangle.angle);
            ctx.scale(triangle.scale, triangle.scale);
            
            // Draw equilateral triangle
            const size = this.config.size;
            
            // Calculate vertices of equilateral triangle
            // Height of equilateral triangle = size * √3/2
            const height = size * Math.sqrt(3) / 2;
            
            ctx.beginPath();
            ctx.moveTo(0, -height * 2/3);           // Top vertex
            ctx.lineTo(-size/2, height/3);          // Bottom left
            ctx.lineTo(size/2, height/3);           // Bottom right
            ctx.closePath();
            
            // Fill triangle
            ctx.fillStyle = triangle.color;
            ctx.fill();
            
            // Outline triangle
            ctx.strokeStyle = triangle.outlineColor;
            ctx.lineWidth = this.config.outlineWidth;
            ctx.stroke();
            
            ctx.restore();
        }
        
        // Restore context state
        ctx.restore();
    }
    
    // Method to update configuration
    updateConfig(newConfig) {
        // Update triangle colors if provided
        if (newConfig.triangleColors) {
            for (let i = 0; i < Math.min(newConfig.triangleColors.length, this.triangles.length); i++) {
                if (newConfig.triangleColors[i]) {
                    this.triangles[i].color = newConfig.triangleColors[i];
                }
            }
            delete newConfig.triangleColors;
        }
        
        // Update outline colors if provided
        if (newConfig.outlineColors) {
            for (let i = 0; i < Math.min(newConfig.outlineColors.length, this.triangles.length); i++) {
                if (newConfig.outlineColors[i]) {
                    this.triangles[i].outlineColor = newConfig.outlineColors[i];
                }
            }
            delete newConfig.outlineColors;
        }
        
        // Update other config properties
        Object.assign(this.config, newConfig);
    }
}
