import React, { useState } from 'react';
import { useAction } from '@devvit/public-api';
import { PlayerSchema, GlobalStateSchema, LeaderboardEntry } from '../schemas';
import { calculateGoalProgress } from '../gameLogic';

interface CommunityViewProps {
  player: PlayerSchema;
  globalState: GlobalStateSchema;
  postId: string;
  setMessage: (message: string | null) => void;
  setError: (error: string | null) => void;
}

export function CommunityView({ 
  player, 
  globalState, 
  postId, 
  setMessage, 
  setError 
}: CommunityViewProps) {
  const [activeTab, setActiveTab] = useState('goals');
  
  const completeQuest = useAction<{ 
    success: boolean; 
    message: string; 
    updatedPlayer?: PlayerSchema;
    updatedGlobal?: GlobalStateSchema;
  }>({
    name: 'completeQuest'
  });
  
  const handleOrganizeEvent = async () => {
    // Find community event quest
    const eventQuest = globalState.activeQuests.find(
      quest => quest.type === 'community' && 
      quest.requirements.action === 'organize' && 
      quest.requirements.target === 'event'
    );
    
    if (!eventQuest) {
      setError('No community event quest available right now. Check back later!');
      return;
    }
    
    try {
      const result = await completeQuest({
        postId,
        questId: eventQuest.id,
        action: 'organize'
      });
      
      if (result.success) {
        setMessage(result.message);
        
        if (result.updatedGlobal) {
          // This would be handled by the parent component updating the global state
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to organize community event. Please try again.');
    }
  };
  
  const handleCleanOcean = async () => {
    // Find clean ocean quest
    const cleanQuest = globalState.activeQuests.find(
      quest => quest.type === 'environment' && 
      quest.requirements.action === 'clean' && 
      quest.requirements.target === 'ocean'
    );
    
    if (!cleanQuest) {
      setError('No ocean cleaning quest available right now. Check back later!');
      return;
    }
    
    try {
      const result = await completeQuest({
        postId,
        questId: cleanQuest.id,
        action: 'clean'
      });
      
      if (result.success) {
        setMessage(result.message);
        
        if (result.updatedGlobal) {
          // This would be handled by the parent component updating the global state
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to clean ocean. Please try again.');
    }
  };
  
  const renderGoalsTab = () => {
    return (
      <div className="community-goals">
        <h3>Villehaven Community Goals</h3>
        
        <div className="global-goals">
          {Object.entries(globalState.globalGoals).map(([key, goal]) => {
            const progress = calculateGoalProgress(goal.current, goal.target);
            
            return (
              <div key={key} className="goal-item">
                <div className="goal-header">
                  <h4>{goal.title}</h4>
                  <span className="goal-progress">
                    {goal.current} / {goal.target} ({progress}%)
                  </span>
                </div>
                
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                
                <div className="goal-actions">
                  {key === 'oceansClean' && (
                    <button onClick={handleCleanOcean}>Clean Ocean</button>
                  )}
                  
                  {key === 'communityEventsHeld' && (
                    <button onClick={handleOrganizeEvent}>Organize Event</button>
                  )}
                  
                  {key === 'treesPlanted' && (
                    <p>Plant trees on your farm to contribute to this goal!</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  const renderLeaderboardTab = () => {
    return (
      <div className="community-leaderboard">
        <h3>Villehaven Leaderboard</h3>
        
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Villager</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {globalState.leaderboard.length > 0 ? (
              globalState.leaderboard.map((entry, index) => (
                <tr 
                  key={entry.userId} 
                  className={entry.userId === player.userId ? 'current-player' : ''}
                >
                  <td>{entry.rank}</td>
                  <td>{entry.username}</td>
                  <td>{entry.score}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3}>No data available yet</td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Show current player's rank if not in top 10 */}
        {!globalState.leaderboard.some(entry => entry.userId === player.userId) && (
          <div className="player-rank">
            <p>Your current rank: Calculating...</p>
          </div>
        )}
      </div>
    );
  };
  
  const renderEventsTab = () => {
    return (
      <div className="community-events">
        <h3>Community Events</h3>
        
        <div className="events-info">
          <p>
            Community events bring all villagers together for a common cause.
            By organizing and participating in events, you contribute to the growth
            and prosperity of Villehaven.
          </p>
          
          <div className="event-stats">
            <div className="event-stat">
              <span className="stat-value">
                {globalState.globalGoals.communityEventsHeld.current}
              </span>
              <span className="stat-label">Events Held</span>
            </div>
            
            <div className="event-stat">
              <span className="stat-value">
                {Math.round((globalState.globalGoals.communityEventsHeld.current / 
                  globalState.globalGoals.communityEventsHeld.target) * 100)}%
              </span>
              <span className="stat-label">Goal Progress</span>
            </div>
          </div>
          
          <button onClick={handleOrganizeEvent} className="organize-button">
            Organize New Event
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="community-view">
      <h2>Community Hub</h2>
      
      <div className="community-tabs">
        <button 
          className={`tab-button ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          Community Goals
        </button>
        <button 
          className={`tab-button ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          Leaderboard
        </button>
        <button 
          className={`tab-button ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Community Events
        </button>
      </div>
      
      <div className="community-content">
        {activeTab === 'goals' && renderGoalsTab()}
        {activeTab === 'leaderboard' && renderLeaderboardTab()}
        {activeTab === 'events' && renderEventsTab()}
      </div>
    </div>
  );
}