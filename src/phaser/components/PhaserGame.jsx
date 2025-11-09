/**
 * Layer 1: React-Phaser Integration Component
 *
 * This component handles mounting and unmounting the Phaser game instance
 * within the React application lifecycle.
 */

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '../config/gameConfig';

/**
 * PhaserGame component - mounts Phaser game instance into React
 * @returns {JSX.Element}
 */
export default function PhaserGame() {
  const gameRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Only initialize if we don't have a game instance
    if (!gameRef.current && containerRef.current) {
      const config = createGameConfig();

      // Override parent to use our ref
      config.parent = containerRef.current;

      // Create game instance
      gameRef.current = new Phaser.Game(config);
    }

    // Cleanup on unmount
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="game-container"
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000'
      }}
    />
  );
}
