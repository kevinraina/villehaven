import { Devvit } from '@devvit/public-api';
import { useState } from 'react';
import { 
  PlayerData, 
  QuestData,
  StatsData,
  Milestone,
  CommunityEvent,
  Activity
} from './game-state';

// ==== SHARED UI COMPONENTS ====

// Progress Bar Component
export function ProgressBar({ value, max, label, color = 'green' }: { 
  value: number; 
  max: number; 
  label?: string;
  color?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <vstack width="100%" gap="small">
      {label && <text size="small">{label}: {value}/{max}</text>}
      <hstack width="100%" height="12px" border="thin" cornerRadius="full">
        <hstack 
          width={`${percentage}%`} 
          height="100%" 
          backgroundColor={color} 
          cornerRadius="full"
        />
      </hstack>
    </vstack>
  );
}

// ==== HOUSE COMPONENTS ====

// House Interior Component
export function HouseInterior({ player, onAction }: { 
  player: PlayerData; 
  onAction: (type: string, amount?: number) => void;
}) {
  return (
    <vstack gap="medium" padding="medium" border="thick" cornerRadius="medium">
      <hstack alignment="center">
        <text weight="bold" size="large">🏠 Your House Interior</text>
      </hstack>
      
      <hstack alignment="center" padding="medium" border="thin" cornerRadius="medium">
        <vstack>
          <text>🛋️ {player.house.interior.furniture.includes('basic_sofa') ? 'Cozy Sofa' : 'Empty Space'}</text>
          <text>🪑 {player.house.interior.furniture.includes('basic_chair') ? 'Wooden Chair' : 'Empty Space'}</text>
          <text>🛏️ {player.house.interior.furniture.includes('basic_bed') ? 'Simple Bed' : 'Empty Space'}</text>
        </vstack>
      </hstack>
      
      <ProgressBar 
        value={player.house.interior.cleanliness} 
        max={100} 
        label="Cleanliness" 
        color="blue" 
      />
      
      <button onPress={() => onAction('clean')}>
        🧹 Clean House (+5 Cleanliness)
      </button>
      
      <text size="small">A clean home brings peace of mind and reduces environmental waste!</text>
    </vstack>
  );
}

// Farm Component
export function Farm({ player, onAction }: { 
  player: PlayerData; 
  onAction: (type: string, amount?: number) => void;
}) {
  return (
    <vstack gap="medium" padding="medium" border="thick" cornerRadius="medium">
      <hstack alignment="center">
        <text weight="bold" size="large">🌱 Your Farm</text>
      </hstack>
      
      <hstack alignment="center" padding="medium" border="thin" cornerRadius="medium">
        <vstack width="100%">
          <hstack width="100%" alignment="center" gap="medium">
            {player.house.farm.crops.length > 0 ? (
              Array(Math.min(5, player.house.farm.crops.length)).fill(0).map((_, i) => (
                <text key={i}>🥕</text>
              ))
            ) : (
              <text>No crops planted yet</text>
            )}
          </hstack>
          
          <hstack width="100%" alignment="center" gap="medium">
            {player.house.farm.trees > 0 ? (
              Array(Math.min(3, player.house.farm.trees)).fill(0).map((_, i) => (
                <text key={i}>🌳</text>
              ))
            ) : (
              <text>No trees planted yet</text>
            )}
          </hstack>
        </vstack>
      </hstack>
      
      <hstack gap="medium">
        <button 
          onPress={() => onAction('plant')}
          disabled={player.inventory.seeds['carrot'] <= 0}
        >
          🥕 Plant Carrot ({player.inventory.seeds['carrot']} left)
        </button>
        
        <button 
          onPress={() => onAction('plant', 2)}
          disabled={player.inventory.seeds['tomato'] <= 0}
        >
          🍅 Plant Tomato ({player.inventory.seeds['tomato']} left)
        </button>
      </hstack>
      
      <button onPress={() => onAction('plant', 3)}>
        🌳 Plant Tree (10 environmental points)
      </button>
      
      <text size="small">Growing your own food reduces carbon footprint and promotes sustainability!</text>
    </vstack>
  );
}

