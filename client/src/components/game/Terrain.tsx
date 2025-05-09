import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { useGameState } from "@/lib/stores/useGameState";

export const Terrain = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Load the grass texture for our terrain
  const grassTexture = useTexture("/textures/grass.png");
  
  // Configure texture for better appearance
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(100, 100);
  grassTexture.anisotropy = 16;
  
  // Get the world position, altitude, and distance traveled from our game state
  const { worldOffset, altitude, distanceTraveled } = useGameState();
  
  // Create some terrain features (grid pattern)
  const gridTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    if (context) {
      // Fill with light green background
      context.fillStyle = '#4CAF50';
      context.fillRect(0, 0, 512, 512);
      
      // Add grid lines for farmland effect
      context.strokeStyle = '#388E3C';
      context.lineWidth = 4;
      
      // Draw horizontal lines
      for (let i = 0; i < 10; i++) {
        const y = i * 51.2;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(512, y);
        context.stroke();
      }
      
      // Draw vertical lines
      for (let i = 0; i < 10; i++) {
        const x = i * 51.2;
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, 512);
        context.stroke();
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(300, 300);
    return texture;
  }, []);
  
  // Update terrain position based on world offset, altitude and forward movement
  useFrame(() => {
    if (!meshRef.current) return;
    
    // Move the terrain based on world offset and forward distance
    meshRef.current.position.x = worldOffset.x;
    meshRef.current.position.z = distanceTraveled; // Forward movement
    
    // Adjust y-position based on worldOffset.y (not altitude)
    // This creates the illusion that the plane is moving up/down
    meshRef.current.position.y = -1 + worldOffset.y;
  });
  
  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1, 0]}
      receiveShadow
    >
      {/* Large flat plane for the ground */}
      <planeGeometry args={[2000, 2000]} />
      <meshStandardMaterial 
        map={gridTexture} 
        roughness={0.8}
        metalness={0.1}
        color={"#7cb342"} // Base green color
      />
    </mesh>
  );
};
