// Global configuration
const config = {
    // Audio frequency bands
    frequencyBands: {
        bass: { min: 20, max: 250, color: '#ff1e00' },
        lowMid: { min: 250, max: 500, color: '#ff6c00' },
        highMid: { min: 500, max: 2000, color: '#ffde00' },
        treble: { min: 2000, max: 20000, color: '#fffddd' }
    },
    
    // Layer toggles
    layers: {
        video: true,
        particles: false,
        waveform: false,
        triangles: false,
        surprise: false,
        mandala: false
    },
    
    // Video layer settings
    video: {
        flameIntensity: 0.98,
        brightness: 0,
        contrast: 0,
        trail: {
            enabled: false,
            frames: 10,
            opacity: 0.7
        }
    },
    
    // Waveform layer settings
    waveform: {
        width: 10,
        outlineColor: '#806400',
        fillColor: '#9e0000',
        blendMode: 'color-dodge',
        sensitivity: {
            bass: 1.0,
            lowMid: 1.0,
            highMid: 1.0,
            treble: 1.0
        }
    },
    
    // Particle layer settings
    particles: {
        size: 5,
        aggressiveness: 0.7,
        fadeRate: 0.02,
        velocity: 2,
        maxParticles: 1000,  // Increased from 500
        blendMode: 'screen'
    },
    
    // Animation durations
    animation: {
        normal: 1000, // seconds
        surprise: 2 // seconds
    }
};

// Main app class
class FireDancerApp {
    constructor() {
        this.videoLayer = null;
        this.particleLayer = null;
        this.waveformLayer = null;
        this.trianglesLayer = null;
        this.surpriseLayer = null;
        this.mandalaLayer = null;
        this.audioProcessor = null;
        this.audioInitialized = false;
        this.isFullscreen = false;
        
        this.canvas = document.getElementById('output-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container = document.getElementById('video-container');
        
        this.setupEventListeners();
        this.initializeLayers();
        this.resizeCanvas();
        this.startAnimationLoop();
    }
    
    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Handle fullscreen change events
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());
        
