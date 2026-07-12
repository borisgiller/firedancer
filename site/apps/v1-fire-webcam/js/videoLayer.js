class VideoLayer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.video = document.getElementById('webcam');
        this.isActive = true;
        this.lastImageData = null;
        
        // For trailing/echoing effect
        this.trailEnabled = false;
        this.trailFrames = [];
        this.maxTrailFrames = 40; // Increased default
        this.trailOpacity = 0.7;  // Increased default
        
        // Debug counter
        this.frameCount = 0;
        
        // Initialize webcam
        this.initWebcam();
    }
    
    async initWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            this.video.srcObject = stream;
            console.log('Webcam initialized successfully');
        } catch (error) {
            console.error('Error accessing webcam:', error);
        }
    }
    
    update() {
        // In the future, this will update any dynamic elements
    }
    
    render() {
        if (!this.isActive || this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
            return;
        }
        
        this.frameCount++;
        
        // Create a temporary canvas for processing the current frame
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw the video frame to the temporary canvas
        tempCtx.drawImage(this.video, 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Get image data for processing
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        // Apply brightness and contrast adjustments
        this.applyBrightnessContrast(data);
        
        // Apply flame effect
        this.applyFlameEffect(data);
        
        // Put the modified image data back to the temporary canvas
        tempCtx.putImageData(imageData, 0, 0);
        
        // Clear the main canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // SIMPLIFIED TRAIL EFFECT IMPLEMENTATION
        if (this.trailEnabled) {
            // Store the current frame
            this.storeFrameForTrail(tempCanvas);
            
            // Render trail frames
            if (this.trailFrames.length > 0) {
                this.renderTrailFrames();
            }
            
            // Debug logging every 30 frames
            if (this.frameCount % 30 === 0) {
                console.log(`Trail effect active: ${this.trailFrames.length}/${this.maxTrailFrames} frames, opacity: ${this.trailOpacity}`);
                console.log('Trail frames array:', this.trailFrames);
            }
        } else {
            // Clear trail frames if effect is disabled
            this.trailFrames = [];
        }
        
        // Draw the current frame on top with full opacity
        this.ctx.globalAlpha = 1.0;
        this.ctx.drawImage(tempCanvas, 0, 0);
        
        // Store the processed image data for use by other layers
        this.lastImageData = imageData;
    }
    
    storeFrameForTrail(canvas) {
        try {
            // Create a copy of the canvas
            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = this.canvas.width;
            frameCanvas.height = this.canvas.height;
            const frameCtx = frameCanvas.getContext('2d');
            frameCtx.drawImage(canvas, 0, 0);
            
            // Add to the beginning of the array (newest frames first)
            this.trailFrames.unshift(frameCanvas);
            
            // Limit the number of stored frames
            if (this.trailFrames.length > this.maxTrailFrames) {
                this.trailFrames.pop(); // Remove oldest frame
            }
        } catch (error) {
            console.error('Error storing frame for trail:', error);
        }
    }
    
    renderTrailFrames() {
        try {
            // MUCH MORE VISIBLE TRAIL EFFECT
            // Draw each trail frame with fixed opacity offset
            for (let i = 0; i < this.trailFrames.length; i++) {
                // Skip the current frame (already drawn)
                if (i === 0) continue;
                
                // Calculate a strong opacity that decreases with each older frame
                const opacity = this.trailOpacity * (1 - (i / this.trailFrames.length));
                
                this.ctx.globalAlpha = opacity;
                this.ctx.drawImage(this.trailFrames[i], 0, 0);
            }
            
            // Reset global alpha
            this.ctx.globalAlpha = 1.0;
        } catch (error) {
            console.error('Error rendering trail frames:', error);
        }
    }
    
    // Methods to update trail effect settings
    setTrailEnabled(enabled) {
        this.trailEnabled = enabled;
        console.log(`Trail effect ${enabled ? 'enabled' : 'disabled'}`);
        
        // Clear frames when disabling
        if (!enabled) {
            this.trailFrames = [];
        }
    }
    
    setMaxTrailFrames(frames) {
        this.maxTrailFrames = frames;
        console.log(`Trail frames set to ${frames}`);
        
        // Trim excess frames if needed
        if (this.trailFrames.length > frames) {
            this.trailFrames = this.trailFrames.slice(0, frames);
        }
    }
    
    setTrailOpacity(opacity) {
        this.trailOpacity = opacity;
        console.log(`Trail opacity set to ${opacity}`);
    }
    
    applyBrightnessContrast(data) {
        const brightness = config.video.brightness / 100;
        const contrast = config.video.contrast / 100;
        
        // Calculate contrast factor
        const factor = (259 * (contrast + 1)) / (255 * (1 - contrast));
        
        for (let i = 0; i < data.length; i += 4) {
            // Apply brightness
            data[i] += 255 * brightness;
            data[i + 1] += 255 * brightness;
            data[i + 2] += 255 * brightness;
            
            // Apply contrast
            data[i] = factor * (data[i] - 128) + 128;
            data[i + 1] = factor * (data[i + 1] - 128) + 128;
            data[i + 2] = factor * (data[i + 2] - 128) + 128;
            
            // Ensure values are within valid range
            data[i] = Math.max(0, Math.min(255, data[i]));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
        }
    }
    
    applyFlameEffect(data) {
        // Flame color mapping
        const flameColors = {
            darkest: hexToRgb('#0f0004'),    // Solid black (0-75% brightness)
            darkMid: hexToRgb('#FF1E00'),    // Red (75-85% brightness)
            mid: hexToRgb('#FF6C00'),        // Orange (85-90% brightness)
            midBright: hexToRgb('#FFDE00'),  // Yellow (90-95% brightness)
            brightest: hexToRgb('#FFFDDD')   // White (95-100% brightness)
        };
        
        // Brightness thresholds (as percentages of 255)
        const thresholds = {
            darkMid: 0.75 * 255,    // 75%
            mid: 0.85 * 255,        // 85%
            midBright: 0.90 * 255,  // 90%
            brightest: 0.95 * 255   // 95%
        };
        
        const intensity = config.video.flameIntensity;
        
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            
            let resultColor;
            
            if (brightness < thresholds.darkMid) {
                // Darkest regions: solid black
                resultColor = flameColors.darkest;
            } else if (brightness < thresholds.mid) {
                // Dark-mid regions: gradient from black to red
                const ratio = (brightness - thresholds.darkMid) / (thresholds.mid - thresholds.darkMid);
                resultColor = interpolateColors(flameColors.darkest, flameColors.darkMid, ratio);
            } else if (brightness < thresholds.midBright) {
                // Mid regions: gradient from red to orange
                const ratio = (brightness - thresholds.mid) / (thresholds.midBright - thresholds.mid);
                resultColor = interpolateColors(flameColors.darkMid, flameColors.mid, ratio);
            } else if (brightness < thresholds.brightest) {
                // Mid-bright regions: gradient from orange to yellow
                const ratio = (brightness - thresholds.midBright) / (thresholds.brightest - thresholds.midBright);
                resultColor = interpolateColors(flameColors.mid, flameColors.midBright, ratio);
            } else {
                // Brightest regions: gradient from yellow to white
                const ratio = (brightness - thresholds.brightest) / (255 - thresholds.brightest);
                resultColor = interpolateColors(flameColors.midBright, flameColors.brightest, ratio);
            }
            
            // Apply the flame effect with user-controlled intensity
            data[i] = Math.round(data[i] * (1 - intensity) + resultColor.r * intensity);
            data[i + 1] = Math.round(data[i + 1] * (1 - intensity) + resultColor.g * intensity);
            data[i + 2] = Math.round(data[i + 2] * (1 - intensity) + resultColor.b * intensity);
            // Alpha channel (data[i + 3]) remains unchanged
        }
    }
}

// Helper function to convert hex color to RGB
function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return { r, g, b };
}

// Helper function to interpolate between two colors
function interpolateColors(color1, color2, ratio) {
    return {
        r: Math.round(color1.r + (color2.r - color1.r) * ratio),
        g: Math.round(color1.g + (color2.g - color1.g) * ratio),
        b: Math.round(color1.b + (color2.b - color1.b) * ratio)
    };
}
