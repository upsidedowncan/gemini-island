import React, { useState, useEffect, useCallback, useRef } from 'react';
import IslandGrid from './components/IslandGrid.tsx';
import SurvivorStatusPanel from './components/SurvivorStatusPanel.tsx';
import GameLog from './components/GameLog.tsx';
import { generateMap } from './utils/mapGenerator.ts';
import { TileType, Survivor, LogEntry, ChatMessage, Item, Inventory, Mob, Chest } from './types.ts';
import { GRID_SIZE, MAX_STAT, TICK_RATE, TICKS_PER_DAY, TREE_REGROWTH_CHANCE, CRAFTING_DURATION_TICKS, MOB_SPAWN_CHANCE_NIGHT, MOB_HEALTH, MOB_ATTACK_DAMAGE, SURVIVOR_BASE_ATTACK_DAMAGE, SWORD_ATTACK_DAMAGE } from './constants.ts';
import { getSurvivorAction } from './services/geminiService.ts';
import { findRecipeByName } from './recipes.ts';

const App: React.FC = () => {
  const [map, setMap] = useState<TileType[][]>([]);
  const [survivors, setSurvivors] = useState<Survivor[]>([]);
  const [mobs, setMobs] = useState<Mob[]>([]);
  const [chests, setChests] = useState<Chest[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [selectedSurvivor, setSelectedSurvivor] = useState<Survivor | null>(null);
  const [time, setTime] = useState(0);
  const [thinkingSurvivorId, setThinkingSurvivorId] = useState<string | null>(null);

  const gameTickRef = useRef<number>(0);
  
  const addLogEntry = useCallback((message: string) => {
    setLog(prevLog => [...prevLog.slice(-100), { id: prevLog.length, timestamp: Date.now(), message }]);
  }, []);

  const initializeGame = useCallback(() => {
    const initialMap = generateMap();
    for (let i = 0; i < GRID_SIZE * 5; i++) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        if (initialMap[y][x] === TileType.GRASS) {
            initialMap[y][x] = TileType.FOREST;
        }
    }
    setMap(initialMap);

    const findValidPosition = (): { x: number; y: number } => {
        let pos = { x: 0, y: 0 };
        do {
            pos = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
        } while (initialMap[pos.y][pos.x] === TileType.WATER);
        return pos;
    };
    
    const initialSurvivors: Survivor[] = Array.from({ length: 5 }, (_, i) => ({
      id: `survivor-${i}`,
      name: ['Alice', 'Bob', 'Charlie', 'Dana', 'Eve'][i],
      stats: { health: 100, hunger: 100, energy: 100 },
      inventory: {},
      action: 'IDLE',
      position: findValidPosition(),
      lastDecisionTick: 0
    }));

    setSurvivors(initialSurvivors);
    setMobs([]);
    setChests([]);
    setSelectedSurvivor(initialSurvivors.length > 0 ? initialSurvivors[0] : null);
    setLog([]);
    setChatHistory([]);
    addLogEntry('A new journey begins. Five survivors find themselves on a deserted island.');
  }, [addLogEntry]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const updateSurvivorState = useCallback(() => {
    const isNight = (time % TICKS_PER_DAY) > TICKS_PER_DAY / 2;

    setSurvivors(prev => prev.map(s => {
      if(s.stats.health <= 0) return s;

      const newStats = { ...s.stats };
      newStats.hunger = Math.max(0, newStats.hunger - 0.1);
      
      let energyChange = -0.05;
      if (isNight && s.action !== 'RESTING') energyChange -= 0.1;

      if (newStats.hunger === 0) newStats.health = Math.max(0, newStats.health - 0.2);

      switch(s.action) {
        case 'RESTING': 
          const isOnBed = map[s.position.y]?.[s.position.x] === TileType.BED;
          energyChange = isOnBed ? 1.5 : 0;
          if (isOnBed) {
            newStats.health = Math.min(MAX_STAT, newStats.health + 0.5);
          }
          break;
        case 'GATHERING_WOOD': energyChange -= 0.3; break;
        case 'BUILDING_FLOOR': energyChange -= 0.2; break;
        case 'BUILDING_WALL': energyChange -= 0.2; break;
        case 'PLACING_ITEM': energyChange -= 0.1; break;
        case 'CRAFTING': energyChange -= 0.15; break;
        case 'EXPLORING': energyChange -= 0.2; break;
        case 'FIGHTING': energyChange -= 0.4; break;
      }
      
      newStats.energy = Math.max(0, Math.min(MAX_STAT, newStats.energy + energyChange));
      
      let newMsg = s.currentMessage;
      if (newMsg) {
        newMsg.displayTicks -= 1;
        if (newMsg.displayTicks <= 0) newMsg = undefined;
      }

      return { ...s, stats: newStats, currentMessage: newMsg };
    }).filter(s => s.stats.health > 0));
  }, [time, map]);
  
  const isPassable = (pos: { x: number, y: number }, grid: TileType[][]) => {
      const tile = grid[pos.y]?.[pos.x];
      return tile && tile !== TileType.WATER && tile !== TileType.WOODEN_WALL;
  }

  const moveTowards = (currentPos: { x: number; y: number }, target: { x: number; y: number }, grid: TileType[][]): { x: number; y: number } => {
      const { x, y } = currentPos;
      let newX = x, newY = y;
      const dx = target.x - x;
      const dy = target.y - y;
      
      if (Math.abs(dx) > Math.abs(dy)) {
          newX += Math.sign(dx);
      } else if (Math.abs(dy) > 0) {
          newY += Math.sign(dy);
      }

      if (isPassable({x: newX, y: newY}, grid)) return { x: newX, y: newY };
      
      if (dx !== 0 && dy !== 0) {
        if(isPassable({x: x + Math.sign(dx), y: y}, grid)) return {x: x + Math.sign(dx), y:y};
        if(isPassable({x: x, y: y + Math.sign(dy)}, grid)) return {x: x, y: y + Math.sign(dy)};
      } else if (dx === 0) { // Moving vertically
        if(isPassable({x: x + 1, y: y}, grid)) return {x: x + 1, y: y};
        if(isPassable({x: x - 1, y: y}, grid)) return {x: x - 1, y: y};
      } else { // Moving horizontally
        if(isPassable({x: x, y: y + 1}, grid)) return {x: x, y: y + 1};
        if(isPassable({x: x, y: y - 1}, grid)) return {x: x, y: y - 1};
      }

      return currentPos;
  };
  
  const findNearestTile = (startPos: { x: number; y: number }, tileType: TileType | TileType[], grid: TileType[][]): { x: number; y: number } | null => {
      let nearest: { x: number; y: number } | null = null;
      let minDistance = Infinity;
      const targetTypes = Array.isArray(tileType) ? tileType : [tileType];
      for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
              if (targetTypes.includes(grid[y][x])) {
                  const distance = Math.abs(x - startPos.x) + Math.abs(y - startPos.y);
                  if (distance < minDistance) {
                      minDistance = distance;
                      nearest = { x, y };
                  }
              }
          }
      }
      return nearest;
  };

  const executeMobActions = useCallback(() => {
    setSurvivors(currentSurvivors => {
        let newSurvivors = currentSurvivors.map(s => ({...s}));
        
        setMobs(currentMobs => {
            let newMobs = currentMobs.map(m => {
                let nearestSurvivor: Survivor | null = null;
                let minDistance = Infinity;

                for (const s of newSurvivors) {
                    const distance = Math.abs(m.position.x - s.position.x) + Math.abs(m.position.y - s.position.y);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestSurvivor = s;
                    }
                }

                if (nearestSurvivor) {
                    if (minDistance <= 1) { // Attack if adjacent
                        const targetSurvivorIndex = newSurvivors.findIndex(s => s.id === nearestSurvivor!.id);
                        if (targetSurvivorIndex !== -1) {
                            newSurvivors[targetSurvivorIndex].stats.health = Math.max(0, newSurvivors[targetSurvivorIndex].stats.health - m.attackDamage);
                            if (newSurvivors[targetSurvivorIndex].stats.health <= 0) {
                                addLogEntry(`${newSurvivors[targetSurvivorIndex].name} was defeated by a mob.`);
                            }
                        }
                    } else { // Move towards
                        m.position = moveTowards(m.position, nearestSurvivor.position, map);
                    }
                }
                return m;
            });
            return newMobs;
        });
        return newSurvivors.filter(s => s.stats.health > 0);
    });
  }, [map, addLogEntry]);

  const executeSurvivorActions = useCallback(() => {
    let newChests = [...chests];
    
    setMap(currentMap => {
      let newMap = currentMap.map(row => [...row]);
      
      setSurvivors(currentSurvivors => {
        const randomMove = (currentPos: { x: number; y: number }, grid: TileType[][]): { x: number; y: number } => {
            const { x, y } = currentPos;
            const moves = [[0, 1], [0, -1], [1, 0], [-1, 0]].filter(([dx, dy]) => isPassable({x: x+dx, y: y+dy}, grid));
            if (moves.length > 0) {
                const [dx, dy] = moves[Math.floor(Math.random() * moves.length)];
                return { x: x + dx, y: y + dy };
            }
            return currentPos;
        };
        
        let survivorsAfterAction = currentSurvivors.map(s => {
          let newSurvivor = { ...s, inventory: { ...s.inventory }, position: {...s.position}, craftingState: s.craftingState ? {...s.craftingState} : undefined };
          
          const findNearestEntity = <T extends { position: { x: number, y: number } }>(entities: T[]): T | null => {
            return entities.reduce((nearest, entity) => {
                const distance = Math.abs(entity.position.x - s.position.x) + Math.abs(entity.position.y - s.position.y);
                if (distance < (nearest ? nearest.distance : Infinity)) return { entity, distance };
                return nearest;
            }, null as { entity: T, distance: number } | null)?.entity || null;
          }

          switch (newSurvivor.action) {
            case 'GATHERING_WOOD':
              if (newMap[s.position.y][s.position.x] === TileType.FOREST) {
                newSurvivor.inventory[Item.WOOD] = (newSurvivor.inventory[Item.WOOD] || 0) + 1;
                if (Math.random() < 0.05) {
                  newMap[s.position.y][s.position.x] = TileType.GRASS;
                  addLogEntry(`A tree was felled near ${s.name}.`);
                }
              } else {
                const nearestForest = findNearestTile(s.position, TileType.FOREST, newMap);
                if (nearestForest) newSurvivor.position = moveTowards(s.position, nearestForest, newMap);
              }
              break;
            case 'CRAFTING':
                if (newSurvivor.craftingState) {
                    newSurvivor.craftingState.progress += 1;
                    if (newSurvivor.craftingState.progress >= CRAFTING_DURATION_TICKS) {
                        const recipe = findRecipeByName(newSurvivor.craftingState.recipeName);
                        if (recipe) {
                            newSurvivor.inventory[recipe.output.item] = (newSurvivor.inventory[recipe.output.item] || 0) + recipe.output.quantity;
                            addLogEntry(`${s.name} crafted ${recipe.name}.`);
                        }
                        newSurvivor.craftingState = undefined;
                        newSurvivor.action = 'IDLE';
                    }
                }
                break;
            case 'BUILDING_FLOOR':
              if ((newSurvivor.inventory[Item.WOODEN_PLANK] || 0) > 0) {
                  if(newMap[s.position.y][s.position.x] === TileType.GRASS) {
                    newMap[s.position.y][s.position.x] = TileType.WOODEN_FLOOR;
                    newSurvivor.inventory[Item.WOODEN_PLANK]!--;
                    newSurvivor.action = 'IDLE';
                  } else {
                    const nearestGrass = findNearestTile(s.position, TileType.GRASS, newMap);
                    if (nearestGrass) newSurvivor.position = moveTowards(s.position, nearestGrass, newMap);
                  }
              } else { newSurvivor.action = 'IDLE'; }
              break;
            case 'BUILDING_WALL':
              if ((newSurvivor.inventory[Item.WOODEN_PLANK] || 0) > 0) {
                  const validBuildTiles = [TileType.GRASS, TileType.SAND, TileType.WOODEN_FLOOR];
                  if(validBuildTiles.includes(newMap[s.position.y][s.position.x])) {
                    newMap[s.position.y][s.position.x] = TileType.WOODEN_WALL;
                    newSurvivor.inventory[Item.WOODEN_PLANK]!--;
                    newSurvivor.action = 'IDLE';
                  } else {
                    const nearestValidTile = findNearestTile(s.position, validBuildTiles, newMap);
                    if (nearestValidTile) newSurvivor.position = moveTowards(s.position, nearestValidTile, newMap);
                  }
              } else { newSurvivor.action = 'IDLE'; }
              break;
             case 'PLACING_ITEM':
                const itemToPlace = newSurvivor.actionTargetItem;
                if(itemToPlace && (newSurvivor.inventory[itemToPlace] || 0) > 0) {
                    if (newMap[s.position.y][s.position.x] === TileType.WOODEN_FLOOR) {
                        const tileTypeToPlace = itemToPlace === Item.BED ? TileType.BED : itemToPlace === Item.CHEST_ITEM ? TileType.CHEST : null;
                        if (tileTypeToPlace) {
                            newMap[s.position.y][s.position.x] = tileTypeToPlace;
                            if (tileTypeToPlace === TileType.CHEST) {
                                newChests.push({ position: { ...s.position }, inventory: {} });
                            }
                            newSurvivor.inventory[itemToPlace]!--;
                            newSurvivor.action = 'IDLE';
                            addLogEntry(`${s.name} placed a ${itemToPlace.replace('_ITEM', '')}.`);
                        }
                    } else {
                       const nearestFloor = findNearestTile(s.position, TileType.WOODEN_FLOOR, newMap);
                       if (nearestFloor) newSurvivor.position = moveTowards(s.position, nearestFloor, newMap);
                    }
                } else { newSurvivor.action = 'IDLE'; }
                break;
            case 'EXPLORING':
              newSurvivor.position = randomMove(s.position, newMap);
              break;
            case 'RESTING':
              if (newMap[s.position.y][s.position.x] !== TileType.BED) {
                const nearestBed = findNearestTile(s.position, TileType.BED, newMap);
                if (nearestBed) newSurvivor.position = moveTowards(s.position, nearestBed, newMap);
                else newSurvivor.action = 'IDLE';
              }
              break;
            case 'FIGHTING':
              const targetMob = findNearestEntity(mobs);
              if (targetMob) {
                const distance = Math.abs(targetMob.position.x - s.position.x) + Math.abs(targetMob.position.y - s.position.y);
                if (distance > 1) {
                  newSurvivor.position = moveTowards(s.position, targetMob.position, newMap);
                }
              } else { newSurvivor.action = 'IDLE'; }
              break;
            case 'DEPOSITING_ITEM':
              const depositItem = newSurvivor.actionTargetItem;
              if (depositItem && (newSurvivor.inventory[depositItem] || 0) > 0) {
                const nearestChest = findNearestEntity(newChests);
                if(nearestChest) {
                    const distance = Math.abs(nearestChest.position.x - s.position.x) + Math.abs(nearestChest.position.y - s.position.y);
                    if (distance <= 1) {
                        const chestIndex = newChests.findIndex(c => c.position.x === nearestChest.position.x && c.position.y === nearestChest.position.y);
                        if (chestIndex > -1) {
                            newChests[chestIndex].inventory[depositItem] = (newChests[chestIndex].inventory[depositItem] || 0) + 1;
                            newSurvivor.inventory[depositItem]!--;
                            newSurvivor.action = 'IDLE';
                        }
                    } else {
                        newSurvivor.position = moveTowards(s.position, nearestChest.position, newMap);
                    }
                } else { newSurvivor.action = 'IDLE'; }
              } else { newSurvivor.action = 'IDLE'; }
              break;
            case 'WITHDRAWING_ITEM':
              const withdrawItem = newSurvivor.actionTargetItem;
              if (withdrawItem) {
                const nearestChest = findNearestEntity(newChests);
                if (nearestChest && (nearestChest.inventory[withdrawItem] || 0) > 0) {
                     const distance = Math.abs(nearestChest.position.x - s.position.x) + Math.abs(nearestChest.position.y - s.position.y);
                     if (distance <= 1) {
                         const chestIndex = newChests.findIndex(c => c.position.x === nearestChest.position.x && c.position.y === nearestChest.position.y);
                         if (chestIndex > -1) {
                             newChests[chestIndex].inventory[withdrawItem]!--;
                             newSurvivor.inventory[withdrawItem] = (newSurvivor.inventory[withdrawItem] || 0) + 1;
                             newSurvivor.action = 'IDLE';
                         }
                     } else {
                         newSurvivor.position = moveTowards(s.position, nearestChest.position, newMap);
                     }
                } else { newSurvivor.action = 'IDLE'; }
              } else { newSurvivor.action = 'IDLE'; }
              break;
          }
          return newSurvivor;
        });

        return survivorsAfterAction;
      });

      return newMap;
    });

    setChests(newChests);
  }, [addLogEntry, chests, mobs]);

  const resolveCombat = useCallback(() => {
    setMobs(currentMobs => {
        let newMobs = currentMobs.map(m => ({...m}));
        setSurvivors(currentSurvivors => {
            let newSurvivors = currentSurvivors.map(s => ({...s}));

            newSurvivors.forEach(survivor => {
                if (survivor.action === 'FIGHTING') {
                    const attackableMobs = newMobs.filter(mob => {
                        const distance = Math.abs(mob.position.x - survivor.position.x) + Math.abs(mob.position.y - survivor.position.y);
                        return distance <= 1;
                    });

                    if (attackableMobs.length > 0) {
                        const targetMob = attackableMobs[0];
                        const damage = (survivor.inventory[Item.WOODEN_SWORD] || 0) > 0 ? SWORD_ATTACK_DAMAGE : SURVIVOR_BASE_ATTACK_DAMAGE;
                        targetMob.health -= damage;
                        if (targetMob.health <= 0) {
                            addLogEntry(`${survivor.name} defeated a mob.`);
                        }
                    }
                }
            });
            return newSurvivors;
        });
        return newMobs.filter(mob => mob.health > 0);
    });
  }, [addLogEntry]);

  // Main Game Loop
  useEffect(() => {
    const gameLoop = () => {
        gameTickRef.current += 1;
        const tick = gameTickRef.current;
        
        setTime(prevTime => prevTime + 1);
        updateSurvivorState();
        executeMobActions();
        executeSurvivorActions();
        resolveCombat();

        setSurvivors(currentSurvivors => {
            const currentThinkingId = thinkingSurvivorId;
            let survivorToThink: Survivor | null = null;

            for(const survivor of currentSurvivors) {
                const isNight = (time % TICKS_PER_DAY) > TICKS_PER_DAY / 2;
                const nearbyMobs = mobs.filter(m => Math.abs(m.position.x - survivor.position.x) < 5 && Math.abs(m.position.y - survivor.position.y) < 5);
                
                if (isNight && nearbyMobs.length > 0 && survivor.action !== 'FIGHTING') {
                    return currentSurvivors.map(s => s.id === survivor.id ? { ...s, action: 'FIGHTING', lastDecisionTick: tick } : s);
                }
                
                if (!currentThinkingId && !survivorToThink && (survivor.action === 'IDLE' || tick - survivor.lastDecisionTick > 40)) {
                    if (survivor.stats.energy > 10 && survivor.stats.health > 20) {
                        survivorToThink = survivor;
                    }
                }
            }

            if (survivorToThink) {
                setThinkingSurvivorId(survivorToThink.id);
            }
            return currentSurvivors;
        });

        const isNightTime = (time % TICKS_PER_DAY) > TICKS_PER_DAY / 2;
        setMap(currentMap => {
            let newMap = [...currentMap];
            let changed = false;
            for (let y = 0; y < GRID_SIZE; y++) {
                for (let x = 0; x < GRID_SIZE; x++) {
                    if (newMap[y][x] === TileType.GRASS && Math.random() < TREE_REGROWTH_CHANCE) {
                        newMap[y][x] = TileType.FOREST;
                        changed = true;
                    }
                }
            }
            return changed ? newMap.map(r => [...r]) : currentMap;
        });

        if (isNightTime) {
            setMobs(prevMobs => {
                if (prevMobs.length < 10 && Math.random() < MOB_SPAWN_CHANCE_NIGHT * GRID_SIZE) {
                    let x, y;
                    do {
                        x = Math.floor(Math.random() * GRID_SIZE);
                        y = Math.floor(Math.random() * GRID_SIZE);
                    } while (map[y][x] === TileType.WATER || map[y][x] === TileType.WOODEN_WALL);
                    
                    return [...prevMobs, {
                        id: `mob-${Date.now()}-${x}-${y}`,
                        position: { x, y },
                        health: MOB_HEALTH,
                        attackDamage: MOB_ATTACK_DAMAGE,
                    }];
                }
                return prevMobs;
            });
        }
    };

    const intervalId = setInterval(gameLoop, TICK_RATE);
    return () => clearInterval(intervalId);
  }, [time, mobs, thinkingSurvivorId, map, updateSurvivorState, executeMobActions, executeSurvivorActions, resolveCombat]);

  // AI Decision Trigger
  useEffect(() => {
    if (thinkingSurvivorId) {
        const survivor = survivors.find(s => s.id === thinkingSurvivorId);
        if (survivor) {
            const gameState = { survivors, map, time, chatHistory, mobs, chests };
            getSurvivorAction(gameState, survivor).then(newActionData => {
                if (newActionData) {
                    const { action, reasoning, message, craftingRecipeName, itemToPlace, depositItem, withdrawItem } = newActionData;
                    
                    setSurvivors(prev => prev.map(s => {
                        if (s.id === survivor.id) {
                            let newSurvivorState = { ...s, action: action, lastDecisionTick: gameTickRef.current, actionTargetItem: itemToPlace || depositItem || withdrawItem, currentMessage: s.currentMessage };
                            
                            addLogEntry(`${s.name} decided to ${action.toLowerCase().replace(/_/g, ' ')}. Reason: ${reasoning}`);
                            
                            if (message) {
                                newSurvivorState.currentMessage = { text: message, displayTicks: 20 }; // show for 10s
                                setChatHistory(prev => [...prev.slice(-20), { survivorName: s.name, text: message }]);
                            }
                            
                            if (action === 'CRAFTING' && craftingRecipeName) {
                                const recipe = findRecipeByName(craftingRecipeName);
                                if (recipe) {
                                    const ingredients = recipe.shape.flat().filter(Boolean) as Item[];
                                    const inventoryCopy = {...newSurvivorState.inventory};
                                    const hasIngredients = ingredients.every(ing => {
                                        if((inventoryCopy[ing] || 0) > 0) {
                                            inventoryCopy[ing]!--;
                                            return true;
                                        }
                                        return false;
                                    });

                                    if(hasIngredients) {
                                        newSurvivorState.inventory = inventoryCopy;
                                        newSurvivorState.craftingState = { recipeName: craftingRecipeName, progress: 0 };
                                    } else {
                                        newSurvivorState.action = 'IDLE';
                                        addLogEntry(`${s.name} wanted to craft ${craftingRecipeName} but lacked ingredients.`);
                                    }
                                }
                            }
                            
                            return newSurvivorState;
                        }
                        return s;
                    }));
                } else {
                    addLogEntry(`Failed to get a new action for ${survivor.name}.`);
                    setSurvivors(prev => prev.map(s => s.id === survivor.id ? {...s, action: 'IDLE', lastDecisionTick: gameTickRef.current} : s));
                }
                setThinkingSurvivorId(null);
            });
        } else {
            setThinkingSurvivorId(null);
        }
    }
  }, [thinkingSurvivorId, survivors, map, time, chatHistory, addLogEntry, mobs, chests]);

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 lg:p-8 flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-teal-300">AI Civilization Game</h1>
        <p className="text-gray-400 mt-2">Observing an AI-driven island survival simulation.</p>
      </header>
      <main className="grid grid-cols-1 lg:grid-cols-5 gap-8 flex-grow">
        <div className="lg:col-span-3">
            <IslandGrid map={map} survivors={survivors} mobs={mobs} chests={chests} selectedSurvivor={selectedSurvivor} time={time} />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-8 h-[85vh] lg:h-auto">
            <div className="flex-1 min-h-0">
                <SurvivorStatusPanel
                    survivors={survivors}
                    selectedSurvivor={selectedSurvivor}
                    onSelectSurvivor={setSelectedSurvivor}
                    thinkingSurvivorId={thinkingSurvivorId}
                />
            </div>
            <div className="flex-1 min-h-0">
                <GameLog log={log} />
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;