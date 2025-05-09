import { create } from "zustand";
import * as THREE from "three";
import { generateRingPositions, RING_LAYOUT_CONFIG } from "@/lib/constants/gameConfig";

// Define event types
export type GameEvent =
  | "ring_passed"
  | "score_changed"
  | "game_started"
  | "game_ended"
  | "game_reset";

// Define an event listener type
type EventListener = (eventData?: any) => void;

// Interface for our game state
interface GameState {
  // Airplane visual position (fixed in view)
  airplanePosition: THREE.Vector3;
  airplaneRotation: THREE.Euler;

  // World position (what actually moves)
  worldOffset: THREE.Vector3;
  altitude: number; // Will be refactored to worldOffset.y

  // Movement properties
  forwardSpeed: number;
  distanceTraveled: number;

  // Rings and scoring
  ringsPassed: number;
  score: number;

  // Controls state
  controls: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  };

  // Event system
  eventListeners: Map<GameEvent, EventListener[]>;
  addEventListener: (event: GameEvent, listener: EventListener) => void;
  removeEventListener: (event: GameEvent, listener: EventListener) => void;
  dispatchEvent: (event: GameEvent, data?: any) => void;

  // Methods to update state
  setAirplanePosition: (position: THREE.Vector3) => void;
  setAirplaneRotation: (rotation: THREE.Euler) => void;
  setWorldOffset: (offset: THREE.Vector3) => void;
  setAltitude: (altitude: number) => void;
  setControl: (control: string, active: boolean) => void;
  updateDistanceTraveled: (delta: number) => void;
  incrementRingsPassed: () => void;
  addScore: (points: number) => void;
  addScoreForRing: (ringIndex: number) => void; // New method for ring passing score

  // Game loop state
  isGameRunning: boolean;
  startGame: () => void;
  pauseGame: () => void;
  resetGame: () => void;

  // Add ring layout
  currentRingLayout: ReturnType<typeof generateRingPositions>;
  regenerateRingLayout: () => void;
}

// Min and max altitude ranges
const MIN_ALTITUDE = 0;
const MAX_ALTITUDE = 20;
const DEFAULT_ALTITUDE = 5;

// Debug altitude changes
const logAltitudeChange = (oldAlt: number, newAlt: number) => {
  // console.log(`Altitude changed: ${oldAlt.toFixed(2)} -> ${newAlt.toFixed(2)}`);
};

// Forward movement constants
const DEFAULT_FORWARD_SPEED = 15; // Units per second

// Initial state values
const INITIAL_STATE = {
  airplanePosition: new THREE.Vector3(0, 5, 0),
  airplaneRotation: new THREE.Euler(0, 0, 0),
  worldOffset: new THREE.Vector3(0, 0, 0),
  altitude: DEFAULT_ALTITUDE,
  forwardSpeed: DEFAULT_FORWARD_SPEED,
  distanceTraveled: 0,
  ringsPassed: 0,
  score: 0,
  isGameRunning: false,
  controls: {
    up: false,
    down: false,
    left: false,
    right: false,
  },
  currentRingLayout: generateRingPositions(),
};

// Create the store
export const useGameState = create<GameState>((set, get) => ({
  // Initial state
  ...INITIAL_STATE,

  // Initialize event system
  eventListeners: new Map<GameEvent, EventListener[]>(),

  // State update methods
  setAirplanePosition: (position: THREE.Vector3) =>
    set({ airplanePosition: position }),

  setAirplaneRotation: (rotation: THREE.Euler) =>
    set({ airplaneRotation: rotation }),

  setWorldOffset: (offset: THREE.Vector3) => set({ worldOffset: offset }),

  setAltitude: (newAltitude: number) => {
    const { altitude: oldAltitude } = get();
    const clampedAltitude = THREE.MathUtils.clamp(
      newAltitude,
      MIN_ALTITUDE,
      MAX_ALTITUDE,
    );

    // Log altitude changes for debugging
    if (oldAltitude !== clampedAltitude) {
      logAltitudeChange(oldAltitude, clampedAltitude);
    }

    set({ altitude: clampedAltitude });
  },

  updateDistanceTraveled: (delta: number) => {
    const { forwardSpeed, distanceTraveled } = get();
    set({ distanceTraveled: distanceTraveled + forwardSpeed * delta });
  },

  setControl: (control: string, active: boolean) => {
    const currentControls = get().controls;
    set({
      controls: {
        ...currentControls,
        [control]: active,
      },
    });
  },

  // Ring and score methods
  incrementRingsPassed: () => {
    const { ringsPassed } = get();
    set({ ringsPassed: ringsPassed + 1 });
    console.log(`Rings passed: ${ringsPassed + 1}`);
  },

  addScore: (points: number) => {
    const { score } = get();
    set({ score: score + points });
    console.log(`Score increased by ${points}. Total: ${score + points}`);
  },

  // Ring-specific score method
  addScoreForRing: (ringIndex: number) => {
    // Default score for each ring
    const basePoints = 10;

    // Add points for each ring successfully passed through (not hit or missed)
    const { score } = get();
    set({ score: score + basePoints });
    console.log(
      `Ring ${ringIndex} passed successfully! +${basePoints} points. Total: ${score + basePoints}`,
    );

    // Dispatch event for UI to react
    get().dispatchEvent("ring_passed", { ringIndex, points: basePoints });
    get().dispatchEvent("score_changed", {
      newScore: score + basePoints,
      pointsAdded: basePoints,
    });
  },

  // Event system methods
  addEventListener: (event: GameEvent, listener: EventListener) => {
    const { eventListeners } = get();
    if (!eventListeners.has(event)) {
      eventListeners.set(event, []);
    }
    const listeners = eventListeners.get(event);
    if (listeners) {
      listeners.push(listener);
    }
  },

  removeEventListener: (event: GameEvent, listener: EventListener) => {
    const { eventListeners } = get();
    const listeners = eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  },

  dispatchEvent: (event: GameEvent, data?: any) => {
    const { eventListeners } = get();
    const listeners = eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        listener(data);
      }
    }
  },

  // Game control methods
  startGame: () => {
    set({ isGameRunning: true });
    get().dispatchEvent("game_started");
  },

  pauseGame: () => {
    set({ isGameRunning: false });
    get().dispatchEvent("game_ended");
  },

  // Reset game state to initial values
  resetGame: () => {
    // Generate new ring layout
    const newRingLayout = generateRingPositions(Date.now());

    // Reset to initial state but preserve event listeners
    const currentListeners = get().eventListeners;

    set({
      ...INITIAL_STATE,
      currentRingLayout: newRingLayout,
      // Ensure controls are explicitly reset
      controls: {
        up: false,
        down: false,
        left: false,
        right: false,
      },
      // Reset positions
      airplanePosition: new THREE.Vector3(0, DEFAULT_ALTITUDE, 0),
      airplaneRotation: new THREE.Euler(0, 0, 0),
      worldOffset: new THREE.Vector3(0, 0, 0),
      // Keep event listeners
      eventListeners: currentListeners,
    });

    // Dispatch reset events
    get().dispatchEvent("game_ended");
    get().dispatchEvent("game_reset");
  },

  // Method to regenerate ring layout
  regenerateRingLayout: () => {
    const newLayout = generateRingPositions(Date.now());
    set({ currentRingLayout: newLayout });
  },
}));
