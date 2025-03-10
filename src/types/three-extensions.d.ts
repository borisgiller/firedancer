import * as THREE from 'three';

declare module 'three' {
  export interface Video extends THREE.VideoTexture {}
  export interface VideoConstructor {
    new (video: HTMLVideoElement): Video;
    prototype: Video;
  }
  
  export interface ThreeStatic {
    Video: VideoConstructor;
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      video: React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>;
      mesh: any;
      planeGeometry: any;
      shaderMaterial: any;
    }
  }
}
