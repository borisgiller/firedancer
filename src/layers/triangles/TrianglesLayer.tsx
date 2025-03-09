import React from 'react';

interface TrianglesLayerProps {
  active: boolean;
}

export function TrianglesLayer({ active }: TrianglesLayerProps) {
  if (!active) return null;
  
  return (
    <group>
      {/* Triangles implementation will go here */}
    </group>
  );
}
