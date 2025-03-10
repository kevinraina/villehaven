import React, { useState } from 'react';
import { useAction } from '@devvit/public-api';
import { PlayerSchema } from '../schemas';
import { Tabs } from './Tabs';
import { getHouseStyles } from '../gameLogic';

interface HouseViewProps {
  player: PlayerSchema;
  setPlayer: (player: PlayerSchema) => void;
  postId: string;
  setMessage: (message: string | null) => void;
  setError: (error: string | null) => void;
}

export function HouseView({ player, setPlayer, postId, setMessage, setError }: HouseViewProps) {
  const [selectedInteriorStyle, setSelectedInteriorStyle] = useState(player.house.interior.style);
  const [selectedExteriorStyle, setSelectedExteriorStyle] = useState(player.house.exterior.style);
  
  const customizeHouse = useAction<{ 
    success: boolean; 
    message: string; 
    updatedPlayer?: PlayerSchema 
  }>({
    name: 'customizeHouse'
  });
  
  const houseStyles = getHouseStyles();
  
  const handleInteriorCustomize = async () => {
    try {
      const result = await customizeHouse({
        postId,
        location: 'interior',
        style: selectedInteriorStyle
      });
      
      if (result.success && result.updatedPlayer) {
        setPlayer(result.updatedPlayer);
        setMessage(result.message);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to customize house interior. Please try again.');
    }
  };
  
  const handleExteriorCustomize = async () => {
    try {
      const result = await customizeHouse({
        postId,
        location: 'exterior',
        style: selectedExteriorStyle
      });
      
      if (result.success && result.updatedPlayer) {
        setPlayer(result.updatedPlayer);
        setMessage(result.message);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to customize house exterior. Please try again.');
    }
  };
  
  const renderInteriorHouse = () => {
    return (
      <div className={`house-interior ${player.house.interior.style}`}>
        <div className="house-customization">
          <h3>Customize Interior</h3>
          <div className="style-selection">
            <label>Interior Style:</label>
            <select 
              value={selectedInteriorStyle}
              onChange={(e) => setSelectedInteriorStyle(e.target.value)}
            >
              {houseStyles.interior.map(style => (
                <option key={style} value={style}>
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </option>
              ))}
            </select>
            <button onClick={handleInteriorCustomize}>Apply Style</button>
          </div>
          
          <div className="interior-preview">
            <div className={`room ${selectedInteriorStyle}`}>
              <div className="room-background"></div>
              <div className="furniture">
                {player.house.interior.items.map((item, index) => (
                  <div 
                    key={index}
                    className={`furniture-item ${item.type}`}
                    style={{ 
                      left: `${item.position.x}%`, 
                      top: `${item.position.y}%` 
                    }}
                  >
                    {item.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderExteriorHouse = () => {
    return (
      <div className={`house-exterior ${player.house.exterior.style}`}>
        <div className="house-customization">
          <h3>Customize Exterior</h3>
          <div className="style-selection">
            <label>Exterior Style:</label>
            <select 
              value={selectedExteriorStyle}
              onChange={(e) => setSelectedExteriorStyle(e.target.value)}
            >
              {houseStyles.exterior.map(style => (
                <option key={style} value={style}>
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </option>
              ))}
            </select>
            <button onClick={handleExteriorCustomize}>Apply Style</button>
          </div>
          
          <div className="exterior-preview">
            <div className={`house ${selectedExteriorStyle}`}>
              <div className="house-background"></div>
              <div className="yard-items">
                {player.house.exterior.items.map((item, index) => (
                  <div 
                    key={index}
                    className={`yard-item ${item.type}`}
                    style={{ 
                      left: `${item.position.x}%`, 
                      top: `${item.position.y}%` 
                    }}
                  >
                    {item.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderPetView = () => {
    // If player has a pet, show pet interaction screen
    if (player.pet) {
      return (
        <div className="pet-view">
          <h3>Your Pet: {player.pet.name}</h3>
          <div className={`pet-container ${player.pet.type}`}>
            <div className={`pet ${player.pet.type}`}></div>
            <div className="pet-info">
              <p>Type: {player.pet.type.charAt(0).toUpperCase() + player.pet.type.slice(1)}</p>
              <p>Level: {player.pet.level}</p>
              <p>Happiness: {player.pet.happiness}%</p>
              
              <div className="pet-bonuses">
                <h4>Bonuses:</h4>
                <ul>
                  {player.pet.bonuses.map((bonus, index) => (
                    <li key={index}>
                      +{bonus.value}% {bonus.type.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          <div className="pet-actions">
            <button>Pet</button>
            <button>Feed</button>
            <button>Play</button>
          </div>
        </div>
      );
    } 
    // Otherwise show pet adoption screen
    else {
      return (
        <div className="pet-adoption">
          <h3>Adopt a Pet</h3>
          <p>
            Pets provide companionship and special bonuses to help you in Villehaven.
            Choose a pet that matches your playstyle!
          </p>
          
          <div className="available-pets">
            <div className="pet-card" onClick={() => handleAdoptPet('cat')}>
              <div className="pet-image cat"></div>
              <h4>Cat</h4>
              <p>Boosts personal growth points by 10%</p>
            </div>
            
            <div className="pet-card" onClick={() => handleAdoptPet('dog')}>
              <div className="pet-image dog"></div>
              <h4>Dog</h4>
              <p>Boosts community points by 10%</p>
            </div>
            
            <div className="pet-card" onClick={() => handleAdoptPet('bird')}>
              <div className="pet-image bird"></div>
              <h4>Bird</h4>
              <p>Boosts environmental points by 10%</p>
            </div>
            
            <div className="pet-card" onClick={() => handleAdoptPet('rabbit')}>
              <div className="pet-image rabbit"></div>
              <h4>Rabbit</h4>
              <p>Makes crops grow 15% faster</p>
            </div>
          </div>
        </div>
      );
    }
  };
  
  const adoptPet = useAction<{ 
    success: boolean; 
    message: string; 
    updatedPlayer?: PlayerSchema 
  }>({
    name: 'adoptPet'
  });
  
  const handleAdoptPet = async (petType: string) => {
    try {
      const result = await adoptPet({
        postId,
        petType
      });
      
      if (result.success && result.updatedPlayer) {
        setPlayer(result.updatedPlayer);
        setMessage(result.message);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to adopt pet. Please try again.');
    }
  };
  
  const tabs = [
    {
      id: 'interior',
      label: 'Inside House',
      content: renderInteriorHouse()
    },
    {
      id: 'exterior',
      label: 'Outside House',
      content: renderExteriorHouse()
    },
    {
      id: 'pet',
      label: 'Pet Companion',
      content: renderPetView()
    }
  ];
  
  return (
    <div className="house-view">
      <h2>Your House</h2>
      <Tabs tabs={tabs} defaultTab="interior" />
    </div>
  );
}