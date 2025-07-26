import React from 'react'
import styles from '../styles/DebugControls.module.css'

const DebugControls = ({ debugInfo, onToggleDebug, onSetMovementSpeed }) => {
  return (
    <div className={styles.debugPanel}>
      <h3>Debug Controls</h3>
      
      <div className={styles.control}>
        <label>
          <input 
            type="checkbox" 
            checked={debugInfo.enabled}
            onChange={(e) => onToggleDebug(e.target.checked)}
          />
          Enable Debug View (Ctrl+D)
        </label>
      </div>
      
      <div className={styles.control}>
        <label>Movement Speed:</label>
        <select onChange={(e) => onSetMovementSpeed(e.target.value)}>
          <option value="walking">Walking (32 px/s)</option>
          <option value="running">Running (64 px/s)</option>
          <option value="road">On Road (1.5x)</option>
        </select>
      </div>
      
      <div className={styles.info}>
        <h4>Performance</h4>
        <p>FPS: {debugInfo.fps}</p>
        <p>Entities: {debugInfo.entityCount}</p>
        <p>Zoom: {debugInfo.zoom}x</p>
      </div>
      
      <div className={styles.info}>
        <h4>Movement Profiles</h4>
        <ul>
          <li>Walking: 32 pixels/second (2 px/frame @ 60fps)</li>
          <li>Running: 64 pixels/second (4 px/frame @ 60fps)</li>
          <li>Roads: 1.5x speed multiplier</li>
        </ul>
      </div>
      
      <div className={styles.info}>
        <h4>Zoom Levels</h4>
        <p>Use mouse wheel to zoom</p>
        <p>Available: 1x, 2x, 3x, 4x</p>
      </div>
    </div>
  )
}

export default DebugControls