import React from 'react';

interface SurpriseLayerProps {
  active: boolean;
}

export function SurpriseLayer({ active }: SurpriseLayerProps) {
  if (!active) return null;
  
  return (
    <group>
      {/* Surprise animation implementation will go here */}
    </group>
  );
}
