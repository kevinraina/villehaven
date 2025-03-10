// Custom message types for Villehaven game

export interface JoinGameResponse {
  message: string;
}

export interface ActionResponse {
  success: boolean;
  message: string;
  updatedPlayer?: any;
  updatedGlobal?: any;
}

export interface QuestCompletePayload {
  postId: string;
  questId: string;
  action: string;
}

export interface CustomizeHousePayload {
  postId: string;
  location: 'interior' | 'exterior';
  style?: string;
  items?: any[];
}

export interface AdoptPetPayload {
  postId: string;
  petType: string;
}

export interface FarmActionPayload {
  postId: string;
  action: 'plantCrop' | 'harvestCrop' | 'addAnimal';
  cropType?: string;
  animalType?: string;
}