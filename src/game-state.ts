import { Devvit } from '@devvit/public-api';

// ==== CORE TYPES ====

export type PlayerData = {
  username: string;
  joinedAt: number;
  lastActive: number;
  house: HouseData;
  inventory: InventoryData;
  stats: StatsData;
  questIds: string[]; // Store IDs only, not full quest data
  pet?: PetData;
  shardId: number; // Which player shard this player belongs to
};

export type PlayerSummary = {
  username: string;
  totalPoints: number;
  lastActive: number;
  joinedAt: number;
};

export type HouseData = {
  interior: {
    cleanliness: number;
    furniture: string[];
    decorations: string[];
  };
  exterior: {
    plants: number;
    decorations: string[];
  };
  farm: {
    crops: { type: string; plantedAt: number; growthStage: number }[];
    trees: number;
    compost: number;
  };
};

export type InventoryData = {
  seeds: Record<string, number>;
  materials: Record<string, number>;
  items: string[];
  currency: number;
};

export type StatsData = {
  environmental: number;
  social: number;
  personal: number;
  totalActions: number;
};

export type QuestData = {
  id: string;
  type: 'environmental' | 'social' | 'personal';
  title: string;
  description: string;
  progress: number;
  goal: number;
  reward: {
    environmentalPoints?: number;
    socialPoints?: number;
    personalPoints?: number;
    currency?: number;
    items?: string[];
  };
  completedAt?: number;
  playerId: string; // Reference to the player
};

export type PetData = {
  type: string;
  name: string;
  happiness: number;
  adoptedAt: number;
};

export type CommunityEvent = {
  id: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  goal: number;
  progress: number;
  participants: string[]; // For small events, store usernames. For large events, we'll use a bitfield in a separate store
  rewards: {
    environmental: number;
    social: number;
    personal: number;
  };
};

export type DailyChallenge = {
  type: 'environmental' | 'social' | 'personal';
  description: string;
  goal: number;
  current: number;
  participants: string[]; // For small challenges, store usernames
  participantCount: number; // For efficiency in display
  expiresAt: number;
};

export type Milestone = {
  id: string;
  title: string;
  description: string;
  pointsRequired: number;
  achieved: boolean;
  achievedAt?: number;
};

export type Activity = {
  username: string;
  action: string;
  timestamp: number;
};

// ==== SHARDED DATA STORES ====

// Root game state - small and fast to access
export type GameState = {
  version: number;
  communityProgress: {
    environmental: number;
    social: number;
    personal: number;
  };
  playerCount: number;
  activePlayerCount: number; // Active in last 24h
  dailyChallenge?: DailyChallenge;
  lastUpdated: number;
  shardCount: number; // How many player shards we've created
};

// Sharded player storage - each shard contains up to 5000 players
export type PlayerShard = {
  shardId: number;
  players: Record<string, PlayerData>;
  lastUpdated: number;
};

// Top 1000 players by score - fast access for leaderboards
export type LeaderboardStore = {
  players: PlayerSummary[];
  lastUpdated: number;
};

// Recent 200 activities - circular buffer FIFO
export type ActivityStore = {
  activities: Activity[];
  lastUpdated: number;
};

// Quest store - holds all current quests
export type QuestStore = {
  quests: Record<string, QuestData>;
  lastUpdated: number;
};

// Community features store
export type CommunityStore = {
  events: CommunityEvent[];
  milestones: Milestone[];
  lastUpdated: number;
};

// Event participation store (for events with >1000 participants)
export type EventParticipationStore = {
  eventId: string;
  // Store each username as a key with value = true
  // This is more efficient than arrays for lookups
  participants: Record<string, boolean>;
  participantCount: number;
  lastUpdated: number;
};

// Challenge participation store (for challenges with >1000 participants)
export type ChallengeParticipationStore = {
  challengeId: string;
  participants: Record<string, boolean>;
  participantCount: number;
  lastUpdated: number;
};

// ==== PLAYER MANAGEMENT ====

// Find which shard a player belongs to
export function getPlayerShardId(username: string, shardCount: number): number {
  // Simple hashing algorithm for shard assignment
  // This ensures a player is always mapped to the same shard
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash << 5) - hash + username.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash % shardCount);
}

