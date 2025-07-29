/**
 * Profession System - Specialized villager roles
 * Based on Black & White's villager specialization
 */

export class ProfessionSystem {
  constructor() {
    // Profession definitions
    this.PROFESSIONS = {
      FARMER: {
        name: 'Farmer',
        icon: '🌾',
        color: '#8B4513',
        requirements: {
          strength: 30,
          intelligence: 20
        },
        skills: {
          farming: 2.0,
          animalCare: 1.5,
          gathering: 1.3
        },
        tasks: ['farming', 'harvesting', 'planting', 'animalCare'],
        buildings: ['farm', 'storage', 'mill'],
        tools: ['hoe', 'scythe', 'basket']
      },
      BUILDER: {
        name: 'Builder',
        icon: '🔨',
        color: '#CD853F',
        requirements: {
          strength: 50,
          endurance: 40
        },
        skills: {
          construction: 2.5,
          repair: 2.0,
          planning: 1.5
        },
        tasks: ['building', 'repairing', 'planning', 'demolishing'],
        buildings: ['workshop', 'scaffolding'],
        tools: ['hammer', 'saw', 'blueprint']
      },
      PRIEST: {
        name: 'Priest',
        icon: '🙏',
        color: '#FFD700',
        requirements: {
          faith: 60,
          intelligence: 40
        },
        skills: {
          prayer: 3.0,
          healing: 1.5,
          conversion: 2.0,
          blessing: 2.0
        },
        tasks: ['praying', 'healing', 'converting', 'blessing'],
        buildings: ['temple', 'shrine', 'monastery'],
        tools: ['staff', 'holyBook', 'incense']
      },
      SOLDIER: {
        name: 'Soldier',
        icon: '⚔️',
        color: '#DC143C',
        requirements: {
          strength: 60,
          bravery: 50,
          endurance: 50
        },
        skills: {
          combat: 2.5,
          defense: 2.0,
          patrolling: 1.5,
          training: 1.3
        },
        tasks: ['patrolling', 'fighting', 'training', 'guarding'],
        buildings: ['barracks', 'watchtower', 'armory'],
        tools: ['sword', 'shield', 'armor']
      },
      MERCHANT: {
        name: 'Merchant',
        icon: '💰',
        color: '#FFD700',
        requirements: {
          intelligence: 50,
          social: 60
        },
        skills: {
          trading: 2.5,
          negotiation: 2.0,
          appraisal: 1.5
        },
        tasks: ['trading', 'selling', 'buying', 'appraising'],
        buildings: ['market', 'tradingPost', 'warehouse'],
        tools: ['scales', 'ledger', 'cart']
      },
      SCHOLAR: {
        name: 'Scholar',
        icon: '📚',
        color: '#4B0082',
        requirements: {
          intelligence: 70,
          curiosity: 60
        },
        skills: {
          research: 3.0,
          teaching: 2.0,
          invention: 1.5
        },
        tasks: ['researching', 'teaching', 'inventing', 'documenting'],
        buildings: ['library', 'school', 'laboratory'],
        tools: ['book', 'quill', 'telescope']
      },
      BREEDER: {
        name: 'Breeder',
        icon: '🐄',
        color: '#8B4513',
        requirements: {
          animalAffinity: 50,
          patience: 40
        },
        skills: {
          animalCare: 2.5,
          breeding: 2.0,
          training: 1.5
        },
        tasks: ['breeding', 'feeding', 'training', 'herding'],
        buildings: ['stable', 'pen', 'pasture'],
        tools: ['feed', 'rope', 'whistle']
      },
      FISHERMAN: {
        name: 'Fisherman',
        icon: '🎣',
        color: '#4682B4',
        requirements: {
          patience: 60,
          dexterity: 40
        },
        skills: {
          fishing: 3.0,
          boating: 1.5,
          netMaking: 1.3
        },
        tasks: ['fishing', 'boating', 'netMending', 'fishProcessing'],
        buildings: ['dock', 'fishery', 'boatHouse'],
        tools: ['fishingRod', 'net', 'boat']
      }
    }

    // Profession progression
    this.EXPERIENCE_LEVELS = {
      NOVICE: { min: 0, max: 100, multiplier: 1.0 },
      APPRENTICE: { min: 100, max: 500, multiplier: 1.2 },
      JOURNEYMAN: { min: 500, max: 1500, multiplier: 1.5 },
      EXPERT: { min: 1500, max: 3000, multiplier: 2.0 },
      MASTER: { min: 3000, max: Infinity, multiplier: 2.5 }
    }

    // Task priorities by profession
    this.TASK_PRIORITIES = {
      FARMER: ['farming', 'harvesting', 'gathering', 'idle'],
      BUILDER: ['building', 'repairing', 'gathering', 'idle'],
      PRIEST: ['praying', 'healing', 'converting', 'idle'],
      SOLDIER: ['patrolling', 'fighting', 'training', 'idle'],
      MERCHANT: ['trading', 'gathering', 'transporting', 'idle'],
      SCHOLAR: ['researching', 'teaching', 'idle'],
      BREEDER: ['feeding', 'breeding', 'gathering', 'idle'],
      FISHERMAN: ['fishing', 'processing', 'idle']
    }
  }

