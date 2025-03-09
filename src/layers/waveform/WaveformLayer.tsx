import React from 'react';

interface WaveformLayerProps {
  active: boolean;
}

export function WaveformLayer({ active }: WaveformLayerProps) {
  if (!active) return null;
  
  return (
    <group>
      {/* Waveform implementation will go here */}
    </group>
  );
}
