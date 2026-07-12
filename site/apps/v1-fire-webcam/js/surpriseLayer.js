class SurpriseLayer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.isActive = false;
        this.currentColorIndex = 0;
        this.animations = []; 
        this.images = [new Image(), new Image()]; // [image1, image2]
        this.activeImageIndex = 0;
        this.lastTriggerTime = [0, 0]; 
        this.duration = [2000, 2000]; // [image1 duration, image2 duration]
        this.cooldown = [1000, 1000]; // [image1 cooldown, image2 cooldown]
        this.animationStartTime = 0;
        this.colorChangeInterval = null;
        this.cooldownTimeout = null;
        this.startSize = 0; // Starting size factor
        this.expansionFactor = 1.5; // How much the image expands (default 1.5)
        
        // Colors for the 7 bursts
        this.colors = [
            '#FF0000', // Red
            '#FF8000', // Orange
            '#FFFF00', // Yellow
            '#00FF00', // Green
            '#00FFFF', // Turquoise
            '#0000FF', // Blue
            '#8000FF'  // Purple
        ];
        
        // Load both images
        this.images.forEach((img, idx) => {
            img.onload = () => console.log(`Image ${idx+1} loaded from: ${img.src}`);
            img.onerror = (e) => {
                console.error(`Error loading image ${idx+1} from: ${img.src}`);
                this.createFallbackImage();
            };
            img.src = idx === 0 ? 'surprise.png' : 'surprise2.png';
        });
    }
    
    createFallbackImage() {
        // Create a canvas to generate a fallback image
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        
        // Draw a simple star shape
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        
        // Draw a star
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const spikes = 7;
        const outerRadius = 80;
        const innerRadius = 40;
        
        let rot = Math.PI / 2 * 3;
        let x = centerX;
        let y = centerY;
        const step = Math.PI / spikes;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = centerX + Math.cos(rot) * outerRadius;
            y = centerY + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;
            
            x = centerX + Math.cos(rot) * innerRadius;
            y = centerY + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        
        ctx.lineTo(centerX, centerY - outerRadius);
        ctx.closePath();
        ctx.fill();
        
        // Convert canvas to data URL and set as image source
        const dataUrl = canvas.toDataURL('image/png');
        this.image.src = dataUrl;
        
        console.log('Created fallback star image');
    }
    
    setImage(src) {
        // Load new image
        const newImage = new Image();
        newImage.onload = () => {
            this.image = newImage;
            console.log('New surprise image loaded');
        };
        newImage.onerror = (e) => {
            console.error('Error loading new surprise image:', e);
            // Create a fallback image if upload fails
            this.createFallbackImage();
        };
        newImage.src = src;
    }
    
    setDuration(duration) {
        this.duration = duration;
    }
    
    setCooldown(cooldown) {
        this.cooldown = cooldown;
        
        // Clear existing cooldown timeout if it exists
        if (this.cooldownTimeout) {
            clearTimeout(this.cooldownTimeout);
            this.cooldownTimeout = null;
        }
    }
    
    setStartSize(size) {
        this.startSize = size;
    }
    
    setExpansionFactor(factor) {
        this.expansionFactor = factor;
    }
    
    trigger() {
        const currentTime = Date.now();
        
        // Clear any existing animations and reset state
        this._stopAnimation();
        this.animations = [];
        this.isActive = false;

        // Check if cooldown has passed for current image
        if (currentTime - this.lastTriggerTime[this.activeImageIndex] < this.cooldown[this.activeImageIndex]) {
            console.log('Surprise animation in cooldown - skipping trigger');
            return;
        }
        
        console.log('Surprise animation triggered');
        this.isActive = true;
        // Update last trigger time for current image and switch to next
        this.lastTriggerTime[this.activeImageIndex] = currentTime;
        this.activeImageIndex = (this.activeImageIndex + 1) % this.images.length;
        this.animationStartTime = currentTime;
        this.currentColorIndex = 0;
        
        // Create a new animation sequence
        const newAnimationSequence = {
            id: Date.now(), // Unique identifier for this animation sequence
            startTime: currentTime,
            endTime: currentTime + this.duration,
            colors: [...this.colors], // Copy the colors array
            currentColorIndex: 0,
            animations: [] // Will hold individual color animations
        };
        
        // Add the first animation with the first color
        newAnimationSequence.animations.push({
            startTime: currentTime,
            color: this.colors[0],
            scale: this.startSize,
            opacity: 0,
            phase: 'growing' // Track animation phase: growing, stable, or fading
        });
        
        // Add this animation sequence to our list
        this.animations.push(newAnimationSequence);
        
        // Set up interval to change colors for this sequence
        const colorDuration = this.duration / this.colors.length;
        const sequenceId = newAnimationSequence.id;
        
        const colorInterval = setInterval(() => {
            // Find the animation sequence by ID
            const sequence = this.animations.find(seq => seq.id === sequenceId);
            if (!sequence) {
                clearInterval(colorInterval);
                return;
            }
            
            sequence.currentColorIndex = (sequence.currentColorIndex + 1) % sequence.colors.length;
            
            // If we've gone through all colors, stop adding new ones
            if (sequence.currentColorIndex === 0) {
                clearInterval(colorInterval);
                return;
            }
            
            // Add a new animation with the next color
            sequence.animations.push({
                startTime: Date.now(),
                color: sequence.colors[sequence.currentColorIndex],
                scale: this.startSize,
                opacity: 0,
                phase: 'growing'
            });
        }, colorDuration);
        
        // Set a timeout to mark this sequence as complete
        setTimeout(() => {
            // Find the animation sequence and mark it for cleanup
            const sequence = this.animations.find(seq => seq.id === sequenceId);
            if (sequence) {
                sequence.complete = true;
            }
            
            // Set up cooldown timeout to auto-trigger again if this was the last animation
        if (this.animations.length === 1 && this.animations[0].id === sequenceId) {
            if (this.cooldownTimeout) {
                clearTimeout(this.cooldownTimeout);
            }
            
            this.cooldownTimeout = setTimeout(() => {
                console.log('Cooldown complete, auto-triggering animation');
                this.trigger();
            }, Math.min(...this.cooldown));
        }
        }, this.duration);
    }
    
    _stopAnimation() {
        // Clear any existing intervals and timeouts
        if (this.colorChangeInterval) {
            clearInterval(this.colorChangeInterval);
            this.colorChangeInterval = null;
        }
        
        // Mark all animations for cleanup
        this.animations.forEach(sequence => {
            sequence.complete = true;
            sequence.animations.forEach(anim => {
                anim.phase = 'fading';
            });
        });
    }
    
    update() {
        if (!this.isActive || this.animations.length === 0) {
            return;
        }

        const currentTime = Date.now();
        
        // Process each animation sequence
        for (let i = this.animations.length - 1; i >= 0; i--) {
            const sequence = this.animations[i];
            const totalElapsed = currentTime - sequence.startTime;
            
            // Remove completed sequences that have faded out
            if (sequence.complete && sequence.animations.every(anim => anim.opacity <= 0)) {
                this.animations.splice(i, 1);
                continue;
            }
            
            // Process each color animation within the sequence
            for (let j = sequence.animations.length - 1; j >= 0; j--) {
                const anim = sequence.animations[j];
                const animElapsed = currentTime - anim.startTime;
                
                // Calculate animation parameters
                const totalColors = this.colors.length;
                const phaseDuration = this.duration / (totalColors * 0.75);
                
                // Determine animation phase based on elapsed time and sequence state
                if (sequence.complete || animElapsed > phaseDuration) {
                    anim.phase = 'fading';
                } else if (animElapsed > phaseDuration * 0.7) {
                    anim.phase = 'stable';
                } else {
                    anim.phase = 'growing';
                }
                
                // Calculate animation progress
                const baseProgress = Math.min(animElapsed / phaseDuration, 1);
                const waveProgress = Math.sin(baseProgress * Math.PI * 2);
                const easedProgress = Math.pow(baseProgress, 0.8);
                
                // Calculate phase-specific parameters
                const colorPhase = animElapsed / (phaseDuration * 1.5);
                const phaseOffset = Math.min(colorPhase % 1, 1);
                
                // Update opacity based on animation phase
                if (anim.phase === 'growing') {
                    // Growing phase: increase opacity using sine curve
                    anim.opacity = Math.sin(phaseOffset * Math.PI) * 0.8;
                } else if (anim.phase === 'stable') {
                    // Stable phase: maintain maximum opacity
                    anim.opacity = 0.8;
                } else if (anim.phase === 'fading') {
                    // Fading phase: decrease opacity smoothly
                    const fadeProgress = Math.min((animElapsed - phaseDuration) / (phaseDuration * 0.5), 1);
                    anim.opacity = Math.max(0.8 * (1 - fadeProgress), 0);
                }
                
                // Update scale based on animation progress
                const scaleProgress = Math.min(easedProgress + (phaseOffset * 0.3), 1);
                anim.scale = this.startSize + 
                    (scaleProgress * this.expansionFactor * (1 + (waveProgress * 0.1)));
                
                // Remove fully faded animations
                if (anim.opacity <= 0 && anim.phase === 'fading') {
                    sequence.animations.splice(j, 1);
                }
            }
        }
        
        // Update active state based on whether we have any animations
        this.isActive = this.animations.length > 0;
    }
    
    render() {
        const currentImage = this.images[this.activeImageIndex];
        if (!this.isActive || this.animations.length === 0 || (!currentImage.complete && !currentImage.naturalWidth)) {
            return;
        }

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        this.animations.forEach(sequence => {
            sequence.animations.forEach(anim => {
                if (anim.opacity <= 0.01) return;

                this.ctx.save();
                
                const size = Math.min(this.canvas.width, this.canvas.height) * anim.scale;
                this.ctx.globalAlpha = anim.opacity;
                
                // Draw directly using global composite operations
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.drawImage(
                    currentImage,
                    centerX - size/2,
                    centerY - size/2,
                    size,
                    size
                );
                
                // Apply color tint
                if (currentImage.naturalWidth > 0) {
                    this.ctx.globalCompositeOperation = 'source-atop';
                    this.ctx.fillStyle = anim.color;
                    this.ctx.fillRect(centerX - size/2, centerY - size/2, size, size);
                } else {
                    // Draw fallback circle if image failed to load
                    this.ctx.globalCompositeOperation = 'lighter';
                    this.ctx.fillStyle = anim.color;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, size/2, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                this.ctx.restore();
            });
        });
    }
}
