class WaveformLayer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.isActive = false;
        this.audioProcessor = null;
        
        // Waveform configuration
        this.config = {
            width: 10,               // Width of the standing waveform (default: 10)
            outlineColor: '#806400', // Color of outline (default: #806400)
            fillColor: '#9e0000',    // Color of fill (default: #9e0000)
            blendMode: 'color-dodge',// Blend mode (default: color-dodge)
            minFreq: 20,             // Minimum frequency (Hz) - bottom of screen
            maxFreq: 15000,          // Maximum frequency (Hz) - top of screen
            smoothingFactor: 0.5,    // Smoothing factor for the waveform (0-1)
            amplification: 2.5,      // Amplification factor for the waveform
            // Sensitivity multipliers for different frequency bands
            sensitivity: {
                bass: 1.0,           // 20-250 Hz
                lowMid: 1.0,         // 250-500 Hz
                highMid: 1.0,        // 500-2000 Hz
                treble: 1.0          // 2000-20000 Hz
            }
        };
        
        // Frequency data array
        this.frequencyData = null;
        this.smoothedData = null;
        
        // Debug flag
        this.debug = false;
    }
    
    setAudioProcessor(audioProcessor) {
        this.audioProcessor = audioProcessor;
    }
    
    update() {
        if (!this.isActive || !this.audioProcessor) {
            return;
        }
        
        // Get frequency data from audio processor if initialized
        if (this.audioProcessor.isInitialized) {
            this.frequencyData = this.audioProcessor.getFrequencyData();
            
            if (!this.frequencyData) {
                return;
            }
            
            // Initialize smoothed data if needed
            if (!this.smoothedData || this.smoothedData.length !== this.frequencyData.length) {
                this.smoothedData = new Uint8Array(this.frequencyData.length);
                this.smoothedData.set(this.frequencyData);
            } else {
                // Apply smoothing
                for (let i = 0; i < this.frequencyData.length; i++) {
                    this.smoothedData[i] = this.smoothedData[i] * this.config.smoothingFactor + 
                                          this.frequencyData[i] * (1 - this.config.smoothingFactor);
                }
            }
        }
    }
    
    render() {
        if (!this.isActive || !this.smoothedData) {
            return;
        }
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        
        // Save current context state
        ctx.save();
        
        // Set blend mode
        ctx.globalCompositeOperation = this.config.blendMode;
        
        // Calculate the number of frequency bins to display
        const logMinFreq = Math.log10(this.config.minFreq);
        const logMaxFreq = Math.log10(this.config.maxFreq);
        const binCount = this.smoothedData.length;
        
        // Sample rate and Nyquist frequency
        const sampleRate = this.audioProcessor.audioContext.sampleRate;
        const nyquist = sampleRate / 2;
        
        // Create a single path for the entire waveform (both left and right sides)
        ctx.beginPath();
        
        // Number of points to draw (fewer points for better performance)
        const numPoints = 100;
        const freqStep = (this.config.maxFreq - this.config.minFreq) / numPoints;
        
        // Store points for the right side to reuse for the left side
        const points = [];
        
        // Calculate points for the right side (from bottom to top)
        for (let i = 0; i <= numPoints; i++) {
            // Calculate the frequency for this point
            const freq = this.config.minFreq + (freqStep * i);
            
            // Skip if outside our frequency range
            if (freq < this.config.minFreq || freq > this.config.maxFreq) {
                continue;
            }
            
            // Map frequency to y position (logarithmic scale)
            const logFreq = Math.log10(freq);
            // Remap to use full height (previously only used 80% of height)
            const yPos = height - (height * 1.25 * (logFreq - logMinFreq) / (logMaxFreq - logMinFreq));
            
            // Find the bin index for this frequency
            const binIndex = Math.floor((freq / nyquist) * (binCount - 1));
            
            // Get amplitude value and scale it
            let value = this.smoothedData[binIndex] / 255.0; // Normalize to 0-1
            
            // Apply frequency band sensitivity
            if (freq >= 20 && freq <= 250) {
                value *= this.config.sensitivity.bass;
            } else if (freq > 250 && freq <= 500) {
                value *= this.config.sensitivity.lowMid;
            } else if (freq > 500 && freq <= 2000) {
                value *= this.config.sensitivity.highMid;
            } else if (freq > 2000) {
                value *= this.config.sensitivity.treble;
            }
            
            const amplitude = value * this.config.amplification * (width / 4); // Reduced amplitude
            
            // Store the point
            points.push({ x: centerX + amplitude, y: yPos });
        }
        
        // Start the path at the bottom center
        ctx.moveTo(centerX, height);
        
        // Draw the right side of the waveform
        for (const point of points) {
            ctx.lineTo(point.x, point.y);
        }
        
        // Draw the left side of the waveform (in reverse order)
        for (let i = points.length - 1; i >= 0; i--) {
            const point = points[i];
            // Mirror the x-coordinate
            const mirroredX = centerX - (point.x - centerX);
            ctx.lineTo(mirroredX, point.y);
        }
        
        // Close the path
        ctx.lineTo(centerX, height);
        
        // Fill the waveform
        ctx.fillStyle = this.config.fillColor;
        ctx.fill();
        
        // Draw the outline
        ctx.strokeStyle = this.config.outlineColor;
        ctx.lineWidth = this.config.width;
        ctx.stroke();
        
        // Debug info
        if (this.debug) {
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.fillText(`Audio Context: ${this.audioProcessor.audioContext ? 'Created' : 'Not Created'}`, 10, 20);
            ctx.fillText(`Initialized: ${this.audioProcessor.isInitialized}`, 10, 40);
            ctx.fillText(`Sample Rate: ${this.audioProcessor.audioContext ? this.audioProcessor.audioContext.sampleRate : 'N/A'}`, 10, 60);
            ctx.fillText(`FFT Size: ${this.audioProcessor.analyser ? this.audioProcessor.analyser.fftSize : 'N/A'}`, 10, 80);
            
            // Show some frequency data values
            if (this.smoothedData) {
                for (let i = 0; i < 5; i++) {
                    const binIndex = Math.floor(i * binCount / 5);
                    const freq = (binIndex / binCount) * nyquist;
                    ctx.fillText(`Bin ${binIndex}: ${Math.round(freq)}Hz = ${this.smoothedData[binIndex]}`, 10, 100 + i * 20);
                }
            }
        }
        
        // Restore context state
        ctx.restore();
    }
    
    // Method to update configuration
    updateConfig(newConfig) {
        // Handle nested sensitivity object
        if (newConfig.sensitivity) {
            Object.assign(this.config.sensitivity, newConfig.sensitivity);
            delete newConfig.sensitivity;
        }
        
        // Handle other properties
        Object.assign(this.config, newConfig);
    }
    
    // Method to update sensitivity for a specific frequency band
    updateSensitivity(band, value) {
        if (this.config.sensitivity.hasOwnProperty(band)) {
            this.config.sensitivity[band] = value;
        }
    }
}
