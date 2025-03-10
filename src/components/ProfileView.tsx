import React from 'react';
import { PlayerSchema } from '../schemas';
import { formatTimestamp } from '../gameLogic';

interface ProfileViewProps {
  player: PlayerSchema;
  setPlayer: (player: PlayerSchema) => void;
  postId: string;
  setMessage: (message: string | null) => void;
  setError: (error: string | null) => void;
}

export function ProfileView({ 
  player, 
  setPlayer, 
  postId, 
  setMessage, 
  setError 
}: ProfileViewProps) {
  // Calculate total resources in inventory
  const totalResources = player.inventory.resources.reduce(
    (sum, resource) => sum + resource.quantity, 0
  );
  
  // Calculate total items in inventory
  const totalItems = player.inventory.items.length;
  
  return (
    <div className="profile-view">
      <div className="profile-header">
        <h2>{player.username}'s Profile</h2>
        <div className="player-joined">
          Joined: {formatTimestamp(player.lastActive)}
        </div>
      </div>
      
      <div className="profile-content">
        <div className="stats-section">
          <h3>Your Stats</h3>
          
          <div className="stats-grid">
            <div className="stat-card environment">
              <div className="stat-icon">🌿</div>
              <div className="stat-value">{player.stats.environmentPoints}</div>
              <div className="stat-label">Environment Points</div>
            </div>
            
            <div className="stat-card community">
              <div className="stat-icon">👥</div>
              <div className="stat-value">{player.stats.communityPoints}</div>
              <div className="stat-label">Community Points</div>
            </div>
            
            <div className="stat-card personal">
              <div className="stat-icon">✨</div>
              <div className="stat-value">{player.stats.personalGrowthPoints}</div>
              <div className="stat-label">Personal Growth Points</div>
            </div>
            
            <div className="stat-card total">
              <div className="stat-icon">🏆</div>
              <div className="stat-value">{player.stats.totalPoints}</div>
              <div className="stat-label">Total Points</div>
            </div>
          </div>
        </div>
        
        <div className="inventory-section">
          <h3>Your Inventory</h3>
          
          <div className="inventory-tabs">
            <div className="inventory-tab resources active">
              <h4>Resources ({totalResources})</h4>
              
              {player.inventory.resources.length > 0 ? (
                <div className="resources-list">
                  {player.inventory.resources.map((resource, index) => (
                    <div key={index} className="resource-item">
                      <div className={`resource-icon ${resource.type}`}></div>
                      <div className="resource-details">
                        <div className="resource-name">
                          {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                        </div>
                        <div className="resource-quantity">
                          Quantity: {resource.quantity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-items">You don't have any resources yet.</p>
              )}
            </div>
            
            <div className="inventory-tab items">
              <h4>Items ({totalItems})</h4>
              
              {player.inventory.items.length > 0 ? (
                <div className="items-list">
                  {player.inventory.items.map((item, index) => (
                    <div key={index} className="inventory-item">
                      <div className={`item-icon ${item.type}`}></div>
                      <div className="item-details">
                        <div className="item-name">{item.name}</div>
                        <div className="item-description">{item.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-items">You don't have any special items yet.</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="achievements-section">
          <h3>Achievements</h3>
          
          <div className="achievements-list">
            {/* We could add achievements here based on player progress */}
            <div className="achievement-placeholder">
              <p>Achievements are coming soon!</p>
              <p>Complete quests and contribute to community goals to earn badges and rewards.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}