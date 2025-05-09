import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "./Environment";
import { useAudio } from "@/lib/stores/useAudio";
import { useGameState } from "@/lib/stores/useGameState";
// Import icons for the mute button
import { VolumeX, Volume2 } from "lucide-react";

export const GameCanvas = () => {
  // Audio setup
  const {
    setBackgroundMusic,
    setHitSound,
    setSuccessSound,
    toggleMute,
    isMuted,
  } = useAudio();

  // Get game state values
  const distanceTraveled = useGameState((state) => state.distanceTraveled);
  const forwardSpeed = useGameState((state) => state.forwardSpeed);
  const ringsPassed = useGameState((state) => state.ringsPassed);
  const score = useGameState((state) => state.score);

  // Load and setup audio elements
  useEffect(() => {
    // Load the background music
    const bgMusic = new Audio("/sounds/background.mp3");
    bgMusic.loop = true;
    bgMusic.volume = 0.3;
    setBackgroundMusic(bgMusic);

    // Load sound effects
    const hit = new Audio("/sounds/hit.mp3");
    setHitSound(hit);

    const success = new Audio("/sounds/success.mp3");
    setSuccessSound(success);

    // Play background music when the component loads
    bgMusic.play().catch((err) => console.log("Audio play prevented:", err));

    // Add event listener for browser policies that may block autoplay
    const handleUserInteraction = () => {
      if (bgMusic.paused) {
        bgMusic
          .play()
          .catch((err) => console.log("Audio play prevented:", err));
      }
      // Remove the event listeners after first interaction
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
    };

    // Add event listeners for user interactions to enable audio
    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("keydown", handleUserInteraction);

    return () => {
      // Clean up audio when the component unmounts
      bgMusic.pause();
      bgMusic.currentTime = 0;
    };
  }, []);

  // Reset the game state for score and rings passed on component mount
  useEffect(() => {
    // Reset score and rings when the game canvas loads
    useGameState.setState({ score: 0, ringsPassed: 0 });
    console.log("Game initialized: Score and rings reset to 0");
  }, []);

  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        camera={{
          position: [0, 10, 20],
          fov: 60,
          near: 0.1,
          far: 1000,
        }}
        className="w-full h-full"
      >
        <Suspense fallback={null}>
          <Environment />
        </Suspense>
      </Canvas>

      {/* Game title overlay */}
      <div className="absolute top-0 left-0 p-4 bg-black bg-opacity-40 text-white">
        <h1 className="text-2xl font-bold">Skyways</h1>
        <p className="text-sm">3D Arcade Flying Game</p>
        <div className="mt-2">
          <p className="text-sm font-bold text-yellow-300">Score: {score}</p>
          <p className="text-sm">Rings: {ringsPassed} / 7</p>
        </div>
      </div>

      {/* Mute button */}
      <div className="absolute bottom-4 right-4 p-2 bg-black bg-opacity-40 text-white rounded">
        <button
          onClick={toggleMute}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="w-6 h-6" />
          ) : (
            <Volume2 className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  );
};
