import { useEffect, useState, useRef } from "react";
import { useGame } from "@/lib/stores/useGame";
import { useAudio } from "@/lib/stores/useAudio";
import { useGameState, GameEvent } from "@/lib/stores/useGameState";
import { Button } from "./button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./card";
import { Input } from "./input";
import { VolumeX, Volume2, RotateCw, Trophy, Gem, Check } from "lucide-react";
import ReactConfetti from 'react-confetti';

// Game completion screen component
function GameCompletionScreen({ score, ringsPassed, onRestart }: {
  score: number;
  ringsPassed: number;
  onRestart: () => void;
}) {
  const [hederaAccountId, setHederaAccountId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [claimMessage, setClaimMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleClaimTokens = async () => {
    if (!isValidHederaId || score <= 0) {
      setClaimMessage({ type: 'error', text: "Please enter a valid Hedera Account ID (e.g. 0.0.X) and have a score greater than 0." });
      return;
    }
    setIsLoading(true);
    setClaimMessage(null);

    try {
      const response = await fetch("/api/claim-tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hederaAccountId: hederaAccountId,
          score: score
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setClaimMessage({ type: 'success', text: `${data.message} Tx ID: ${data.transactionId}` });
      } else {
        setClaimMessage({ type: 'error', text: data.message || "Failed to claim tokens. Please try again." });
      }
    } catch (error) {
      console.error("Claim tokens API call error:", error);
      setClaimMessage({ type: 'error', text: "An error occurred while communicating with the server." });
    }

    setIsLoading(false);
  };

  const isValidHederaId = /^\d+\.\d+\.\d+$/.test(hederaAccountId);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-20 bg-black/85">
      {/* Confetti effect */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        <ReactConfetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
          gravity={0.15}
        />
      </div>

      {/* Completion card */}
      <Card className="w-full max-w-md mx-4 shadow-lg bg-slate-800 text-slate-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Trophy className="text-yellow-500" />
            Level Complete!
          </CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-center text-slate-400 mb-2">
            Congratulations! You successfully navigated the course.
          </p>
          <p className="text-center text-sm text-slate-400">
            You passed through all {ringsPassed} rings and earned a total of {score} points!
          </p>
          <div className="mt-4 flex justify-center items-center gap-2">
            <div className="text-center bg-yellow-100 dark:bg-yellow-950 rounded-lg p-3 text-slate-900 dark:text-slate-50">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Gem className="h-5 w-5 text-yellow-500" />
                <span className="font-bold text-xl">{score}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Final Score</p>
            </div>
            <div className="text-center bg-blue-100 dark:bg-blue-950 rounded-lg p-3 text-slate-900 dark:text-slate-50">
              <div className="font-bold text-xl mb-1">{ringsPassed}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Rings Passed</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          {score > 0 && (
            <div className="w-full space-y-2">
              <p className="text-sm text-center text-slate-400">
                Enter your Hedera Account ID (e.g., 0.0.12345) to claim your tokens.
              </p>
              <Input
                type="text"
                placeholder="0.0.XXXXX"
                value={hederaAccountId}
                onChange={(e) => setHederaAccountId(e.target.value)}
                disabled={isLoading}
                className="text-center bg-slate-700 border-slate-600 placeholder-slate-500 text-slate-50"
              />
              {claimMessage && (
                <p className={`text-sm text-center ${claimMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {claimMessage.text}
                </p>
              )}
              <Button
                onClick={handleClaimTokens}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white"
                disabled={!isValidHederaId || isLoading || score <= 0 || (claimMessage?.type === 'success')}
              >
                {isLoading ? "Claiming..." : `Claim ${score} Token${score !== 1 ? 's' : ''}`}
              </Button>
            </div>
          )}
          <Button onClick={onRestart} className="w-full" variant={score > 0 ? "outline" : "default"}>
            Play Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export function Interface() {
  const restart = useGame((state) => state.restart);
  const phase = useGame((state) => state.phase);
  const { isMuted, toggleMute } = useAudio();

  // Get score and rings passed from game state
  const score = useGameState((state) => state.score);
  const ringsPassed = useGameState((state) => state.ringsPassed);
  const resetGameState = useGameState((state) => state.resetGame);

  // State for showing notifications
  const [showScoreNotification, setShowScoreNotification] = useState(false);
  const [showRingNotification, setShowRingNotification] = useState(false);
  const [scoreAmount, setScoreAmount] = useState(1);

  // Handle full game restart
  const handleRestart = () => {
    // Reset all game state first
    resetGameState();
    // Reset game phase to ready
    restart();
    // Clear notifications
    setShowScoreNotification(false);
    setShowRingNotification(false);
    // Start the game after a brief delay to ensure everything is reset
    setTimeout(() => {
      useGame.getState().start();
      useGameState.getState().startGame();
    }, 100);
  };

  // Listen for game events - only setup once
  useEffect(() => {
    // Create event listeners
    const handleRingPassed = (data: any) => {
      const { ringIndex, points } = data;
      console.log(`UI received ring_passed event: Ring ${ringIndex}, +${points} points`);

      // Show ring notification
      setShowRingNotification(true);

      // Hide it after 1.5 seconds
      const timer = setTimeout(() => {
        setShowRingNotification(false);
      }, 1500);

      return () => clearTimeout(timer);
    };

    const handleScoreChanged = (data: any) => {
      const { newScore, pointsAdded } = data;
      console.log(`UI received score_changed event: +${pointsAdded} points, new score: ${newScore}`);

      // Update the score amount to show in the notification
      setScoreAmount(pointsAdded);

      // Show score notification
      setShowScoreNotification(true);

      // Hide it after 1.5 seconds
      const timer = setTimeout(() => {
        setShowScoreNotification(false);
      }, 1500);

      return () => clearTimeout(timer);
    };

    // Register event listeners
    const gameState = useGameState.getState();
    gameState.addEventListener('ring_passed', handleRingPassed);
    gameState.addEventListener('score_changed', handleScoreChanged);

    // Cleanup when component unmounts
    return () => {
      const gameState = useGameState.getState();
      gameState.removeEventListener('ring_passed', handleRingPassed);
      gameState.removeEventListener('score_changed', handleScoreChanged);
    };
  }, []);

  return (
    <>
      {/* Main game HUD - minimal top bar */}
      <div className="fixed top-0 left-0 right-0 p-4 flex justify-between items-start z-10">
        {/* Left side - Score */}
        <Card className="bg-background/80 backdrop-blur-sm shadow-md">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Gem className="h-5 w-5 text-yellow-500" />
              <span className="font-bold">{score}</span>
            </div>
          </CardContent>
        </Card>

        {/* Right side - Essential Controls */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleRestart}
          title="Restart Game"
          className="bg-background/80 backdrop-blur-sm"
        >
          <RotateCw size={18} />
        </Button>
      </div>

      {/* Game Completion Screen */}
      {phase === "ended" && (
        <GameCompletionScreen
          score={score}
          ringsPassed={ringsPassed}
          onRestart={handleRestart}
        />
      )}

      {/* Notifications container - centered with proper z-index */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-30">
        {showRingNotification && (
          <div className="flex flex-col items-center animate-bounce-slow">
            <div className="rounded-full bg-green-500 p-3 shadow-lg">
              <Check className="h-6 w-6 text-white" />
            </div>
            <div className="mt-2 bg-green-500 text-white font-bold py-1 px-3 rounded shadow-lg">
              Ring Passed!
            </div>
          </div>
        )}

        {showScoreNotification && (
          <div className="bg-yellow-500 text-white font-bold text-2xl py-2 px-4 rounded-lg shadow-lg animate-pulse">
            +{scoreAmount} point{scoreAmount !== 1 ? 's' : ''}!
          </div>
        )}
      </div>
    </>
  );
}
