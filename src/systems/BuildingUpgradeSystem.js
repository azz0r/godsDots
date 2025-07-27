/**
 * Building Upgrade System
 * Allows buildings to be upgraded and specialized
 */

export class BuildingUpgradeSystem {
  constructor() {
    // Building upgrade paths
    this.UPGRADE_PATHS = {
      house: {
        level1: {
          name: 'Basic House',
          capacity: 4,
          cost: { wood: 20, stone: 10 },
          buildTime: 300
        },
        level2: {
          name: 'Large House', 
          capacity: 6,
          cost: { wood: 40, stone: 30, iron: 10 },
          buildTime: 450,
          requires: ['carpentry'],
          benefits: {
            happiness: 10,
            restQuality: 1.2
          }
        },
        level3: {
          name: 'Manor',
          capacity: 10,
          cost: { wood: 80, stone: 60, iron: 30, gold: 10 },
          buildTime: 600,
          requires: ['architecture', 'masonry'],
          benefits: {
            happiness: 20,
            restQuality: 1.5,
            prestige: 5
          }
        },
        specializations: {
          tavern: {
            name: 'Tavern',
            cost: { wood: 30, gold: 20 },
            requires: ['brewing'],
            benefits: {
              socialNeed: 2.0,
              happiness: 15,
              income: 5
            }
          },
          inn: {
            name: 'Inn',
            cost: { wood: 40, stone: 20, cloth: 10 },
            requires: ['hospitality'],
            benefits: {
              restQuality: 2.0,
              income: 10,
              visitorAttraction: 1.5
            }
          }
        }
      },
      temple: {
        level1: {
          name: 'Shrine',
          cost: { stone: 50, gold: 20 },
          buildTime: 450,
          beliefGeneration: 1
        },
        level2: {
          name: 'Temple',
          cost: { stone: 100, gold: 50, marble: 20 },
          buildTime: 600,
          requires: ['theology'],
          beliefGeneration: 3,
          benefits: {
            conversionRange: 200,
            healingPower: 1.5
          }
        },
        level3: {
          name: 'Cathedral',
          cost: { stone: 200, gold: 100, marble: 50, gems: 10 },
          buildTime: 900,
          requires: ['architecture', 'theology', 'art'],
          beliefGeneration: 5,
          benefits: {
            conversionRange: 400,
            healingPower: 2.0,
            miracleEfficiency: 1.5,
            aweInspiring: true
          }
        },
        specializations: {
          monastery: {
            name: 'Monastery',
            cost: { stone: 80, wood: 40 },
            requires: ['meditation'],
            benefits: {
              knowledgeGeneration: 2,
              priestTraining: true,
              peacefulAura: 300
            }
          },
          oracle: {
            name: 'Oracle',
            cost: { stone: 60, gems: 20, incense: 30 },
            requires: ['mysticism'],
            benefits: {
              futureVision: true,
              wisdomGeneration: 3,
              propheticVisions: true
            }
          }
        }
      },
      farm: {
        level1: {
          name: 'Small Farm',
          cost: { wood: 15 },
          buildTime: 180,
          foodProduction: 2
        },
        level2: {
          name: 'Farm',
          cost: { wood: 30, stone: 10, tools: 5 },
          buildTime: 300,
          requires: ['agriculture'],
          foodProduction: 4,
          benefits: {
            cropVariety: 2,
            pestResistance: 1.3
          }
        },
        level3: {
          name: 'Estate Farm',
          cost: { wood: 60, stone: 30, tools: 15, iron: 10 },
          buildTime: 450,
          requires: ['agriculture', 'irrigation'],
          foodProduction: 8,
          benefits: {
            cropVariety: 4,
            pestResistance: 1.6,
            surplus: true
          }
        },
        specializations: {
          orchard: {
            name: 'Orchard',
            cost: { wood: 40, water: 20 },
            requires: ['horticulture'],
            benefits: {
              fruitProduction: 3,
              happiness: 10,
              beverageProduction: true
            }
          },
          ranch: {
            name: 'Ranch',
            cost: { wood: 50, fence: 30 },
            requires: ['animalHusbandry'],
            benefits: {
              meatProduction: 4,
              leatherProduction: 2,
              mountTraining: true
            }
          }
        }
      },
      workshop: {
        level1: {
          name: 'Workshop',
          cost: { wood: 30, stone: 20 },
          buildTime: 240,
          toolProduction: 1
        },
        level2: {
          name: 'Craftsman Workshop',
          cost: { wood: 60, stone: 40, iron: 20 },
          buildTime: 360,
          requires: ['craftsmanship'],
          toolProduction: 2,
          benefits: {
            qualityBonus: 1.3,
            specializedTools: true
          }
        },
        level3: {
          name: 'Guild Hall',
          cost: { wood: 100, stone: 80, iron: 40, gold: 20 },
          buildTime: 600,
          requires: ['guildSystem', 'masterCrafting'],
          toolProduction: 3,
          benefits: {
            qualityBonus: 2.0,
            masterworkItems: true,
            apprenticeTraining: true
          }
        },
        specializations: {
          blacksmith: {
            name: 'Blacksmith',
            cost: { stone: 40, iron: 30, coal: 20 },
            requires: ['metallurgy'],
            benefits: {
              weaponProduction: true,
              armorProduction: true,
              metalQuality: 1.5
            }
          },
          alchemist: {
            name: 'Alchemist Lab',
            cost: { stone: 30, glass: 20, herbs: 30 },
            requires: ['alchemy'],
            benefits: {
              potionProduction: true,
              research: 2,
              explosives: true
            }
          }
        }
      }
    }

    // Research requirements
    this.RESEARCH_TREE = {
      carpentry: { cost: 100, time: 300, requires: [] },
      architecture: { cost: 200, time: 600, requires: ['carpentry'] },
      masonry: { cost: 150, time: 450, requires: ['carpentry'] },
      theology: { cost: 150, time: 450, requires: [] },
      agriculture: { cost: 100, time: 300, requires: [] },
      irrigation: { cost: 200, time: 450, requires: ['agriculture'] },
      craftsmanship: { cost: 150, time: 400, requires: [] },
      metallurgy: { cost: 250, time: 600, requires: ['craftsmanship'] },
      alchemy: { cost: 300, time: 750, requires: ['craftsmanship'] }
    }
  }

