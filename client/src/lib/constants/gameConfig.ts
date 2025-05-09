import * as THREE from "three";

// Ring layout configuration
export const RING_LAYOUT_CONFIG = {
    // Base distance between rings
    ringSpacing: 50,
    // How much rings can deviate from center
    maxHorizontalOffset: 15,
    maxVerticalOffset: 8,
    // How much rings can be rotated (in radians)
    maxTiltX: Math.PI / 6, // 30 degrees pitch
    maxTiltZ: Math.PI / 6, // 30 degrees bank
    // Number of rings to generate
    totalRings: 7,
    // Starting position
    startZ: -50,
};

// Ring dimensions
export const RING_CONFIG = {
    radius: 5,
    thickness: 0.5,
    color: "#FFD700", // Gold color
    innerRadiusBuffer: 0.3, // Buffer for collision detection
    planeMaxWidth: 3.0, // Reduced from true 5.0 for more lenient collisions
};

// Function to generate a seeded random number between -1 and 1
function seededRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// Function to generate ring positions with a specific seed
export function generateRingPositions(seed: number = Date.now()): {
    position: THREE.Vector3;
    rotation: THREE.Euler;
}[] {
    const positions = [];

    for (let i = 0; i < RING_LAYOUT_CONFIG.totalRings; i++) {
        // Use different seeds for each property to avoid correlation
        const xOffset = seededRandom(seed + i * 1.1) * RING_LAYOUT_CONFIG.maxHorizontalOffset;
        const yOffset = seededRandom(seed + i * 2.2) * RING_LAYOUT_CONFIG.maxVerticalOffset + 5; // Base height of 5
        const zPos = RING_LAYOUT_CONFIG.startZ - (i * RING_LAYOUT_CONFIG.ringSpacing);

        // Generate ring rotations
        const rotX = seededRandom(seed + i * 3.3) * RING_LAYOUT_CONFIG.maxTiltX;
        const rotZ = seededRandom(seed + i * 4.4) * RING_LAYOUT_CONFIG.maxTiltZ;

        positions.push({
            position: new THREE.Vector3(xOffset, yOffset, zPos),
            rotation: new THREE.Euler(rotX, 0, rotZ),
        });
    }

    return positions;
}

// Export a constant for the current level's ring layout
export const RING_POSITIONS = generateRingPositions();

export const TOTAL_RINGS = RING_POSITIONS.length; 