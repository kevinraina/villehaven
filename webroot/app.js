// Villehaven Game JavaScript

// Global state
let playerData = null;
let gameState = null;
let postId = null;
let username = null;
let realTimeChannel = null;

// Audio Manager functionality
const audioManager = {
  sounds: {},
  categoryVolumes: {
    ui: 1,
    effects: 1,
    music: 0.5,
    ambient: 0.7
  },
  masterVolume: 0.5,
  isMuted: false,
  
  init() {
    // Initialize with empty Audio objects first
    const soundFiles = {
      click: ['sounds/click.wav', 'sounds/click.mp3'],
      complete: ['sounds/complete.wav', 'sounds/complete.mp3'],
      achievement: ['sounds/achievement.wav', 'sounds/achievement.mp3'],
      background: ['sounds/background.wav', 'sounds/background.mp3']
    };
    
    Object.entries(soundFiles).forEach(([name, paths]) => {
      // Try loading each format until one succeeds
      const audio = new Audio();
      let loaded = false;
      
      const tryNextFormat = (index) => {
        if (index >= paths.length) {
          console.log(`Warning: Could not load sound: ${name}`);
          return;
        }
        
        audio.src = paths[index];
        audio.volume = this.masterVolume;
        
        audio.addEventListener('canplaythrough', () => {
          if (!loaded) {
            loaded = true;
            this.sounds[name] = audio;
            console.log(`Loaded sound: ${name} (${paths[index]})`);
          }
        });
        
        audio.addEventListener('error', () => {
          if (!loaded) {
            console.log(`Failed to load: ${paths[index]}, trying next format...`);
            tryNextFormat(index + 1);
          }
        });
      };
      
      tryNextFormat(0);
    });
  },
  
  play(soundName) {
    if (!this.isMuted && this.sounds[soundName]) {
      const sound = this.sounds[soundName];
      sound.currentTime = 0;
      sound.play().catch(e => {
        console.log(`Failed to play sound ${soundName}:`, e);
      });
    }
  },
  
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    Object.values(this.sounds).forEach(sound => {
      if (sound && sound.volume !== undefined) {
        sound.volume = this.masterVolume;
      }
    });
  },
  
  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }
};

// Initialize audio manager
audioManager.init();

// Initial setup - Ensure DOM is loaded before adding event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI elements only after DOM is loaded
  try {
    setupEventListeners();
    initializeSoundControls();
    initializeSettingsToggle();
  } catch (error) {
    console.error('Error during initialization:', error);
  }
  
  // Tell Devvit we're ready to receive messages
  window.parent.postMessage({ type: 'webViewReady' }, '*');
  
  // Listen for messages from Devvit
  window.addEventListener('message', handleDevvitMessages);
  
  // Simulate loading
  simulateLoading();
  
  initializeDailyChallenge();
  initializeQuickTasks();
  initializeSocialFeatures();
});

// Set up event listeners for UI elements
function setupEventListeners() {
  // Join game button
  const joinButton = document.getElementById('join-button');
  if (joinButton) {
    joinButton.addEventListener('click', handleJoinGame);
  }
  
  // Navigation tabs
  const navTabs = document.querySelectorAll('#nav-tabs li');
  navTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const tabId = tab.getAttribute('data-tab');
      if (tabId) {
        switchTab(tabId);
      }
    });
  });
  
  // Subtabs
  const subtabButtons = document.querySelectorAll('.subtab-button');
  subtabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const subtabId = button.getAttribute('data-subtab');
      if (!subtabId) return;
      
      const parent = button.closest('.tab-content');
      if (!parent) return;
      
      // Update active button
      parent.querySelectorAll('.subtab-button').forEach(btn => {
        btn.classList.remove('active');
      });
      button.classList.add('active');
      
      // Show selected subtab
      parent.querySelectorAll('.subtab-content').forEach(content => {
        content.classList.add('hidden');
      });
      const selectedSubtab = parent.querySelector(`#${subtabId}-subtab`);
      if (selectedSubtab) {
        selectedSubtab.classList.remove('hidden');
      }
    });
  });
  
  // Message and error dismiss
  const messageContainers = document.querySelectorAll('#message-container, #error-container, #game-message, #game-error');
  messageContainers.forEach(element => {
    if (element) {
      element.addEventListener('click', () => {
        element.classList.add('hidden');
      });
    }
  });
}

// Modified addVolumeControls function
function addVolumeControls() {
  const settingsContainer = document.querySelector('#settings-container') || createSettingsContainer();
  
  const volumeControls = document.createElement('div');
  volumeControls.className = 'volume-controls';
  volumeControls.innerHTML = `
    <h3>Sound Settings</h3>
    <div class="volume-slider">
      <label for="master-volume">Master Volume</label>
      <input type="range" id="master-volume" min="0" max="100" value="${audioManager.masterVolume * 100}">
      <span class="volume-value">${Math.round(audioManager.masterVolume * 100)}%</span>
    </div>
  `;
  
  settingsContainer.appendChild(volumeControls);
  
  // Add event listener for volume control
  const masterVolume = document.querySelector('#master-volume');
  if (masterVolume) {
    masterVolume.addEventListener('input', (e) => {
      const volume = e.target.value / 100;
      audioManager.setMasterVolume(volume);
      e.target.nextElementSibling.textContent = `${Math.round(volume * 100)}%`;
    });
  }
}

// ... rest of the existing code ...