        // Global audio sensitivity controls
        const bassSensitivity = document.getElementById('bass-sensitivity');
        if (bassSensitivity) {
            bassSensitivity.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.audioProcessor) {
                    this.audioProcessor.updateSensitivity('bass', value);
                }
                document.getElementById('bass-sensitivity-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        const lowMidSensitivity = document.getElementById('lowmid-sensitivity');
        if (lowMidSensitivity) {
            lowMidSensitivity.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.audioProcessor) {
                    this.audioProcessor.updateSensitivity('lowMid', value);
                }
                document.getElementById('lowmid-sensitivity-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        const highMidSensitivity = document.getElementById('highmid-sensitivity');
        if (highMidSensitivity) {
            highMidSensitivity.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.audioProcessor) {
                    this.audioProcessor.updateSensitivity('highMid', value);
                }
                document.getElementById('highmid-sensitivity-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        const trebleSensitivity = document.getElementById('treble-sensitivity');
        if (trebleSensitivity) {
            trebleSensitivity.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.audioProcessor) {
                    this.audioProcessor.updateSensitivity('treble', value);
                }
                document.getElementById('treble-sensitivity-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        // Layer toggle controls
        document.getElementById('video-layer-toggle').addEventListener('change', (e) => {
            config.layers.video = e.target.checked;
        });
        
        document.getElementById('particle-toggle').addEventListener('change', (e) => {
            config.layers.particles = e.target.checked;
            
            // Initialize audio processor if particles are enabled and not already initialized
            if (config.layers.particles && this.audioProcessor && !this.audioInitialized) {
                this.audioProcessor.initialize().then(() => {
                    this.audioInitialized = true;
                    console.log("Audio initialized successfully");
                    
                    // Update particle layer active state
                    if (this.particleLayer) {
                        this.particleLayer.isActive = true;
                    }
                }).catch(error => {
                    console.error("Failed to initialize audio:", error);
                });
            } else if (config.layers.particles && this.audioInitialized) {
                // Just update the active state if already initialized
                if (this.particleLayer) {
                    this.particleLayer.isActive = true;
                }
            } else {
                // Particles are being turned off
                if (this.particleLayer) {
                    this.particleLayer.isActive = false;
                }
            }
            
            // Enable/disable particle controls based on toggle
            const particleControls = document.getElementById('particle-controls');
            if (particleControls) {
                particleControls.style.display = e.target.checked ? 'block' : 'none';
            }
        });
        
        document.getElementById('waveform-toggle').addEventListener('change', (e) => {
            config.layers.waveform = e.target.checked;
            
            // Initialize audio processor if waveform is enabled and not already initialized
            if (config.layers.waveform && this.audioProcessor && !this.audioInitialized) {
                this.audioProcessor.initialize().then(() => {
                    this.audioInitialized = true;
                    console.log("Audio initialized successfully");
                    
                    // Update waveform layer active state
                    if (this.waveformLayer) {
                        this.waveformLayer.isActive = true;
                    }
                }).catch(error => {
                    console.error("Failed to initialize audio:", error);
                });
            } else if (config.layers.waveform && this.audioInitialized) {
                // Just update the active state if already initialized
                if (this.waveformLayer) {
                    this.waveformLayer.isActive = true;
                }
            } else {
                // Waveform is being turned off
                if (this.waveformLayer) {
                    this.waveformLayer.isActive = false;
                }
            }
            
            // Enable/disable waveform controls based on toggle
            const waveformControls = document.getElementById('waveform-controls');
            if (waveformControls) {
                waveformControls.style.display = e.target.checked ? 'block' : 'none';
            }
        });
        
        document.getElementById('triangles-toggle').addEventListener('change', (e) => {
            config.layers.triangles = e.target.checked;
            
            // Initialize audio processor if triangles are enabled and not already initialized
            if (config.layers.triangles && this.audioProcessor && !this.audioInitialized) {
                this.audioProcessor.initialize().then(() => {
                    this.audioInitialized = true;
                    console.log("Audio initialized successfully");
                    
                    // Update triangles layer active state
                    if (this.trianglesLayer) {
                        this.trianglesLayer.isActive = true;
                    }
                }).catch(error => {
                    console.error("Failed to initialize audio:", error);
                });
            } else if (config.layers.triangles && this.audioInitialized) {
                // Just update the active state if already initialized
                if (this.trianglesLayer) {
                    this.trianglesLayer.isActive = true;
                }
            } else {
                // Triangles are being turned off
                if (this.trianglesLayer) {
                    this.trianglesLayer.isActive = false;
                }
            }
            
            // Enable/disable triangle controls based on toggle
            const triangleControls = document.getElementById('triangle-controls');
            if (triangleControls) {
                triangleControls.style.display = e.target.checked ? 'block' : 'none';
            }
        });
        
        // Mandala layer toggle
        document.getElementById('mandala-toggle').addEventListener('change', (e) => {
            config.layers.mandala = e.target.checked;
            
            // Initialize audio processor if mandala is enabled and not already initialized
            if (config.layers.mandala && this.audioProcessor && !this.audioInitialized) {
                this.audioProcessor.initialize().then(() => {
                    this.audioInitialized = true;
                    console.log("Audio initialized successfully");
                    
                    // Update mandala layer active state
                    if (this.mandalaLayer) {
                        this.mandalaLayer.isActive = true;
                    }
                }).catch(error => {
                    console.error("Failed to initialize audio:", error);
                });
            } else if (config.layers.mandala && this.audioInitialized) {
                // Just update the active state if already initialized
                if (this.mandalaLayer) {
                    this.mandalaLayer.isActive = true;
                }
            } else {
                // Mandala is being turned off
                if (this.mandalaLayer) {
                    this.mandalaLayer.isActive = false;
                }
            }
            
            // Enable/disable mandala controls based on toggle
            const mandalaControls = document.getElementById('mandala-controls');
            if (mandalaControls) {
                mandalaControls.style.display = e.target.checked ? 'block' : 'none';
            }
        });
        
        // Mandala controls
        const mandalaComplexityControl = document.getElementById('mandala-complexity');
        if (mandalaComplexityControl) {
            mandalaComplexityControl.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                if (this.mandalaLayer) {
                    this.mandalaLayer.updateConfig({ complexity: value });
                }
                document.getElementById('mandala-complexity-value').textContent = value;
            });
        }
        
        const mandalaLayersControl = document.getElementById('mandala-layers');
        if (mandalaLayersControl) {
            mandalaLayersControl.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                if (this.mandalaLayer) {
                    this.mandalaLayer.updateConfig({ layers: value });
                }
                document.getElementById('mandala-layers-value').textContent = value;
            });
        }
        
