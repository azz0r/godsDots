import React from 'react'
import styles from '../styles/TopBar.module.css'

const TopBar = ({ beliefPoints, population, onSave, onZoomOut, onTempleView }) => {
  return (
    <div className={styles.topBar}>
      <div className={styles.resources}>
        <span>Belief: {Math.floor(beliefPoints)}</span>
        <span>Population: {population}</span>
      </div>
      <div className={styles.gameTitle}>God Dots</div>
      <div className={styles.controls}>
        <button onClick={onZoomOut} className={styles.controlButton}>
          🌍 World View
        </button>
        <button onClick={onTempleView} className={styles.controlButton}>
          ⛪ Temple View
        </button>
        <button onClick={onSave} className={styles.controlButton}>
          💾 Save
        </button>
      </div>
    </div>
  )
}

export default TopBar