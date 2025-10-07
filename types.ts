import { string } from "@google/genai/dist/protos/protos";

export enum TileType {
  WATER = 'WATER',
  SAND = 'SAND',
  GRASS = 'GRASS',
  FOREST = 'FOREST',
  WOODEN_FLOOR = 'WOODEN_FLOOR',
  WOODEN_WALL = 'WOODEN_WALL',
  BED = 'BED',
  CHEST = 'CHEST'
}

export enum Item {
    WOOD = 'WOOD',
    WOODEN_PLANK = 'WOODEN_PLANK',
    BED = 'BED',
    WOODEN_SWORD = 'WOODEN_SWORD',
    CHEST_ITEM = 'CHEST_ITEM',
    STRING = 'STRING',
    FISHING_ROD = 'FISHING_ROD',
    FISH = 'FISH',
}

export type Inventory = Partial<Record<Item, number>>;

export type ActionType = 'IDLE' | 'GATHERING_WOOD' | 'BUILDING_FLOOR' | 'BUILDING_WALL' | 'PLACING_ITEM' | 'CRAFTING' | 'EXPLORING' | 'RESTING' | 'FIGHTING' | 'DEPOSITING_ITEM' | 'WITHDRAWING_ITEM' | 'GIVING_ITEM' | 'FISHING' | 'GATHERING_STRING';

export interface Survivor {
  id: string;
  name: string;
  stats: {
    health: number;
    hunger: number;
    energy: number;
  };
  inventory: Inventory;
  action: ActionType;
  position: { x: number; y: number };
  lastDecisionTick: number;
  currentMessage?: { text: string; displayTicks: number; };
  craftingState?: { recipeName: string; progress: number; };
  actionTargetItem?: Item;
  actionTargetSurvivorId?: string;
}

export interface Mob {
    id: string;
    position: { x: number; y: number };
    health: number;
    attackDamage: number;
}

export interface Chest {
    position: { x: number; y: number };
    inventory: Inventory;
}

export interface LogEntry {
  id: number;
  timestamp: number;
  message: string;
}

export interface ChatMessage {
    survivorName: string;
    text: string;
}

export interface Recipe {
    name: string;
    output: { item: Item, quantity: number };
    shape: (Item | null)[][];
}

// Fix: Added the missing GameState interface.
export interface GameState {
  map: TileType[][];
  survivors: Survivor[];
  mobs: Mob[];
  chests: Chest[];
  log: LogEntry[];
  chatHistory: ChatMessage[];
  time: number;
}