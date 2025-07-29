import React from 'react'
import styles from '../styles/TopBar.module.css'

const TopBar = ({ beliefPoints, population, timeInfo, onSave, onZoomOut, onTempleView }) => {
  const getTimeEmoji = () => {
    if (!timeInfo) return '🌅'
    switch (timeInfo.period) {
      case 'DAWN': return '🌅'
      case 'MORNING': return '☀️'
      case 'AFTERNOON': return '☀️'
      case 'DUSK': return '🌇'
      case 'NIGHT': return '🌙'
      default: return '☀️'
    }
  }
  
  const formatTime = () => {
    if (!timeInfo) return 'Day 1'
    return `Day ${timeInfo.day} - ${timeInfo.time}`
  }
  
  return (
    <div className={styles.topBar}>
      <div className={styles.resources}>
        <span>Belief: {Math.floor(beliefPoints)}</span>
        <span>Population: {population}</span>
        <span>{getTimeEmoji()} {formatTime()}</span>
      </div>
      <div className={styles.gameTitle}>God Dots</div>
      <div className={styles.controls}>
        <span className={styles.helpText} title="Hold Ctrl and drag to draw gestures">
          ✨ Ctrl+Drag for Miracles
        </span>
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