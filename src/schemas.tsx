// Player schema
export interface PlayerSchema {
  userId: string;
  username: string;
  house: {
    interior: {
      style: string;
      items: HouseItem[];
    };
    exterior: {
      style: string;
      items: HouseItem[];
    };
  };
  farm: {
    crops: Crop[];
    animals: Animal[];
  };
  inventory: {
    resources: Resource[];
    items: InventoryItem[];
  };
  quests: {
    completed: string[];
    active: string[];
  };
  stats: {
    environmentPoints: number;
    communityPoints: number;
    personalGrowthPoints: number;
    totalPoints: number;
  };
  pet: PetSchema | null;
  lastActive: number;
}

// House item schema
export interface HouseItem {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  acquiredAt: number;
}

// Crop schema
export interface Crop {
  type: string;
  plantedAt: number;
  readyAt: number;
  harvested: boolean;
}

// Animal schema
export interface Animal {
  type: string;
  addedAt: number;
  happiness: number;
}

// Resource schema
export interface Resource {
  type: string;
  quantity: number;
  acquiredAt: number;
}

// Inventory item schema
export interface InventoryItem {
  id: string;
  type: string;
  name: string;
  acquiredAt: number;
  description: string;
}

// Pet schema
export interface PetSchema {
  type: string;
  name: string;
  level: number;
  happiness: number;
  bonuses: PetBonus[];
}

// Pet bonus schema
export interface PetBonus {
  type: 'environment' | 'community' | 'personalGrowth';
  value: number;
}

// Quest schema
export interface QuestSchema {
  id: string;
  title: string;
  description: string;
  type: 'environment' | 'community' | 'personal';
  points: number;
  requirements: {
    action: string;
    target: string;
    count: number;
  };
}

// Global state schema
export interface GlobalStateSchema {
  globalGoals: {
    treesPlanted: GlobalGoal;
    oceansClean: GlobalGoal;
    communityEventsHeld: GlobalGoal;
  };
  playerCount: number;
  leaderboard: LeaderboardEntry[];
  activePlayers: { [userId: string]: number };
  activeQuests: QuestSchema[];
  lastQuestRefresh: number;
}

// Global goal schema
export interface GlobalGoal {
  current: number;
  target: number;
  title: string;
}

// Leaderboard entry schema
export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
}

// Game settings schema
export interface GameSettings {
  title: string;
  enablePets: boolean;
  questRefreshHours: number;
}