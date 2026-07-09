# Firedancer

Webcam-driven party and projection visuals for playful installations.

Firedancer turns camera and microphone input into reactive visual layers: flame-treated video, audio-reactive particles, waveform motion, and geometric animations. It is a side quest built for experimentation, performance rooms, projection surfaces, and small interactive party setups.

## Why It Exists

This repo is public proof of a small interactive media build: camera input, browser graphics, audio response, and a simple Vite/React development loop. The goal is not a polished commercial product; it is a clean open-source starting point for webcam-driven visual experiments.

## What Is Inside

- React + Vite app structure.
- Webcam video layer with fire/color treatment.
- Audio-reactive particles and waveform visualization.
- Geometric animation layers that respond to music.
- GLSL shader support through Vite.

## Development

Prerequisites:

- Node.js 18+
- npm

Install and run locally:

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

## Notes

The app requests camera and microphone access in the browser. Keep real event/client deployments separate from this public repo if they contain private assets, venue-specific content, or credentials.

## License

MIT