// Get player data with automatic shard lookup
export async function getPlayerData(postId: string, username: string): Promise<PlayerData | null> {
  try {
    // Get main game state to determine shard count
    const gameState = await Devvit.storage.get<GameState>(`gameState:${postId}`);
    if (!gameState) return null;
    
    // Determine which shard the player is in
    const shardId = getPlayerShardId(username, Math.max(1, gameState.shardCount));
    
    // Get the player shard
    const shard = await Devvit.storage.get<PlayerShard>(`playerShard:${postId}:${shardId}`);
    if (!shard) return null;
    
    // Return the player data
    return shard.players[username] || null;
  } catch (error) {
    console.error(`Error getting player data for ${username}:`, error);
    return null;
  }
}

// Save player data with automatic shard lookup
export async function savePlayerData(postId: string, player: PlayerData): Promise<boolean> {
  try {
    // Get main game state to determine shard count
    const gameState = await Devvit.storage.get<GameState>(`gameState:${postId}`);
    if (!gameState) return false;
    
    // Determine which shard the player is in
    const shardId = player.shardId;
    
    // Get the player shard
    let shard = await Devvit.storage.get<PlayerShard>(`playerShard:${postId}:${shardId}`);
    if (!shard) {
      // Create a new shard if it doesn't exist
      shard = {
        shardId,
        players: {},
        lastUpdated: Date.now()
      };
    }
    
    // Update the player data
    shard.players[player.username] = player;
    shard.lastUpdated = Date.now();
    
    // Save the updated shard
    await Devvit.storage.set(`playerShard:${postId}:${shardId}`, shard);
    
    // Update leaderboard if needed
    await updateLeaderboardForPlayer(postId, player);
    
    return true;
  } catch (error) {
    console.error(`Error saving player data for ${player.username}:`, error);
    return false;
  }
}

// Create a new player
export function createNewPlayer(username: string, shardId: number): PlayerData {
  return {
    username,
    joinedAt: Date.now(),
    lastActive: Date.now(),
    shardId,
    house: {
      interior: {
        cleanliness: 50,
        furniture: ['basic_bed', 'basic_table', 'basic_chair'],
        decorations: [],
      },
      exterior: {
        plants: 0,
        decorations: [],
      },
      farm: {
        crops: [],
        trees: 0,
        compost: 0,
      },
    },
    inventory: {
      seeds: { 'carrot': 5, 'tomato': 3 },
      materials: { 'wood': 10, 'stone': 5 },
      items: [],
      currency: 100,
    },
    stats: {
      environmental: 0,
      social: 0,
      personal: 0,
      totalActions: 0,
    },
    questIds: [
      'welcome_quest_' + Date.now(),
      'plant_trees_' + Date.now(),
      'help_neighbors_' + Date.now()
    ],
  };
}

// ==== QUEST MANAGEMENT ====

// Get quests for a player
export async function getPlayerQuests(postId: string, questIds: string[]): Promise<QuestData[]> {
  try {
    const questStore = await Devvit.storage.get<QuestStore>(`questStore:${postId}`);
    if (!questStore) return [];
    
    // Return only the quests that exist in the store
    return questIds
      .map(id => questStore.quests[id])
      .filter(quest => quest !== undefined);
  } catch (error) {
    console.error(`Error getting quests:`, error);
    return [];
  }
}

// Save a quest
export async function saveQuest(postId: string, quest: QuestData): Promise<boolean> {
  try {
    let questStore = await Devvit.storage.get<QuestStore>(`questStore:${postId}`);
    if (!questStore) {
      questStore = {
        quests: {},
        lastUpdated: Date.now()
      };
    }
    
    // Add/update the quest
    questStore.quests[quest.id] = quest;
    questStore.lastUpdated = Date.now();
    
    // Save the quest store
    await Devvit.storage.set(`questStore:${postId}`, questStore);
    return true;
  } catch (error) {
    console.error(`Error saving quest:`, error);
    return false;
  }
}

// ==== LEADERBOARD MANAGEMENT ====

