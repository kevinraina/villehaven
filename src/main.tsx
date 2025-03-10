import { Devvit } from '@devvit/public-api';
import { GameView } from './components/GameView';
import { createPost } from './createPost';
import { PlayerSchema, GlobalStateSchema, PetSchema, QuestSchema } from './schemas';
import { calculateLeaderboard, generateDailyQuests, updateGlobalProgress } from './gameLogic';

Devvit.configure({
  redditAPI: true,
  kvStore: true,
  postEvents: true,
  redis: true,
});

// Register the custom post type for Villehaven
Devvit.addCustomPostType({
  name: 'Villehaven',
  description: 'A community-driven game focused on building a virtual town together',
  render: GameView,
});

// Set up custom post preview for feed
Devvit.addSettings([
  {
    type: 'string',
    name: 'title',
    label: 'Game Title',
    default: 'Villehaven - Build a Better World Together!',
  },
  {
    type: 'boolean',
    name: 'enablePets',
    label: 'Enable Pet Companions',
    default: true,
  },
  {
    type: 'number',
    name: 'questRefreshHours',
    label: 'Quest Refresh Time (hours)',
    default: 24,
  },
]);

// Initialize global game state 
Devvit.onTrigger('startGame', async (event, context) => {
  const kv = context.redis;
  const postId = event.postId;
  
  // Check if game state already exists
  const gameExists = await kv.get(`game:${postId}:initialized`);
  if (gameExists) {
    return;
  }
  
  // Initialize global state
  const initialGlobalState: GlobalStateSchema = {
    globalGoals: {
      treesPlanted: { current: 0, target: 10000, title: 'Trees Planted' },
      oceansClean: { current: 0, target: 1000, title: 'Oceans Cleaned' },
      communityEventsHeld: { current: 0, target: 500, title: 'Community Events' }
    },
    playerCount: 0,
    leaderboard: [],
    activePlayers: {},
    activeQuests: generateDailyQuests(),
    lastQuestRefresh: Date.now()
  };
  
  await kv.set(`game:${postId}:global`, JSON.stringify(initialGlobalState));
  await kv.set(`game:${postId}:initialized`, 'true');
  
  // Set up recurring tasks
  await context.scheduler.runEvery(60 * 60 * 1000, 'refreshQuests', { postId });
  await context.scheduler.runEvery(5 * 60 * 1000, 'updateLeaderboard', { postId });
});

// Refresh quests daily
Devvit.onSchedule('refreshQuests', async (event, context) => {
  const kv = context.redis;
  const postId = event.data.postId as string;
  
  // Get current global state
  const globalStateJson = await kv.get(`game:${postId}:global`) || '{}';
  const globalState: GlobalStateSchema = JSON.parse(globalStateJson);
  
  // Check if it's time to refresh quests (based on settings)
  const settings = await context.settings.getAll();
  const refreshHours = settings.questRefreshHours as number || 24;
  const timeSinceRefresh = Date.now() - globalState.lastQuestRefresh;
  
  if (timeSinceRefresh >= refreshHours * 60 * 60 * 1000) {
    globalState.activeQuests = generateDailyQuests();
    globalState.lastQuestRefresh = Date.now();
    
    await kv.set(`game:${postId}:global`, JSON.stringify(globalState));
    
    // Update custom post preview to show new quests
    await context.reddit.updatePostFlairText({
      postId,
      text: `Daily Quests Refreshed! ${new Date().toLocaleDateString()}`
    });
  }
});

// Update leaderboard periodically
Devvit.onSchedule('updateLeaderboard', async (event, context) => {
  const kv = context.redis;
  const postId = event.data.postId as string;
  
  // Get all player data
  const playerKeys = await kv.keys(`game:${postId}:player:*`);
  const players: PlayerSchema[] = [];
  
  for (const key of playerKeys) {
    const playerJson = await kv.get(key) || '{}';
    players.push(JSON.parse(playerJson));
  }
  
  // Calculate and update leaderboard
  const globalStateJson = await kv.get(`game:${postId}:global`) || '{}';
  const globalState: GlobalStateSchema = JSON.parse(globalStateJson);
  
  globalState.leaderboard = calculateLeaderboard(players);
  await kv.set(`game:${postId}:global`, JSON.stringify(globalState));
  
  // Update custom post preview
  const topPlayer = globalState.leaderboard[0] || { username: 'None', score: 0 };
  const preview = `Villehaven | Top player: ${topPlayer.username} | Players: ${players.length}`;
  
  await context.reddit.setCustomPostPreview({
    postId,
    preview,
  });
});