// Outside House Component
export function HouseExterior({ player, onAction }: { 
  player: PlayerData; 
  onAction: (type: string, amount?: number) => void;
}) {
  return (
    <vstack gap="medium" padding="medium" border="thick" cornerRadius="medium">
      <hstack alignment="center">
        <text weight="bold" size="large">🏡 House Exterior</text>
      </hstack>
      
      <hstack alignment="center" padding="medium" border="thin" cornerRadius="medium">
        <vstack width="100%">
          <text>🌷 Garden Plants: {player.house.exterior.plants}</text>
          <text>🪴 Decorations: {player.house.exterior.decorations.length}</text>
        </vstack>
      </hstack>
      
      <button onPress={() => onAction('plant')}>
        🌷 Plant Flowers (5 environmental points)
      </button>
      
      <text size="small">Beautiful gardens support local pollinators and improve air quality!</text>
    </vstack>
  );
}

// ==== COMMUNITY COMPONENTS ====

// Community Hub Component
export function CommunityHub({ playerCount, activePlayers, topContributor, onAction }: { 
  playerCount: number;
  activePlayers: number;
  topContributor: string;
  onAction: (type: string, amount?: number) => void;
}) {
  return (
    <vstack gap="medium" padding="medium" border="thick" cornerRadius="medium">
      <hstack alignment="center">
        <text weight="bold" size="large">👥 Community Hub</text>
      </hstack>
      
      <vstack gap="small" padding="medium" border="thin" cornerRadius="medium">
        <text weight="bold">Village Statistics</text>
        <text>👥 Total Villagers: {playerCount}</text>
        <text>👤 Active Today: {activePlayers}</text>
        <text>🏆 Top Contributor: {topContributor || "No one yet"}</text>
      </vstack>
      
      <button onPress={() => onAction('help')}>
        🤝 Help a Neighbor (+5 Social Points)
      </button>
      
      <text size="small">Supporting others builds stronger communities and creates lasting positive change!</text>
    </vstack>
  );
}

// Global Progress Component
export function GlobalProgress({ environmentalPoints, socialPoints, personalPoints, totalPoints }: { 
  environmentalPoints: number;
  socialPoints: number;
  personalPoints: number;
  totalPoints: number;
}) {
  // Determine what community upgrades have been unlocked based on points
  const unlockedUpgrades = [];
  
  if (totalPoints >= 100) unlockedUpgrades.push("Community Garden");
  if (totalPoints >= 500) unlockedUpgrades.push("Recycling Center");
  if (totalPoints >= 1000) unlockedUpgrades.push("Education Hub");
  if (totalPoints >= 2000) unlockedUpgrades.push("Renewable Energy");
  if (totalPoints >= 5000) unlockedUpgrades.push("Sustainable Paradise");
  
  // Next milestone
  const nextMilestone = 
    totalPoints < 100 ? 100 :
    totalPoints < 500 ? 500 :
    totalPoints < 1000 ? 1000 :
    totalPoints < 2000 ? 2000 :
    totalPoints < 5000 ? 5000 : null;
  
  return (
    <vstack gap="medium" padding="medium" border="thick" cornerRadius="medium">
      <hstack alignment="center">
        <text weight="bold" size="large">🌍 Global Village Progress</text>
      </hstack>
      
      <vstack gap="medium">
        <ProgressBar 
          value={environmentalPoints} 
          max={3000} 
          label="🌿 Environmental Impact" 
          color="green" 
        />
        
        <ProgressBar 
          value={socialPoints} 
          max={3000} 
          label="👥 Social Cohesion" 
          color="blue" 
        />
        
        <ProgressBar 
          value={personalPoints} 
          max={3000} 
          label="🧠 Personal Growth" 
          color="purple" 
        />
      </vstack>
      
      <vstack gap="small" padding="medium" border="thin" cornerRadius="medium">
        <text weight="bold">Community Achievements</text>
        {unlockedUpgrades.length > 0 ? (
          unlockedUpgrades.map(upgrade => (
            <text key={upgrade}>✓ {upgrade} Unlocked!</text>
          ))
        ) : (
          <text>No community upgrades unlocked yet. Keep working together!</text>
        )}
        
        {nextMilestone && (
          <text>Next milestone: {nextMilestone} points</text>
        )}
      </vstack>
      
      <text size="small">Every action matters! Together, we're building a better Villehaven.</text>
    </vstack>
  );
}

