import React, { useRef, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface VideoLayerProps {
  active: boolean;
}

export function VideoLayer({ active }: VideoLayerProps) {
  const { size } = useThree();
  const videoRef = useRef<HTMLVideoElement>(null);
  const textureRef = useRef<THREE.VideoTexture | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  // Set up webcam
  useEffect(() => {
    if (!active) return;

    const video = videoRef.current;
    if (!video) return;

    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        video.srcObject = stream;
        video.play();
        setVideoReady(true);
      })
      .catch(err => {
        console.error("Error accessing webcam:", err);
      });

    return () => {
      const stream = video.srcObject as MediaStream;
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [active]);

  // Create video texture when video is ready
  useEffect(() => {
    if (!videoReady || !videoRef.current) return;
    
    textureRef.current = new THREE.VideoTexture(videoRef.current);
    textureRef.current.minFilter = THREE.LinearFilter;
    textureRef.current.magFilter = THREE.LinearFilter;
    
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
      }
    };
  }, [videoReady]);

  if (!active) return null;

  return (
    <>
      <video 
        ref={videoRef} 
        style={{ display: 'none' }} 
        width={size.width} 
        height={size.height}
      />
      {videoReady && textureRef.current && (
        <mesh position={[0, 0, -1]}>
          <planeGeometry args={[2, 2 * (size.height / size.width)]} />
          <shaderMaterial
            uniforms={{
              u_texture: { value: textureRef.current }
            }}
            vertexShader={`
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              uniform sampler2D u_texture;
              varying vec2 vUv;
              
              void main() {
                // Flip the UV coordinates horizontally to mirror the webcam
                vec2 flippedUv = vec2(1.0 - vUv.x, vUv.y);
                vec4 color = texture2D(u_texture, flippedUv);
                
                // Convert to black and white
                float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                gl_FragColor = vec4(vec3(gray), 1.0);
              }
            `}
          />
        </mesh>
      )}
    </>
  );
}
