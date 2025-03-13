class AudioManager {
  constructor() {
    this.sounds = {
      click: new Audio('sounds/click.mp3'),
      complete: new Audio('sounds/complete.mp3'),
      achievement: new Audio('sounds/achievement.mp3'),
      hover: new Audio('sounds/hover.mp3'),
      plant: new Audio('sounds/plant.mp3'),
      harvest: new Audio('sounds/harvest.mp3'),
      levelUp: new Audio('sounds/level-up.mp3'),
      coins: new Audio('sounds/coins.mp3'),
      notification: new Audio('sounds/notification.mp3'),
      error: new Audio('sounds/error.mp3'),
      success: new Audio('sounds/success.mp3'),
      pop: new Audio('sounds/pop.mp3'),
      swoosh: new Audio('sounds/swoosh.mp3'),
      chime: new Audio('sounds/chime.mp3')
    };

    this.categories = {
      ui: ['click', 'hover', 'pop', 'swoosh'],
      feedback: ['complete', 'success', 'error', 'notification'],
      achievement: ['achievement', 'levelUp', 'chime'],
      gameplay: ['plant', 'harvest', 'coins']
    };

    // Initialize all sounds
    Object.values(this.sounds).forEach(sound => {
      sound.preload = 'auto';
      sound.volume = 0.5; // Default volume
    });

    // Load user preferences
    this.loadPreferences();
    
    // Add error handling for sounds
    Object.entries(this.sounds).forEach(([key, sound]) => {
      sound.addEventListener('error', () => {
        console.warn(`Failed to load sound: ${key}`);
      });
    });
  }

  loadPreferences() {
    try {
      const preferences = JSON.parse(localStorage.getItem('audioPreferences')) || {};
      this.masterVolume = preferences.masterVolume ?? 0.7;
      this.categoryVolumes = preferences.categoryVolumes || {
        ui: 0.5,
        feedback: 0.7,
        achievement: 0.8,
        gameplay: 0.6
      };
      this.isMuted = preferences.isMuted || false;
      
      this.applyVolumes();
    } catch (error) {
      console.error('Error loading audio preferences:', error);
      this.resetToDefaults();
    }
  }

  savePreferences() {
    const preferences = {
      masterVolume: this.masterVolume,
      categoryVolumes: this.categoryVolumes,
      isMuted: this.isMuted
    };
    localStorage.setItem('audioPreferences', JSON.stringify(preferences));
  }

  resetToDefaults() {
    this.masterVolume = 0.7;
    this.categoryVolumes = {
      ui: 0.5,
      feedback: 0.7,
      achievement: 0.8,
      gameplay: 0.6
    };
    this.isMuted = false;
    this.applyVolumes();
    this.savePreferences();
  }

  applyVolumes() {
    Object.entries(this.sounds).forEach(([name, sound]) => {
      const category = Object.entries(this.categories)
        .find(([_, sounds]) => sounds.includes(name))?.[0];
      
      if (category) {
        sound.volume = this.isMuted ? 0 : 
          this.masterVolume * this.categoryVolumes[category];
      }
    });
  }

  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.applyVolumes();
    this.savePreferences();
  }

  setCategoryVolume(category, volume) {
    if (this.categoryVolumes.hasOwnProperty(category)) {
      this.categoryVolumes[category] = Math.max(0, Math.min(1, volume));
      this.applyVolumes();
      this.savePreferences();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.applyVolumes();
    this.savePreferences();
    return this.isMuted;
  }

  play(soundName, options = {}) {
    const sound = this.sounds[soundName];
    if (!sound) return;

    try {
      // Create a new audio instance for overlapping sounds
      if (options.allowOverlap) {
        const newSound = new Audio(sound.src);
        newSound.volume = sound.volume;
        newSound.play().catch(e => console.warn(`Failed to play sound: ${soundName}`, e));
        return;
      }

      // For non-overlapping sounds, stop and replay
      sound.currentTime = 0;
      sound.play().catch(e => console.warn(`Failed to play sound: ${soundName}`, e));
    } catch (error) {
      console.warn(`Error playing sound: ${soundName}`, error);
    }
  }

  // Specialized methods for common sound effects
  playUISound(name) {
    if (this.categories.ui.includes(name)) {
      this.play(name, { allowOverlap: false });
    }
  }

  playAchievement() {
    // Play a combination of sounds for achievements
    this.play('achievement', { allowOverlap: true });
    setTimeout(() => this.play('chime', { allowOverlap: true }), 200);
  }

  playSuccess() {
    this.play('success', { allowOverlap: false });
  }

  playError() {
    this.play('error', { allowOverlap: false });
  }

  playNotification() {
    this.play('notification', { allowOverlap: true });
  }
}

// Create and export a singleton instance
const audioManager = new AudioManager();
export default audioManager; 