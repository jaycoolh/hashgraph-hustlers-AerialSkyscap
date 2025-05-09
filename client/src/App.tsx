import { GameCanvas } from "./components/game/GameCanvas";
import { useEffect } from "react";
import { useGame } from "@/lib/stores/useGame";
import { useGameState } from "./lib/stores/useGameState";
import { Interface } from "./components/ui/interface";
import "@fontsource/inter";

function App() {
  const { altitude } = useGameState();
  const { phase } = useGame()
  // Update altitude indicator when altitude changes
  useEffect(() => {
    const altitudeIndicator = document.querySelector(
      ".altitude-indicator",
    ) as HTMLDivElement;
    if (altitudeIndicator) {
      // Normalize altitude to 0-100%
      const MAX_ALTITUDE = 10;
      const heightPercentage = (altitude / MAX_ALTITUDE) * 100;
      altitudeIndicator.style.height = `${heightPercentage}%`;
    }
  }, [altitude]);

  return (
    <div className="w-full h-full bg-black">
      <GameCanvas />
      <Interface />
    </div>
  );
}

export default App;