  /**
   * Assign a profession to a villager
   */
  assignProfession(villager, professionType, force = false) {
    const profession = this.PROFESSIONS[professionType]
    if (!profession) return false

    // Check requirements unless forced
    if (!force && !this.meetsRequirements(villager, profession)) {
      return false
    }

    // Remove old profession bonuses
    if (villager.profession) {
      this.removeProfessionBonuses(villager)
    }

    // Assign new profession
    villager.profession = professionType
    villager.professionLevel = 'NOVICE'
    villager.professionXP = 0
    villager.skills = { ...profession.skills }
    
    // Apply profession bonuses
    this.applyProfessionBonuses(villager, profession)
    
    // Update appearance
    villager.appearance = {
      ...villager.appearance,
      clothingColor: profession.color,
      tool: profession.tools[0]
    }

    return true
  }

  meetsRequirements(villager, profession) {
    for (const [stat, required] of Object.entries(profession.requirements)) {
      if ((villager.stats?.[stat] || villager[stat] || 0) < required) {
        return false
      }
    }
    return true
  }

  applyProfessionBonuses(villager, profession) {
    // Stat bonuses based on profession
    switch (villager.profession) {
      case 'FARMER':
        villager.stats.endurance *= 1.2
        villager.gatheringSpeed = 2.0
        break
      case 'BUILDER':
        villager.stats.strength *= 1.3
        villager.buildSpeed = 2.5
        break
      case 'PRIEST':
        villager.stats.faith *= 1.5
        villager.beliefGeneration = 2.0
        break
      case 'SOLDIER':
        villager.stats.strength *= 1.5
        villager.stats.endurance *= 1.3
        villager.combatPower = 2.5
        break
      case 'SCHOLAR':
        villager.stats.intelligence *= 1.5
        villager.learningSpeed = 3.0
        break
    }
  }

  removeProfessionBonuses(villager) {
    // Reset modified stats
    villager.gatheringSpeed = 1.0
    villager.buildSpeed = 1.0
    villager.beliefGeneration = 1.0
    villager.combatPower = 1.0
    villager.learningSpeed = 1.0
  }

  /**
   * Update villager profession experience
   */
  gainExperience(villager, task, amount = 1) {
    if (!villager.profession) return

    const profession = this.PROFESSIONS[villager.profession]
    if (!profession.tasks.includes(task)) {
      amount *= 0.5 // Half XP for non-profession tasks
    }

    villager.professionXP += amount

    // Check for level up
    const currentLevel = this.getExperienceLevel(villager.professionXP)
    if (currentLevel !== villager.professionLevel) {
      this.levelUpProfession(villager, currentLevel)
    }
  }

  getExperienceLevel(xp) {
    for (const [level, config] of Object.entries(this.EXPERIENCE_LEVELS)) {
      if (xp >= config.min && xp < config.max) {
        return level
      }
    }
    return 'MASTER'
  }

  levelUpProfession(villager, newLevel) {
    villager.professionLevel = newLevel
    const levelConfig = this.EXPERIENCE_LEVELS[newLevel]
    
    // Apply level multiplier to skills
    const profession = this.PROFESSIONS[villager.profession]
    for (const [skill, baseValue] of Object.entries(profession.skills)) {
      villager.skills[skill] = baseValue * levelConfig.multiplier
    }

    // Special bonuses for reaching master level
    if (newLevel === 'MASTER') {
      villager.canTeach = true
      villager.inspiresOthers = true
      villager.happiness += 20
    }

    // Visual feedback
    villager.levelUpEffect = {
      duration: 180, // 3 seconds
      color: '#FFD700'
    }
  }

  /**
   * Get suitable task for villager based on profession
   */
  getTaskForProfession(villager, availableTasks) {
    if (!villager.profession) {
      return availableTasks[0] || 'idle'
    }

    const priorities = this.TASK_PRIORITIES[villager.profession]
    
    // Find highest priority task that's available
    for (const task of priorities) {
      if (availableTasks.includes(task)) {
        return task
      }
    }

    return 'idle'
  }

