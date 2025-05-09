import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameState } from "@/lib/stores/useGameState";

export const FollowCamera = () => {
  const { camera } = useThree();
  const { airplanePosition, altitude } = useGameState();
  
  // Fixed camera position behind and above the airplane
  const cameraOffset = useRef(new THREE.Vector3(0, 5, 15));
  
  // Camera target (slightly ahead of the airplane)
  const cameraTarget = useRef(new THREE.Vector3());
  
  // Set initial camera position
  useEffect(() => {
    // Position the camera behind and above the airplane
    camera.position.copy(airplanePosition).add(cameraOffset.current);
    
    // Look at the airplane
    cameraTarget.current.copy(airplanePosition);
    camera.lookAt(cameraTarget.current);
    
    console.log("Camera initialized at position:", camera.position);
  }, []);
  
  // Update camera position and target in the game loop
  useFrame(() => {
    // In stage 2, the camera is fixed relative to the plane
    // We only slightly adjust the camera based on altitude
    
    // The camera is positioned behind and above the airplane at a fixed offset
    // We keep a fixed camera height, so it doesn't move up/down with the plane
    // This is critical for maintaining the correct perspective
    const idealPosition = new THREE.Vector3(
      airplanePosition.x,
      airplanePosition.y + cameraOffset.current.y,
      airplanePosition.z + cameraOffset.current.z
    );
    
    // Set the camera position directly (no lag/interpolation)
    camera.position.copy(idealPosition);
    
    // Look directly at the airplane position
    cameraTarget.current.copy(airplanePosition);
    camera.lookAt(cameraTarget.current);
  });
  
  return null; // This component doesn't render any visible elements
};