  /**
   * Check if building can be upgraded
   */
  canUpgrade(building, player) {
    const upgradePath = this.UPGRADE_PATHS[building.type]
    if (!upgradePath) return { canUpgrade: false, reason: 'No upgrades available' }

    const currentLevel = building.level || 1
    const nextLevel = `level${currentLevel + 1}`
    
    if (!upgradePath[nextLevel]) {
      return { canUpgrade: false, reason: 'Maximum level reached' }
    }

    const upgrade = upgradePath[nextLevel]

    // Check resources
    for (const [resource, amount] of Object.entries(upgrade.cost)) {
      if ((player.resources[resource] || 0) < amount) {
        return { canUpgrade: false, reason: `Insufficient ${resource}` }
      }
    }

    // Check research requirements
    if (upgrade.requires) {
      for (const tech of upgrade.requires) {
        if (!player.research?.includes(tech)) {
          return { canUpgrade: false, reason: `Requires ${tech} research` }
        }
      }
    }

    return { canUpgrade: true }
  }

  /**
   * Start building upgrade
   */
  startUpgrade(building, player) {
    const check = this.canUpgrade(building, player)
    if (!check.canUpgrade) return false

    const currentLevel = building.level || 1
    const upgradePath = this.UPGRADE_PATHS[building.type]
    const upgrade = upgradePath[`level${currentLevel + 1}`]

    // Deduct resources
    for (const [resource, amount] of Object.entries(upgrade.cost)) {
      player.resources[resource] -= amount
    }

    // Start upgrade process
    building.upgrading = {
      toLevel: currentLevel + 1,
      progress: 0,
      totalTime: upgrade.buildTime,
      startTime: Date.now()
    }

    building.operational = false // Building offline during upgrade

    return true
  }

  /**
   * Update upgrade progress
   */
  updateUpgrades(buildings, deltaTime) {
    buildings.forEach(building => {
      if (building.upgrading) {
        building.upgrading.progress += deltaTime / 1000

        if (building.upgrading.progress >= building.upgrading.totalTime) {
          this.completeUpgrade(building)
        }
      }
    })
  }

  completeUpgrade(building) {
    const upgradePath = this.UPGRADE_PATHS[building.type]
    const newLevel = building.upgrading.toLevel
    const upgrade = upgradePath[`level${newLevel}`]

    // Apply upgrade
    building.level = newLevel
    building.name = upgrade.name
    building.operational = true
    
    // Apply benefits
    if (upgrade.benefits) {
      Object.assign(building, upgrade.benefits)
    }

    // Apply production bonuses
    if (upgrade.foodProduction) building.foodProduction = upgrade.foodProduction
    if (upgrade.beliefGeneration) building.beliefGeneration = upgrade.beliefGeneration
    if (upgrade.toolProduction) building.toolProduction = upgrade.toolProduction

    // Visual upgrade
    building.appearance = {
      size: 1 + (newLevel - 1) * 0.3,
      decorations: newLevel - 1,
      quality: newLevel
    }

    // Clear upgrade status
    building.upgrading = null

    // Celebration effect
    building.upgradeCompleteEffect = {
      duration: 180,
      particles: true
    }
  }

