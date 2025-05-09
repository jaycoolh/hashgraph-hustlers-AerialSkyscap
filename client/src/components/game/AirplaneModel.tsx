import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useKeyboardControls } from "@react-three/drei";
import { useGameState } from "@/lib/stores/useGameState";

export const AirplaneModel = () => {
  // Reference for the propeller animation
  const propellerRef = useRef<THREE.Group>(null);
  // Create a simple airplane model using primitive shapes
  const createAirplaneModel = () => {
    return (
      // Rotate the entire plane 180 degrees around Y axis to correct direction
      <group rotation={[0, Math.PI, 0]}>
        {/* Airplane body */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[1, 0.5, 3]} />
          <meshStandardMaterial
            color="#3b82f6"
            metalness={0.4}
            roughness={0.2}
          />
        </mesh>

        {/* Wings */}
        <mesh position={[0, 0, 0.5]} castShadow>
          <boxGeometry args={[5, 0.1, 1]} />
          <meshStandardMaterial
            color="#60a5fa"
            metalness={0.4}
            roughness={0.2}
          />
        </mesh>

        {/* Tail */}
        <mesh position={[0, 0.5, -1.3]} castShadow>
          <boxGeometry args={[1, 0.8, 0.5]} />
          <meshStandardMaterial
            color="#3b82f6"
            metalness={0.4}
            roughness={0.2}
          />
        </mesh>

        {/* Tail wings */}
        <mesh position={[0, 0.5, -1.3]} castShadow>
          <boxGeometry args={[2, 0.1, 0.5]} />
          <meshStandardMaterial
            color="#60a5fa"
            metalness={0.4}
            roughness={0.2}
          />
        </mesh>

        {/* Cockpit */}
        <mesh position={[0, 0.4, 0.8]} castShadow>
          <boxGeometry args={[0.6, 0.4, 0.8]} />
          <meshStandardMaterial
            color="#dbeafe"
            metalness={0.6}
            roughness={0.2}
            opacity={0.8}
            transparent
          />
        </mesh>

        {/* Propeller at the front */}
        <mesh position={[0, 0, 1.7]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.1, 8]} />
          <meshStandardMaterial
            color="#333333"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Propeller blades */}
        <group
          ref={propellerRef}
          position={[0, 0, 1.75]}
          rotation={[0, 0, Math.PI / 4]}
        >
          <mesh castShadow>
            <boxGeometry args={[1.5, 0.1, 0.05]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
          <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[1.5, 0.1, 0.05]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        </group>
      </group>
    );
  };
  // Reference to the airplane group
  const groupRef = useRef<THREE.Group>(null);

  // Get airplane state from our game store
  const {
    airplanePosition,
    airplaneRotation,
    isGameRunning,
    controls,
    setControl,
    setAirplaneRotation,
    setWorldOffset,
    worldOffset,
    setAltitude,
    altitude,
    forwardSpeed,
    updateDistanceTraveled,
  } = useGameState();

  // Keyboard control setup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          setControl("up", true);
          break;
        case "ArrowDown":
        case "KeyS":
          setControl("down", true);
          break;
        case "ArrowLeft":
        case "KeyA":
          setControl("left", true);
          break;
        case "ArrowRight":
        case "KeyD":
          setControl("right", true);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          setControl("up", false);
          break;
        case "ArrowDown":
        case "KeyS":
          setControl("down", false);
          break;
        case "ArrowLeft":
        case "KeyA":
          setControl("left", false);
          break;
        case "ArrowRight":
        case "KeyD":
          setControl("right", false);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Update the airplane position and rotation in the game loop
  useFrame((_, delta) => {
    // Rotate the propeller
    if (propellerRef.current && isGameRunning) {
      propellerRef.current.rotation.z += 2 * delta * 10; // Fast rotation
    }
    if (!groupRef.current || !isGameRunning) return;

    // Update position from game state
    groupRef.current.position.copy(airplanePosition);

    // Move forward at constant speed
    updateDistanceTraveled(delta);

    // Handle control inputs
    const moveSpeed = 20 * delta;
    const rotationSpeed = 2 * delta;
    const altitudeChangeSpeed = 5 * delta; // Increased from 2 to 5 for faster vertical movement

    // Create a new world offset that we'll modify
    const newWorldOffset = worldOffset.clone();
    // Calculate altitude changes and rotation
    let altitudeChange = 0;
    let targetRotationX = 0;
    let targetRotationZ = 0;

    // Handle up/down controls exclusively (can't be both at once)
    if (controls.up && !controls.down) {
      // Move world down (plane appears to move up) and pitch up
      altitudeChange = altitudeChangeSpeed;
      newWorldOffset.y -= altitudeChange; // Move world DOWN to make plane go UP
      targetRotationX = 0.2; // Pitch up (positive rotation for nose up)
      // console.log("UP pressed, increasing altitude");
    } else if (controls.down && !controls.up) {
      // Move world up (plane appears to move down) and pitch down
      altitudeChange = -altitudeChangeSpeed;
      newWorldOffset.y -= altitudeChange; // Move world UP to make plane go DOWN
      targetRotationX = -0.2; // Pitch down (negative rotation for nose down)
      // console.log("DOWN pressed, decreasing altitude");
    }

    // Update altitude for tracking - will be phased out eventually
    // Currently needed because other components still reference altitude
    const newAltitude = altitude + altitudeChange;

    if (controls.left) {
      // Move world to the right (plane appears to move left)
      newWorldOffset.x += moveSpeed;
      targetRotationZ = 0.3; // Bank left
    }

    if (controls.right) {
      // Move world to the left (plane appears to move right)
      newWorldOffset.x -= moveSpeed;
      targetRotationZ = -0.3; // Bank right
    }

    // Smoothly interpolate to the target rotation
    const newRotation = new THREE.Euler(
      THREE.MathUtils.lerp(airplaneRotation.x, targetRotationX, 0.1),
      airplaneRotation.y,
      THREE.MathUtils.lerp(airplaneRotation.z, targetRotationZ, 0.1),
    );

    // Update state
    setAirplaneRotation(newRotation);
    setWorldOffset(newWorldOffset);
    setAltitude(newAltitude);

    // Apply rotation to the model
    // Add the base rotation to the control-influenced rotation
    groupRef.current.rotation.set(newRotation.x, newRotation.y, newRotation.z);

    // Add a gentle hover effect
    const time = Date.now() * 0.001;
    groupRef.current.position.y += Math.sin(time) * 0.02;
  });

  useEffect(() => {
    // Log for debugging
    console.log("Airplane model initialized at position:", airplanePosition);
  }, []);

  return <group ref={groupRef}>{createAirplaneModel()}</group>;
};
