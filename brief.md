# Current task

Create an app structure with placeholders for the effects and layers, then upload it to my github repository which will sync with my railway.com service and will be available online. For this first phase only activate the video layer and apply a black and white effect to confirm it works.

# Overall objective
create a react app that uses webcam feed and mic input. It's meant to convert the video input into a fire effect and then overlay dynamic animations like particles and triangles that move/bounce to the music coming in from the microphone on top. This is meant to show the dancer that is in front of the webcam as a dancing flame.

# App structure

This app/folder should sync with my github github repository:
https://github.com/borisgiller/firedancer 

that repository is then deployed to a railway service automatically.

## 1. Main app:

defines common elements and global variables, loads all the layers and coordinates normal animation and switch to surprise animation. Has interface to change variables.

### variables:


Groups of Elements / sound bands / Colors
Bass: 20-250 Hz - #ff1e00
Low-mid: 250-500 Hz - #ff6c00
High-mid: 500-2,000 Hz - #ffde00
Treble: 2,000-20,000 Hz - #fffddd

video layer - active/not-active
Particle Sparkles
Wave form
Triangles
Surprise animation
Duration of normal animation: 1000 seconds
Duration of suprise animation: 2 seconds

## 2. Video Layer

The Video Layer processes camera input by transforming the brightness values of the image into a stylized flame effect using the following color mapping:

Darkest regions (0%-75% brightness): Solid black (#160106)
Dark-mid regions (75%-85% brightness): Gradient from black (#160106) to red (#FF1E00)
Mid regions (85%-90% brightness): Gradient from red (#FF1E00) to orange (#FF6C00)
Mid-bright regions (90%-95% brightness): Gradient from orange (#FF6C00) to yellow (#FFDE00)
Brightest regions (95%-100% brightness): Gradient from yellow (#FFDE00) to white (#FFFDDD)

This mapping creates the illusion of flames emanating from the brightest parts of the captured image. All color values are defined as configurable variables to allow for easy customization.

## 3. Particle Sparkles

The Particle Sparkles system generates dynamic flame-like particles that emanate from specific regions of the video layer, with each particle type triggered by corresponding audio frequency bands:

Dark-mid regions: Red particles (#FF1E00) - Activated by bass frequencies (20-250 Hz)
Mid regions: Orange particles (#FF6C00) - Activated by low-mid frequencies (250-500 Hz)
Mid-bright regions: Yellow particles (#FFDE00) - Activated by high-mid frequencies (500-2,000 Hz)
Brightest regions: White particles (#FFFDDD) - Activated by treble frequencies (2,000-20,000 Hz)
(color and frequency variables are global and defined once in main app)

Particles burst and explode in synchronization with beats and transients detected in their respective frequency bands. Each particle follows an upward trajectory while simultaneously fading out, creating the visual effect of sparkles emerging from flames in rhythm with the music.

Key configurable parameters:
Size of particles
Particle aggressiveness
Particle fade/disappearance rate
Upward movement velocity
Maximum particle count on screen
Sparkles layer mode (overlay, soft-light, dodge-light, screen etc...)

This creates a responsive visual experience where the intensity and quantity of particles directly correspond to the energy present in each frequency band of the audio input.

## 4. Wave form

A wave form that is vertical instead of horizontal, rotated 90% so taht 20hz is all the way at the bottom and 15,000 hz is at the very top of the screen.

Variables:
width of standing waveform
color of outline
color of fill
wave form layer mode (overlay, soft-light, dodge-light, screen etc...)

## 5. Triangles

4 equilateral triangles 1 for each color band / frequency. 
center of the triangle is centered to the center of the screen. 

Variables:
initial size of triangles
Width of outline 1px - 40px
infill color
outline color
expansion: 1X- 5X
spin amount: 1X- 5X
Start opacity: 0%
End opacity: 100%
Triangles layer mode (overlay, soft-light, dodge-light, screen etc...)

## 6. Surprise animation

Takes a PNG image default suprise.png but able to upload new one and bursts it out of the screen. starts small and faded, and quickly expands and increases in opacity. It does this 7 times. First time coloring the image red, then orange, then yellow, then green then turqoise, then blue then purple and keeps cycling through the colors.