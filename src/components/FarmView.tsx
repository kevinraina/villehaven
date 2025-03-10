import React, { useState } from 'react';
import { useAction } from '@devvit/public-api';
import { PlayerSchema, GlobalStateSchema, Crop, Animal } from '../schemas';
import { getAvailableCrops, getAvailableAnimals } from '../gameLogic';

interface FarmViewProps {
  player: PlayerSchema;
  setPlayer: (player: PlayerSchema) => void;
  postId: string;
  globalState: GlobalStateSchema;
  setGlobalState: (globalState: GlobalStateSchema) => void;
  setMessage: (message: string | null) => void;
  setError: (error: string | null) => void;
}

export function FarmView({ 
  player, 
  setPlayer, 
  postId, 
  globalState, 
  setGlobalState, 
  setMessage, 
  setError 
}: FarmViewProps) {
  const [activeSection, setActiveSection] = useState('crops');
  
  const farmAction = useAction<{ 
    success: boolean; 
    message: string; 
    updatedPlayer?: PlayerSchema;
    updatedGlobal?: GlobalStateSchema;
  }>({
    name: 'farmAction'
  });
  
  const handlePlantCrop = async (cropType: string) => {
    try {
      const result = await farmAction({
        postId,
        action: 'plantCrop',
        cropType
      });
      
      if (result.success && result.updatedPlayer) {
        setPlayer(result.updatedPlayer);
        setMessage(result.message);
        
        // If global state was updated (e.g., for trees planted)
        if (result.updatedGlobal) {
          setGlobalState(result.updatedGlobal);
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to plant crop. Please try again.');
    }
  };
  
  const handleHarvestCrops = async () => {
    try {
      const result = await farmAction({
        postId,
        action: 'harvestCrop'
      });
      
      if (result.success && result.updatedPlayer) {
        setPlayer(result.updatedPlayer);
        setMessage(result.message);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to harvest crops. Please try again.');
    }
  };
  
  const handleAddAnimal = async (animalType: string) => {
    try {
      const result = await farmAction({
        postId,
        action: 'addAnimal',
        animalType
      });
      
      if (result.success && result.updatedPlayer) {
        setPlayer(result.updatedPlayer);
        setMessage(result.message);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to add animal. Please try again.');
    }
  };
  
  const cropsList = getAvailableCrops();
  const animalsList = getAvailableAnimals();
  
  // Check if any crops are ready to harvest
  const readyToHarvest = player.farm.crops.some(
    crop => !crop.harvested && crop.readyAt <= Date.now()
  );
  
  const renderCropsSection = () => {
    return (
      <div className="crops-section">
        <h3>Your Crops</h3>
        
        <div className="crop-actions">
          <div className="available-crops">
            <h4>Plant New Crops</h4>
            <div className="crops-grid">
              {cropsList.map(crop => (
                <div 
                  key={crop.type} 
                  className="crop-item"
                  onClick={() => handlePlantCrop(crop.type)}
                >
                  <div className={`crop-icon ${crop.type}`}></div>
                  <div className="crop-info">
                    <div className="crop-name">{crop.name}</div>
                    <div className="crop-time">
                      Grows in {Math.round(crop.growthTime / (60 * 60 * 1000))} hours
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {player.farm.crops.length > 0 && (
            <div className="planted-crops">
              <h4>Your Planted Crops</h4>
              <div className="crops-grid">
                {player.farm.crops
                  .filter(crop => !crop.harvested)
                  .map((crop, index) => {
                    const timeLeft = crop.readyAt - Date.now();
                    const isReady = timeLeft <= 0;
                    
                    return (
                      <div 
                        key={index} 
                        className={`planted-crop ${isReady ? 'ready' : ''}`}
                      >
                        <div className={`crop-icon ${crop.type}`}></div>
                        <div className="crop-status">
                          {isReady ? (
                            <span className="ready-label">Ready to harvest!</span>
                          ) : (
                            <span className="time-left">
                              {Math.ceil(timeLeft / (60 * 1000))} minutes left
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
              
              {readyToHarvest && (
                <button 
                  className="harvest-button"
                  onClick={handleHarvestCrops}
                >
                  Harvest Ready Crops
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const renderAnimalsSection = () => {
    return (
      <div className="animals-section">
        <h3>Your Farm Animals</h3>
        
        <div className="animal-actions">
          <div className="available-animals">
            <h4>Add New Animals</h4>
            <div className="animals-grid">
              {animalsList.map(animal => (
                <div 
                  key={animal.type} 
                  className="animal-item"
                  onClick={() => handleAddAnimal(animal.type)}
                >
                  <div className={`animal-icon ${animal.type}`}></div>
                  <div className="animal-info">
                    <div className="animal-name">{animal.name}</div>
                    <div className="animal-product">
                      Produces {animal.product} every {Math.round(animal.productionTime / (60 * 60 * 1000))} hours
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {player.farm.animals.length > 0 && (
            <div className="farm-animals">
              <h4>Your Animals</h4>
              <div className="animals-grid">
                {player.farm.animals.map((animal, index) => (
                  <div key={index} className="farm-animal">
                    <div className={`animal-icon ${animal.type}`}></div>
                    <div className="animal-status">
                      <div className="animal-name">
                        {animal.type.charAt(0).toUpperCase() + animal.type.slice(1)}
                      </div>
                      <div className="animal-happiness">
                        Happiness: {animal.happiness}%
                      </div>
                      <button className="care-button">Care for Animal</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="farm-view">
      <h2>Your Farm</h2>
      
      <div className="farm-tabs">
        <button 
          className={`tab-button ${activeSection === 'crops' ? 'active' : ''}`}
          onClick={() => setActiveSection('crops')}
        >
          Crops
        </button>
        <button 
          className={`tab-button ${activeSection === 'animals' ? 'active' : ''}`}
          onClick={() => setActiveSection('animals')}
        >
          Animals
        </button>
      </div>
      
      <div className="farm-content">
        {activeSection === 'crops' ? renderCropsSection() : renderAnimalsSection()}
      </div>
    </div>
  );