// ==== CHALLENGE COMPONENTS ====

// Daily Challenge Component
export function DailyChallenge({ 
  type, 
  description, 
  current, 
  goal, 
  participantCount,
  expiresAt,
  hasParticipated,
  onParticipate 
}: { 
  type: 'environmental' | 'social' | 'personal';
  description: string;
  current: number;
  goal: number;
  participantCount: number;
  expiresAt: number;
  hasParticipated: boolean;
  onParticipate: () => void;
}) {
  const timeLeft = Math.max(0, expiresAt - Date.now());
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  return (
    <vstack gap="medium" padding="medium" border="thick" cornerRadius="medium">
      <hstack alignment="center">
        <text weight="bold" size="large">📅 Daily Community Challenge</text>
      </hstack>
      
      <vstack gap="small" padding="medium" border="thin" cornerRadius="medium" backgroundColor="rgba(255, 215, 0, 0.1)">
        <text weight="bold">{description}</text>
        <ProgressBar 
          value={current} 
          max={goal} 
          label="Community Progress" 
          color="orange" 
        />
        <text>Participants: {participantCount}</text>
        <text>Time remaining: {hoursLeft}h {minutesLeft}m</text>
      </vstack>
      
      <button 
        onPress={onParticipate}
        disabled={hasParticipated}
        variant={hasParticipated ? "secondary" : "primary"}
      >
        {hasParticipated ? "Already Participated Today" : "Participate in Challenge"}
      </button>
      
      <text size="small">Working together on daily challenges brings our community closer!</text>
    </vstack>
  );
}

// Player Quests Component
export function PlayerQuests({ quests }: { quests: QuestData[] }) {
  const activeQuests = quests.filter(q => !q.completedAt);
  const completedQuests = quests.filter(q => q.completedAt);
  
  return (
    <vstack gap="medium" padding="medium" border="thick" cornerRadius="medium">
      <hstack alignment="center">
        <text weight="bold" size="large">📜 Your Quests</text>
      </hstack>
      
      {activeQuests.length > 0 ? (
        <vstack gap="medium">
          {activeQuests.map(quest => (
            <vstack key={quest.id} gap="small" padding="medium" border="thin" cornerRadius="medium">
              <text weight="bold">{quest.title}</text>
              <text>{quest.description}</text>
              <ProgressBar 
                value={quest.progress} 
                max={quest.goal} 
                color="purple" 
              />
              <text size="small">
                Rewards: 
                {quest.reward.environmentalPoints ? ` 🌿 ${quest.reward.environmentalPoints}` : ''}
                {quest.reward.socialPoints ? ` 👥 ${quest.reward.socialPoints}` : ''}
                {quest.reward.personalPoints ? ` 🧠 ${quest.reward.personalPoints}` : ''}
                {quest.reward.currency ? ` 💰 ${quest.reward.currency}` : ''}
              </text>
            </vstack>
          ))}
        </vstack>
      ) : (
        <text>No active quests. Complete activities to unlock more!</text>
      )}
      
      {completedQuests.length > 0 && (
        <vstack gap="small">
          <text weight="bold">Completed Quests: {completedQuests.length}</text>
          <button variant="secondary">
            View Completed Quests
          </button>
        </vstack>
      )}
    </vstack>
  );
}

// ==== PLAYER COMPONENTS ====