// Update leaderboard with a player's new stats
export async function updateLeaderboardForPlayer(postId: string, player: PlayerData): Promise<void> {
  try {
    let leaderboard = await Devvit.storage.get<LeaderboardStore>(`leaderboard:${postId}`);
    if (!leaderboard) {
      leaderboard = {
        players: [],
        lastUpdated: Date.now()
      };
    }
    
    // Calculate total points
    const totalPoints = 
      player.stats.environmental + 
      player.stats.social + 
      player.stats.personal;
    
    // Remove player from leaderboard if they exist
    leaderboard.players = leaderboard.players.filter(p => p.username !== player.username);
    
    // Create player summary
    const playerSummary: PlayerSummary = {
      username: player.username,
      totalPoints,
      lastActive: player.lastActive,
      joinedAt: player.joinedAt
    };
    
    // Add player to leaderboard
    leaderboard.players.push(playerSummary);
    
    // Sort by points (descending)
    leaderboard.players.sort((a, b) => b.totalPoints - a.totalPoints);
    
    // Keep only top 1000 players
    leaderboard.players = leaderboard.players.slice(0, 1000);
    
    leaderboard.lastUpdated = Date.now();
    
    // Save updated leaderboard
    await Devvit.storage.set(`leaderboard:${postId}`, leaderboard);
  } catch (error) {
    console.error(`Error updating leaderboard:`, error);
  }
}

// Get player rank
export async function getPlayerRank(postId: string, username: string): Promise<number> {
  try {
    const leaderboard = await Devvit.storage.get<LeaderboardStore>(`leaderboard:${postId}`);
    if (!leaderboard) return 0;
    
    const playerIndex = leaderboard.players.findIndex(p => p.username === username);
    return playerIndex >= 0 ? playerIndex + 1 : leaderboard.players.length + 1;
  } catch (error) {
    console.error(`Error getting player rank:`, error);
    return 0;
  }
}

// ==== ACTIVITY FEED MANAGEMENT ====

// Add activity to the feed
export async function addActivity(postId: string, activity: Activity): Promise<void> {
  try {
    let activityStore = await Devvit.storage.get<ActivityStore>(`activities:${postId}`);
    if (!activityStore) {
      activityStore = {
        activities: [],
        lastUpdated: Date.now()
      };
    }
    
    // Add new activity to the beginning
    activityStore.activities.unshift(activity);
    
    // Keep only the latest 200 activities
    activityStore.activities = activityStore.activities.slice(0, 200);
    
    activityStore.lastUpdated = Date.now();
    
    // Save updated activity store
    await Devvit.storage.set(`activities:${postId}`, activityStore);
  } catch (error) {
    console.error(`Error adding activity:`, error);
  }
}

// Get recent activities
export async function getRecentActivities(postId: string, limit: number = 50): Promise<Activity[]> {
  try {
    const activityStore = await Devvit.storage.get<ActivityStore>(`activities:${postId}`);
    if (!activityStore) return [];
    
    return activityStore.activities.slice(0, limit);
  } catch (error) {
    console.error(`Error getting recent activities:`, error);
    return [];
  }
}

// ==== COMMUNITY MANAGEMENT ====

// Get community data
export async function getCommunityStore(postId: string): Promise<CommunityStore | null> {
  try {
    return await Devvit.storage.get<CommunityStore>(`community:${postId}`);
  } catch (error) {
    console.error(`Error getting community data:`, error);
    return null;
  }
}

// Save community data
export async function saveCommunityStore(postId: string, store: CommunityStore): Promise<boolean> {
  try {
    await Devvit.storage.set(`community:${postId}`, {
      ...store,
      lastUpdated: Date.now()
    });
    return true;
  } catch (error) {
    console.error(`Error saving community data:`, error);
    return false;
  }
}

// ==== EVENT PARTICIPATION ====

