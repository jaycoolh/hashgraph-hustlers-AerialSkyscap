import { useRef, useEffect } from 'react';
import ReactConfetti from 'react-confetti';
import { useGame } from '@/lib/stores/useGame';

export function Confetti() {
  const phase = useGame((state) => state.phase);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Only show confetti during the "ended" phase
  if (phase !== 'ended') return null;
  
  return (
    <div ref={containerRef} className="fixed inset-0 z-10 pointer-events-none">
      <ReactConfetti
        width={window.innerWidth}
        height={window.innerHeight}
        recycle={false}
        numberOfPieces={500}
        gravity={0.15}
      />
    </div>
  );
}
