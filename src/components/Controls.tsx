import React from 'react';
import { useAtom } from 'jotai';
import {
  videoLayerActiveAtom,
  particleLayerActiveAtom,
  waveformLayerActiveAtom,
  trianglesLayerActiveAtom,
  surpriseLayerActiveAtom
} from '../store';

export function Controls() {
  const [videoActive, setVideoActive] = useAtom(videoLayerActiveAtom);
  const [particlesActive, setParticlesActive] = useAtom(particleLayerActiveAtom);
  const [waveformActive, setWaveformActive] = useAtom(waveformLayerActiveAtom);
  const [trianglesActive, setTrianglesActive] = useAtom(trianglesLayerActiveAtom);
  const [surpriseActive, setSurpriseActive] = useAtom(surpriseLayerActiveAtom);

  return (
    <div className="controls">
      <h2>Fire Dancer Controls</h2>
      
      <div className="control-group">
        <h3>Layers</h3>
        <label>
          <input 
            type="checkbox" 
            checked={videoActive} 
            onChange={e => setVideoActive(e.target.checked)} 
          />
          Video Layer
        </label>
        
        <label>
          <input 
            type="checkbox" 
            checked={particlesActive} 
            onChange={e => setParticlesActive(e.target.checked)} 
          />
          Particle Sparkles
        </label>
        
        <label>
          <input 
            type="checkbox" 
            checked={waveformActive} 
            onChange={e => setWaveformActive(e.target.checked)} 
          />
          Waveform
        </label>
        
        <label>
          <input 
            type="checkbox" 
            checked={trianglesActive} 
            onChange={e => setTrianglesActive(e.target.checked)} 
          />
          Triangles
        </label>
      </div>
      
      <div className="control-group">
        <h3>Special Effects</h3>
        <button 
          onClick={() => {
            setSurpriseActive(true);
            setTimeout(() => setSurpriseActive(false), 2000);
          }}
        >
          Trigger Surprise Animation
        </button>
      </div>
    </div>
  );
}
