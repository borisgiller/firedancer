class AudioProcessor {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.isInitialized = false;
        this.frequencyData = null;
        this.initializationInProgress = false;
        
        // Sensitivity multipliers for each frequency band
        this.sensitivityMultipliers = {
            bass: 0.05,      // 20-250 Hz (reduced default sensitivity for bass)
            lowMid: 0.14,    // 250-500 Hz
            highMid: 0.4,   // 500-2000 Hz
            treble: 1.0     // 2000-20000 Hz
        };
        
        // Initialize audio context
        this.createAudioContext();
    }
    
    createAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Audio context created');
        } catch (error) {
            console.error('Error creating audio context:', error);
        }
    }
    
    async initialize() {
        // If already initialized or initialization is in progress, don't do it again
        if (this.isInitialized || this.initializationInProgress) {
            return Promise.resolve();
        }
        
        this.initializationInProgress = true;
        
        try {
            // Create audio context if it doesn't exist
            if (!this.audioContext) {
                this.createAudioContext();
            }
            
            // Resume audio context if it's suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            console.log('Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            
            console.log('Microphone access granted');
            
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            
            // Set FFT size for better frequency resolution
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;
            
            this.microphone.connect(this.analyser);
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            
            this.isInitialized = true;
            this.initializationInProgress = false;
            console.log('Audio processor initialized successfully');
            return Promise.resolve();
        } catch (error) {
            console.error('Error initializing audio processor:', error);
            this.initializationInProgress = false;
            alert('Could not access microphone. Please check permissions and try again.');
            return Promise.reject(error);
        }
    }
    
    getFrequencyData() {
        if (!this.isInitialized || !this.analyser) {
            return null;
        }
        
        this.analyser.getByteFrequencyData(this.frequencyData);
        return this.frequencyData;
    }
    
    getBandEnergy(minFreq, maxFreq) {
        if (!this.isInitialized || !this.analyser) {
            return 0;
        }
        
        const nyquist = this.audioContext.sampleRate / 2;
        const minBin = Math.floor((minFreq / nyquist) * this.frequencyData.length);
        const maxBin = Math.floor((maxFreq / nyquist) * this.frequencyData.length);
        
        let sum = 0;
        for (let i = minBin; i <= maxBin; i++) {
            sum += this.frequencyData[i];
        }
        
        // Normalize by the number of bins
        let energy = sum / (maxBin - minBin + 1) / 255;
        
        // Apply sensitivity multiplier based on frequency band
        if (minFreq >= 20 && maxFreq <= 250) {
            energy *= this.sensitivityMultipliers.bass;
        } else if (minFreq >= 250 && maxFreq <= 500) {
            energy *= this.sensitivityMultipliers.lowMid;
        } else if (minFreq >= 500 && maxFreq <= 2000) {
            energy *= this.sensitivityMultipliers.highMid;
        } else if (minFreq >= 2000 && maxFreq <= 20000) {
            energy *= this.sensitivityMultipliers.treble;
        }
        
        return energy;
    }
    
    // Method to update sensitivity multipliers
    updateSensitivity(band, value) {
        if (this.sensitivityMultipliers.hasOwnProperty(band)) {
            this.sensitivityMultipliers[band] = value;
        }
    }
}
