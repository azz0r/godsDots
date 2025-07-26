import React from 'react'
import styles from '../styles/LandManagementPanel.module.css'

const LandManagementPanel = ({
  selectedPlot,
  plotInfo,
  ownedPlots,
  availablePlots,
  onPurchase,
  onSelectPlot,
  canAfford,
  onClose
}) => {
  if (!selectedPlot || !plotInfo) return null

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Land Management</h3>
        <button className={styles.closeButton} onClick={onClose}>×</button>
      </div>
      
      <div className={styles.content}>
        <div className={styles.plotInfo}>
          <h4>Selected Plot</h4>
          <p>ID: {selectedPlot}</p>
          <p>Size: {plotInfo.size} tiles</p>
          <p>Owner: {plotInfo.owner || 'Unclaimed'}</p>
          <p>Terrain: {plotInfo.terrain}</p>
          {!plotInfo.owner && (
            <>
              <p>Cost: {plotInfo.cost} belief points</p>
              <button 
                className={styles.purchaseButton}
                onClick={() => onPurchase(selectedPlot)}
                disabled={!canAfford(selectedPlot)}
              >
                Purchase Plot
              </button>
            </>
          )}
        </div>
        
        <div className={styles.plotLists}>
          <div className={styles.plotList}>
            <h4>Owned Plots ({ownedPlots.length})</h4>
            <ul>
              {ownedPlots.map(plot => (
                <li 
                  key={plot.id} 
                  onClick={() => onSelectPlot(plot.id)}
                  className={plot.id === selectedPlot ? styles.selected : ''}
                >
                  Plot {plot.id} - {plot.tiles.length} tiles
                </li>
              ))}
            </ul>
          </div>
          
          <div className={styles.plotList}>
            <h4>Available Plots ({availablePlots.length})</h4>
            <ul>
              {availablePlots.slice(0, 10).map(plot => (
                <li 
                  key={plot.id} 
                  onClick={() => onSelectPlot(plot.id)}
                  className={plot.id === selectedPlot ? styles.selected : ''}
                >
                  Plot {plot.id} - {plot.tiles.length} tiles - {plot.cost} BP
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandManagementPanel