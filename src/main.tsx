import { Devvit, useWebView } from '@devvit/public-api';
import type { Context, PostSubmit, PostCreate, ScheduledJobEvent, TriggerEvent, JobContext, TriggerContext } from '@devvit/public-api';

Devvit.configure({
  redditAPI: true,
  kvStore: true,
  redis: true,
  realtime: true,
});

interface GameState {
  playerCount: number;
  leaderboard: Array<{rank: number; username: string; score: number}>;
  activePlayers: Record<string, {
    userId: string;
    username: string;
    action: string;
    timestamp: number;
  }>;
  lastQuestRefresh: number;
  quests: Record<string, Quest>;
  globalGoals: {
    treesPlanted: GlobalGoal;
    oceansClean: GlobalGoal;
    communityEventsHeld: GlobalGoal;
  };
}

interface GlobalGoal {
  current: number;
  target: number;
  title: string;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'environment' | 'community' | 'personal';
  progress: number;
  goal: number;
  participants: string[];
  rewards: {
    experience: number;
    resources: Record<string, number>;
  };
  deadline: string;
  target: string;
  completed?: boolean;
}

interface PlayerData {
  userId: string;
  username: string;
  house: {
    interior: { style: string; items: any[] };
    exterior: { style: string; items: any[] };
  };
  farm: {
    crops: Array<{
      type: string;
      plantedAt: number;
      readyAt: number;
      harvested: boolean;
    }>;
    animals: Array<{
      type: string;
      addedAt: number;
      happiness: number;
    }>;
  };
  inventory: {
    resources: Array<{
      type: string;
      quantity: number;
      acquiredAt: number;
    }>;
    items: any[];
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
  pet: {
    type: string;
    name: string;
    level: number;
    happiness: number;
    bonuses: Array<{
      type: string;
      value: number;
    }>;
  } | null;
  lastActive: number;
}

interface PetBonus {
  type: string;
  value: number;
}

interface Pet {
  type: string;
  name: string;
  level: number;
  happiness: number;
  bonuses: PetBonus[];
}

interface GameMessage {
  type: string;
  action?: string;
  data?: {
    [key: string]: any;
  };
  error?: string;
}

interface VillehavenGameProps {
  context: Context;
}

interface DevvitMessage {
  [key: string]: any;
  type: 'initialData' | 'playerDataUpdated' | 'gameStateUpdated' | 'error' | 'joinGameSuccess' | 'questsRefreshed' | 'leaderboardUpdate';
  data?: {
    postId?: string;
    username?: string;
    gameState?: GameState;
    playerData?: PlayerData;
    error?: string;
    leaderboard?: Array<{rank: number; username: string; score: number}>;
  };
}

interface WebViewMessage {
  [key: string]: any;
  type: 'webViewReady' | 'gameAction';
  action?: string;
  data?: Record<string, any>;
}

const VillehavenGame = (context: Context) => {
  const { mount, postMessage } = useWebView<WebViewMessage, DevvitMessage>({
    url: 'index.html',
    onMessage: async (message, webView) => {
      console.log('Received message from web view:', message);
    
      if (!message) return;
      
      if (message.type === 'webViewReady') {
        // Send initial data once web view signals it's ready
        const postId = context.postId;
        const username = await context.reddit.getCurrentUsername();
        
        try {
          // Get game state from Redis
          const gameStateStr = await context.redis.get(`game:${postId}:state`);
          const gameState = gameStateStr ? JSON.parse(gameStateStr) as GameState : undefined;
          
          // Get player data if they exist
          let playerData: PlayerData | undefined;
          if (username) {
            const playerDataStr = await context.redis.get(`game:${postId}:player:${username}`);
            if (playerDataStr) {
              playerData = JSON.parse(playerDataStr) as PlayerData;
            }
          }
          
          // Send initial data to the web view
          postMessage({
            type: 'initialData',
            data: {
              postId,
              username,
              gameState,
              playerData
            }
          });
          
          // Update active players
          if (username && gameState) {
            const activePlayers = gameState.activePlayers || {};
            activePlayers[username] = {
              userId: username,
              username: username,
              action: 'joined the game',
              timestamp: Date.now()
            };
            
            const updatedState = {
              ...gameState,
              activePlayers
            };
            
            await context.redis.set(`game:${postId}:state`, JSON.stringify(updatedState));
            
            // Update real-time for other players
            await context.realtime.send(`game:${postId}:updates`, {
              type: 'playerJoined',
              player: activePlayers[username]
            });
          }
        } catch (error) {
          console.error('Error initializing game:', error);
          postMessage({
            type: 'error',
            data: { error: 'Failed to load game data' }
          });
        }
      }
      
      // Handle game actions
      if (message.type === 'gameAction' && message.action && message.data) {
        try {
          const { action, data } = message;
          const postId = context.postId;
          const username = await context.reddit.getCurrentUsername();
          
          if (!username || !postId) {
            postMessage({
              type: 'error',
              data: { error: 'You must be logged in to perform this action' }
            });
            return;
          }
          
          // Get current game and player state
          const gameStateStr = await context.redis.get(`game:${postId}:state`);
          const gameState = gameStateStr ? JSON.parse(gameStateStr) as GameState : null;
          
          const playerDataStr = await context.redis.get(`game:${postId}:player:${username}`);
          const playerData = playerDataStr ? JSON.parse(playerDataStr) as PlayerData : null;
          
          // Process different game actions
          if (action === 'joinGame') {
            // Create a new player if they don't exist
            if (!playerData) {
              const newPlayerData: PlayerData = {
                userId: username,
                username: username,
                house: {
                  interior: { style: 'cozy', items: [] },
                  exterior: { style: 'cottage', items: [] }
                },
                farm: {
                  crops: [],
                  animals: []
                },
                inventory: {
                  resources: [],
                  items: []
                },
                quests: {
                  completed: [],
                  active: []
                },
                stats: {
                  environmentPoints: 0,
                  communityPoints: 0,
                  personalGrowthPoints: 0,
                  totalPoints: 0
                },
                pet: null,
                lastActive: Date.now()
              };
              
              // Save new player data
              await context.redis.set(`game:${postId}:player:${username}`, JSON.stringify(newPlayerData));
              
              // Update player count in game state
              if (gameState) {
                const updatedState = {
                  ...gameState,
                  playerCount: (gameState.playerCount || 0) + 1
                };
                await context.redis.set(`game:${postId}:state`, JSON.stringify(updatedState));
              }
              
              // Notify web view that player joined successfully
              postMessage({
                type: 'joinGameSuccess',
                data: { playerData: newPlayerData }
              });
              
              // Update realtime for other players
              await context.realtime.send(`game:${postId}:updates`, {
                type: 'newPlayer',
                username
              });
            } else {
              // Existing player is rejoining
              postMessage({
                type: 'joinGameSuccess',
                data: { playerData }
              });
            }
          }
          else if (action === 'customizeHouse') {
            if (!playerData) {
              postMessage({
                type: 'error',
                data: { error: 'Player not found' }
              });
              return;
            }
            
            const { location, style } = data;
            if (location === 'interior') {
              playerData.house.interior.style = style;
            } else if (location === 'exterior') {
              playerData.house.exterior.style = style;
            }
            
            // Save updated player data
            await context.redis.set(`game:${postId}:player:${username}`, JSON.stringify(playerData));
            
            // Send update to player
            postMessage({
              type: 'playerDataUpdated',
              data: { playerData }
            });
          }
          else if (action === 'adoptPet') {
            if (!playerData) {
              postMessage({
                type: 'error',
                data: { error: 'Player not found' }
              });
              return;
            }
            
            const { petType } = data;
            
            // Create new pet based on type
            const newPet: Pet = {
              type: petType,
              name: `${petType.charAt(0).toUpperCase() + petType.slice(1)}`,
              level: 1,
              happiness: 100,
              bonuses: []
            };
            
            // Add bonuses based on pet type
            const bonus: PetBonus = {
              type: petType === 'cat' ? 'personalGrowth' :
                    petType === 'dog' ? 'community' :
                    petType === 'bird' ? 'environment' :
                    petType === 'rabbit' ? 'farmSpeed' : 'general',
              value: petType === 'rabbit' ? 15 : 10
            };
            newPet.bonuses = [bonus];
            
            // Update player data with new pet
            const updatedPlayerData = {
              ...playerData,
              pet: newPet
            };
            
            await context.redis.set(`game:${postId}:player:${username}`, JSON.stringify(updatedPlayerData));
            
            // Send update to player
            postMessage({
              type: 'playerDataUpdated',
              data: { playerData: updatedPlayerData }
            });
          }
          else if (action === 'farmAction') {
            if (!playerData) {
              postMessage({
                type: 'error',
                data: { error: 'Player not found' }
              });
              return;
            }
            
            const { farmAction, cropType, animalType } = data;
            
            if (farmAction === 'plantCrop' && cropType) {
              const newCrop = {
                type: cropType,
                plantedAt: Date.now(),
                // In a real game we'd use longer times, using short times for demo
                readyAt: Date.now() + (cropType === 'tree' ? 120000 : 60000), // Trees take 2 minutes, other crops 1 minute
                harvested: false
              };
              
              playerData.farm.crops.push(newCrop);
              
              // If planting a tree, update global goal
              if (cropType === 'tree' && gameState) {
                if (gameState.globalGoals && gameState.globalGoals.treesPlanted) {
                  gameState.globalGoals.treesPlanted.current += 1;
                  await context.redis.set(`game:${postId}:state`, JSON.stringify(gameState));
                  
                  // Broadcast update to all players
                  await context.realtime.send(`game:${postId}:updates`, {
                    type: 'globalGoalUpdate',
                    goal: 'treesPlanted',
                    value: gameState.globalGoals.treesPlanted.current
                  });
                }
                
                // Award environment points
                playerData.stats.environmentPoints += 5;
                playerData.stats.totalPoints += 5;
              }
            }
            else if (farmAction === 'harvestCrop') {
              const readyCrops = playerData.farm.crops.filter(crop => 
                !crop.harvested && crop.readyAt <= Date.now()
              );
              
              if (readyCrops.length === 0) {
                postMessage({
                  type: 'error',
                  data: { error: 'No crops ready to harvest!' }
                });
                return;
              }
              
              readyCrops.forEach(crop => {
                const cropIndex = playerData.farm.crops.findIndex(c => 
                  c.plantedAt === crop.plantedAt && c.type === crop.type
                );
                
                if (cropIndex !== -1) {
                  playerData.farm.crops[cropIndex].harvested = true;
                  
                  // Add to inventory
                  const existingResource = playerData.inventory.resources.find(r => r.type === crop.type);
                  
                  if (existingResource) {
                    existingResource.quantity += 1;
                  } else {
                    playerData.inventory.resources.push({
                      type: crop.type,
                      quantity: 1,
                      acquiredAt: Date.now()
                    });
                  }
                }
              });
              
              // Award points
              const pointsEarned = readyCrops.length * 2;
              playerData.stats.environmentPoints += pointsEarned;
              playerData.stats.totalPoints += pointsEarned;
            }
            else if (farmAction === 'addAnimal' && animalType) {
              playerData.farm.animals.push({
                type: animalType,
                addedAt: Date.now(),
                happiness: 100
              });
            }
            
            // Save updated player data
            await context.redis.set(`game:${postId}:player:${username}`, JSON.stringify(playerData));
            
            // Send update to player
            postMessage({
              type: 'playerDataUpdated',
              data: { playerData }
            });
          }
          else if (action === 'completeQuest') {
            if (!playerData || !gameState) {
              postMessage({
                type: 'error',
                data: { error: 'Player or game data not found' }
              });
              return;
            }
            
            const { questId, questAction } = data;
            
            // Find the quest
            const quest = gameState.quests[questId];
            if (!quest) {
              postMessage({
                type: 'error',
                data: { error: 'Quest not found!' }
              });
              return;
            }
            
            // Check if already completed
            if (playerData.quests.completed.includes(questId)) {
              postMessage({
                type: 'error',
                data: { error: 'You already completed this quest!' }
              });
              return;
            }
            
            // Add to completed quests
            playerData.quests.completed.push(questId);
            
            // Award points based on quest type
            const pointsEarned = quest.progress === quest.goal ? quest.rewards.experience * 2 : quest.rewards.experience;
            
            if (quest.type === 'environment') {
              playerData.stats.environmentPoints += pointsEarned;
            } else if (quest.type === 'community') {
              playerData.stats.communityPoints += pointsEarned;
            } else if (quest.type === 'personal') {
              playerData.stats.personalGrowthPoints += pointsEarned;
            }
            
            playerData.stats.totalPoints += pointsEarned;
            
            // Update global goals if applicable
            if (quest.type === 'environment') {
              if (questAction === 'clean' && quest.target === 'ocean') {
                if (gameState.globalGoals && gameState.globalGoals.oceansClean) {
                  gameState.globalGoals.oceansClean.current += 1;
                  
                  // Broadcast update to all players
                  await context.realtime.send(`game:${postId}:updates`, {
                    type: 'globalGoalUpdate',
                    goal: 'oceansClean',
                    value: gameState.globalGoals.oceansClean.current
                  });
                }
              }
            } else if (quest.type === 'community') {
              if (questAction === 'organize' && quest.target === 'event') {
                if (gameState.globalGoals && gameState.globalGoals.communityEventsHeld) {
                  gameState.globalGoals.communityEventsHeld.current += 1;
                  
                  // Broadcast update to all players
                  await context.realtime.send(`game:${postId}:updates`, {
                    type: 'globalGoalUpdate',
                    goal: 'communityEventsHeld',
                    value: gameState.globalGoals.communityEventsHeld.current
                  });
                }
              }
            }
            
            // Update game state and player data
            await context.redis.set(`game:${postId}:state`, JSON.stringify(gameState));
            await context.redis.set(`game:${postId}:player:${username}`, JSON.stringify(playerData));
            
            // Update leaderboard
            await updateLeaderboard(context, postId, username, playerData.stats.totalPoints);
            
            // Send updates to player
            postMessage({
              type: 'playerDataUpdated',
              data: { playerData }
            });
            
            postMessage({
              type: 'gameStateUpdated',
              data: { gameState }
            });
          }
          else if (action === 'joinQuest') {
            if (!playerData || !gameState) {
              postMessage({
                type: 'error',
                data: { error: 'Player or game data not found' }
              });
              return;
            }
            
            const { questId } = data;
            const quest = gameState.quests[questId];
            
            if (!quest) {
              postMessage({
                type: 'error',
                data: { error: 'Quest not found' }
              });
              return;
            }
            
            // Add player to quest participants if not already there
            if (!quest.participants.includes(username)) {
              quest.participants.push(username);
              
              // Update game state
              await context.redis.set(`game:${postId}:state`, JSON.stringify(gameState));
              
              // Broadcast update to all players
              await context.realtime.send(`game:${postId}:updates`, {
                type: 'questUpdate',
                questId,
                participants: quest.participants
              });
              
              // Send update to player
              postMessage({
                type: 'gameStateUpdated',
                data: { gameState }
              });
            }
          }
          else if (action === 'contributeToQuest') {
            if (!playerData || !gameState) {
              postMessage({
                type: 'error',
                data: { error: 'Player or game data not found' }
              });
              return;
            }
            
            const { questId, amount } = data;
            const quest = gameState.quests[questId];
            
            if (!quest) {
              postMessage({
                type: 'error',
                data: { error: 'Quest not found' }
              });
              return;
            }
            
            // Check if player is a participant
            if (!quest.participants.includes(username)) {
              postMessage({
                type: 'error',
                data: { error: 'You are not a participant in this quest' }
              });
              return;
            }
            
            // Update quest progress
            const newProgress = Math.min(quest.progress + amount, quest.goal);
            quest.progress = newProgress;
            
            // If quest completed, award bonuses
            if (quest.progress >= quest.goal && !quest.completed) {
              quest.completed = true;
              
              // Award points to all participants
              for (const participant of quest.participants) {
                if (!participant) continue;
                
                const participantData = await context.redis.get(`game:${postId}:player:${participant}`);
                if (participantData) {
                  const parsedData = JSON.parse(participantData) as PlayerData;
                  
                  // Award bonus points based on quest type
                  if (quest.type === 'environment') {
                    parsedData.stats.environmentPoints += quest.rewards.experience;
                  } else if (quest.type === 'community') {
                    parsedData.stats.communityPoints += quest.rewards.experience;
                  } else if (quest.type === 'personal') {
                    parsedData.stats.personalGrowthPoints += quest.rewards.experience;
                  }
                  
                  parsedData.stats.totalPoints += quest.rewards.experience;
                  
                  // Update player data
                  await context.redis.set(`game:${postId}:player:${participant}`, JSON.stringify(parsedData));
                  
                  // Update leaderboard
                  await updateLeaderboard(context, postId, participant, parsedData.stats.totalPoints);
                  
                  // If this is the current player, update their data
                  if (participant === username) {
                    postMessage({
                      type: 'playerDataUpdated',
                      data: { playerData: parsedData }
                    });
                  }
                }
              }
            }
            
            // Update game state
            await context.redis.set(`game:${postId}:state`, JSON.stringify(gameState));
            
            // Broadcast update to all players
            await context.realtime.send(`game:${postId}:updates`, {
              type: 'questProgressUpdate',
              questId,
              progress: quest.progress,
              completed: !!quest.completed
            });
            
            // Send updates to player
            postMessage({
              type: 'gameStateUpdated',
              data: { gameState }
            });
          }
        } catch (error) {
          console.error('Error processing game action:', error);
          postMessage({
            type: 'error',
            data: { error: 'Failed to process action' }
          });
        }
      }
    },
    onUnmount: () => {
      console.log('Web view closed');
    }
  });

  return (
    <vstack alignment="center middle" height="100%" gap="medium">
      <text style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>Welcome to Villehaven!</text>
      <text style={{ fontSize: '18px' }}>🌳 Build your village, grow your community, save the planet! 🌍</text>
      <button 
        style={{
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
        onClick={mount}
      >
        🚀 Launch Game
      </button>
    </vstack>
  );
};

// Helper function to update leaderboard
async function updateLeaderboard(context: Context, postId: string, username: string, score: number) {
  try {
    // Add or update user score in leaderboard
    await context.redis.zAdd(`game:${postId}:leaderboard`, { score, member: username });
    
    // Get updated leaderboard (top 10)
    const leaderboardData = await context.redis.zRange(`game:${postId}:leaderboard`, 0, 9, {
      reverse: true,
      by: 'score'
    });
    
    // Format leaderboard data
    const leaderboard = leaderboardData.map((entry: { member: string; score: number }, index: number) => ({
      rank: index + 1,
      username: entry.member,
      score: entry.score
    }));
    
    // Get game state and update leaderboard
    const gameStateStr = await context.redis.get(`game:${postId}:state`);
    
    if (gameStateStr) {
      const gameState = JSON.parse(gameStateStr) as GameState;
      const updatedState = {
        ...gameState,
        leaderboard
      };
      
      await context.redis.set(`game:${postId}:state`, JSON.stringify(updatedState));
      
      // Broadcast leaderboard update to all players
      await context.realtime.send(`game:${postId}:updates`, {
        type: 'leaderboardUpdate',
        leaderboard
      });
    }
  } catch (error) {
    console.error('Error updating leaderboard:', error);
  }
}

// Create Villehaven custom post type
Devvit.addCustomPostType({
  name: 'Villehaven',
  render: VillehavenGame,
  height: 'tall'
});

// Menu item for creating a new game
Devvit.addMenuItem({
  label: 'Create Villehaven Game',
  location: 'subreddit',
  onPress: async (_event, context) => {
    try {
      const subredditName = await context.reddit.getCurrentSubredditName();
      if (subredditName) {
        await context.reddit.submitPost({
          title: '[Villehaven] New Game',
          subredditName,
          text: 'A new Villehaven game has been created!'
        });
      }
    } catch (error) {
      console.error('Error creating game post:', error);
    }
  }
});

// Add trigger for post creation
Devvit.addTrigger({
  event: 'PostSubmit',
  onEvent: async (event, context) => {
    try {
      if (event.type === 'PostSubmit' && event.post?.title?.toLowerCase().includes('villehaven')) {
        // Initialize game state
        const gameState = {
          playerCount: 0,
          leaderboard: [],
          activePlayers: [],
          lastQuestRefresh: Date.now(),
          quests: {},
          globalGoals: []
        };

        const postId = event.post.id;
        await context.redis.set(`game:${postId}:state`, JSON.stringify(gameState));
        await context.redis.set(`game:${postId}:initialized`, 'true');
        await context.redis.set(`game:${postId}:type`, 'villehaven');

        console.log(`Initialized Villehaven game for post ${postId}`);
      }
    } catch (error) {
      console.error('Error initializing game:', error);
    }
  }
});

// Setup scheduler to refresh quests periodically
Devvit.addSchedulerJob({
  name: 'refreshQuests',
  onRun: async (event, context: JobContext) => {
    try {
      const postId = event.data?.postId as string;
      if (!postId) {
        console.error('No postId provided in scheduler event');
        return;
      }
      
      // Get game state
      const gameStateStr = await context.redis.get(`game:${postId}:state`);
      
      if (gameStateStr) {
        const gameState = JSON.parse(gameStateStr) as GameState;
        
        // Check if it's time to refresh quests (every 24 hours)
        const currentTime = Date.now();
        if (currentTime - gameState.lastQuestRefresh >= 24 * 60 * 60 * 1000) {
          // Generate new quests
          const newQuests = generateQuests();
          
          // Update game state with new quests
          const updatedState = {
            ...gameState,
            quests: {
              ...gameState.quests,
              ...newQuests
            },
            lastQuestRefresh: currentTime
          };
          
          // Save updated game state
          await context.redis.set(`game:${postId}:state`, JSON.stringify(updatedState));
          
          // Notify players of new quests
          await context.realtime.send(`game:${postId}:updates`, {
            type: 'questsRefreshed',
            quests: serializeGameState(gameState).quests
          });
          
          console.log('Refreshed quests for post:', postId);
        }
      }
    } catch (error) {
      console.error('Error refreshing quests:', error);
    }
  }
});

// Schedule quest refresh when post is created
Devvit.addTrigger({
  event: 'PostCreate',
  async onEvent(triggerEvent, context) {
    try {
      const post = triggerEvent.post;
      if (!post?.id || !post.title || !post.title.toLowerCase().includes('villehaven')) {
        return;
      }
      
      // Schedule quest refresh every hour (we'll check if it's time to refresh in the job)
      await context.scheduler.runJob({
        name: 'refreshQuests',
        data: { postId: post.id },
        cron: '0 * * * *' // Run every hour
      });
      
      console.log('Scheduled quest refresh for post:', post.id);
    } catch (error) {
      console.error('Failed to schedule quest refresh:', error);
    }
  }
});

interface QuestMap {
  [key: string]: Quest;
}

function generateQuests(): Record<string, Quest> {
  const questTypes = ['environment', 'community', 'personal'] as const;
  const newQuests: Record<string, Quest> = {};
  
  // Generate a random number of quests (3-5)
  const numQuests = Math.floor(Math.random() * 3) + 3;
  
  for (let i = 0; i < numQuests; i++) {
    const questType = questTypes[Math.floor(Math.random() * questTypes.length)];
    const questId = `quest_${questType.substring(0, 3)}_${Date.now()}_${i}`;
    
    let title = '';
    let description = '';
    let goal = 0;
    let target = '';
    let reward = 0;
    
    switch (questType) {
      case 'environment':
        if (Math.random() < 0.5) {
          title = 'Plant More Trees';
          description = 'Continue our reforestation efforts by planting more trees.';
          goal = Math.floor(Math.random() * 30) + 20; // 20-50
          target = 'tree';
        } else {
          title = 'Clean the Oceans';
          description = 'Help remove pollution from our virtual oceans.';
          goal = Math.floor(Math.random() * 50) + 50; // 50-100
          target = 'ocean';
        }
        reward = Math.floor(Math.random() * 50) + 50; // 50-100
        break;
        
      case 'community':
        if (Math.random() < 0.5) {
          title = 'Organize Community Event';
          description = 'Bring villagers together by organizing a community event.';
          goal = Math.floor(Math.random() * 20) + 10; // 10-30
          target = 'event';
        } else {
          title = 'Build Community Gardens';
          description = 'Create shared garden spaces for the community to enjoy.';
          goal = Math.floor(Math.random() * 40) + 20; // 20-60
          target = 'garden';
        }
        reward = Math.floor(Math.random() * 60) + 70; // 70-130
        break;
        
      case 'personal':
        if (Math.random() < 0.5) {
          title = 'Learn New Skills';
          description = 'Expand your knowledge and abilities by learning new skills.';
          goal = Math.floor(Math.random() * 15) + 5; // 5-20
          target = 'skill';
        } else {
          title = 'Meditate Daily';
          description = 'Practice mindfulness and meditation for personal well-being.';
          goal = Math.floor(Math.random() * 10) + 5; // 5-15
          target = 'meditation';
        }
        reward = Math.floor(Math.random() * 40) + 60; // 60-100
        break;
    }
    
    newQuests[questId] = {
      id: questId,
      title,
      description,
      type: questType,
      progress: 0,
      goal,
      participants: [],
      rewards: {
        experience: reward,
        resources: {}
      },
      deadline: new Date(Date.now() + (Math.floor(Math.random() * 7) + 3) * 24 * 60 * 60 * 1000).toISOString(),
      target
    };
  }
  
  return newQuests;
}

// Helper function to ensure JSON-serializable game state
function serializeGameState(gameState: GameState): Record<string, any> {
  return {
    ...gameState,
    quests: Object.fromEntries(
      Object.entries(gameState.quests).map(([id, quest]) => [
        id,
        {
          ...quest,
          rewards: {
            experience: quest.rewards.experience,
            resources: Object.fromEntries(
              Object.entries(quest.rewards.resources)
            )
          }
        }
      ])
    )
  };
}

export default Devvit;