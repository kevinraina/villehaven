  import { Devvit } from '@devvit/public-api';
  import { useState, useEffect } from 'react';
  import GameState from './game-state';
  import Components from './game-components';

  // Main component for the game
  Devvit.addCustomPostType({
    name: 'Villehaven',
    render: ({ postId }) => {
      return <VillehavenGame postId={postId} />;
    },
  });

  function VillehavenGame({ postId }: { postId: string }) {
    // State variables
    const [activeTab, setActiveTab] = useState<'house' | 'community' | 'challenges' | 'leaderboard'>('house');
    const [houseTab, setHouseTab] = useState<'inside' | 'outside' | 'farm'>('inside');
    const [communityTab, setCommunityTab] = useState<'hub' | 'progress' | 'events'>('hub');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [player, setPlayer] = useState<any>(null);
    const [username, setUsername] = useState<string>('');
    const [showGuide, setShowGuide] = useState(false);
    const [playerRank, setPlayerRank] = useState<number>(0);
    const [communityData, setCommunityData] = useState<any>(null);
    const [gameState, setGameState] = useState<any>(null);
    const [quests, setQuests] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [dailyChallenge, setDailyChallenge] = useState<any>(null);
    const [hasParticipatedInChallenge, setHasParticipatedInChallenge] = useState(false);
    const [eventParticipation, setEventParticipation] = useState<Record<string, boolean>>({});
    
    // Pagination state for large data
    const [activityPage, setActivityPage] = useState(0);
    const [leaderboardPage, setLeaderboardPage] = useState(0);
    const ITEMS_PER_PAGE = 10;
    
    const context = Devvit.useContext();

    // Get current user's information
    useEffect(() => {
      const getCurrentUser = async () => {
        try {
          const user = await context.reddit.getCurrentUser();
          if (user) {
            setUsername(user.username);
          }
        } catch (err) {
          console.error('Error getting current user:', err);
        }
      };
      
      getCurrentUser();
    }, []);

    // Initialize and load game data
    useEffect(() => {
      const loadGameData = async () => {
        try {
          setLoading(true);
          
          // Get main game state
          let state = await GameState.getGameState(postId);
          
          // Initialize if doesn't exist
          if (!state) {
            // Create all required data stores
            await GameState.initializeGameDataStores(postId);
            state = await GameState.getGameState(postId);
            
            if (!state) {
              throw new Error("Failed to initialize game state");
            }
          }
          
          setGameState(state);
          
          // Check if we need to create a new player shard
          await GameState.checkAndCreateNewShardIfNeeded(postId);
          
          // Only continue loading player-specific data if user is logged in
          if (!username) {
            setLoading(false);
            return;
          }
          
          // Get or create player data
          let playerData = await GameState.getPlayerData(postId, username);
          
          if (!playerData) {
            // Determine which shard to place the player in
            const shardId = GameState.getPlayerShardId(username, state.shardCount);
            
            // Create new player
            playerData = GameState.createNewPlayer(username, shardId);
            
            // Generate welcome quests
            const questIds = await GameState.generateWelcomeQuests(postId, username);
            playerData.questIds = questIds;
            
            // Save player
            await GameState.savePlayerData(postId, playerData);
            
            // Show guide for new players
            setShowGuide(true);
            
            // Add activity
            await GameState.addActivity(postId, {
              username,
              action: "joined the village",
              timestamp: Date.now()
            });
            
            // Update player count
            await GameState.updatePlayerCounts(postId);
            
            // Update custom post preview
            await GameState.updateCustomPostPreview(postId);
          }
          
          // Get player quests
          const playerQuests = await GameState.getPlayerQuests(postId, playerData.questIds);
          
          // Set daily challenge participation
          let participatedInChallenge = false;
          if (state.dailyChallenge) {
            const challengeId = `daily_${new Date(state.dailyChallenge.expiresAt).toDateString()}`;
            participatedInChallenge = await GameState.hasParticipatedInChallenge(
              postId, 
              challengeId, 
              username
            );
          }
          
          // Get community data
          const community = await GameState.getCommunityStore(postId);
          
          // Get event participation data
          const eventParticipations: Record<string, boolean> = {};
          if (community) {
            for (const event of community.events) {
              if (event.endTime > Date.now()) {
                const participated = await GameState.hasParticipatedInEvent(postId, event.id, username);
                eventParticipations[event.id] = participated;
              }
            }
          }
          
          // Get player rank
          const rank = await GameState.getPlayerRank(postId, username);
          
          // Get activities
          const recentActivities = await GameState.getRecentActivities(postId);
          
          // Get leaderboard
          const leaderboardData = await Devvit.storage.get(`leaderboard:${postId}`);
          
          // Set all state
          setPlayer(playerData);
          setQuests(playerQuests);
          setCommunityData(community);
          setPlayerRank(rank);
          setActivities(recentActivities);
          setLeaderboard(leaderboardData?.players || []);
          setDailyChallenge(state.dailyChallenge);
          setHasParticipatedInChallenge(participatedInChallenge);
          setEventParticipation(eventParticipations);
          
          // Mark player as active
          playerData.lastActive = Date.now();
          await GameState.savePlayerData(postId, playerData);
          
        } catch (err) {
          console.error('Error loading game data:', err);
          setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
          setLoading(false);
        }
      };
      
      loadGameData();
    }, [postId, username]);

    // Handle player actions (plant, clean, help, learn)
    const handleAction = async (actionType: string, amount: number = 1) => {
      if (!player || !gameState) return;
      
      try {
        const updatedPlayer = { ...player };
        let environmentalDelta = 0;
        let socialDelta = 0;
        let personalDelta = 0;
        let actionDesc = '';
        
        // Update player stats based on action
        switch (actionType) {
          case 'plant':
            updatedPlayer.stats.environmental += amount;
            updatedPlayer.stats.totalActions += 1;
            environmentalDelta = amount;
            actionDesc = `planted ${amount > 1 ? 'crops' : 'a plant'}`;
            
            // Update farm data
            if (amount > 2) {
              // Planting trees
              updatedPlayer.house.farm.trees += 1;
            } else {
              // Planting crops
              const seedType = amount === 1 ? 'carrot' : 'tomato';
              if (updatedPlayer.inventory.seeds[seedType] > 0) {
                updatedPlayer.inventory.seeds[seedType] -= 1;
                updatedPlayer.house.farm.crops.push({
                  type: seedType,
                  plantedAt: Date.now(),
                  growthStage: 0
                });
              }
            }
            break;
            
          case 'clean':
            updatedPlayer.house.interior.cleanliness = Math.min(100, updatedPlayer.house.interior.cleanliness + 10 * amount);
            updatedPlayer.stats.environmental += amount / 2;
            updatedPlayer.stats.personal += amount / 2;
            updatedPlayer.stats.totalActions += 1;
            environmentalDelta = amount / 2;
            personalDelta = amount / 2;
            actionDesc = 'cleaned their house';
            break;
            
          case 'help':
            updatedPlayer.stats.social += amount;
            updatedPlayer.stats.totalActions += 1;
            socialDelta = amount;
            actionDesc = 'helped a neighbor';
            break;
            
          case 'learn':
            updatedPlayer.stats.personal += amount;
            updatedPlayer.stats.totalActions += 1;
            personalDelta = amount;
            actionDesc = 'learned something new';
            break;
        }
        
        // Process quests progress
        await processQuestsProgress(actionType, updatedPlayer);
        
        // Save player changes
        await GameState.savePlayerData(postId, updatedPlayer);
        setPlayer(updatedPlayer);
        
        // Update community progress
        await GameState.updateCommunityProgress(
          postId,
          environmentalDelta,
          socialDelta,
          personalDelta
        );
        
        // Add activity
        await GameState.addActivity(postId, {
          username,
          action: actionDesc,
          timestamp: Date.now()
        });
        
        // Reload activities
        const recentActivities = await GameState.getRecentActivities(postId);
        setActivities(recentActivities);
        
        // Get updated game state
        const updatedGameState = await GameState.getGameState(postId);
        setGameState(updatedGameState);
        
        // Get updated community data
        const updatedCommunity = await GameState.getCommunityStore(postId);
        setCommunityData(updatedCommunity);
        
        // Update rank
        const rank = await GameState.getPlayerRank(postId, username);
        setPlayerRank(rank);
        
        // Get updated leaderboard
        const leaderboardData = await Devvit.storage.get(`leaderboard:${postId}`);
        setLeaderboard(leaderboardData?.players || []);
        
        // Update custom post preview
        await GameState.updateCustomPostPreview(postId);
        
      } catch (err) {
        console.error('Error handling action:', err);
      }
    };

    // Process quests progress
    const processQuestsProgress = async (actionType: string, updatedPlayer: any) => {
      const questChanges = quests.map(quest => {
        if (quest.completedAt) return quest;
        
        let progressIncrease = 0;
        
        if (
          (quest.type === 'environmental' && actionType === 'plant') ||
          (quest.type === 'environmental' && actionType === 'clean') ||
          (quest.type === 'social' && actionType === 'help') ||
          (quest.type === 'personal' && actionType === 'learn')
        ) {
          progressIncrease = 1;
        }
        
        const newProgress = Math.min(quest.goal, quest.progress + progressIncrease);
        
        // Check if quest is completed
        if (newProgress === quest.goal && quest.progress !== quest.goal) {
          // Apply rewards
          if (quest.reward.environmentalPoints) {
            updatedPlayer.stats.environmental += quest.reward.environmentalPoints;
          }
          
          if (quest.reward.socialPoints) {
            updatedPlayer.stats.social += quest.reward.socialPoints;
          }
          
          if (quest.reward.personalPoints) {
            updatedPlayer.stats.personal += quest.reward.personalPoints;
          }
          
          if (quest.reward.currency) {
            updatedPlayer.inventory.currency += quest.reward.currency;
          }
          
          if (quest.reward.items) {
            updatedPlayer.inventory.items = [...updatedPlayer.inventory.items, ...quest.reward.items];
          }
          
          return {
            ...quest,
            progress: newProgress,
            completedAt: Date.now(),
          };
        }
        
        return { ...quest, progress: newProgress };
      });
      
      // Save quest changes
      for (const quest of questChanges) {
        await GameState.saveQuest(postId, quest);
      }
      
      // Update quests in state
      setQuests(questChanges);
      
      // Generate new quests for completed ones
      const completedQuests = questChanges.filter(
        (q, i) => q.completedAt && !quests[i].completedAt
      );
      
      if (completedQuests.length > 0) {
        const newQuestIds = [];
        
        for (const completedQuest of completedQuests) {
          // Generate a new quest of a different type than the completed one
          const possibleTypes = ['environmental', 'social', 'personal'] as const;
          const otherTypes = possibleTypes.filter(t => t !== completedQuest.type);
          const newType = otherTypes[Math.floor(Math.random() * otherTypes.length)];
          
          // Create a new quest
          const newQuestId = `${newType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const newQuest = {
            id: newQuestId,
            type: newType,
            title: getRandomQuestTitle(newType),
            description: getRandomQuestDescription(newType),
            progress: 0,
            goal: Math.floor(Math.random() * 5) + 3, // 3-7
            reward: generateQuestRewards(newType),
            playerId: username
          };
          
          await GameState.saveQuest(postId, newQuest);
          newQuestIds.push(newQuestId);
        }
        
        // Add new quest IDs to player
        updatedPlayer.questIds = [...updatedPlayer.questIds, ...newQuestIds];
        
        // Load the updated set of quests
        const updatedQuests = await GameState.getPlayerQuests(postId, updatedPlayer.questIds);
        setQuests(updatedQuests);
      }
    };
    
    // Helper functions for quest generation
    function getRandomQuestTitle(type: 'environmental' | 'social' | 'personal'): string {
      const titles = {
        environmental: [
          'Green Guardian',
          'Nature\'s Ally',
          'Eco Warrior',
          'Environmental Steward',
          'Earth Protector',
        ],
        social: [
          'Community Builder',
          'Social Butterfly',
          'Neighborly Helper',
          'Village Connector',
          'Friend to All',
        ],
        personal: [
          'Self Improver',
          'Knowledge Seeker',
          'Skill Master',
          'Personal Growth',
          'Mind Expander',
        ],
      };
      
      return titles[type][Math.floor(Math.random() * titles[type].length)];
    }
    
    function getRandomQuestDescription(type: 'environmental' | 'social' | 'personal'): string {
      const descriptions = {
        environmental: [
          'Plant more trees and flowers to improve our environment.',
          'Keep your home and surroundings clean for a healthier ecosystem.',
          'Grow sustainable crops in your farm to support local food needs.',
          'Create a beautiful garden to support local wildlife.',
          'Promote environmental consciousness in Villehaven.',
        ],
        social: [
          'Help your neighbors with their daily tasks.',
          'Participate in community events and activities.',
          'Build connections with other villagers.',
          'Support community initiatives and projects.',
          'Spread positivity throughout the village.',
        ],
        personal: [
          'Focus on your own learning and personal growth.',
          'Develop new skills to benefit yourself and others.',
          'Expand your knowledge in various areas.',
          'Take time for self-reflection and improvement.',
          'Nurture your mind with new experiences.',
        ],
      };
      
      return descriptions[type][Math.floor(Math.random() * descriptions[type].length)];
    }
    
    function generateQuestRewards(type: 'environmental' | 'social' | 'personal'): any {
      const baseReward = {
        currency: Math.floor(Math.random() * 30) + 20, // 20-50
      };
      
      // Add type-specific points
      if (type === 'environmental') {
        return {
          ...baseReward,
          environmentalPoints: Math.floor(Math.random() * 10) + 10, // 10-20
        };
      } else if (type === 'social') {
        return {
          ...baseReward,
          socialPoints: Math.floor(Math.random() * 10) + 10, // 10-20
        };
      } else {
        return {
          ...baseReward,
          personalPoints: Math.floor(Math.random() * 10) + 10, // 10-20
        };
      }
    }

    // Handle participation in daily challenge
    const handleDailyChallenge = async () => {
      if (!gameState?.dailyChallenge || !player) return;
      
      try {
        const challengeId = `daily_${new Date(gameState.dailyChallenge.expiresAt).toDateString()}`;
        
        // Check if already participated
        if (hasParticipatedInChallenge) return;
        
        // Register participation
        const success = await GameState.participateInChallenge(postId, challengeId, username);
        
        if (success) {
          // Update player stats based on challenge type
          const updatedPlayer = { ...player };
          
          if (gameState.dailyChallenge.type === 'environmental') {
            updatedPlayer.stats.environmental += 5;
          } else if (gameState.dailyChallenge.type === 'social') {
            updatedPlayer.stats.social += 5;
          } else if (gameState.dailyChallenge.type === 'personal') {
            updatedPlayer.stats.personal += 5;
          }
          
          updatedPlayer.stats.totalActions += 1;
          
          // Save player data
          await GameState.savePlayerData(postId, updatedPlayer);
          setPlayer(updatedPlayer);
          
          // Add activity
          await GameState.addActivity(postId, {
            username,
            action: "participated in the daily challenge",
            timestamp: Date.now()
          });
          
          // Get updated game state
          const updatedGameState = await GameState.getGameState(postId);
          setGameState(updatedGameState);
          setDailyChallenge(updatedGameState.dailyChallenge);
          setHasParticipatedInChallenge(true);
          
          // Update custom post preview
          await GameState.updateCustomPostPreview(postId);
          
          // Get updated activities
          const updatedActivities = await GameState.getRecentActivities(postId);
          setActivities(updatedActivities);
        }
      } catch (err) {
        console.error('Error participating in challenge:', err);
      }
    };

    // Handle participation in community event
    const handleCommunityEvent = async (eventId: string) => {
      if (!player || !communityData) return;
      
      try {
        // Check if already participated
        if (eventParticipation[eventId]) return;
        
        // Register participation
        const success = await GameState.participateInEvent(postId, eventId, username);
        
        if (success) {
          // Find the event
          const event = communityData.events.find((e: any) => e.id === eventId);
          
          if (event) {
            // Update player stats
            const updatedPlayer = { ...player };
            
            // Apply rewards
            updatedPlayer.stats.environmental += event.rewards.environmental;
            updatedPlayer.stats.social += event.rewards.social;
            updatedPlayer.stats.personal += event.rewards.personal;
            updatedPlayer.stats.totalActions += 1;
            
            // Save player data
            await GameState.savePlayerData(postId, updatedPlayer);
            setPlayer(updatedPlayer);
            
            // Add activity
            await GameState.addActivity(postId, {
              username,
              action: `participated in the "${event.title}" event`,
              timestamp: Date.now()
            });
            
            // Update event participation state
            setEventParticipation({
              ...eventParticipation,
              [eventId]: true
            });
            
            // Get updated community data
            const updatedCommunity = await GameState.getCommunityStore(postId);
            setCommunityData(updatedCommunity);
            
            // Get updated activities
            const updatedActivities = await GameState.getRecentActivities(postId);
            setActivities(updatedActivities);
            
            // Update custom post preview
            await GameState.updateCustomPostPreview(postId);
          }
        }
      } catch (err) {
        console.error('Error participating in event:', err);
      }
    };

    // Check if user has participated in an event
    const hasParticipatedInEvent = (eventId: string): boolean => {
      return eventParticipation[eventId] || false;
    };

    // Rendering loading state
    if (loading) {
      return (
        <blocks>
          <Components.LoadingScreen />
        </blocks>
      );
    }

    // Error state
    if (error) {
      return (
        <blocks>
          <Components.ErrorScreen />
        </blocks>
      );
    }

    // Rendering login prompt if user is not logged in
    if (!username) {
      return (
        <blocks>
          <Components.LoginPrompt />
        </blocks>
      );
    }

    // Rendering game if state is loaded
    if (!gameState || !player) {
      return (
        <blocks>
          <Components.ErrorScreen />
        </blocks>
      );
    }

    // Prepare data for pagination
    const paginatedActivities = activities.slice(
      activityPage * ITEMS_PER_PAGE,
      (activityPage + 1) * ITEMS_PER_PAGE
    );
    
    const paginatedLeaderboard = leaderboard.slice(
      leaderboardPage * ITEMS_PER_PAGE,
      (leaderboardPage + 1) * ITEMS_PER_PAGE
    );
    
    const activitiesPageCount = Math.ceil(activities.length / ITEMS_PER_PAGE);
    const leaderboardPageCount = Math.ceil(leaderboard.length / ITEMS_PER_PAGE);

    // Main tabs
    const mainTabs = [
      { id: 'house', label: 'House', icon: '🏠' },
      { id: 'community', label: 'Community', icon: '👥' },
      { id: 'challenges', label: 'Challenges', icon: '🎯' },
      { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' }
    ];

    // House sub-tabs
    const houseTabs = [
      { id: 'inside', label: 'Inside' },
      { id: 'outside', label: 'Outside' },
      { id: 'farm', label: 'Farm' }
    ];

    // Community sub-tabs
    const communityTabs = [
      { id: 'hub', label: 'Community Hub' },
      { id: 'progress', label: 'Global Progress' },
      { id: 'events', label: 'Events' }
    ];

    // Get top contributor
    const topContributor = leaderboard.length > 0 ? leaderboard[0].username : "No one yet";

    // Calculate total points
    const totalPoints = 
      gameState.communityProgress.environmental + 
      gameState.communityProgress.social + 
      gameState.communityProgress.personal;

    // Main game UI
    return (
      <blocks>
        <vstack padding="medium" gap="medium">
          {/* Game Header */}
          <Components.GameHeader 
            username={username}
            currency={player.inventory.currency}
            showGuide={showGuide}
            onToggleGuide={() => setShowGuide(!showGuide)}
          />

          {/* Guide Character (conditionally shown) */}
          {showGuide && (
            <Components.GuideCharacter onDismiss={() => setShowGuide(false)} />
          )}

          {/* Navigation Tabs */}
          <Components.TabNavigation
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as any)}
            tabs={mainTabs}
          />

          {/* House Tab Content */}
          {activeTab === 'house' && (
            <vstack gap="medium">
              <Components.SubTabNavigation
                activeTab={houseTab}
                onTabChange={(tab) => setHouseTab(tab as any)}
                tabs={houseTabs}
              />

              {houseTab === 'inside' && (
                <Components.HouseInterior player={player} onAction={handleAction} />
              )}

              {houseTab === 'outside' && (
                <Components.HouseExterior player={player} onAction={handleAction} />
              )}

              {houseTab === 'farm' && (
                <Components.Farm player={player} onAction={handleAction} />
              )}
            </vstack>
          )}

          {/* Community Tab Content */}
          {activeTab === 'community' && (
            <vstack gap="medium">
              <Components.SubTabNavigation
                activeTab={communityTab}
                onTabChange={(tab) => setCommunityTab(tab as any)}
                tabs={communityTabs}
              />

              {communityTab === 'hub' && (
                <Components.CommunityHub 
                  playerCount={gameState.playerCount}
                  activePlayers={gameState.activePlayerCount}
                  topContributor={topContributor}
                  onAction={handleAction}
                />
              )}

              {communityTab === 'progress' && (
                <Components.GlobalProgress 
                  environmentalPoints={gameState.communityProgress.environmental}
                  socialPoints={gameState.communityProgress.social}
                  personalPoints={gameState.communityProgress.personal}
                  totalPoints={totalPoints}
                />
              )}

              {communityTab === 'events' && communityData && (
                <Components.CommunityEvents 
                  events={communityData.events}
                  username={username}
                  hasParticipated={hasParticipatedInEvent}
                  onParticipate={handleCommunityEvent}
                />
              )}
            </vstack>
          )}

          {/* Challenges Tab Content */}
          {activeTab === 'challenges' && (
            <vstack gap="medium">
              {dailyChallenge && (
                <Components.DailyChallenge 
                  type={dailyChallenge.type}
                  description={dailyChallenge.description}
                  current={dailyChallenge.current}
                  goal={dailyChallenge.goal}
                  participantCount={dailyChallenge.participantCount}
                  expiresAt={dailyChallenge.expiresAt}
                  hasParticipated={hasParticipatedInChallenge}
                  onParticipate={handleDailyChallenge}
                />
              )}
              
              <Components.PlayerQuests quests={quests} />
              
              <Components.PersonalGrowth onAction={handleAction} />
            </vstack>
          )}

          {/* Leaderboard Tab Content */}
          {activeTab === 'leaderboard' && (
            <vstack gap="medium">
              <Components.Leaderboard 
                players={paginatedLeaderboard}
                currentUsername={username}
              />
              
              {leaderboardPageCount > 1 && (
                <Components.Pagination
                  currentPage={leaderboardPage}
                  totalPages={leaderboardPageCount}
                  onPageChange={(page) => setLeaderboardPage(page)}
                />
              )}
              
              {communityData && (
                <Components.CommunityMilestones milestones={communityData.milestones} />
              )}
              
              <Components.ActivityFeed activities={paginatedActivities} />
              
              {activitiesPageCount > 1 && (
                <Components.Pagination
                  currentPage={activityPage}
                  totalPages={activitiesPageCount}
                  onPageChange={(page) => setActivityPage(page)}
                />
              )}
            </vstack>
          )}

          {/* Player Stats */}
          <Components.PlayerStatsCard 
            stats={player.stats}
            rank={playerRank}
            joinedAt={player.joinedAt}
            totalActions={player.stats.totalActions}
          />
        </vstack>
      </blocks>
    );
  }

  // Register the VillehavenGame post type
  Devvit.addMenuItem({
    location: 'subreddit',
    label: 'Create Villehaven Game',
    onPress: async (event, context) => {
      const postData = {
        title: 'Join Villehaven - Build, Grow, and Connect!',
        content: 'Welcome to Villehaven! A cozy village simulation where your actions help build a better community. Play together with other redditors to create a thriving village that values environmental stewardship, social connection, and personal growth.',
        subredditName: event.subreddit.name,
        customPostType: 'Villehaven',
      };
      
      try {
        const post = await context.reddit.submitPost(postData);
        
        // Initialize all game data stores for the new post
        await GameState.initializeGameDataStores(post.id);
        
        // Set initial custom post preview
        await Devvit.api.setCustomPostPreview({
          postId: post.id,
          preview: {
            type: 'image',
            url: 'https://placehold.co/600x400/87CEEB/FFFFFF/png?text=Villehaven%0A0+Villagers%0A0+Community+Points%0AJoin+the+new+village!',
            width: 600,
            height: 400,
          },
        });
      } catch (error) {
        console.error('Error creating Villehaven game:', error);
      }
    },
  });

  // Set up scheduled task to reset daily challenges
  Devvit.addSchedulerJob({
    name: 'daily-challenge-reset',
    cronExpression: '0 0 * * *', // Run at midnight every day
    onRun: async (event, context) => {
      try {
        // Get all Villehaven posts
        const posts = await context.reddit.search({ 
          query: 'title:Villehaven', 
          subreddit: event.subreddit.name 
        });
        
        for (const post of posts) {
          // Get game state
          const gameState = await GameState.getGameState(post.id);
          if (!gameState) continue;
          
          // Create new daily challenge
          const dailyChallenge = GameState.createDailyChallenge();
          
          // Update game state with new challenge
          gameState.dailyChallenge = dailyChallenge;
          await GameState.saveGameState(post.id, gameState);
          
          // Update player counts
          await GameState.updatePlayerCounts(post.id);
          
          // Update custom post preview
          await GameState.updateCustomPostPreview(post.id);
          
          // Check events and milestones
          const communityStore = await GameState.getCommunityStore(post.id);
          if (communityStore) {
            // Check for expired events and replace them
            const updatedEvents = [];
            for (const event of communityStore.events) {
              if (event.endTime < Date.now()) {
                // Create a new event to replace the expired one
                updatedEvents.push({
                  id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  title: getRandomEventTitle(),
                  description: getRandomEventDescription(),
                  startTime: Date.now(),
                  endTime: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days
                  goal: Math.floor(Math.random() * 50) + 50, // 50-100
                  progress: 0,
                  participants: [],
                  rewards: {
                    environmental: Math.floor(Math.random() * 15) + 5, // 5-20
                    social: Math.floor(Math.random() * 15) + 5, // 5-20
                    personal: Math.floor(Math.random() * 15) + 5, // 5-20
                  },
                });
              } else {
                updatedEvents.push(event);
              }
            }
            
            communityStore.events = updatedEvents;
            await GameState.saveCommunityStore(post.id, communityStore);
          }
        }
      } catch (error) {
        console.error('Error in daily challenge reset job:', error);
      }
    }
  });

  // Helper functions for event generation
  function getRandomEventTitle(): string {
    const titles = [
      'Community Cleanup',
      'Tree Planting Day',
      'Knowledge Sharing',
      'Neighborly Help',
      'Village Celebration',
      'Garden Festival',
      'Environmental Awareness',
      'Social Connection Day',
      'Personal Growth Challenge',
      'Sustainability Drive',
    ];
    
    return titles[Math.floor(Math.random() * titles.length)];
  }

  function getRandomEventDescription(): string {
    const descriptions = [
      'Help clean up our virtual village environment!',
      'Let\'s plant trees and make our village greener!',
      'Share knowledge and learn from each other!',
      'Help your neighbors with their daily tasks!',
      'Celebrate our community achievements together!',
      'Grow beautiful gardens and share your progress!',
      'Promote environmental awareness in our community!',
      'Build stronger connections with fellow villagers!',
      'Focus on personal development and growth!',
      'Work together for a more sustainable village!',
    ];
    
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  // Weekly maintenance task
  Devvit.addSchedulerJob({
    name: 'weekly-maintenance',
    cronExpression: '0 0 * * 0', // Run at midnight every Sunday
    onRun: async (event, context) => {
      try {
        // Get all Villehaven posts
        const posts = await context.reddit.search({ 
          query: 'title:Villehaven', 
          subreddit: event.subreddit.name 
        });
        
        for (const post of posts) {
          // Update player counts
          await GameState.updatePlayerCounts(post.id);
          
          // Get game state
          const gameState = await GameState.getGameState(post.id);
          if (!gameState) continue;
          
          // Check if we need to create a new player shard
          await GameState.checkAndCreateNewShardIfNeeded(post.id);
          
          // Announce weekly stats
          await GameState.addActivity(post.id, {
            username: 'Villehaven',
            action: `📊 Weekly stats: ${gameState.playerCount} villagers, ${gameState.activePlayerCount} active, ${
              gameState.communityProgress.environmental + 
              gameState.communityProgress.social + 
              gameState.communityProgress.personal
            } total points!`,
            timestamp: Date.now()
          });
          
          // Update custom post preview
          await GameState.updateCustomPostPreview(post.id);
        }
      } catch (error) {
        console.error('Error in weekly maintenance job:', error);
      }
    }
  });

  export default {};