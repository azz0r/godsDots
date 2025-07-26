import React from 'react'
import styles from '../styles/InfoPanel.module.css'

const InfoPanel = () => {
  return (
    <div className={styles.infoPanel}>
      <h3>Divine Commands</h3>
      <p>Click and drag to move your view</p>
      <p>Mouse wheel to zoom in/out</p>
      <p>Use divine powers to help your followers</p>
      <div className={styles.powerInfo}>
        <div className={styles.powerDesc}>
          <strong>Heal (20)</strong> - Restore villager health and happiness
        </div>
        <div className={styles.powerDesc}>
          <strong>Storm (50)</strong> - Unleash divine wrath
        </div>
        <div className={styles.powerDesc}>
          <strong>Food (15)</strong> - Bless with sustenance
        </div>
        <div className={styles.powerDesc}>
          <strong>Build (100)</strong> - Create new structures
        </div>
      </div>
    </div>
  )
}

export default InfoPanel