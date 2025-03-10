import { 
  GlobalStateSchema, 
  PlayerSchema, 
  QuestSchema, 
  LeaderboardEntry 
} from './schemas';

// Calculate and return the leaderboard based on player data
export function calculateLeaderboard(players: PlayerSchema[]): LeaderboardEntry[] {
  // Sort players by total points in descending order
  const sortedPlayers = [...players].sort((a, b) => 
    b.stats.totalPoints - a.stats.totalPoints
  );
  
  // Create leaderboard entries
  return sortedPlayers.slice(0, 10).map((player, index) => ({
    userId: player.userId,
    username: player.username,
    score: player.stats.totalPoints,
    rank: index + 1
  }));
}

// Generate a set of daily quests
export function generateDailyQuests(): QuestSchema[] {
  const quests: QuestSchema[] = [];
  
  // Environment quests
  quests.push({
    id: `env_${Date.now()}_1`,
    title: 'Plant a Tree',
    description: 'Plant a tree in your farm to help the environment.',
    type: 'environment',
    points: 10,
    requirements: {
      action: 'plant',
      target: 'tree',
      count: 1
    }
  });
  
  quests.push({
    id: `env_${Date.now()}_2`,
    title: 'Clean the Ocean',
    description: 'Help clean up virtual pollution from the oceans.',
    type: 'environment',
    points: 15,
    requirements: {
      action: 'clean',
      target: 'ocean',
      count: 1
    }
  });
  
  // Community quests
  quests.push({
    id: `com_${Date.now()}_1`,
    title: 'Help a Neighbor',
    description: 'Visit another player\'s house and help with a task.',
    type: 'community',
    points: 12,
    requirements: {
      action: 'help',
      target: 'player',
      count: 1
    }
  });
  
  quests.push({
    id: `com_${Date.now()}_2`,
    title: 'Organize Community Event',
    description: 'Organize a virtual event for all villagers to enjoy.',
    type: 'community',
    points: 20,
    requirements: {
      action: 'organize',
      target: 'event',
      count: 1
    }
  });
  
  // Personal growth quests
  quests.push({
    id: `per_${Date.now()}_1`,
    title: 'Solve a Puzzle',
    description: 'Exercise your mind by solving a challenging puzzle.',
    type: 'personal',
    points: 8,
    requirements: {
      action: 'solve',
      target: 'puzzle',
      count: 1
    }
  });
  
  quests.push({
    id: `per_${Date.now()}_2`,
    title: 'Learn a New Skill',
    description: 'Spend time learning a new skill to improve yourself.',
    type: 'personal',
    points: 10,
    requirements: {
      action: 'learn',
      target: 'skill',
      count: 1
    }
  });
  
  return quests;
}

// Update global progress based on completed quests
export function updateGlobalProgress(
  globalState: GlobalStateSchema,
  quest: QuestSchema,
  action: string
): GlobalStateSchema {
  const updatedState = { ...globalState };
  
  // Update relevant global goal based on quest type and action
  if (quest.type === 'environment') {
    if (action === 'plant' && quest.requirements.target === 'tree') {
      updatedState.globalGoals.treesPlanted.current += 1;
    } else if (action === 'clean' && quest.requirements.target === 'ocean') {
      updatedState.globalGoals.oceansClean.current += 1;
    }
  } else if (quest.type === 'community') {
    if (action === 'organize' && quest.requirements.target === 'event') {
      updatedState.globalGoals.communityEventsHeld.current += 1;
    }
  }
  
  return updatedState;
}

// Check if a quest is completed
export function isQuestCompleted(
  player: PlayerSchema,
  quest: QuestSchema,
  action: string
): boolean {
  // Check if player already completed this quest
  if (player.quests.completed.includes(quest.id)) {
    return true;
  }
  
  // Check requirements
  switch (quest.requirements.action) {
    case 'plant':
      if (action === 'plant' && quest.requirements.target === 'tree') {
        return true;
      }
      break;
    case 'clean':
      if (action === 'clean' && quest.requirements.target === 'ocean') {
        return true;
      }
      break;
    case 'help':
      if (action === 'help' && quest.requirements.target === 'player') {
        return true;
      }
      break;
    case 'organize':
      if (action === 'organize' && quest.requirements.target === 'event') {
        return true;
      }
      break;
    case 'solve':
      if (action === 'solve' && quest.requirements.target === 'puzzle') {
        return true;
      }
      break;
    case 'learn':
      if (action === 'learn' && quest.requirements.target === 'skill') {
        return true;
      }
      break;
  }
  
  return false;
}

// Get available pets
export function getAvailablePets() {
  return [
    {
      type: 'cat',
      name: 'Cat',
      description: 'Boosts personal growth points by 10%',
      bonus: { type: 'personalGrowth', value: 10 }
    },
    {
      type: 'dog',
      name: 'Dog',
      description: 'Boosts community points by 10%',
      bonus: { type: 'community', value: 10 }
    },
    {
      type: 'bird',
      name: 'Bird',
      description: 'Boosts environmental points by 10%',
      bonus: { type: 'environment', value: 10 }
    },
    {
      type: 'rabbit',
      name: 'Rabbit',
      description: 'Makes crops grow 15% faster',
      bonus: { type: 'farmSpeed', value: 15 }
    }
  ];
}

// Get available house styles
export function getHouseStyles() {
  return {
    interior: [
      'cozy',
      'modern',
      'rustic',
      'minimalist',
      'bohemian'
    ],
    exterior: [
      'cottage',
      'cabin',
      'modern',
      'victorian',
      'ranch'
    ]
  };
}

// Get available crops
export function getAvailableCrops() {
  return [
    {
      type: 'tree',
      name: 'Tree',
      growthTime: 24 * 60 * 60 * 1000, // 24 hours
      environmentalImpact: 5
    },
    {
      type: 'tomato',
      name: 'Tomato',
      growthTime: 2 * 60 * 60 * 1000, // 2 hours
      environmentalImpact: 1
    },
    {
      type: 'corn',
      name: 'Corn',
      growthTime: 4 * 60 * 60 * 1000, // 4 hours
      environmentalImpact: 2
    },
    {
      type: 'wheat',
      name: 'Wheat',
      growthTime: 3 * 60 * 60 * 1000, // 3 hours
      environmentalImpact: 2
    },
    {
      type: 'flower',
      name: 'Flower',
      growthTime: 1 * 60 * 60 * 1000, // 1 hour
      environmentalImpact: 1
    }
  ];
}

// Get available animals
export function getAvailableAnimals() {
  return [
    {
      type: 'chicken',
      name: 'Chicken',
      product: 'egg',
      productionTime: 6 * 60 * 60 * 1000 // 6 hours
    },
    {
      type: 'cow',
      name: 'Cow',
      product: 'milk',
      productionTime: 12 * 60 * 60 * 1000 // 12 hours
    },
    {
      type: 'sheep',
      name: 'Sheep',
      product: 'wool',
      productionTime: 24 * 60 * 60 * 1000 // 24 hours
    }
  ];
}

// Calculate progress percentage for a global goal
export function calculateGoalProgress(current: number, target: number): number {
  return Math.min(Math.round((current / target) * 100), 100);
}

// Format timestamp to readable date
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}