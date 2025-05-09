import { useState, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameState } from "@/lib/stores/useGameState";
import { useAudio } from "@/lib/stores/useAudio";
import { useGame } from "@/lib/stores/useGame";
import * as THREE from "three";
import { RING_POSITIONS, TOTAL_RINGS, RING_CONFIG, generateRingPositions } from "@/lib/constants/gameConfig";

// Interface for ring properties
interface RingProps {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  index: number;
}

// Component for an individual ring
const Ring = ({ position, rotation, index }: RingProps) => {
  const [isPassed, setIsPassed] = useState(false);
  const ringRef = useRef<THREE.Group>(null);
  const altitude = useGameState((state) => state.altitude);
  const worldOffset = useGameState((state) => state.worldOffset);
  const distanceTraveled = useGameState((state) => state.distanceTraveled);
  const endGame = useGame((state) => state.end);
  const { playSuccess } = useAudio();

  // Reset handler
  useEffect(() => {
    const handleReset = () => {
      console.log(`Ring ${index} resetting state`);
      setIsPassed(false);
    };

    // Register reset listener
    const gameState = useGameState.getState();
    gameState.addEventListener('game_reset', handleReset);

    // Cleanup
    return () => {
      const gameState = useGameState.getState();
      gameState.removeEventListener('game_reset', handleReset);
    };
  }, [index]);

  // Use constants from config
  const ringRadius = RING_CONFIG.radius;
  const ringThickness = RING_CONFIG.thickness;
  const ringColor = RING_CONFIG.color;
  const innerRadius = ringRadius - ringThickness - RING_CONFIG.innerRadiusBuffer;
  const planeMaxWidth = RING_CONFIG.planeMaxWidth;
  const planeHalfVisualWidth = planeMaxWidth / 2;
  const successAreaRadius = innerRadius - planeHalfVisualWidth * 0.5;

  // Update position to move with the world
  useFrame(() => {
    if (!ringRef.current) return;

    // Update the ring position - move with the world in all directions
    ringRef.current.position.x = worldOffset.x + position.x;
    ringRef.current.position.y = worldOffset.y + position.y;
    ringRef.current.position.z = position.z + distanceTraveled;

    // Apply the ring's rotation
    ringRef.current.rotation.copy(rotation);

    // Don't evaluate if already passed or too early in the game
    if (isPassed || distanceTraveled < 10) return;

    // The visual aircraft lives at the camera origin (x=0,z=0); only its altitude changes
    const planePos = new THREE.Vector3(0, altitude, 0);

    // Ring's world position = its design position plus the scrolled world offset
    const ringPos = new THREE.Vector3()
      .copy(position)
      .add(worldOffset)
      .setZ(position.z + distanceTraveled);

    // Create a matrix to transform points into ring's local space for collision check
    const ringMatrix = new THREE.Matrix4();
    ringMatrix.makeRotationFromEuler(rotation);
    ringMatrix.setPosition(ringPos);
    const ringMatrixInverse = ringMatrix.clone().invert();

    // Transform plane position to ring's local space
    const planePosLocal = planePos.clone().applyMatrix4(ringMatrixInverse);

    // In ring's local space, we can do a simple XY distance check (Z is depth)
    const radial = Math.hypot(planePosLocal.x, planePosLocal.y);
    const zGap = Math.abs(planePosLocal.z);

    if (zGap > ringThickness * 1.5) return;

    const hitRadius = ringRadius + 0.2; // collide zone

    let result: "success" | "hit" | "miss";

    if (radial < innerRadius) result = "success";
    else if (radial < hitRadius) result = "hit";
    else result = "miss";

    // Mark the ring as passed regardless of outcome
    setIsPassed(true);

    // Always increment rings passed counter
    useGameState.getState().incrementRingsPassed();

    // Log the outcome
    console.log(
      `Ring ${index}: ${result} | radial=${radial.toFixed(2)} zGap=${zGap.toFixed(2)}`,
    );

    // Only award points for successful passes
    if (result === "success") {
      useGameState.getState().addScoreForRing(index);
      playSuccess();
    }

    // Check if this was the last ring
    const ringsPassed = useGameState.getState().ringsPassed;
    if (ringsPassed >= TOTAL_RINGS) {
      console.log("All rings processed! Game complete!");
      setTimeout(() => {
        console.log("Ending game and showing completion screen");
        useGameState.getState().pauseGame();
        endGame();
        const gameState = useGameState.getState();
        gameState.setControl("up", false);
        gameState.setControl("down", false);
        gameState.setControl("left", false);
        gameState.setControl("right", false);
        gameState.dispatchEvent("game_ended");
      }, 1500);
    }
  });

  return (
    <group ref={ringRef}>
      {/* Using a torus (donut shape) for the ring */}
      {/* Outer ring (gold) */}
      <mesh>
        <torusGeometry args={[ringRadius, ringThickness, 16, 32]} />
        <meshStandardMaterial
          color={ringColor}
          emissive="#884400"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Inner scoring area indicator (faint green glow) */}
      <mesh>
        <circleGeometry args={[successAreaRadius, 32]} />
        <meshBasicMaterial
          color="#00FF00"
          transparent={true}
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Dynamic lights based on ring state */}
      <pointLight
        position={[0, 0, 0]}
        intensity={isPassed ? 0 : 5}
        color={ringColor}
        distance={10}
      />

      {/* Success effect - only visible after successfully passing through */}
      {isPassed && (
        <>
          <pointLight
            position={[0, 0, 0]}
            intensity={10}
            color="#00FF00"
            distance={7}
          />
          <mesh>
            <ringGeometry
              args={[
                successAreaRadius - 0.2,
                successAreaRadius,
                32,
              ]}
            />
            <meshBasicMaterial
              color="#00FF00"
              transparent={true}
              opacity={0.7}
            />
          </mesh>
        </>
      )}
    </group>
  );
};

// Component to manage multiple rings
export const RingsManager = () => {
  // Get the current ring layout from game state
  const currentRingLayout = useGameState((state) => state.currentRingLayout);

  return (
    <group>
      {/* Create all rings using current layout */}
      {currentRingLayout.map((ringData, index) => (
        <Ring
          key={`ring-${index}`}
          position={ringData.position}
          rotation={ringData.rotation}
          index={index}
        />
      ))}
    </group>
  );
};