  /**
   * Determine best profession for unemployed villager
   */
  suggestProfession(villager, playerNeeds) {
    const professionScores = {}

    // Score each profession based on villager stats and player needs
    for (const [type, profession] of Object.entries(this.PROFESSIONS)) {
      let score = 0

      // Base score from meeting requirements
      const meetsReqs = this.meetsRequirements(villager, profession)
      score += meetsReqs ? 50 : 0

      // Score from player needs
      if (playerNeeds[type.toLowerCase()]) {
        score += playerNeeds[type.toLowerCase()] * 10
      }

      // Score from villager personality
      score += this.getPersonalityScore(villager, type)

      professionScores[type] = score
    }

    // Return highest scoring profession
    return Object.entries(professionScores)
      .sort(([,a], [,b]) => b - a)[0][0]
  }

  getPersonalityScore(villager, professionType) {
    let score = 0

    switch (professionType) {
      case 'FARMER':
        score += villager.traits?.hardWorking ? 20 : 0
        score += villager.traits?.natureLover ? 15 : 0
        break
      case 'SOLDIER':
        score += villager.traits?.brave ? 25 : 0
        score += villager.traits?.aggressive ? 15 : 0
        break
      case 'PRIEST':
        score += villager.traits?.spiritual ? 30 : 0
        score += villager.traits?.compassionate ? 20 : 0
        break
      case 'SCHOLAR':
        score += villager.traits?.curious ? 25 : 0
        score += villager.traits?.intelligent ? 20 : 0
        break
      case 'MERCHANT':
        score += villager.traits?.social ? 20 : 0
        score += villager.traits?.greedy ? 15 : 0
        break
    }

    return score
  }

  /**
   * Create profession training program
   */
  startTraining(teacher, student, profession) {
    if (!teacher.canTeach || teacher.profession !== profession) {
      return false
    }

    student.training = {
      profession,
      teacher: teacher.id,
      progress: 0,
      duration: 600 // 10 seconds
    }

    teacher.task = 'teaching'
    student.task = 'learning'

    return true
  }

  /**
   * Update training progress
   */
  updateTraining(student, deltaTime) {
    if (!student.training) return

    student.training.progress += deltaTime / 1000
    
    if (student.training.progress >= student.training.duration) {
      // Training complete
      this.assignProfession(student, student.training.profession, true)
      student.training = null
      student.task = 'idle'
    }
  }

  /**
   * Analyze village needs to determine which professions are needed
   */
  analyzeVillageNeeds(player) {
    const needs = {
      FARMER: 0,
      BUILDER: 0,
      PRIEST: 0,
      SOLDIER: 0,
      SCHOLAR: 0
    }

    // Count existing professions
    const professionCounts = {}
    for (const profession of Object.keys(this.PROFESSIONS)) {
      professionCounts[profession] = player.villagers.filter(v => v.profession === profession).length
    }

    // Analyze needs based on village state
    const totalVillagers = player.villagers.length
    const buildingCount = player.buildings.length
    const templeCount = player.buildings.filter(b => b.type === 'temple').length
    
    // Need farmers based on population
    needs.FARMER = Math.max(0, Math.ceil(totalVillagers * 0.3) - (professionCounts.FARMER || 0))
    
    // Need builders based on construction
    const underConstruction = player.buildings.filter(b => b.isUnderConstruction).length
    needs.BUILDER = Math.max(0, Math.ceil(underConstruction * 0.5 + buildingCount * 0.1) - (professionCounts.BUILDER || 0))
    
    // Need priests based on temples
    needs.PRIEST = Math.max(0, templeCount - (professionCounts.PRIEST || 0))
    
    // Need soldiers for defense (10% of population)
    needs.SOLDIER = Math.max(0, Math.ceil(totalVillagers * 0.1) - (professionCounts.SOLDIER || 0))
    
    // Need scholars for research (5% of population)
    needs.SCHOLAR = Math.max(0, Math.ceil(totalVillagers * 0.05) - (professionCounts.SCHOLAR || 0))

    return needs
  }

  /**
   * Get profession statistics for UI
   */
  getProfessionStats(player) {
    const stats = {}
    
    for (const profession of Object.keys(this.PROFESSIONS)) {
      stats[profession] = {
        count: player.villagers.filter(v => v.profession === profession).length,
        averageLevel: 0,
        efficiency: 1.0
      }
    }

    // Calculate average levels and efficiency
    for (const [profession, data] of Object.entries(stats)) {
      if (data.count > 0) {
        const professionVillagers = player.villagers.filter(v => v.profession === profession)
        const totalXP = professionVillagers.reduce((sum, v) => sum + v.professionXP, 0)
        data.averageLevel = this.getExperienceLevel(totalXP / data.count)
        
        // Calculate efficiency based on happiness and needs
        const avgHappiness = professionVillagers.reduce((sum, v) => sum + v.happiness, 0) / data.count
        data.efficiency = (avgHappiness / 100) * 1.5
      }
    }

    return stats
  }
}

// Export singleton
export const professionSystem = new ProfessionSystem()