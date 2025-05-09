import { useRef, useEffect } from "react";
import { useGameState } from "@/lib/stores/useGameState";
import { useGame } from "@/lib/stores/useGame";
import { Lighting } from "./Lighting";
import { Sky } from "./Sky";
import { Terrain } from "./Terrain";
import { AirplaneModel } from "./AirplaneModel";
import { FollowCamera } from "./FollowCamera";
import { RingsManager } from "./RingModel";

export const Environment = () => {
  const { startGame } = useGameState();
  const startGamePhase = useGame(state => state.start);
  
  // Start the game when the environment is ready
  useEffect(() => {
    console.log("Environment initialized, starting game...");
    startGame();
    // Also update the game phase to 'playing'
    startGamePhase();
    console.log("Game phase set to playing:", useGame.getState().phase);
  }, []);
  
  return (
    <>
      {/* Scene lighting */}
      <Lighting />
      
      {/* Sky background */}
      <Sky />
      
      {/* Ground terrain */}
      <Terrain />
      
      {/* The rings to fly through */}
      <RingsManager />
      
      {/* The airplane model */}
      <AirplaneModel />
      
      {/* Camera that follows the airplane */}
      <FollowCamera />
      
      {/* Fog to create distance fading effect */}
      <fog attach="fog" args={["#bfd8ff", 50, 500]} />
    </>
  );
};
