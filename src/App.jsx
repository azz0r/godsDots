/**
 * God Dots - Phaser 3 Migration Demo
 * Layer 1: Basic Scene + Camera System
 */

import PhaserGame from './phaser/components/PhaserGame';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>God Dots - Phaser 3 Migration</h1>
        <p>Layer 1: Scene + Camera System (20/20 tests passing)</p>
      </header>
      <main className="app-main">
        <PhaserGame />
      </main>
      <footer className="app-footer">
        <p>Use mouse wheel to zoom | Click and drag to pan (coming soon)</p>
      </footer>
    </div>
  );
}
