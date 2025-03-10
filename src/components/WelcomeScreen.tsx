import React from 'react';
import { GlobalStateSchema } from '../schemas';
import { calculateGoalProgress } from '../gameLogic';

interface WelcomeScreenProps {
  onJoin: () => void;
  error: string | null;
  message: string | null;
  globalState: GlobalStateSchema | null;
}

export function WelcomeScreen({ onJoin, error, message, globalState }: WelcomeScreenProps) {
  return (
    <div className="welcome-screen">
      <div className="welcome-header">
        <h1>Welcome to Villehaven</h1>
        <p className="tagline">Build a better virtual world together!</p>
      </div>
      
      {message && (
        <div className="message" onClick={() => {}}>
          {message}
        </div>
      )}
      
      {error && (
        <div className="error" onClick={() => {}}>
          {error}
        </div>
      )}
      
      <div className="welcome-content">
        <div className="welcome-description">
          <h2>About Villehaven</h2>
          <p>
            Villehaven is a community-driven game where players can build and improve a virtual town together.
            Focus on environmental stewardship, community building, and personal growth as you help create
            a thriving village!
          </p>
          
          <h3>Key Features:</h3>
          <ul>
            <li>🏠 <strong>Customize your house</strong> both inside and out</li>
            <li>🌱 <strong>Grow crops and raise animals</strong> on your farm</li>
            <li>👥 <strong>Contribute to community goals</strong> and see real-time progress</li>
            <li>📋 <strong>Complete daily quests</strong> to earn points and rewards</li>
            <li>🐱 <strong>Adopt pet companions</strong> that provide special bonuses</li>
          </ul>
        </div>
        
        {globalState && (
          <div className="community-progress">
            <h2>Community Progress</h2>
            {Object.entries(globalState.globalGoals).map(([key, goal]) => (
              <div key={key} className="progress-item">
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
            
            <div className="community-stats">
              <div className="stat">
                <span className="stat-value">{globalState.playerCount}</span>
                <span className="stat-label">Villagers</span>
              </div>
              
              {globalState.leaderboard.length > 0 && (
                <div className="stat">
                  <span className="stat-value">{globalState.leaderboard[0].username}</span>
                  <span className="stat-label">Top Villager</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="join-section">
        <p>Ready to join our community and make a difference?</p>
        <button className="join-button" onClick={onJoin}>
          Start Your Adventure
        </button>
      </div>
    </div>
  );
}