// Player Stats Card Component
export function PlayerStatsCard({ stats, rank, joinedAt, totalActions }: { 
  stats: StatsData; 
  rank: number | string;
  joinedAt: number;
  totalActions: number;
}) {
  const totalPoints = 
    stats.environmental + 
    stats.social + 
    stats.personal;
  
  return (
    <vstack padding="medium" border="thick" cornerRadius="medium" gap="small">
      <hstack alignment="center">
        <text weight="bold" size="large">👤 Your Villager Profile</text>
      </hstack>
      
      <hstack gap="medium">
        <vstack flex={1}>
          <text weight="bold">Rank: #{rank}</text>
          <text>Total Actions: {totalActions}</text>
          <text>Joined: {new Date(joinedAt).toLocaleDateString()}</text>
        </vstack>
        
        <vstack flex={1}>
          <text>🌿 Environmental: {stats.environmental}</text>
          <text>👥 Social: {stats.social}</text>
          <text>🧠 Personal: {stats.personal}</text>
          <text weight="bold">Total: {totalPoints}</text>
        </vstack>
      </hstack>
    </vstack>
  );
}

// ==== LEADERBOARD AND MILESTONE COMPONENTS ====

// Community Milestones Component
export function CommunityMilestones({ milestones }: { milestones: Milestone[] }) {
  // Sort milestones: achieved ones first, then by point requirement
  const sortedMilestones = [...milestones].sort((a, b) => {
    if (a.achieved && !b.achieved) return -1;
    if (!a.achieved && b.achieved) return 1;
    return a.pointsRequired - b.pointsRequired;
  });
  
  return (
    <vstack padding="medium" border="thick" cornerRadius="medium" gap="medium">
      <text weight="bold" size="large">🏆 Village Milestones</text>
      
      {sortedMilestones.map(milestone => (
        <vstack 
          key={milestone.id} 
          padding="medium" 
          border="thin" 
          cornerRadius="medium" 
          gap="small"
          backgroundColor={milestone.achieved ? "rgba(100, 200, 100, 0.1)" : "transparent"}
        >
          <hstack>
            <text weight="bold">{milestone.achieved ? "✓ " : ""}{milestone.title}</text>
            <spacer />
            <text>{milestone.pointsRequired} points</text>
          </hstack>
          
          <text>{milestone.description}</text>
          
          {milestone.achieved && milestone.achievedAt && (
            <text size="small">
              Achieved on {new Date(milestone.achievedAt).toLocaleDateString()}
            </text>
          )}
        </vstack>
      ))}
    </vstack>
  );
}

// Leaderboard Component
export function Leaderboard({ 
  players, 
  currentUsername, 
  limit = 10 
}: { 
  players: { username: string; totalPoints: number }[];
  currentUsername: string;
  limit?: number;
}) {
  // Only show top N players
  const topPlayers = players.slice(0, limit);
  
  return (
    <vstack padding="medium" border="thick" cornerRadius="medium" gap="medium">
      <text weight="bold" size="large">🏅 Village Leaderboard</text>
      
      {topPlayers.length === 0 ? (
        <text>No data available yet. Be the first to score!</text>
      ) : (
        <vstack gap="small">
          {topPlayers.map((player, index) => (
            <hstack 
              key={player.username}
              padding="small"
              backgroundColor={player.username === currentUsername ? "rgba(100, 150, 255, 0.1)" : "transparent"}
              cornerRadius="medium"
            >
              <text weight={player.username === currentUsername ? "bold" : "normal"}>
                #{index + 1} {player.username}
              </text>
              <spacer />
              <text weight={player.username === currentUsername ? "bold" : "normal"}>
                {player.totalPoints} points
              </text>
            </hstack>
          ))}
        </vstack>
      )}
    </vstack>
  );
}

