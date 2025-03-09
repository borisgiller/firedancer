# Fire Dancer

A React application that transforms webcam feed into a fire effect and overlays dynamic animations that respond to microphone input.

## Features

- Video layer with fire effect
- Particle sparkles that respond to audio frequencies
- Vertical waveform visualization
- Triangles that expand and spin with the music
- Surprise animation feature

## Current Status

Phase 1: Basic structure with video layer and black and white effect.

## Development

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
# Build the project
npm run build

# Preview the production build
npm run preview
```

## Deployment

This project is configured for deployment on Railway.com. It will automatically deploy when changes are pushed to the main branch of the GitHub repository.

## Project Structure

- `src/layers/` - Contains the different visual layers
  - `video/` - Webcam processing with fire effect
  - `particles/` - Audio-reactive particle effects
  - `waveform/` - Audio waveform visualization
  - `triangles/` - Audio-reactive triangle animations
  - `surprise/` - Special surprise animation
- `src/components/` - React components
- `src/shaders/` - GLSL shader files

## License

MIT
