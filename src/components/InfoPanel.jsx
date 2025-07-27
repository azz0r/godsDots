import React from 'react'
import styles from '../styles/InfoPanel.module.css'

const InfoPanel = ({ selectedVillager, hoveredEntity }) => {
  const renderVillagerInfo = (villager) => {
    return (
      <div className={styles.villagerInfo}>
        <h4>{villager.name || `Villager ${villager.id}`}</h4>
        {villager.profession && (
          <p className={styles.profession}>Profession: {villager.profession}</p>
        )}
        <div className={styles.needs}>
          <div className={styles.needBar}>
            <span>Health</span>
            <div className={styles.bar}>
              <div className={styles.fill} style={{ width: `${villager.health}%`, backgroundColor: '#ff4444' }} />
            </div>
          </div>
          <div className={styles.needBar}>
            <span>Hunger</span>
            <div className={styles.bar}>
              <div className={styles.fill} style={{ width: `${villager.hunger}%`, backgroundColor: '#ff8844' }} />
            </div>
          </div>
          <div className={styles.needBar}>
            <span>Happiness</span>
            <div className={styles.bar}>
              <div className={styles.fill} style={{ width: `${villager.happiness}%`, backgroundColor: '#44ff44' }} />
            </div>
          </div>
          {villager.needs && (
            <>
              <div className={styles.needBar}>
                <span>Social</span>
                <div className={styles.bar}>
                  <div className={styles.fill} style={{ width: `${villager.needs.social * 100}%`, backgroundColor: '#4444ff' }} />
                </div>
              </div>
              <div className={styles.needBar}>
                <span>Spiritual</span>
                <div className={styles.bar}>
                  <div className={styles.fill} style={{ width: `${villager.needs.spiritual * 100}%`, backgroundColor: '#ff44ff' }} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }
  
  return (
    <div className={styles.infoPanel}>
      {selectedVillager ? (
        renderVillagerInfo(selectedVillager)
      ) : hoveredEntity?.type === 'villager' ? (
        renderVillagerInfo(hoveredEntity.entity)
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}

export default InfoPanel