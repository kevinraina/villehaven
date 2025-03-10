import React from 'react';
import { PlayerSchema, GlobalStateSchema } from '../schemas';
import { calculateGoalProgress } from '../gameLogic';

interface NavigationBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  player: PlayerSchema | null;
  globalState: GlobalStateSchema | null;
}

export function NavigationBar({ activeTab, setActiveTab, player, globalState }: NavigationBarProps) {
  // Navigation tabs
  const tabs = [
    { id: 'house', label: 'House', icon: '🏠' },
    { id: 'farm', label: 'Farm', icon: '🌱' },
    { id: 'community', label: 'Community', icon: '👥' },
    { id: 'quests', label: 'Quests', icon: '📋' },
    { id: 'profile', label: 'Profile', icon: '👤' }
  ];
  
  return (
    <header className="navigation-bar">
      <div className="game-title">
        <h1>Villehaven</h1>
        {player && (
          <div className="player-stats">
            <span className="environment-points" title="Environment Points">
              🌿 {player.stats.environmentPoints}
            </span>
            <span className="community-points" title="Community Points">
              👥 {player.stats.communityPoints}
            </span>
            <span className="personal-points" title="Personal Growth Points">
              ✨ {player.stats.personalGrowthPoints}
            </span>
          </div>
        )}
      </div>
      
      {globalState && (
        <div className="global-progress">
          {Object.entries(globalState.globalGoals).map(([key, goal]) => (
            <div key={key} className="progress-bar">
              <div className="progress-label">
                {goal.title}: {goal.current}/{goal.target}
              </div>
              <div className="progress-container">
                <div 
                  className="progress-fill"
                  style={{ width: `${calculateGoalProgress(goal.current, goal.target)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      
      <nav className="tabs">
        <ul>
          {tabs.map(tab => (
            <li 
              key={tab.id}
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}