        const mandalaSizeControl = document.getElementById('mandala-size');
        if (mandalaSizeControl) {
            mandalaSizeControl.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.mandalaLayer) {
                    this.mandalaLayer.updateConfig({ baseSize: value });
                }
                document.getElementById('mandala-size-value').textContent = Math.round(value * 100);
            });
        }
        
        const mandalaSpeedControl = document.getElementById('mandala-speed');
        if (mandalaSpeedControl) {
            mandalaSpeedControl.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.mandalaLayer) {
                    this.mandalaLayer.updateConfig({ animationSpeed: value });
                }
                document.getElementById('mandala-speed-value').textContent = value.toFixed(3);
            });
        }
        
        const mandalaDepthControl = document.getElementById('mandala-depth');
        if (mandalaDepthControl) {
            mandalaDepthControl.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                if (this.mandalaLayer) {
                    this.mandalaLayer.updateConfig({ fractalDepth: value });
                }
                document.getElementById('mandala-depth-value').textContent = value;
            });
        }
        
        const mandalaFractalScaleControl = document.getElementById('mandala-fractal-scale');
        if (mandalaFractalScaleControl) {
            mandalaFractalScaleControl.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.mandalaLayer) {
                    this.mandalaLayer.updateConfig({ fractalScale: value });
                }
                document.getElementById('mandala-fractal-scale-value').textContent = value.toFixed(2);
            });
        }
        
        const mandalaBlendModeControl = document.getElementById('mandala-blend-mode');
        if (mandalaBlendModeControl) {
            mandalaBlendModeControl.addEventListener('change', (e) => {
                if (this.mandalaLayer) {
                    this.mandalaLayer.updateConfig({ blendMode: e.target.value });
                }
            });
        }
        
        // Mandala audio sensitivity controls
        const mandalaBassSensitivity = document.getElementById('mandala-bass-sensitivity');
        if (mandalaBassSensitivity) {
            mandalaBassSensitivity.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.mandalaLayer) {
                    this.mandalaLayer.updateSensitivity('bass', value);
                }
                document.getElementById('mandala-bass-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        const mandalaLowMidSensitivity = document.getElementById('mandala-lowmid-sensitivity');
        if (mandalaLowMidSensitivity) {
            mandalaLowMidSensitivity.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.mandalaLayer) {
                    this.mandalaLayer.updateSensitivity('lowMid', value);
                }
                document.getElementById('mandala-lowmid-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        const mandalaHighMidSensitivity = document.getElementById('mandala-highmid-sensitivity');
        if (mandalaHighMidSensitivity) {
            mandalaHighMidSensitivity.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.mandalaLayer) {
                    this.mandalaLayer.updateSensitivity('highMid', value);
                }
                document.getElementById('mandala-highmid-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        const mandalaTrebleSensitivity = document.getElementById('mandala-treble-sensitivity');
        if (mandalaTrebleSensitivity) {
            mandalaTrebleSensitivity.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.mandalaLayer) {
                    this.mandalaLayer.updateSensitivity('treble', value);
                }
                document.getElementById('mandala-treble-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        // Surprise layer toggle
        document.getElementById('surprise-toggle').addEventListener('change', (e) => {
            config.layers.surprise = e.target.checked;
            
            // Enable/disable surprise controls based on toggle
            const surpriseControls = document.getElementById('surprise-controls');
            if (surpriseControls) {
                surpriseControls.style.display = e.target.checked ? 'block' : 'none';
            }
        });
        
        // Surprise image uploads
        document.getElementById('surprise1-image-upload').addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                if (file.type !== 'image/png') {
                    alert('Please upload a PNG image');
                    return;
                }
                const imageUrl = URL.createObjectURL(file);
                if (this.surpriseLayer) {
                    this.surpriseLayer.images[0].src = imageUrl;
                }
            }
        });

        document.getElementById('surprise2-image-upload').addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                if (file.type !== 'image/png') {
                    alert('Please upload a PNG image');
                    return;
                }
                const imageUrl = URL.createObjectURL(file);
                if (this.surpriseLayer) {
                    this.surpriseLayer.images[1].src = imageUrl;
                }
            }
        });

        // Image 1 controls
        document.getElementById('surprise1-duration').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (this.surpriseLayer) {
                this.surpriseLayer.setDuration(0, value * 1000);
            }
            document.getElementById('surprise1-duration-value').textContent = value;
        });

        document.getElementById('surprise1-cooldown').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (this.surpriseLayer) {
                this.surpriseLayer.setCooldown(0, value * 1000);
            }
            document.getElementById('surprise1-cooldown-value').textContent = value;
        });

        // Image 2 controls
        document.getElementById('surprise2-duration').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (this.surpriseLayer) {
                this.surpriseLayer.setDuration(1, value * 1000);
            }
            document.getElementById('surprise2-duration-value').textContent = value;
        });

        document.getElementById('surprise2-cooldown').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (this.surpriseLayer) {
                this.surpriseLayer.setCooldown(1, value * 1000);
            }
            document.getElementById('surprise2-cooldown-value').textContent = value;
        });
        
        // Surprise start size control
        document.getElementById('surprise-start-size').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            
            if (this.surpriseLayer) {
                this.surpriseLayer.setStartSize(value);
            }
            
            document.getElementById('surprise-start-size-value').textContent = value.toFixed(2);
        });
        
        // Surprise expansion factor control
        document.getElementById('surprise-expansion').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            
            if (this.surpriseLayer) {
                this.surpriseLayer.setExpansionFactor(value);
            }
            
            document.getElementById('surprise-expansion-value').textContent = value;
        });
        
        // Surprise trigger button
        document.getElementById('surprise-btn').addEventListener('click', () => {
            if (this.surpriseLayer) {
                this.surpriseLayer.trigger();
            }
        });
        
        // Fullscreen toggle
        document.getElementById('fullscreen-btn').addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // Flame intensity slider
        document.getElementById('flame-intensity').addEventListener('input', (e) => {
            config.video.flameIntensity = parseFloat(e.target.value);
            document.getElementById('intensity-value').textContent = Math.round(config.video.flameIntensity * 100) + '%';
        });
        
        // Brightness slider
        document.getElementById('brightness-control').addEventListener('input', (e) => {
            config.video.brightness = parseFloat(e.target.value);
            document.getElementById('brightness-value').textContent = config.video.brightness > 0 ? 
                `+${config.video.brightness}` : config.video.brightness;
        });
        
        // Contrast slider
        document.getElementById('contrast-control').addEventListener('input', (e) => {
            config.video.contrast = parseFloat(e.target.value);
            document.getElementById('contrast-value').textContent = config.video.contrast > 0 ? 
                `+${config.video.contrast}` : config.video.contrast;
        });
        
        // Trail effect toggle
        document.getElementById('trail-effect-toggle').addEventListener('change', (e) => {
            config.video.trail.enabled = e.target.checked;
            if (this.videoLayer) {
                this.videoLayer.setTrailEnabled(e.target.checked);
            }
            
            // Enable/disable trail controls based on toggle
            const trailControls = document.getElementById('trail-controls');
            if (trailControls) {
                trailControls.style.display = e.target.checked ? 'block' : 'none';
            }
        });
        
        // Trail frames slider
        document.getElementById('trail-frames').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            config.video.trail.frames = value;
            if (this.videoLayer) {
                this.videoLayer.setMaxTrailFrames(value);
            }
            document.getElementById('trail-frames-value').textContent = value;
        });
        
        // Trail opacity slider
        document.getElementById('trail-opacity').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            config.video.trail.opacity = value;
            if (this.videoLayer) {
                this.videoLayer.setTrailOpacity(value);
            }
            document.getElementById('trail-opacity-value').textContent = Math.round(value * 100) + '%';
        });
        
        // Waveform controls
        const waveformWidthControl = document.getElementById('waveform-width');
        if (waveformWidthControl) {
            waveformWidthControl.addEventListener('input', (e) => {
                config.waveform.width = parseFloat(e.target.value);
                if (this.waveformLayer) {
                    this.waveformLayer.updateConfig({ width: config.waveform.width });
                }
                document.getElementById('waveform-width-value').textContent = config.waveform.width;
            });
        }
        
        // Waveform sensitivity controls
        const waveformBassSensitivity = document.getElementById('waveform-bass-sensitivity');
        if (waveformBassSensitivity) {
            waveformBassSensitivity.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                config.waveform.sensitivity.bass = value;
                if (this.waveformLayer) {
                    this.waveformLayer.updateSensitivity('bass', value);
                }
                document.getElementById('waveform-bass-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        const waveformLowMidSensitivity = document.getElementById('waveform-lowmid-sensitivity');
        if (waveformLowMidSensitivity) {
            waveformLowMidSensitivity.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                config.waveform.sensitivity.lowMid = value;
                if (this.waveformLayer) {
                    this.waveformLayer.updateSensitivity('lowMid', value);
                }
                document.getElementById('waveform-lowmid-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        const waveformHighMidSensitivity = document.getElementById('waveform-highmid-sensitivity');
        if (waveformHighMidSensitivity) {
            waveformHighMidSensitivity.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                config.waveform.sensitivity.highMid = value;
                if (this.waveformLayer) {
                    this.waveformLayer.updateSensitivity('highMid', value);
                }
                document.getElementById('waveform-highmid-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        const waveformTrebleSensitivity = document.getElementById('waveform-treble-sensitivity');
        if (waveformTrebleSensitivity) {
            waveformTrebleSensitivity.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                config.waveform.sensitivity.treble = value;
                if (this.waveformLayer) {
                    this.waveformLayer.updateSensitivity('treble', value);
                }
                document.getElementById('waveform-treble-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        const waveformBlendMode = document.getElementById('waveform-blend-mode');
        if (waveformBlendMode) {
            waveformBlendMode.addEventListener('change', (e) => {
                config.waveform.blendMode = e.target.value;
                if (this.waveformLayer) {
                    this.waveformLayer.updateConfig({ blendMode: config.waveform.blendMode });
                }
            });
        }
        
        const waveformOutlineColor = document.getElementById('waveform-outline-color');
        if (waveformOutlineColor) {
            waveformOutlineColor.addEventListener('input', (e) => {
                config.waveform.outlineColor = e.target.value;
                if (this.waveformLayer) {
                    this.waveformLayer.updateConfig({ outlineColor: config.waveform.outlineColor });
                }
            });
        }
        
        const waveformFillColor = document.getElementById('waveform-fill-color');
        if (waveformFillColor) {
            waveformFillColor.addEventListener('input', (e) => {
                // Get the color value and add alpha
                const color = e.target.value;
                const alpha = parseFloat(document.getElementById('waveform-fill-opacity').value);
                config.waveform.fillColor = this.hexToRgba(color, alpha);
                
                if (this.waveformLayer) {
                    this.waveformLayer.updateConfig({ fillColor: config.waveform.fillColor });
                }
            });
        }
        
        const waveformFillOpacity = document.getElementById('waveform-fill-opacity');
        if (waveformFillOpacity) {
            waveformFillOpacity.addEventListener('input', (e) => {
                const alpha = parseFloat(e.target.value);
                const color = document.getElementById('waveform-fill-color').value;
                config.waveform.fillColor = this.hexToRgba(color, alpha);
                
                if (this.waveformLayer) {
                    this.waveformLayer.updateConfig({ fillColor: config.waveform.fillColor });
                }
                
                document.getElementById('waveform-opacity-value').textContent = Math.round(alpha * 100)  + '%';
            });
        }
        
        // Particle controls
        const particleSizeControl = document.getElementById('particle-size');
        if (particleSizeControl) {
            particleSizeControl.addEventListener('input', (e) => {
                config.particles.size = parseFloat(e.target.value);
                if (this.particleLayer) {
                    this.particleLayer.updateConfig({ size: config.particles.size });
                }
                document.getElementById('particle-size-value').textContent = config.particles.size;
            });
        }
        
        const particleAggressivenessControl = document.getElementById('particle-aggressiveness');
        if (particleAggressivenessControl) {
            particleAggressivenessControl.addEventListener('input', (e) => {
                config.particles.aggressiveness = parseFloat(e.target.value);
                if (this.particleLayer) {
                    this.particleLayer.updateConfig({ aggressiveness: config.particles.aggressiveness });
                }
                document.getElementById('particle-aggressiveness-value').textContent = 
                    Math.round(config.particles.aggressiveness * 100) + '%';
            });
        }
        
        const particleFadeRateControl = document.getElementById('particle-fade-rate');
        if (particleFadeRateControl) {
            particleFadeRateControl.addEventListener('input', (e) => {
                config.particles.fadeRate = parseFloat(e.target.value);
                if (this.particleLayer) {
                    this.particleLayer.updateConfig({ fadeRate: config.particles.fadeRate });
                }
                document.getElementById('particle-fade-rate-value').textContent = 
                    Math.round(config.particles.fadeRate * 100) + '%';
            });
        }
        
        const particleVelocityControl = document.getElementById('particle-velocity');
        if (particleVelocityControl) {
            particleVelocityControl.addEventListener('input', (e) => {
                config.particles.velocity = parseFloat(e.target.value);
                if (this.particleLayer) {
                    this.particleLayer.updateConfig({ velocity: config.particles.velocity });
                }
                document.getElementById('particle-velocity-value').textContent = config.particles.velocity;
            });
        }
        
        const particleMaxControl = document.getElementById('particle-max');
        if (particleMaxControl) {
            particleMaxControl.addEventListener('input', (e) => {
                config.particles.maxParticles = parseInt(e.target.value);
                if (this.particleLayer) {
                    this.particleLayer.updateConfig({ maxParticles: config.particles.maxParticles });
                }
                document.getElementById('particle-max-value').textContent = config.particles.maxParticles;
            });
        }
        
        const particleBlendMode = document.getElementById('particle-blend-mode');
        if (particleBlendMode) {
            particleBlendMode.addEventListener('change', (e) => {
                config.particles.blendMode = e.target.value;
                if (this.particleLayer) {
                    this.particleLayer.updateConfig({ blendMode: config.particles.blendMode });
                }
            });
        }
        
        // Particle fill and outline toggles
        const particleFillToggle = document.getElementById('particle-fill-toggle');
        if (particleFillToggle) {
            particleFillToggle.addEventListener('change', (e) => {
                if (this.particleLayer) {
                    this.particleLayer.updateConfig({ showFill: e.target.checked });
                }
            });
        }
        
        const particleOutlineToggle = document.getElementById('particle-outline-toggle');
        if (particleOutlineToggle) {
            particleOutlineToggle.addEventListener('change', (e) => {
                if (this.particleLayer) {
                    this.particleLayer.updateConfig({ showOutline: e.target.checked });
                }
            });
        }
        
        // Particle outline color
        const particleOutlineColor = document.getElementById('particle-outline-color');
        if (particleOutlineColor) {
            particleOutlineColor.addEventListener('input', (e) => {
                if (this.particleLayer) {
                    this.particleLayer.updateConfig({ outlineColor: e.target.value });
                }
            });
        }
        
        // Particle band controls
        const bassParticles = document.getElementById('bass-particles');
        if (bassParticles) {
            bassParticles.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.particleLayer) {
                    this.particleLayer.updateConfig({ 
                        particleTypes: [
                            { name: 'bass', spawnMultiplier: value, updateOnly: true }
                        ]
                    });
                }
                document.getElementById('bass-particles-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        const lowMidParticles = document.getElementById('lowmid-particles');
        if (lowMidParticles) {
            lowMidParticles.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.particleLayer) {
                    this.particleLayer.updateConfig({ 
                        particleTypes: [
                            { name: 'lowMid', spawnMultiplier: value, updateOnly: true }
                        ]
                    });
                }
                document.getElementById('lowmid-particles-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        const highMidParticles = document.getElementById('highmid-particles');
        if (highMidParticles) {
            highMidParticles.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.particleLayer) {
                    this.particleLayer.updateConfig({ 
                        particleTypes: [
                            { name: 'highMid', spawnMultiplier: value, updateOnly: true }
                        ]
                    });
                }
                document.getElementById('highmid-particles-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        const trebleParticles = document.getElementById('treble-particles');
        if (trebleParticles) {
            trebleParticles.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.particleLayer) {
                    this.particleLayer.updateConfig({ 
                        particleTypes: [
                            { name: 'treble', spawnMultiplier: value, updateOnly: true }
                        ]
                    });
                }
                document.getElementById('treble-particles-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        // Audio spawn threshold control
        const spawnThresholdControl = document.getElementById('spawn-threshold');
        if (spawnThresholdControl) {
            spawnThresholdControl.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.particleLayer) {
                    this.particleLayer.updateConfig({ spawnThreshold: value });
                }
                document.getElementById('spawn-threshold-value').textContent = value.toFixed(3);
            });
        }
        
        // Brightness threshold controls
        const darkMidThreshold = document.getElementById('darkmid-threshold');
        if (darkMidThreshold) {
            darkMidThreshold.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.particleLayer) {
                    this.particleLayer.updateConfig({ 
                        thresholds: { darkMid: value * 255, updateOnly: true }
                    });
                }
                document.getElementById('darkmid-threshold-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        const midThreshold = document.getElementById('mid-threshold');
        if (midThreshold) {
            midThreshold.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.particleLayer) {
                    this.particleLayer.updateConfig({ 
                        thresholds: { mid: value * 255, updateOnly: true }
                    });
                }
                document.getElementById('mid-threshold-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        const midBrightThreshold = document.getElementById('midbright-threshold');
        if (midBrightThreshold) {
            midBrightThreshold.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.particleLayer) {
                    this.particleLayer.updateConfig({ 
                        thresholds: { midBright: value * 255, updateOnly: true }
                    });
                }
                document.getElementById('midbright-threshold-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        const brightestThreshold = document.getElementById('brightest-threshold');
        if (brightestThreshold) {
            brightestThreshold.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.particleLayer) {
                    this.particleLayer.updateConfig({ 
                        thresholds: { brightest: value * 255, updateOnly: true }
                    });
                }
                document.getElementById('brightest-threshold-value').textContent = Math.round(value * 100) + '%';
            });
        }
        
        // Triangle controls
        const triangleSizeControl = document.getElementById('triangle-size');
        if (triangleSizeControl) {
            triangleSizeControl.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.trianglesLayer) {
                    this.trianglesLayer.updateConfig({ size: value });
                }
                document.getElementById('triangle-size-value').textContent = value;
            });
        }
        
        const triangleOutlineWidthControl = document.getElementById('triangle-outline-width');
        if (triangleOutlineWidthControl) {
            triangleOutlineWidthControl.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.trianglesLayer) {
                    this.trianglesLayer.updateConfig({ outlineWidth: value });
                }
                document.getElementById('triangle-outline-width-value').textContent = value;
            });
        }
        
        const triangleExpansionControl = document.getElementById('triangle-expansion');
        if (triangleExpansionControl) {
            triangleExpansionControl.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.trianglesLayer) {
                    this.trianglesLayer.updateConfig({ expansionRange: value });
                }
                document.getElementById('triangle-expansion-value').textContent = value;
            });
        }
        
        const triangleRotationControl = document.getElementById('triangle-rotation');
        if (triangleRotationControl) {
            triangleRotationControl.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.trianglesLayer) {
                    this.trianglesLayer.updateConfig({ rotationSpeed: value });
                }
                document.getElementById('triangle-rotation-value').textContent = value;
            });
        }
        
        const triangleOpacityControl = document.getElementById('triangle-opacity');
        if (triangleOpacityControl) {
            triangleOpacityControl.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (this.trianglesLayer) {
                    this.trianglesLayer.updateConfig({ opacity: value });
                }
                document.getElementById('triangle-opacity-value').textContent = Math.round(value * 100);
            });
        }
        
        const triangleBlendModeControl = document.getElementById('triangle-blend-mode');
        if (triangleBlendModeControl) {
            triangleBlendModeControl.addEventListener('change', (e) => {
                if (this.trianglesLayer) {
                    this.trianglesLayer.updateConfig({ blendMode: e.target.value });
                }
            });
        }
        
        // Triangle fill color controls
        const bassTriangleColorControl = document.getElementById('bass-triangle-color');
        if (bassTriangleColorControl) {
            bassTriangleColorControl.addEventListener('input', (e) => {
                if (this.trianglesLayer) {
                    this.trianglesLayer.updateConfig({ 
                        triangleColors: [e.target.value, null, null, null]
                    });
                }
            });
        }
        
        const lowMidTriangleColorControl = document.getElementById('lowmid-triangle-color');
        if (lowMidTriangleColorControl) {
            lowMidTriangleColorControl.addEventListener('input', (e) => {
                if (this.trianglesLayer) {
                    this.trianglesLayer.updateConfig({ 
                        triangleColors: [null, e.target.value, null, null]
                    });
                }
            });
        }
        
        const highMidTriangleColorControl = document.getElementById('highmid-triangle-color');
        if (highMidTriangleColorControl) {
            highMidTriangleColorControl.addEventListener('input', (e) => {
                if (this.trianglesLayer) {
                    this.trianglesLayer.updateConfig({ 
                        triangleColors: [null, null, e.target.value, null]
                    });
                }
            });
        }
        
        const trebleTriangleColorControl = document.getElementById('treble-triangle-color');
        if (trebleTriangleColorControl) {
            trebleTriangleColorControl.addEventListener('input', (e) => {
                if (this.trianglesLayer) {
                    this.trianglesLayer.updateConfig({ 
                        triangleColors: [null, null, null, e.target.value]
                    });
                }
            });
        }
        
        // Triangle outline color controls
        const bassTriangleOutlineControl = document.getElementById('bass-triangle-outline');
        if (bassTriangleOutlineControl) {
            bassTriangleOutlineControl.addEventListener('input', (e) => {
                if (this.trianglesLayer) {
                    this.trianglesLayer.updateConfig({ 
                        outlineColors: [e.target.value, null, null, null]
                    });
                }
            });
        }
        
        const lowMidTriangleOutlineControl = document.getElementById('lowmid-triangle-outline');
        if (lowMidTriangleOutlineControl) {
            lowMidTriangleOutlineControl.addEventListener('input', (e) => {
                if (this.trianglesLayer) {
                    this.trianglesLayer.updateConfig({ 
                        outlineColors: [null, e.target.value, null, null]
                    });
                }
            });
        }
        
        const highMidTriangleOutlineControl = document.getElementById('highmid-triangle-outline');
        if (highMidTriangleOutlineControl) {
            highMidTriangleOutlineControl.addEventListener('input', (e) => {
                if (this.trianglesLayer) {
                    this.trianglesLayer.updateConfig({ 
                        outlineColors: [null, null, e.target.value, null]
                    });
                }
            });
        }
        
        const trebleTriangleOutlineControl = document.getElementById('treble-triangle-outline');
        if (trebleTriangleOutlineControl) {
            trebleTriangleOutlineControl.addEventListener('input', (e) => {
                if (this.trianglesLayer) {
                    this.trianglesLayer.updateConfig({ 
                        outlineColors: [null, null, null, e.target.value]
                    });
                }
            });
        }
    }
    
    hexToRgba(hex, alpha) {
        // Remove # if present
        hex = hex.replace('#', '');
        
        // Parse the hex values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    initializeLayers() {
        // Initialize audio processor
        this.audioProcessor = new AudioProcessor();
        
        // Initialize video layer (only active layer for now)
        this.videoLayer = new VideoLayer(this.canvas, this.ctx);
        
        // Initialize trail effect settings from config
        this.videoLayer.setTrailEnabled(config.video.trail.enabled);
        this.videoLayer.setMaxTrailFrames(config.video.trail.frames);
        this.videoLayer.setTrailOpacity(config.video.trail.opacity);
        
        // Initialize waveform layer
        this.waveformLayer = new WaveformLayer(this.canvas, this.ctx);
        this.waveformLayer.setAudioProcessor(this.audioProcessor);
        
        // Initialize particle layer
        this.particleLayer = new ParticleLayer(this.canvas, this.ctx);
        this.particleLayer.setAudioProcessor(this.audioProcessor);
        
        // Initialize triangles layer
        this.trianglesLayer = new TrianglesLayer(this.canvas, this.ctx);
        this.trianglesLayer.setAudioProcessor(this.audioProcessor);
        
        // Initialize surprise layer
        this.surpriseLayer = new SurpriseLayer(this.canvas, this.ctx);
        
        // Initialize mandala layer
        this.mandalaLayer = new MandalaLayer(this.canvas, this.ctx);
        this.mandalaLayer.setAudioProcessor(this.audioProcessor);
    }
    
    toggleFullscreen() {
        if (!this.isFullscreen) {
            // Enter fullscreen
            if (this.container.requestFullscreen) {
                this.container.requestFullscreen();
            } else if (this.container.mozRequestFullScreen) { // Firefox
                this.container.mozRequestFullScreen();
            } else if (this.container.webkitRequestFullscreen) { // Chrome, Safari and Opera
                this.container.webkitRequestFullscreen();
            } else if (this.container.msRequestFullscreen) { // IE/Edge
                this.container.msRequestFullscreen();
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) { // Firefox
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { // IE/Edge
                document.msExitFullscreen();
            }
        }
    }
    
    handleFullscreenChange() {
        // Check if we're in fullscreen mode
        this.isFullscreen = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement || 
                           document.msFullscreenElement;
        
        // Update button text
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.textContent = this.isFullscreen ? 'Exit Fullscreen' : 'Toggle Fullscreen';
        }
        
        // Resize canvas to fit new dimensions
        this.resizeCanvas();
    }
    
    resizeCanvas() {
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
    }
    
    startAnimationLoop() {
        const animate = () => {
            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Update and render active layers
            if (config.layers.video && this.videoLayer) {
                // Make sure trail settings are up to date
                this.videoLayer.setTrailEnabled(config.video.trail.enabled);
                this.videoLayer.setMaxTrailFrames(config.video.trail.frames);
                this.videoLayer.setTrailOpacity(config.video.trail.opacity);
                
                this.videoLayer.update();
                this.videoLayer.render();
                
                // If particles are active, pass the video data to the particle layer
                if (config.layers.particles && this.particleLayer && this.videoLayer.lastImageData) {
                    this.particleLayer.setVideoData(
                        this.videoLayer.lastImageData, 
                        this.canvas.width, 
                        this.canvas.height
                    );
                }
            }
            
            if (config.layers.waveform && this.waveformLayer) {
                this.waveformLayer.update();
                this.waveformLayer.render();
            }
            
            if (config.layers.particles && this.particleLayer) {
                this.particleLayer.update();
                this.particleLayer.render();
            }
            
            if (config.layers.triangles && this.trianglesLayer) {
                this.trianglesLayer.update();
                this.trianglesLayer.render();
            }
            
            if (config.layers.mandala && this.mandalaLayer) {
                this.mandalaLayer.update();
                this.mandalaLayer.render();
            }
            
            // Surprise layer renders on top when triggered
            if (this.surpriseLayer) {
                this.surpriseLayer.update();
                this.surpriseLayer.render();
            }
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
}

// Initialize the app when the window loads
window.addEventListener('load', () => {
    const app = new FireDancerApp();
});