// Register participation in an event
export async function participateInEvent(
  postId: string, 
  eventId: string, 
  username: string
): Promise<boolean> {
  try {
    // Get event participation store
    let participationStore = await Devvit.storage.get<EventParticipationStore>(
      `eventParticipation:${postId}:${eventId}`
    );
    
    // Create if it doesn't exist
    if (!participationStore) {
      participationStore = {
        eventId,
        participants: {},
        participantCount: 0,
        lastUpdated: Date.now()
      };
    }
    
    // Check if user already participated
    if (participationStore.participants[username]) {
      return false;
    }
    
    // Register participation
    participationStore.participants[username] = true;
    participationStore.participantCount++;
    participationStore.lastUpdated = Date.now();
    
    // Save participation store
    await Devvit.storage.set(`eventParticipation:${postId}:${eventId}`, participationStore);
    
    // Update event progress in community store
    const communityStore = await getCommunityStore(postId);
    if (communityStore) {
      const eventIndex = communityStore.events.findIndex(e => e.id === eventId);
      if (eventIndex >= 0) {
        communityStore.events[eventIndex].progress++;
        // We no longer store full participant list in the event to save space
        await saveCommunityStore(postId, communityStore);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error participating in event:`, error);
    return false;
  }
}

// Check if a user participated in an event
export async function hasParticipatedInEvent(
  postId: string, 
  eventId: string, 
  username: string
): Promise<boolean> {
  try {
    const participationStore = await Devvit.storage.get<EventParticipationStore>(
      `eventParticipation:${postId}:${eventId}`
    );
    
    if (!participationStore) {
      return false;
    }
    
    return !!participationStore.participants[username];
  } catch (error) {
    console.error(`Error checking event participation:`, error);
    return false;
  }
}

// ==== CHALLENGE PARTICIPATION ====

// Register participation in a daily challenge
export async function participateInChallenge(
  postId: string,
  challengeId: string,
  username: string
): Promise<boolean> {
  try {
    // Get challenge participation store
    let participationStore = await Devvit.storage.get<ChallengeParticipationStore>(
      `challengeParticipation:${postId}:${challengeId}`
    );
    
    // Create if it doesn't exist
    if (!participationStore) {
      participationStore = {
        challengeId,
        participants: {},
        participantCount: 0,
        lastUpdated: Date.now()
      };
    }
    
    // Check if user already participated
    if (participationStore.participants[username]) {
      return false;
    }
    
    // Register participation
    participationStore.participants[username] = true;
    participationStore.participantCount++;
    participationStore.lastUpdated = Date.now();
    
    // Save participation store
    await Devvit.storage.set(`challengeParticipation:${postId}:${challengeId}`, participationStore);
    
    // Update challenge progress in game state
    const gameState = await getGameState(postId);
    if (gameState && gameState.dailyChallenge) {
      gameState.dailyChallenge.current++;
      gameState.dailyChallenge.participantCount++;
      // We no longer store full participant list in the challenge to save space
      await saveGameState(postId, gameState);
    }
    
    return true;
  } catch (error) {
    console.error(`Error participating in challenge:`, error);
    return false;
  }
}

// Check if a user participated in a challenge
export async function hasParticipatedInChallenge(
  postId: string,
  challengeId: string,
  username: string
): Promise<boolean> {
  try {
    const participationStore = await Devvit.storage.get<ChallengeParticipationStore>(
      `challengeParticipation:${postId}:${challengeId}`
    );
    
    if (!participationStore) {
      return false;
    }
    
    return !!participationStore.participants[username];
  } catch (error) {
    console.error(`Error checking challenge participation:`, error);
    return false;
  }
}

// ==== PLAYER COUNTING AND STATS ====

// Update player counts
export async function updatePlayerCounts(postId: string): Promise<void> {
  try {
    const gameState = await getGameState(postId);
    if (!gameState) return;
    
    let totalPlayers = 0;
    let activePlayers = 0;
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    // Loop through all shards
    for (let i = 0; i < gameState.shardCount; i++) {
      const shard = await Devvit.storage.get<PlayerShard>(`playerShard:${postId}:${i}`);
      if (!shard) continue;
      
      const shardPlayerCount = Object.keys(shard.players).length;
      totalPlayers += shardPlayerCount;
      
      // Count active players
      for (const player of Object.values(shard.players)) {
        if (player.lastActive > oneDayAgo) {
          activePlayers++;
        }
      }
    }
    
    // Update game state
    gameState.playerCount = totalPlayers;
    gameState.activePlayerCount = activePlayers;
    
    await saveGameState(postId, gameState);
  } catch (error) {
    console.error(`Error updating player counts:`, error);
  }
}

// ==== GAME STATE MANAGEMENT ====

// Get main game state
export async function getGameState(postId: string): Promise<GameState | null> {
  try {
    return await Devvit.storage.get<GameState>(`gameState:${postId}`);
  } catch (error) {
    console.error(`Error getting game state:`, error);
    return null;
  }
}

// Save main game state
export async function saveGameState(postId: string, state: GameState): Promise<boolean> {
  try {
    await Devvit.storage.set(`gameState:${postId}`, {
      ...state,
      lastUpdated: Date.now()
    });
    return true;
  } catch (error) {
    console.error(`Error saving game state:`, error);
    return false;
  }
}

// Create initial game state
export function createInitialGameState(): GameState {
  return {
    version: 1,
    communityProgress: {
      environmental: 0,
      social: 0,
      personal: 0
    },
    playerCount: 0,
    activePlayerCount: 0,
    lastUpdated: Date.now(),
    shardCount: 1,
  };
}

// Create initial community store
export function createInitialCommunityStore(): CommunityStore {
  return {
    events: [
      {
        id: 'welcome_event',
        title: 'Welcome to Villehaven',
        description: 'Join our community and help us reach 50 villagers!',
        startTime: Date.now(),
        endTime: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week
        goal: 50,
        progress: 0,
        participants: [],
        rewards: {
          environmental: 10,
          social: 20,
          personal: 10,
        },
      },
    ],
    milestones: [
      {
        id: 'first_50_players',
        title: 'Growing Community',
        description: 'Reach 50 active villagers',
        pointsRequired: 50,
        achieved: false,
      },
      {
        id: 'clean_village',
        title: 'Clean Village',
        description: 'Reach 1000 environmental points as a community',
        pointsRequired: 1000,
        achieved: false,
      },
      {
        id: 'social_hub',
        title: 'Social Hub',
        description: 'Reach 1000 social points as a community',
        pointsRequired: 1000,
        achieved: false,
      },
      {
        id: 'learning_center',
        title: 'Learning Center',
        description: 'Reach 1000 personal growth points as a community',
        pointsRequired: 1000,
        achieved: false,
      },
      {
        id: 'sustainable_village',
        title: 'Sustainable Village',
        description: 'Reach 5000 total community points',
        pointsRequired: 5000,
        achieved: false,
      },
    ],
    lastUpdated: Date.now(),
  };
}

// Create initial quest store with default quests
export function createInitialQuestStore(): QuestStore {
  // We'll create template quests when needed for each player
  return {
    quests: {},
    lastUpdated: Date.now()
  };
}

// Generate welcome quests for a new player
export async function generateWelcomeQuests(postId: string, playerId: string): Promise<string[]> {
  const questIds: string[] = [];
  
  const welcomeQuest: QuestData = {
    id: `welcome_quest_${Date.now()}`,
    type: 'personal',
    title: 'Welcome to Villehaven',
    description: 'Take your first steps in improving your new home.',
    progress: 0,
    goal: 3,
    reward: {
      personalPoints: 10,
      currency: 50,
    },
    playerId
  };
  
  const plantTreesQuest: QuestData = {
    id: `plant_trees_${Date.now()}`,
    type: 'environmental',
    title: 'Greener Village',
    description: 'Plant trees to improve the environment.',
    progress: 0,
    goal: 5,
    reward: {
      environmentalPoints: 15,
      currency: 30,
    },
    playerId
  };
  
  const helpNeighborsQuest: QuestData = {
    id: `help_neighbors_${Date.now()}`,
    type: 'social',
    title: 'Neighborly',
    description: 'Help your neighbors with their tasks.',
    progress: 0,
    goal: 3,
    reward: {
      socialPoints: 15,
      currency: 25,
    },
    playerId
  };
  
  // Save quests
  await saveQuest(postId, welcomeQuest);
  await saveQuest(postId, plantTreesQuest);
  await saveQuest(postId, helpNeighborsQuest);
  
  questIds.push(welcomeQuest.id);
  questIds.push(plantTreesQuest.id);
  questIds.push(helpNeighborsQuest.id);
  
  return questIds;
}

// Create a daily challenge
export function createDailyChallenge(): DailyChallenge {
  const challengeTypes = ['environmental', 'social', 'personal'] as const;
  const randomType = challengeTypes[Math.floor(Math.random() * challengeTypes.length)];
  const challenges = [
    'Plant trees and flowers around the village',
    'Help neighbors with their daily tasks',
    'Clean up the community spaces',
    'Share resources with those in need',
    'Learn new skills to benefit the community',
  ];
  
  const challengeId = `daily_${Date.now()}`;
  
  return {
    type: randomType,
    description: challenges[Math.floor(Math.random() * challenges.length)],
    goal: Math.floor(Math.random() * 10) + 20, // Between 20-30
    current: 0,
    participants: [],
    participantCount: 0,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
  };
}

// ==== INITIALIZATION AND MAINTENANCE ====

// Initialize all game data stores
export async function initializeGameDataStores(postId: string): Promise<boolean> {
  try {
    // Create initial game state
    const gameState = createInitialGameState();
    await saveGameState(postId, gameState);
    
    // Create initial player shard
    const playerShard: PlayerShard = {
      shardId: 0,
      players: {},
      lastUpdated: Date.now()
    };
    await Devvit.storage.set(`playerShard:${postId}:0`, playerShard);
    
    // Create empty leaderboard
    const leaderboard: LeaderboardStore = {
      players: [],
      lastUpdated: Date.now()
    };
    await Devvit.storage.set(`leaderboard:${postId}`, leaderboard);
    
    // Create empty activity feed
    const activityStore: ActivityStore = {
      activities: [],
      lastUpdated: Date.now()
    };
    await Devvit.storage.set(`activities:${postId}`, activityStore);
    
    // Create initial community store
    const communityStore = createInitialCommunityStore();
    await saveCommunityStore(postId, communityStore);
    
    // Create initial quest store
    const questStore = createInitialQuestStore();
    await Devvit.storage.set(`questStore:${postId}`, questStore);
    
    // Create daily challenge
    const dailyChallenge = createDailyChallenge();
    gameState.dailyChallenge = dailyChallenge;
    await saveGameState(postId, gameState);
    
    return true;
  } catch (error) {
    console.error(`Error initializing game data stores:`, error);
    return false;
  }
}

// Create new shard when needed
export async function createNewShard(postId: string): Promise<number> {
  try {
    const gameState = await getGameState(postId);
    if (!gameState) throw new Error("Game state not found");
    
    const newShardId = gameState.shardCount;
    
    // Create new empty shard
    const newShard: PlayerShard = {
      shardId: newShardId,
      players: {},
      lastUpdated: Date.now()
    };
    
    await Devvit.storage.set(`playerShard:${postId}:${newShardId}`, newShard);
    
    // Update game state
    gameState.shardCount++;
    await saveGameState(postId, gameState);
    
    return newShardId;
  } catch (error) {
    console.error(`Error creating new shard:`, error);
    return -1;
  }
}

// Check if we need to create a new shard
export async function checkAndCreateNewShardIfNeeded(postId: string): Promise<void> {
  try {
    const gameState = await getGameState(postId);
    if (!gameState) return;
    
    // Check the last shard
    const lastShardId = gameState.shardCount - 1;
    const lastShard = await Devvit.kvStorage.get<PlayerShard>(`playerShard:${postId}:${lastShardId}`);
    
    if (!lastShard) return;
    
    // If the last shard has more than 5000 players, create a new one
    const playerCount = Object.keys(lastShard.players).length;
    if (playerCount >= 5000) {
      await createNewShard(postId);
    }
  } catch (error) {
    console.error(`Error checking shard capacity:`, error);
  }
}

// Update community progress when a player performs an action
export async function updateCommunityProgress(
  postId: string,
  environmentalDelta: number,
  socialDelta: number,
  personalDelta: number
): Promise<void> {
  try {
    const gameState = await getGameState(postId);
    if (!gameState) return;
    
    // Update community progress
    gameState.communityProgress.environmental += environmentalDelta;
    gameState.communityProgress.social += socialDelta;
    gameState.communityProgress.personal += personalDelta;
    
    // Save game state
    await saveGameState(postId, gameState);
    
    // Check if any milestones have been achieved
    await checkMilestones(postId);
  } catch (error) {
    console.error(`Error updating community progress:`, error);
  }
}

// Check if any milestones have been achieved
export async function checkMilestones(postId: string): Promise<void> {
  try {
    const gameState = await getGameState(postId);
    const communityStore = await getCommunityStore(postId);
    
    if (!gameState || !communityStore) return;
    
    let updated = false;
    
    // Check each milestone
    for (const milestone of communityStore.milestones) {
      if (milestone.achieved) continue;
      
      // Check if milestone has been achieved
      let achieved = false;
      
      switch (milestone.id) {
        case 'first_50_players':
          achieved = gameState.playerCount >= 50;
          break;
        case 'clean_village':
          achieved = gameState.communityProgress.environmental >= 1000;
          break;
        case 'social_hub':
          achieved = gameState.communityProgress.social >= 1000;
          break;
        case 'learning_center':
          achieved = gameState.communityProgress.personal >= 1000;
          break;
        case 'sustainable_village':
          achieved = (
            gameState.communityProgress.environmental +
            gameState.communityProgress.social +
            gameState.communityProgress.personal
          ) >= 5000;
          break;
      }
      
      if (achieved) {
        milestone.achieved = true;
        milestone.achievedAt = Date.now();
        updated = true;
        
        // Add milestone achievement activity
        await addActivity(postId, {
          username: 'Villehaven',
          action: `🏆 Milestone achieved: ${milestone.title}!`,
          timestamp: Date.now()
        });
      }
    }
    
    if (updated) {
      await saveCommunityStore(postId, communityStore);
      
      // Update post preview
      await updateCustomPostPreview(postId);
    }
  } catch (error) {
    console.error(`Error checking milestones:`, error);
  }
}

// Update custom post preview
export async function updateCustomPostPreview(postId: string): Promise<void> {
  try {
    const gameState = await getGameState(postId);
    if (!gameState) return;
    
    const totalPoints = 
      gameState.communityProgress.environmental + 
      gameState.communityProgress.social + 
      gameState.communityProgress.personal;
    
    // Get most recent milestone achievement
    const communityStore = await getCommunityStore(postId);
    const recentMilestone = communityStore?.milestones.find(m => 
      m.achieved && m.achievedAt && m.achievedAt > Date.now() - 24 * 60 * 60 * 1000
    );
    
    // Get most recent activity
    const recentActivities = await getRecentActivities(postId, 1);
    const recentActivity = recentActivities.length > 0 
      ? `${recentActivities[0].username} ${recentActivities[0].action}`
      : null;
    
    // Build display text
    let displayText = `Villehaven%0A${gameState.playerCount}+Villagers%0A${totalPoints}+Community+Points`;
    
    if (recentMilestone) {
      displayText += `%0A🏆+${recentMilestone.title}+Achieved!`;
    } else if (recentActivity) {
      displayText += `%0A${recentActivity}`;
    }
    
    // Check for daily challenge
    if (gameState.dailyChallenge) {
      const timeLeft = Math.max(0, gameState.dailyChallenge.expiresAt - Date.now());
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      
      if (hoursLeft > 0) {
        displayText += `%0A📅+Daily+Challenge:+${hoursLeft}h+left`;
      }
    }
    
    await Devvit.api.setCustomPostPreview({
      postId,
      preview: {
        type: 'image',
        url: `https://placehold.co/600x400/87CEEB/FFFFFF/png?text=${displayText}`,
        width: 600,
        height: 400,
      },
    });
  } catch (error) {
    console.error(`Error updating custom post preview:`, error);
  }
}

export default {
  // Player functions
  getPlayerData,
  savePlayerData,
  createNewPlayer,
  getPlayerShardId,
  
  // Quest functions
  getPlayerQuests,
  saveQuest,
  generateWelcomeQuests,
  
  // Leaderboard functions
  updateLeaderboardForPlayer,
  getPlayerRank,
  
  // Activity functions
  addActivity,
  getRecentActivities,
  
  // Community functions
  getCommunityStore,
  saveCommunityStore,
  
  // Event participation
  participateInEvent,
  hasParticipatedInEvent,
  
  // Challenge participation
  participateInChallenge,
  hasParticipatedInChallenge,
  
  // Game state functions
  getGameState,
  saveGameState,
  createInitialGameState,
  createInitialCommunityStore,
  createInitialQuestStore,
  createDailyChallenge,
  
  // Initialization and maintenance
  initializeGameDataStores,
  createNewShard,
  checkAndCreateNewShardIfNeeded,
  updatePlayerCounts,
  
  // Progress and milestones
  updateCommunityProgress,
  checkMilestones,
  updateCustomPostPreview
};