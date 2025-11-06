import React, { createContext, useContext, useRef } from 'react'
import { VillagerNeedsSystem } from '../systems/VillagerNeedsSystem'
import { WorshipSystem } from '../systems/WorshipSystem'
import { ProfessionSystem } from '../systems/ProfessionSystem'
import { DayNightSystem } from '../systems/DayNightSystem'
import { BuildingUpgradeSystem } from '../systems/BuildingUpgradeSystem'
import { VillageExpansionAI } from '../systems/VillageExpansionAI'
import { miracleSystem } from '../systems/MiracleSystem'
import { preacherSystem } from '../systems/PreacherSystem'
import { impressivenessSystem } from '../systems/ImpressivenessSystem'
import { GestureRecognizer } from '../systems/GestureRecognizer'

const SystemsContext = createContext(null)

/**
 * SystemsContext provides centralized access to all game systems
 * This prevents prop drilling and makes systems easily accessible
 */
export const SystemsProvider = ({ children }) => {
  // Initialize all game systems once
  const systemsRef = useRef({
    villagerNeeds: new VillagerNeedsSystem(),
    worship: new WorshipSystem(),
    profession: new ProfessionSystem(),
    dayNight: new DayNightSystem(),
    buildingUpgrade: new BuildingUpgradeSystem(),
    villageExpansion: new VillageExpansionAI(),
    miracle: miracleSystem,
    preacher: preacherSystem,
    impressiveness: impressivenessSystem,
    gestureRecognizer: new GestureRecognizer()
  })

  return (
    <SystemsContext.Provider value={systemsRef.current}>
      {children}
    </SystemsContext.Provider>
  )
}

export const useSystems = () => {
  const context = useContext(SystemsContext)
  if (!context) {
    throw new Error('useSystems must be used within a SystemsProvider')
  }
  return context
}
