import React from 'react';
import { Survivor, Item } from '../types.ts';
import { MAX_STAT } from '../constants.ts';
import { WoodIcon, PlankIcon, BedIcon, SwordIcon, ChestIcon, StringIcon, FishingRodIcon, FishIcon } from './icons.tsx';

interface SurvivorStatusPanelProps {
  survivors: Survivor[];
  selectedSurvivor: Survivor | null;
  onSelectSurvivor: (survivor: Survivor | null) => void;
  thinkingSurvivorId: string | null;
}

const StatBar: React.FC<{ value: number; maxValue: number; color: string; label: string }> = ({ value, maxValue, color, label }) => {
  const percentage = (value / maxValue) * 100;
  return (
    <div>
      <div className="flex justify-between items-center mb-1 text-xs">
        <span className="font-semibold">{label}</span>
        <span>{Math.round(value)}/{maxValue}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div className={color} style={{ width: `${percentage}%`, height: '100%', borderRadius: '9999px', transition: 'width 0.5s ease-in-out' }}></div>
      </div>
    </div>
  );
};

const ItemDisplay: React.FC<{item: Item, count: number}> = ({ item, count }) => {
    const getIcon = () => {
        switch(item) {
            case Item.WOOD: return <WoodIcon className="w-4 h-4" />;
            case Item.WOODEN_PLANK: return <PlankIcon className="w-4 h-4" />;
            case Item.BED: return <BedIcon className="w-4 h-4" />;
            case Item.WOODEN_SWORD: return <SwordIcon className="w-4 h-4" />;
            case Item.CHEST_ITEM: return <ChestIcon className="w-4 h-4" />;
            case Item.STRING: return <StringIcon className="w-4 h-4" />;
            case Item.FISHING_ROD: return <FishingRodIcon className="w-4 h-4" />;
            case Item.FISH: return <FishIcon className="w-4 h-4" />;
            default: return null;
        }
    }
    return (
        <div className="flex items-center gap-1 bg-gray-700/50 text-gray-300 px-2 py-1 rounded">
            {getIcon()}
            <span className="text-sm font-semibold">{count}</span>
        </div>
    );
};

const SurvivorCard: React.FC<{ survivor: Survivor; isSelected: boolean; onSelect: () => void; isThinking: boolean; }> = ({ survivor, isSelected, onSelect, isThinking }) => {
  const getSurvivorColor = (survivorId: string) => {
    const idNum = parseInt(survivorId.split('-')[1] || '0', 10);
    const colors = ['border-cyan-400', 'border-pink-400', 'border-lime-400', 'border-orange-400', 'border-violet-400'];
    return colors[idNum % colors.length];
  }

  const actionText = survivor.action.replace(/_/g, ' ').toLowerCase();
  // FIX: Added a type guard to ensure `count` is a number before comparing it.
  const inventoryItems = Object.entries(survivor.inventory).filter(([, count]) => typeof count === 'number' && count > 0);

  return (
    <div onClick={onSelect} className={`p-4 rounded-lg bg-gray-800/70 border-2 cursor-pointer transition-all duration-300 ${isSelected ? `${getSurvivorColor(survivor.id)} shadow-lg scale-105` : 'border-transparent hover:border-gray-600'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold">{survivor.name}</h3>
            {(survivor.inventory[Item.WOODEN_SWORD] || 0) > 0 && <SwordIcon className="w-4 h-4 text-gray-300" />}
            {isThinking && <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>}
        </div>
        <div className="flex flex-wrap gap-2 justify-end max-w-[50%]">
            {inventoryItems.length > 0 ? (
                 inventoryItems.map(([item, count]) => <ItemDisplay key={item} item={item as Item} count={count!} />)
            ) : (
                <span className="text-xs text-gray-500 italic">Empty</span>
            )}
        </div>
      </div>
      <div className="space-y-3">
        <StatBar value={survivor.stats.health} maxValue={MAX_STAT} color="bg-red-500" label="Health" />
        <StatBar value={survivor.stats.hunger} maxValue={MAX_STAT} color="bg-orange-500" label="Hunger" />
        <StatBar value={survivor.stats.energy} maxValue={MAX_STAT} color="bg-blue-500" label="Energy" />
      </div>
      <p className="mt-3 text-xs text-gray-400 capitalize">Action: <span className="font-semibold text-gray-200">{actionText}</span></p>
    </div>
  );
};


const SurvivorStatusPanel: React.FC<SurvivorStatusPanelProps> = ({ survivors, selectedSurvivor, onSelectSurvivor, thinkingSurvivorId }) => {
  return (
    <div className="bg-gray-800/50 rounded-lg shadow-lg p-4 flex flex-col h-full border border-teal-500/20">
      <h2 className="text-xl font-bold mb-4 text-teal-300 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        Survivors
      </h2>
      <div className="flex-grow overflow-y-auto pr-2 space-y-4">
        {survivors.map(survivor => (
          <SurvivorCard 
            key={survivor.id}
            survivor={survivor}
            isSelected={selectedSurvivor?.id === survivor.id}
            onSelect={() => onSelectSurvivor(selectedSurvivor?.id === survivor.id ? null : survivor)}
            isThinking={thinkingSurvivorId === survivor.id}
          />
        ))}
      </div>
    </div>
  );
};

export default SurvivorStatusPanel;