// Player joins game
Devvit.onAction('joinGame', async (event, context) => {
  const kv = context.redis;
  const postId = event.postId;
  const userId = context.userId;
  const username = await context.reddit.getUserById(userId).then(user => user.username);
  
  // Check if player already exists
  const playerExists = await kv.get(`game:${postId}:player:${userId}`);
  if (playerExists) {
    return { message: 'Welcome back to Villehaven!' };
  }
  
  // Create new player
  const newPlayer: PlayerSchema = {
    userId,
    username,
    house: {
      interior: { style: 'cozy', items: [] },
      exterior: { style: 'cottage', items: [] }
    },
    farm: { crops: [], animals: [] },
    inventory: { resources: [], items: [] },
    quests: { completed: [], active: [] },
    stats: {
      environmentPoints: 0,
      communityPoints: 0,
      personalGrowthPoints: 0,
      totalPoints: 0
    },
    pet: null,
    lastActive: Date.now()
  };
  
  // Store player data
  await kv.set(`game:${postId}:player:${userId}`, JSON.stringify(newPlayer));
  
  // Update global state
  const globalStateJson = await kv.get(`game:${postId}:global`) || '{}';
  const globalState: GlobalStateSchema = JSON.parse(globalStateJson);
  globalState.playerCount += 1;
  globalState.activePlayers[userId] = Date.now();
  
  await kv.set(`game:${postId}:global`, JSON.stringify(globalState));
  
  return { message: 'Welcome to Villehaven! Your adventure begins now.' };
});

// Complete quest
Devvit.onAction('completeQuest', async (event, context) => {
  const kv = context.redis;
  const { postId, questId, action } = event;
  const userId = context.userId;
  
  // Get player data
  const playerJson = await kv.get(`game:${postId}:player:${userId}`);
  if (!playerJson) {
    return { success: false, message: 'Please join the game first!' };
  }
  
  const player: PlayerSchema = JSON.parse(playerJson);
  
  // Get global state and quest info
  const globalStateJson = await kv.get(`game:${postId}:global`) || '{}';
  const globalState: GlobalStateSchema = JSON.parse(globalStateJson);
  
  const quest = globalState.activeQuests.find(q => q.id === questId);
  if (!quest) {
    return { success: false, message: 'Quest not found!' };
  }
  
  // Check if player already completed this quest
  if (player.quests.completed.includes(questId)) {
    return { success: false, message: 'You already completed this quest!' };
  }
  
  // Add quest to completed list
  player.quests.completed.push(questId);
  
  // Update player stats based on quest type
  switch (quest.type) {
    case 'environment':
      player.stats.environmentPoints += quest.points;
      break;
    case 'community':
      player.stats.communityPoints += quest.points;
      break;
    case 'personal':
      player.stats.personalGrowthPoints += quest.points;
      break;
  }
  
  player.stats.totalPoints += quest.points;
  player.lastActive = Date.now();
  
  // Update global goals
  const updatedGlobal = updateGlobalProgress(globalState, quest, action);
  
  // Save changes
  await kv.set(`game:${postId}:player:${userId}`, JSON.stringify(player));
  await kv.set(`game:${postId}:global`, JSON.stringify(updatedGlobal));
  
  return { 
    success: true, 
    message: `Quest completed! You earned ${quest.points} points!`,
    updatedPlayer: player,
    updatedGlobal: updatedGlobal
  };
});

// Adopt a pet
Devvit.onAction('adoptPet', async (event, context) => {
  const kv = context.redis;
  const { postId, petType } = event;
  const userId = context.userId;
  
  // Get player data
  const playerJson = await kv.get(`game:${postId}:player:${userId}`);
  if (!playerJson) {
    return { success: false, message: 'Please join the game first!' };
  }
  
  const player: PlayerSchema = JSON.parse(playerJson);
  
  // Check if player already has a pet
  if (player.pet) {
    return { success: false, message: 'You already have a pet!' };
  }
  
  // Create new pet based on type
  const newPet: PetSchema = {
    type: petType,
    name: `${petType.charAt(0).toUpperCase() + petType.slice(1)}`,
    level: 1,
    happiness: 100,
    bonuses: []
  };
  
  // Add bonuses based on pet type
  switch (petType) {
    case 'cat':
      newPet.bonuses.push({ type: 'personalGrowth', value: 10 });
      break;
    case 'dog':
      newPet.bonuses.push({ type: 'community', value: 10 });
      break;
    case 'bird':
      newPet.bonuses.push({ type: 'environment', value: 10 });
      break;
  }
  
  // Assign pet to player
  player.pet = newPet;
  player.lastActive = Date.now();
  
  // Save changes
  await kv.set(`game:${postId}:player:${userId}`, JSON.stringify(player));
  
  return { 
    success: true, 
    message: `You adopted a ${petType}! It gives you bonuses to ${newPet.bonuses[0].type} tasks.`,
    updatedPlayer: player
  };
});

