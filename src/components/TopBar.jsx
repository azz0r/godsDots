import React from 'react'
import styles from '../styles/TopBar.module.css'

const TopBar = ({ beliefPoints, population, timeInfo, onSave, onZoomOut, onTempleView }) => {
  const getTimeEmoji = () => {
    if (!timeInfo) return '🌅'
    switch (timeInfo.currentPeriod) {
      case 'dawn': return '🌅'
      case 'day': return '☀️'
      case 'dusk': return '🌇'
      case 'night': return '🌙'
      default: return '☀️'
    }
  }
  
  const formatTime = () => {
    if (!timeInfo) return 'Day'
    const hours = Math.floor(timeInfo.hour)
    const minutes = Math.floor((timeInfo.hour - hours) * 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
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