import { useRef } from "react";
import * as THREE from "three";

export const Lighting = () => {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  
  return (
    <>
      {/* Main directional light (sun) */}
      <directionalLight
        ref={directionalLightRef}
        position={[50, 100, 50]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={500}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      
      {/* Ambient light to brighten shadowed areas */}
      <ambientLight intensity={0.4} />
      
      {/* Hemisphere light for sky/ground color blend */}
      <hemisphereLight 
        args={["#bfd8ff", "#8ca37d", 0.6]} 
        position={[0, 50, 0]} 
      />
    </>
  );
};