// Community Events Component
export function CommunityEvents({ 
  events,
  username,
  hasParticipated, 
  onParticipate 
}: { 
  events: CommunityEvent[];
  username: string;
  hasParticipated: (eventId: string) => boolean;
  onParticipate: (eventId: string) => void;
}) {
  // Filter to only show active events
  const activeEvents = events.filter(event => event.endTime > Date.now());
  
  if (activeEvents.length === 0) {
    return (
      <vstack padding="medium" border="thick" cornerRadius="medium" gap="medium">
        <text weight="bold" size="large">🎉 Community Events</text>
        <text>No active events at the moment. Check back soon!</text>
      </vstack>
    );
  }
  
  return (
    <vstack padding="medium" border="thick" cornerRadius="medium" gap="medium">
      <text weight="bold" size="large">🎉 Community Events</text>
      
      {activeEvents.map(event => {
        const participated = hasParticipated(event.id);
        const timeLeft = Math.max(0, event.endTime - Date.now());
        const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        return (
          <vstack key={event.id} padding="medium" border="thin" cornerRadius="medium" gap="small" backgroundColor="rgba(255, 200, 100, 0.1)">
            <text weight="bold">{event.title}</text>
            <text>{event.description}</text>
            
            <hstack>
              <text>Progress: {event.progress}/{event.goal}</text>
              <spacer />
              <text>Participants: {event.participants.length}</text>
            </hstack>
            
            <text>Time remaining: {daysLeft}d {hoursLeft}h</text>
            
            <hstack>
              <vstack>
                <text weight="bold">Rewards:</text>
                <text>🌿 {event.rewards.environmental}</text>
                <text>👥 {event.rewards.social}</text>
                <text>🧠 {event.rewards.personal}</text>
              </vstack>
              
              <spacer />
              
              <button
                onPress={() => onParticipate(event.id)}
                disabled={participated}
                variant={participated ? "secondary" : "primary"}
              >
                {participated ? "Participated" : "Participate"}
              </button>
            </hstack>
          </vstack>
        );
      })}
    </vstack>
  );
}

// Activity Feed Component
export function ActivityFeed({ activities }: { 
  activities: Activity[];
}) {
  return (
    <vstack padding="medium" border="thick" cornerRadius="medium" gap="medium">
      <text weight="bold" size="large">📢 Recent Village Activity</text>
      
      {activities.length === 0 ? (
        <text>No recent activity. Be the first to make a difference!</text>
      ) : (
        <vstack gap="small">
          {activities.map((activity, index) => (
            <hstack key={index} padding="small" cornerRadius="medium" border="thin">
              <text>{activity.username}</text>
              <text>{activity.action}</text>
              <spacer />
              <text size="small">{formatTimeAgo(activity.timestamp)}</text>
            </hstack>
          ))}
        </vstack>
      )}
    </vstack>
  );
}

// Villehaven Mascot and Tutorial Guide
export function GuideCharacter({ onDismiss }: { onDismiss: () => void }) {
  const [currentTip, setCurrentTip] = useState(0);
  
  const tips = [
    "Welcome to Villehaven! Here you'll build a better community through environmental and social actions.",
    "Plant trees and crops in your farm to earn environmental points and help our virtual ecosystem!",
    "Clean your house and plant flowers to make your home beautiful and eco-friendly.",
    "Help your neighbors by participating in community challenges and daily quests!",
    "Your actions matter! Every contribution helps unlock community-wide improvements for all villagers.",
  ];
  
  return (
    <vstack padding="medium" border="thick" cornerRadius="medium" gap="medium" backgroundColor="rgba(135, 206, 250, 0.1)">
      <hstack alignment="center" gap="small">
        <text>🦉</text>
        <text weight="bold">Owlbert, Village Guide</text>
        <spacer />
        <button size="small" onPress={onDismiss}>✕</button>
      </hstack>
      
      <text>{tips[currentTip]}</text>
      
      <hstack gap="small">
        <button 
          disabled={currentTip === 0}
          onPress={() => setCurrentTip(curr => Math.max(0, curr - 1))}
        >
          Previous
        </button>
        
        <button 
          disabled={currentTip === tips.length - 1}
          onPress={() => setCurrentTip(curr => Math.min(tips.length - 1, curr + 1))}
        >
          Next
        </button>
      </hstack>
    </vstack>
  );
}