// Customize house
Devvit.onAction('customizeHouse', async (event, context) => {
  const kv = context.redis;
  const { postId, location, style, items } = event;
  const userId = context.userId;
  
  // Get player data
  const playerJson = await kv.get(`game:${postId}:player:${userId}`);
  if (!playerJson) {
    return { success: false, message: 'Please join the game first!' };
  }
  
  const player: PlayerSchema = JSON.parse(playerJson);
  
  // Update house based on location
  if (location === 'interior') {
    player.house.interior.style = style || player.house.interior.style;
    if (items) player.house.interior.items = items;
  } else if (location === 'exterior') {
    player.house.exterior.style = style || player.house.exterior.style;
    if (items) player.house.exterior.items = items;
  }
  
  player.lastActive = Date.now();
  
  // Save changes
  await kv.set(`game:${postId}:player:${userId}`, JSON.stringify(player));
  
  return { 
    success: true, 
    message: `Your house ${location} has been updated!`,
    updatedPlayer: player
  };
});

// Farm activities
Devvit.onAction('farmAction', async (event, context) => {
  const kv = context.redis;
  const { postId, action, cropType, animalType } = event;
  const userId = context.userId;
  
  // Get player data
  const playerJson = await kv.get(`game:${postId}:player:${userId}`);
  if (!playerJson) {
    return { success: false, message: 'Please join the game first!' };
  }
  
  const player: PlayerSchema = JSON.parse(playerJson);
  
  // Perform farm action
  if (action === 'plantCrop' && cropType) {
    player.farm.crops.push({
      type: cropType,
      plantedAt: Date.now(),
      readyAt: Date.now() + 3600000, // 1 hour to grow
      harvested: false
    });
    
    // Update global goals
    const globalStateJson = await kv.get(`game:${postId}:global`) || '{}';
    const globalState: GlobalStateSchema = JSON.parse(globalStateJson);
    
    if (cropType === 'tree') {
      globalState.globalGoals.treesPlanted.current += 1;
      await kv.set(`game:${postId}:global`, JSON.stringify(globalState));
    }
    
    return { 
      success: true, 
      message: `You planted a ${cropType}!`,
      updatedPlayer: player
    };
  } 
  else if (action === 'harvestCrop') {
    const readyCrops = player.farm.crops.filter(crop => 
      !crop.harvested && crop.readyAt <= Date.now()
    );
    
    if (readyCrops.length === 0) {
      return { success: false, message: 'No crops ready to harvest!' };
    }
    
    // Harvest all ready crops
    readyCrops.forEach(crop => {
      const cropIndex = player.farm.crops.findIndex(c => 
        c.plantedAt === crop.plantedAt && c.type === crop.type
      );
      
      if (cropIndex !== -1) {
        player.farm.crops[cropIndex].harvested = true;
        
        // Add to inventory
        player.inventory.resources.push({
          type: crop.type,
          quantity: 1,
          acquiredAt: Date.now()
        });
      }
    });
    
    player.stats.environmentPoints += readyCrops.length;
    player.stats.totalPoints += readyCrops.length;
    
    return { 
      success: true, 
      message: `You harvested ${readyCrops.length} crops!`,
      updatedPlayer: player
    };
  }
  else if (action === 'addAnimal' && animalType) {
    player.farm.animals.push({
      type: animalType,
      addedAt: Date.now(),
      happiness: 100
    });
    
    return { 
      success: true, 
      message: `You added a ${animalType} to your farm!`,
      updatedPlayer: player
    };
  }
  
  player.lastActive = Date.now();
  
  // Save changes
  await kv.set(`game:${postId}:player:${userId}`, JSON.stringify(player));
  
  return { success: false, message: 'Invalid farm action!' };
});

// Add the post creation hook
Devvit.addMenuItem({
  location: 'subreddit',
  label: 'Create Villehaven Game',
  onPress: createPost,
});

export default Devvit;