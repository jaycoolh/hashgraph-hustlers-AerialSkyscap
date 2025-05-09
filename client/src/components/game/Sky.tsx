import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useGameState } from "@/lib/stores/useGameState";

export const Sky = () => {
  // Create a gradient sky with shaders (more beautiful than texture)
  const skyRef = useRef<THREE.Mesh>(null);
  
  // Get the world position, altitude, and distance traveled from our game state
  const { worldOffset, altitude, distanceTraveled } = useGameState();
  
  // Create beautiful sky gradient shader
  const skyShader = useMemo(() => {
    return {
      uniforms: {
        topColor: { value: new THREE.Color(0x0077FF) }, // Blue
        bottomColor: { value: new THREE.Color(0x89CFF0) }, // Light blue
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `
    };
  }, []);
  
  // Update sky position based on world offset and forward movement
  useFrame(() => {
    if (!skyRef.current) return;
    
    // Keep the sky centered on the camera but offset by world position and forward distance
    skyRef.current.position.x = worldOffset.x;
    skyRef.current.position.z = distanceTraveled;
    
    // Adjust the sky's y position based on worldOffset.y (not altitude)
    // This creates the effect of seeing more sky as the plane ascends
    skyRef.current.position.y = worldOffset.y * 0.3; // Positive multiplier to move sky UP as plane goes UP
  });
  
  return (
    <mesh ref={skyRef} position={[0, 0, 0]}>
      {/* Use a large sphere with inverted normals to create a skybox */}
      <sphereGeometry args={[900, 32, 32]} />
      <shaderMaterial 
        side={THREE.BackSide} // Important: render inside of the sphere
        args={[skyShader]}
      />
    </mesh>
  );
};
