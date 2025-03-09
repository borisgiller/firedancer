import React from 'react';
import { Canvas } from '@react-three/fiber';
import { useAtom } from 'jotai';
import { VideoLayer } from './layers/video/VideoLayer';
import { ParticleLayer } from './layers/particles/ParticleLayer';
import { WaveformLayer } from './layers/waveform/WaveformLayer';
import { TrianglesLayer } from './layers/triangles/TrianglesLayer';
import { SurpriseLayer } from './layers/surprise/SurpriseLayer';
import { Controls } from './components/Controls';
import {
  videoLayerActiveAtom,
  particleLayerActiveAtom,
  waveformLayerActiveAtom,
  trianglesLayerActiveAtom,
  surpriseLayerActiveAtom
} from './store';
import './App.css';

export default function App() {
  const [videoActive] = useAtom(videoLayerActiveAtom);
  const [particlesActive] = useAtom(particleLayerActiveAtom);
  const [waveformActive] = useAtom(waveformLayerActiveAtom);
  const [trianglesActive] = useAtom(trianglesLayerActiveAtom);
  const [surpriseActive] = useAtom(surpriseLayerActiveAtom);

  return (
    <div className="app-container">
      <div className="canvas-container">
        <Canvas>
          <VideoLayer active={videoActive} />
          <ParticleLayer active={particlesActive} />
          <WaveformLayer active={waveformActive} />
          <TrianglesLayer active={trianglesActive} />
          <SurpriseLayer active={surpriseActive} />
        </Canvas>
      </div>
      <Controls />
    </div>
  );
}