  /**
   * Specialize a building
   */
  canSpecialize(building, specialization, player) {
    const upgradePath = this.UPGRADE_PATHS[building.type]
    if (!upgradePath?.specializations?.[specialization]) {
      return { canSpecialize: false, reason: 'Invalid specialization' }
    }

    // Must be at least level 2
    if ((building.level || 1) < 2) {
      return { canSpecialize: false, reason: 'Building must be level 2+' }
    }

    const spec = upgradePath.specializations[specialization]

    // Check resources
    for (const [resource, amount] of Object.entries(spec.cost)) {
      if ((player.resources[resource] || 0) < amount) {
        return { canSpecialize: false, reason: `Insufficient ${resource}` }
      }
    }

    // Check requirements
    if (spec.requires) {
      for (const tech of spec.requires) {
        if (!player.research?.includes(tech)) {
          return { canSpecialize: false, reason: `Requires ${tech} research` }
        }
      }
    }

    return { canSpecialize: true }
  }

  specializeBuilding(building, specialization, player) {
    const check = this.canSpecialize(building, specialization, player)
    if (!check.canSpecialize) return false

    const upgradePath = this.UPGRADE_PATHS[building.type]
    const spec = upgradePath.specializations[specialization]

    // Deduct resources
    for (const [resource, amount] of Object.entries(spec.cost)) {
      player.resources[resource] -= amount
    }

    // Apply specialization
    building.specialization = specialization
    building.name = spec.name
    Object.assign(building, spec.benefits)

    // Change building behavior
    this.applySpecializationBehavior(building, specialization)

    return true
  }

  applySpecializationBehavior(building, specialization) {
    switch (specialization) {
      case 'tavern':
        building.acceptsVillagers = true
        building.socialHub = true
        building.generatesMoney = true
        break
      case 'monastery':
        building.trainsPriests = true
        building.requiresSilence = true
        building.knowledgeGeneration = 2
        break
      case 'blacksmith':
        building.producesWeapons = true
        building.requiresFire = true
        building.noiseLevel = 'high'
        break
      case 'orchard':
        building.seasonalProduction = true
        building.beautifies = true
        break
    }
  }

  /**
   * Get upgrade options for UI
   */
  getUpgradeOptions(building) {
    const upgradePath = this.UPGRADE_PATHS[building.type]
    if (!upgradePath) return null

    const currentLevel = building.level || 1
    const options = {
      currentLevel,
      maxLevel: 3,
      nextUpgrade: null,
      specializations: []
    }

    // Next level upgrade
    if (currentLevel < 3) {
      const nextLevel = upgradePath[`level${currentLevel + 1}`]
      options.nextUpgrade = {
        name: nextLevel.name,
        cost: nextLevel.cost,
        benefits: nextLevel.benefits || {},
        requires: nextLevel.requires || []
      }
    }

    // Available specializations
    if (currentLevel >= 2 && upgradePath.specializations) {
      for (const [type, spec] of Object.entries(upgradePath.specializations)) {
        options.specializations.push({
          type,
          name: spec.name,
          cost: spec.cost,
          benefits: spec.benefits,
          requires: spec.requires || []
        })
      }
    }

    return options
  }

  /**
   * Calculate building efficiency based on level and condition
   */
  getBuildingEfficiency(building) {
    let efficiency = 1.0

    // Level bonus
    efficiency *= 1 + ((building.level || 1) - 1) * 0.3

    // Condition penalty
    const condition = building.condition || 100
    efficiency *= condition / 100

    // Specialization bonus
    if (building.specialization) {
      efficiency *= 1.2
    }

    // Worker satisfaction
    if (building.assignedVillagers?.length > 0) {
      const avgHappiness = building.assignedVillagers.reduce((sum, v) => sum + v.happiness, 0) / building.assignedVillagers.length
      efficiency *= 0.5 + (avgHappiness / 200)
    }

    return efficiency
  }
}

// Export singleton
export const buildingUpgradeSystem = new BuildingUpgradeSystem()