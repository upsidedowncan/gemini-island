
import React from 'react';
import { TileType, Survivor, Item, Mob, Chest } from '../types.ts';
import { GRID_SIZE, TICK_RATE, TICKS_PER_DAY } from '../constants.ts';
import { TreeIcon, SurvivorIcon, BedIcon, PlankIcon, WoodIcon, ChestIcon, SwordIcon, MobIcon } from './icons.tsx';
import { findRecipeByName } from '../recipes.ts';

interface IslandGridProps {
  map: TileType[][];
  survivors: Survivor[];
  mobs: Mob[];
  chests: Chest[];
  selectedSurvivor: Survivor | null;
  time: number;
}

const tileColorMap: { [key in TileType]: string } = {
  [TileType.WATER]: 'bg-blue-600',
  [TileType.SAND]: 'bg-yellow-300',
  [TileType.GRASS]: 'bg-green-600',
  [TileType.FOREST]: 'bg-green-800',
  [TileType.WOODEN_FLOOR]: 'bg-amber-800',
  [TileType.WOODEN_WALL]: 'bg-amber-900',
  [TileType.BED]: 'bg-amber-800',
  [TileType.CHEST]: 'bg-amber-800',
};

const getSurvivorColor = (survivorId: string) => {
    const idNum = parseInt(survivorId.split('-')[1] || '0', 10);
    const colors = ['fill-cyan-400', 'fill-pink-400', 'fill-lime-400', 'fill-orange-400', 'fill-violet-400'];
    return colors[idNum % colors.length];
}

const ItemIcon: React.FC<{ item: Item, className?: string}> = ({ item, className }) => {
    switch(item) {
        case Item.WOOD: return <WoodIcon className={className} />;
        case Item.WOODEN_PLANK: return <PlankIcon className={className} />;
        case Item.BED: return <BedIcon className={className} />;
        case Item.WOODEN_SWORD: return <SwordIcon className={className} />;
        case Item.CHEST_ITEM: return <ChestIcon className={className} />;
        default: return null;
    }
}

const CraftingGridDisplay: React.FC<{ recipeName: string }> = ({ recipeName }) => {
    const recipe = findRecipeByName(recipeName);
    if (!recipe) return null;

    return (
        <div className="relative w-max bg-gray-900/80 backdrop-blur-sm p-1 rounded-lg shadow-lg border border-teal-500/30">
            <div className="grid grid-cols-3 gap-0.5">
                {recipe.shape.flat().map((item, index) => (
                    <div key={index} className="w-4 h-4 bg-black/30 rounded-sm flex items-center justify-center">
                        {item && <ItemIcon item={item} className="w-3 h-3 text-yellow-300" />}
                    </div>
                ))}
            </div>
        </div>
    )
}


const IslandGrid: React.FC<IslandGridProps> = ({ map, survivors, mobs, selectedSurvivor, time }) => {
  const renderTileContent = (tile: TileType, x: number, y: number) => {
    switch (tile) {
      case TileType.FOREST:
        return <TreeIcon className="w-3/4 h-3/4 text-green-400" />;
      case TileType.WOODEN_FLOOR:
        return <div className="w-full h-full bg-black/10"></div>
      case TileType.WOODEN_WALL:
        return <div className="w-full h-full bg-black/20 border-b-2 border-amber-700"></div>
      case TileType.BED:
        return <BedIcon className="w-3/4 h-3/4 text-red-400" />
      case TileType.CHEST:
        return <ChestIcon className="w-3/4 h-3/4 text-yellow-600" />
      default:
        return null;
    }
  };
  
  const timeInDay = time % TICKS_PER_DAY;
  const isNight = timeInDay > TICKS_PER_DAY / 2;
  const nightProgress = isNight ? (timeInDay - TICKS_PER_DAY / 2) / (TICKS_PER_DAY / 2) : 0;
  // Use a sine wave for smooth transition
  const nightOpacity = Math.sin(nightProgress * Math.PI) * 0.6;


  return (
    <div className="aspect-square bg-gray-800/50 p-4 rounded-lg shadow-lg border border-teal-500/20">
      <div className="relative">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
          {map.map((row, y) =>
            row.map((tile, x) => (
              <div
                key={`${x}-${y}`}
                className={`aspect-square flex items-center justify-center ${tileColorMap[tile]}`}
              >
                {renderTileContent(tile, x, y)}
              </div>
            ))
          )}
        </div>
        
        <div className="absolute inset-0 bg-black transition-opacity duration-1000 pointer-events-none" style={{ opacity: nightOpacity, mixBlendMode: 'multiply' }}></div>
        <div className="absolute inset-0 bg-blue-900 transition-opacity duration-1000 pointer-events-none" style={{ opacity: nightOpacity * 0.5, mixBlendMode: 'color' }}></div>


        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {survivors.map(survivor => {
            const cellSize = 100 / GRID_SIZE;
            const isSelected = selectedSurvivor?.id === survivor.id;
            return (
              <div
                key={survivor.id}
                className="absolute"
                style={{
                  width: `${cellSize}%`,
                  height: `${cellSize}%`,
                  transform: `translate(${survivor.position.x * 100}%, ${survivor.position.y * 100}%)`,
                  transition: `transform ${TICK_RATE}ms linear`,
                  zIndex: isSelected ? 10 : 1,
                }}
              >
                <div className="relative w-full h-full flex items-center justify-center">
                    <div className="absolute bottom-full mb-2 flex flex-col items-center gap-1">
                        {survivor.craftingState && <CraftingGridDisplay recipeName={survivor.craftingState.recipeName} />}
                        {survivor.currentMessage && (
                          <div className="relative w-max max-w-xs bg-gray-900 text-white text-xs rounded-lg px-2 py-1 shadow-lg transition-opacity duration-300 opacity-90">
                            {survivor.currentMessage.text}
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-[4px] border-t-gray-900"></div>
                          </div>
                        )}
                    </div>
                    <SurvivorIcon className={`w-3/4 h-3/4 transition-transform duration-300 ${isSelected ? 'scale-125' : ''} ${getSurvivorColor(survivor.id)}`} />
                    {(survivor.inventory[Item.WOODEN_SWORD] ?? 0) > 0 && (
                        <SwordIcon className="absolute w-1/2 h-1/2 text-gray-300" style={{ transform: 'rotate(-45deg) translate(30%, -30%)' }}/>
                    )}
                     {isSelected && <div className="absolute inset-0 bg-white/30 rounded-full animate-ping z-0"></div>}
                </div>
              </div>
            );
          })}
          {mobs.map(mob => {
            const cellSize = 100 / GRID_SIZE;
            return (
              <div
                key={mob.id}
                className="absolute"
                style={{
                  width: `${cellSize}%`,
                  height: `${cellSize}%`,
                  transform: `translate(${mob.position.x * 100}%, ${mob.position.y * 100}%)`,
                  transition: `transform ${TICK_RATE}ms linear`,
                  zIndex: 5,
                }}
              >
                <div className="relative w-full h-full flex items-center justify-center">
                    <MobIcon className="w-3/4 h-3/4 fill-red-500 animate-pulse" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default IslandGrid;