// Helper function to format time ago
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Loading Screen Component
export function LoadingScreen() {
  return (
    <vstack padding="medium" gap="medium" alignment="center">
      <text size="xlarge" weight="bold">Villehaven</text>
      <text>Loading your village...</text>
      <text>Please wait while we prepare your cozy village experience!</text>
    </vstack>
  );
}

// Login Prompt Component
export function LoginPrompt() {
  return (
    <vstack padding="medium" gap="medium" alignment="center">
      <text size="xlarge" weight="bold">Welcome to Villehaven</text>
      <text>A community game where your actions create a better virtual world!</text>
      <text>Please log in to Reddit to start building your village.</text>
    </vstack>
  );
}

// Error Screen Component
export function ErrorScreen() {
  return (
    <vstack padding="medium" gap="medium" alignment="center">
      <text size="xlarge" weight="bold">Villehaven</text>
      <text>Unable to load game data. Please try again.</text>
    </vstack>
  );
}

// Pagination Component
export function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void;
}) {
  return (
    <hstack gap="small" alignment="center">
      <button 
        size="small" 
        disabled={currentPage === 0}
        onPress={() => onPageChange(currentPage - 1)}
      >
        Previous
      </button>
      
      <text>Page {currentPage + 1} of {totalPages}</text>
      
      <button 
        size="small" 
        disabled={currentPage === totalPages - 1}
        onPress={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </hstack>
  );
}

// Personal Growth Component
export function PersonalGrowth({ onAction }: { onAction: (type: string) => void }) {
  return (
    <vstack gap="medium" padding="medium" border="thick" cornerRadius="medium">
      <text weight="bold" size="large">🧠 Personal Growth</text>
      <text>Expand your knowledge and improve your personal skills.</text>
      <button onPress={() => onAction('learn')}>
        📚 Study & Learn (+5 Personal Points)
      </button>
    </vstack>
  );
}

// Tab Navigation Component
export function TabNavigation({ 
  activeTab, 
  onTabChange,
  tabs
}: { 
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { id: string; label: string; icon: string }[];
}) {
  return (
    <hstack gap="small">
      {tabs.map(tab => (
        <button
          key={tab.id}
          variant={activeTab === tab.id ? 'primary' : 'secondary'}
          onPress={() => onTabChange(tab.id)}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </hstack>
  );
}

// Sub-Tab Navigation Component
export function SubTabNavigation({ 
  activeTab, 
  onTabChange,
  tabs
}: { 
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { id: string; label: string }[];
}) {
  return (
    <hstack gap="small">
      {tabs.map(tab => (
        <button
          key={tab.id}
          variant={activeTab === tab.id ? 'primary' : 'secondary'}
          onPress={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </hstack>
  );
}

// Game Header Component
export function GameHeader({ 
  username, 
  currency, 
  showGuide, 
  onToggleGuide 
}: { 
  username: string;
  currency: number;
  showGuide: boolean;
  onToggleGuide: () => void;
}) {
  return (
    <hstack gap="medium" alignment="center">
      <text size="xlarge" weight="bold">Villehaven</text>
      <spacer />
      <text>👤 {username}</text>
      <text>💰 {currency}</text>
      <button 
        size="small" 
        onPress={onToggleGuide}
      >
        {showGuide ? "Hide Guide" : "Help"}
      </button>
    </hstack>
  );
}

export default {
  // Shared UI
  ProgressBar,
  
  // House Components
  HouseInterior,
  Farm,
  HouseExterior,
  
  // Community Components
  CommunityHub,
  GlobalProgress,
  
  // Challenge Components
  DailyChallenge,
  PlayerQuests,
  
  // Player Components
  PlayerStatsCard,
  
  // Leaderboard and Milestone Components
  CommunityMilestones,
  Leaderboard,
  CommunityEvents,
  ActivityFeed,
  
  // Tutorial
  GuideCharacter,
  
  // Utility Components
  LoadingScreen,
  LoginPrompt,
  ErrorScreen,
  Pagination,
  PersonalGrowth,
  TabNavigation,
  SubTabNavigation,
  GameHeader,
  
  // Helper Functions
  formatTimeAgo
};