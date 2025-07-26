import React from 'react'
import styles from '../styles/PowerBar.module.css'

const PowerBar = ({ selectedPower, onPowerSelect, onZoomOut }) => {
  const powers = [
    { id: 'heal', name: 'Heal', cost: 20 },
    { id: 'storm', name: 'Storm', cost: 50 },
    { id: 'food', name: 'Food', cost: 15 },
    { id: 'build', name: 'Build', cost: 100 }
  ]

  return (
    <div className={styles.powerBar}>
      {powers.map(power => (
        <button
          key={power.id}
          className={`${styles.powerBtn} ${selectedPower === power.id ? styles.selected : ''}`}
          onClick={() => onPowerSelect(power.id)}
        >
          {power.name}
          <span className={styles.cost}>({power.cost})</span>
        </button>
      ))}
      
      <button
        className={`${styles.powerBtn} ${styles.zoomBtn}`}
        onClick={onZoomOut}
        title="Zoom out to see entire world"
      >
        🌍 World View
      </button>
    </div>
  )
}

export default PowerBar