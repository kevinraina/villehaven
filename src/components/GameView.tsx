import { useState, useEffect } from 'react';
import { usePostContext, useRedis, useUserId, useAction, useCustomField } from '@devvit/public-api';
import { PlayerSchema, GlobalStateSchema } from '../schemas';
import { calculateGoalProgress, formatTimestamp } from '../gameLogic';
import { Tabs } from './Tabs';
import { HouseView } from './HouseView';
import { FarmView } from './FarmView';
import { CommunityView } from './CommunityView';
import { QuestsView } from './QuestsView';
import { ProfileView } from './ProfileView';
import { NavigationBar } from './NavigationBar';
import { WelcomeScreen } from './WelcomeScreen';
import { LoadingView } from './LoadingView';

export function GameView() {
  const postContext = usePostContext();
  const kv = useRedis();
  const userId = useUserId();
  const postId = postContext.postId;
  
  const [activeTab, setActiveTab] = useState('welcome');
  const [player, setPlayer] = useState<PlayerSchema | null>(null);
  const [globalState, setGlobalState] = useState<GlobalStateSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  const joinGame = useAction<{ message: string }>({
    name: 'joinGame'
  });
  
  // Fetch player and global data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Get global state
        const globalStateJson = await kv.get(`game:${postId}:global`);
        if (globalStateJson) {
          setGlobalState(JSON.parse(globalStateJson));
        }
        
        // Check if user is logged in
        if (userId) {
          // Check if player exists
          const playerJson = await kv.get(`game:${postId}:player:${userId}`);
          if (playerJson) {
            setPlayer(JSON.parse(playerJson));
            setActiveTab('house'); // Set active tab to house for returning players
          }
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load game data. Please try again later.');
        setLoading(false);
      }
    }
    
    fetchData();
  }, [kv, postId, userId]);
  
  // Handle join game
  const handleJoinGame = async () => {
    if (!userId) {
      setError('You need to be logged in to join the game.');
      return;
    }
    
    try {
      setLoading(true);
      const result = await joinGame();
      
      if (result.message) {
        setMessage(result.message);
      }
      
      // Refresh player data
      const playerJson = await kv.get(`game:${postId}:player:${userId}`);
      if (playerJson) {
        setPlayer(JSON.parse(playerJson));
        setActiveTab('house'); // Set active tab to house for new players
      }
      
      // Refresh global state
      const globalStateJson = await kv.get(`game:${postId}:global`);
      if (globalStateJson) {
        setGlobalState(JSON.parse(globalStateJson));
      }
      
      setLoading(false);
    } catch (err) {
      setError('Failed to join the game. Please try again later.');
      setLoading(false);
    }
  };
  
  // If loading, show loading screen
  if (loading) {
    return <LoadingView />;
  }
  
  // If no player and welcome screen, show welcome screen
  if (!player && activeTab === 'welcome') {
    return (
      <WelcomeScreen 
        onJoin={handleJoinGame} 
        error={error} 
        message={message}
        globalState={globalState}
      />
    );
  }
  
  // If player is loaded, show game
  return (
    <div className="villehaven-game">
      {message && (
        <div className="message" onClick={() => setMessage(null)}>
          {message}
        </div>
      )}
      
      {error && (
        <div className="error" onClick={() => setError(null)}>
          {error}
        </div>
      )}
      
      <NavigationBar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        player={player}
        globalState={globalState}
      />
      
      <main className="game-content">
        {player && globalState && (
          <>
            {activeTab === 'house' && (
              <HouseView 
                player={player} 
                setPlayer={setPlayer} 
                postId={postId}
                setMessage={setMessage}
                setError={setError}
              />
            )}
            
            {activeTab === 'farm' && (
              <FarmView 
                player={player} 
                setPlayer={setPlayer} 
                postId={postId}
                globalState={globalState}
                setGlobalState={setGlobalState}
                setMessage={setMessage}
                setError={setError}
              />
            )}
            
            {activeTab === 'community' && (
              <CommunityView 
                player={player} 
                globalState={globalState} 
                postId={postId}
                setMessage={setMessage}
                setError={setError}
              />
            )}
            
            {activeTab === 'quests' && (
              <QuestsView 
                player={player} 
                setPlayer={setPlayer}
                globalState={globalState}
                setGlobalState={setGlobalState}
                postId={postId}
                setMessage={setMessage}
                setError={setError}
              />
            )}
            
            {activeTab === 'profile' && (
              <ProfileView 
                player={player} 
                setPlayer={setPlayer}
                postId={postId}
                setMessage={setMessage}
                setError={setError}
              />
            )}
          </>
        )}
        
        {!player && activeTab !== 'welcome' && (
          <div className="not-joined">
            <h2>Join Villehaven</h2>
            <p>You need to join the game to access this area.</p>
            <button onClick={handleJoinGame}>Join Now</button>
          </div>
        )}
      </main>
    </div>
  );
}