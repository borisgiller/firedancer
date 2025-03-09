import React from 'react';

interface ParticleLayerProps {
  active: boolean;
}

export function ParticleLayer({ active }: ParticleLayerProps) {
  if (!active) return null;
  
  return (
    <group>
      {/* Particle implementation will go here */}
    </group>
  );
}
