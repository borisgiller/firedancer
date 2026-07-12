class ParticleLayer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.particles = [];
        this.isActive = false;
        this.audioProcessor = null;
        this.lastFrameTime = 0;
        
        // Particle configuration
        this.config = {
            size: 1,                    // Base size of particles
            aggressiveness: 5.4,        // How aggressively particles spawn (0-1)
            fadeRate: 0.01,             // How quickly particles fade out (0-1)
            velocity: 2.5,                // Base upward velocity
            maxParticles: 1000,         // Maximum particles on screen (increased from 500)
            blendMode: 'color-dodge',        // Blend mode for particles
            showFill: false,             // Toggle particle fill rendering
            showOutline: true,         // Toggle particle outline rendering
            outlineColor: '#FF6C00',    // Configurable outline color
            spawnThreshold: 0.05,       // Audio threshold to spawn particles (lowered from 0.15)
            sizeVariation: 0.5,         // Random size variation factor
            velocityVariation: 0.5,     // Random velocity variation factor
            horizontalVariation: 4.0,   // Increased horizontal movement variation
            gravityFactor: 0.02,        // Simulated gravity effect
            particleTypes: [
                { 
                    name: 'bass', 
                    color: '#FF1E00', 
                    region: 'darkMid', 
                    freqMin: 20, 
                    freqMax: 250,
                    sizeMultiplier: 1.5,
                    velocityMultiplier: 0.8,
                    spawnMultiplier: 2.5  // Increased spawn rate for red particles
                },
                { 
                    name: 'lowMid', 
                    color: '#FF6C00', 
                    region: 'mid', 
                    freqMin: 250, 
                    freqMax: 500,
                    sizeMultiplier: 1.2,
                    velocityMultiplier: 1.0,
                    spawnMultiplier: 2.0  // Increased spawn rate for orange particles
                },
                { 
                    name: 'highMid', 
                    color: '#FFDE00', 
                    region: 'midBright', 
                    freqMin: 500, 
                    freqMax: 2000,
                    sizeMultiplier: 0.9,
                    velocityMultiplier: 1.2,
                    spawnMultiplier: 1.0
                },
                { 
                    name: 'treble', 
                    color: '#FFFDDD', 
                    region: 'brightest', 
                    freqMin: 2000, 
                    freqMax: 20000,
                    sizeMultiplier: 0.7,
                    velocityMultiplier: 1.5,
                    spawnMultiplier: 1.0
                }
            ]
        };
        
        // Brightness thresholds (as percentages of 255) - matching videoLayer
        this.thresholds = {
            darkMid: 0.65 * 255,    // 75%
            mid: 0.75 * 255,        // 85%
            midBright: 0.80 * 255,  // 90%
            brightest: 0.95 * 255   // 95%
        };
        
        // Store the video frame data for particle generation
        this.videoData = null;
        this.videoWidth = 0;
        this.videoHeight = 0;
    }
    
    setAudioProcessor(audioProcessor) {
        this.audioProcessor = audioProcessor;
    }
    
    setVideoData(imageData, width, height) {
        this.videoData = imageData;
        this.videoWidth = width;
        this.videoHeight = height;
    }
    
    update() {
        if (!this.isActive || !this.audioProcessor || !this.audioProcessor.isInitialized) {
            return;
        }
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = currentTime;
        
        // Generate new particles based on audio and video data
        this.generateParticles();
        
        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update position
            particle.x += particle.vx * deltaTime * 60; // Normalize to 60fps
            particle.y += particle.vy * deltaTime * 60;
            
            // Apply "gravity" - gradually slow upward movement
            particle.vy += this.config.gravityFactor * deltaTime * 60;
            
            // Update opacity (fade out)
            particle.opacity -= this.config.fadeRate * deltaTime * 60;
            
            // Remove particles that are no longer visible
            if (particle.opacity <= 0 || 
                particle.y < -particle.size || 
                particle.x < -particle.size || 
                particle.x > this.canvas.width + particle.size) {
                this.particles.splice(i, 1);
            }
        }
        
        // Limit the number of particles for performance
        if (this.particles.length > this.config.maxParticles) {
            this.particles.splice(0, this.particles.length - this.config.maxParticles);
        }
    }
    
    generateParticles() {
        if (!this.videoData || !this.audioProcessor) {
            return;
        }
        
        // Check each particle type (frequency band)
        for (const particleType of this.config.particleTypes) {
            // Get energy in this frequency band
            const energy = this.audioProcessor.getBandEnergy(particleType.freqMin, particleType.freqMax);
            
            // Apply a more sensitive response curve to energy
            // This makes particles respond to quieter sounds
            const enhancedEnergy = Math.pow(energy, 0.5); // Square root makes response more sensitive
            
            // Only generate particles if energy exceeds threshold
            if (enhancedEnergy > this.config.spawnThreshold) {
                // Number of particles to generate is proportional to energy and aggressiveness
                const spawnMultiplier = particleType.spawnMultiplier || 1.0;
                const particlesToGenerate = Math.floor(
                    enhancedEnergy * this.config.aggressiveness * 20 * spawnMultiplier * 
                    (1 + Math.random() * 0.5) // Add some randomness
                );
                
                // Generate particles
                for (let i = 0; i < particlesToGenerate; i++) {
                    this.trySpawnParticle(particleType, enhancedEnergy);
                }
            }
        }
    }
    
    trySpawnParticle(particleType, energy) {
        if (!this.videoData) return;
        
        // Try to find a suitable spawn location (up to 15 attempts - increased from 10)
        for (let attempt = 0; attempt < 15; attempt++) {
            // Pick a random location in the video frame
            const x = Math.floor(Math.random() * this.videoWidth);
            const y = Math.floor(Math.random() * this.videoHeight);
            
            // Calculate the index in the image data array
            const index = (y * this.videoWidth + x) * 4;
            
            // Calculate brightness at this pixel
            const r = this.videoData.data[index];
            const g = this.videoData.data[index + 1];
            const b = this.videoData.data[index + 2];
            const brightness = (r + g + b) / 3;
            
            // Check if this pixel is in the correct brightness region for this particle type
            let isCorrectRegion = false;
            
            switch (particleType.region) {
                case 'darkMid':
                    isCorrectRegion = brightness >= this.thresholds.darkMid && brightness < this.thresholds.mid;
                    break;
                case 'mid':
                    isCorrectRegion = brightness >= this.thresholds.mid && brightness < this.thresholds.midBright;
                    break;
                case 'midBright':
                    isCorrectRegion = brightness >= this.thresholds.midBright && brightness < this.thresholds.brightest;
                    break;
                case 'brightest':
                    isCorrectRegion = brightness >= this.thresholds.brightest;
                    break;
            }
            
            // For red and orange regions, increase the chance of spawning
            if (particleType.region === 'darkMid' || particleType.region === 'mid') {
                // Increase chance by accepting some particles even if not in exact region
                if (Math.random() < 0.3 && brightness > this.thresholds.darkMid * 0.9) {
                    isCorrectRegion = true;
                }
            }
            
            if (isCorrectRegion) {
                // Create a new particle at this location
                const baseSize = this.config.size * particleType.sizeMultiplier;
                const size = baseSize * (1 + Math.random() * this.config.sizeVariation);
                
                const baseVelocity = -this.config.velocity * particleType.velocityMultiplier; // Negative for upward movement
                const velocityY = baseVelocity * (1 + Math.random() * this.config.velocityVariation);
                const velocityX = (Math.random() - 0.5) * this.config.horizontalVariation;
                
                // Energy affects particle size and velocity
                const energyFactor = 1 + energy * 1.5; // Increased energy impact
                
                this.particles.push({
                    x: x * (this.canvas.width / this.videoWidth),
                    y: y * (this.canvas.height / this.videoHeight),
                    size: size * energyFactor,
                    color: particleType.color, // Base color
                    fillColor: `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`, // Actual pixel color
                    outlineColor: this.config.outlineColor, // Configurable outline
                    opacity: 1.0,
                    vx: velocityX,
                    vy: velocityY * energyFactor,
                    type: particleType.name
                });
                
                // Successfully spawned a particle, so exit the loop
                break;
            }
        }
    }
    
    render() {
        if (!this.isActive || this.particles.length === 0) {
            return;
        }
        
        const ctx = this.ctx;
        
        // Save current context state
        ctx.save();
        
        // Set blend mode
        ctx.globalCompositeOperation = this.config.blendMode;
        
        // Draw each particle
        for (const particle of this.particles) {
            ctx.globalAlpha = particle.opacity;
            ctx.fillStyle = particle.fillColor;
            ctx.strokeStyle = particle.outlineColor;
            ctx.lineWidth = 2;
            
            // Draw a circle for the particle with outline
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            if (this.config.showFill) ctx.fill();
            if (this.config.showOutline) ctx.stroke();
            
            // Optional: Add a glow effect for brighter particles
            if (particle.type === 'highMid' || particle.type === 'treble') {
                ctx.globalAlpha = particle.opacity * 0.5;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Add extra glow for red and orange particles
            if (particle.type === 'bass' || particle.type === 'lowMid') {
                ctx.globalAlpha = particle.opacity * 0.7;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Restore context state
        ctx.restore();
    }
    
    // Method to update configuration
    updateConfig(newConfig) {
        // Update particle type spawn multipliers from band controls
        if (newConfig.particleTypes) {
            // Check if this is a partial update (updateOnly flag)
            const isPartialUpdate = newConfig.particleTypes.length === 1 && 
                                   newConfig.particleTypes[0].updateOnly === true;
            
            if (isPartialUpdate) {
                // Find the particle type by name and update only its properties
                const updateType = newConfig.particleTypes[0];
                const existingType = this.config.particleTypes.find(type => type.name === updateType.name);
                
                if (existingType) {
                    // Update only the specified properties
                    if (updateType.spawnMultiplier !== undefined) {
                        existingType.spawnMultiplier = updateType.spawnMultiplier;
                    }
                    // Add other properties as needed
                }
            } else {
                // Full replacement of particleTypes array
                this.config.particleTypes = newConfig.particleTypes;
            }
            
            // Remove the updateOnly flag from the config
            this.config.particleTypes.forEach(type => {
                delete type.updateOnly;
            });
        }
        
        // Update thresholds if provided
        if (newConfig.thresholds) {
            // Check if this is a partial update
            if (newConfig.thresholds.updateOnly === true) {
                // Update only the specified thresholds
                if (newConfig.thresholds.darkMid !== undefined) {
                    this.thresholds.darkMid = newConfig.thresholds.darkMid;
                }
                if (newConfig.thresholds.mid !== undefined) {
                    this.thresholds.mid = newConfig.thresholds.mid;
                }
                if (newConfig.thresholds.midBright !== undefined) {
                    this.thresholds.midBright = newConfig.thresholds.midBright;
                }
                if (newConfig.thresholds.brightest !== undefined) {
                    this.thresholds.brightest = newConfig.thresholds.brightest;
                }
            } else {
                // Full replacement of thresholds object
                this.thresholds = newConfig.thresholds;
            }
            
            // Remove the updateOnly flag
            delete this.thresholds.updateOnly;
        }
        
        // Update appearance controls
        this.config.showFill = newConfig.showFill ?? this.config.showFill;
        this.config.showOutline = newConfig.showOutline ?? this.config.showOutline;
        this.config.outlineColor = newConfig.outlineColor || this.config.outlineColor;
        
        // Update spawn threshold if provided
        if (newConfig.spawnThreshold !== undefined) {
            this.config.spawnThreshold = newConfig.spawnThreshold;
        }
        
        // Update remaining config properties
        Object.assign(this.config, newConfig);
    }
}
