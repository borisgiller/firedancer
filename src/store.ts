import { atom } from 'jotai';

// Color constants
export const COLORS = {
  BASS: '#ff1e00',       // 20-250 Hz
  LOW_MID: '#ff6c00',    // 250-500 Hz
  HIGH_MID: '#ffde00',   // 500-2,000 Hz
  TREBLE: '#fffddd',     // 2,000-20,000 Hz
  BLACK: '#160106',      // Darkest regions
};

// Layer activation states
export const videoLayerActiveAtom = atom(true);
export const particleLayerActiveAtom = atom(false);
export const waveformLayerActiveAtom = atom(false);
export const trianglesLayerActiveAtom = atom(false);
export const surpriseLayerActiveAtom = atom(false);

// Animation durations
export const normalAnimationDurationAtom = atom(1000); // seconds
export const surpriseAnimationDurationAtom = atom(2);  // seconds

// Layer blend modes
export const particlesBlendModeAtom = atom('screen');
export const waveformBlendModeAtom = atom('overlay');
export const trianglesBlendModeAtom = atom('screen');

// Particle settings
export const particleSizeAtom = atom(5);
export const particleAggressivenessAtom = atom(0.5);
export const particleFadeRateAtom = atom(0.05);
export const particleVelocityAtom = atom(0.1);
export const maxParticleCountAtom = atom(1000);

// Waveform settings
export const waveformWidthAtom = atom(2);
export const waveformOutlineColorAtom = atom('#ffffff');
export const waveformFillColorAtom = atom('#ff6c00');

// Triangle settings
export const triangleInitialSizeAtom = atom(0.2);
export const triangleOutlineWidthAtom = atom(2);
export const triangleOutlineColorAtom = atom('#ffffff');
export const triangleInfillColorAtom = atom('#ff6c00');
export const triangleExpansionAtom = atom(2);
export const triangleSpinAtom = atom(2);
export const triangleStartOpacityAtom = atom(0);
export const triangleEndOpacityAtom = atom(1);
