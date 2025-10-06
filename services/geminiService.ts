
import { GoogleGenAI, Type } from "@google/genai";
// Fix: GameState is now properly defined and imported, resolving the module error.
import { GameState, ActionType, Survivor, Item, TileType, Mob, Chest } from '../types.ts';
import { recipes } from '../recipes.ts';
import { TICKS_PER_DAY } from "../constants.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const availableActions: ActionType[] = ['IDLE', 'GATHERING_WOOD', 'BUILDING_FLOOR', 'BUILDING_WALL', 'PLACING_ITEM', 'CRAFTING', 'EXPLORING', 'RESTING', 'FIGHTING', 'DEPOSITING_ITEM', 'WITHDRAWING_ITEM'];
const craftableItems = recipes.map(r => r.name);
const placeableItems: Item[] = [Item.BED, Item.CHEST_ITEM];
const allItems: Item[] = Object.values(Item);

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        action: { type: Type.STRING, enum: availableActions },
        reasoning: { type: Type.STRING, description: 'A brief explanation for your chosen action from your perspective.' },
        message: { type: Type.STRING, description: 'An optional, short message to coordinate, ask for help, or announce progress. Leave blank for routine actions.' },
        craftingRecipeName: { type: Type.STRING, enum: craftableItems, description: "If action is 'CRAFTING', specify the recipe name." },
        itemToPlace: { type: Type.STRING, enum: placeableItems, description: "If action is 'PLACING_ITEM', specify which item from your inventory to place." },
        depositItem: { type: Type.STRING, enum: allItems, description: "If action is 'DEPOSITING_ITEM', specify which item to deposit into a chest." },
        withdrawItem: { type: Type.STRING, enum: allItems, description: "If action is 'WITHDRAWING_ITEM', specify which item to take from a chest." },
    },
    required: ['action', 'reasoning'],
};

function getVisibleTiles(map: TileType[][], position: { x: number, y: number }, radius: number) {
    const visible: string[] = [];
    for (let y = position.y - radius; y <= position.y + radius; y++) {
        for (let x = position.x - radius; x <= position.x + radius; x++) {
            if (map[y] && map[y][x]) {
                const dx = x - position.x;
                const dy = y - position.y;
                visible.push(`(${dx}, ${dy}): ${map[y][x]}`);
            }
        }
    }
    return visible.join(', ');
}

// Fix: Simplified and corrected the type for the gameState parameter to improve type safety.
export const getSurvivorAction = async (gameState: Omit<GameState, 'log'>, survivor: Survivor) => {
    const { survivors, map, time, chatHistory, mobs, chests } = gameState;
    const dayProgress = ((time % TICKS_PER_DAY) / TICKS_PER_DAY * 100).toFixed(0);
    const isNight = (time % TICKS_PER_DAY) > TICKS_PER_DAY / 2;

    const otherSurvivors = survivors.filter(s => s.id !== survivor.id);
    const visibleTiles = getVisibleTiles(map, survivor.position, 3);
    const bedCount = map.flat().filter(tile => tile === TileType.BED).length;

    const nearbyMobs = mobs.filter(m => Math.abs(m.position.x - survivor.position.x) < 5 && Math.abs(m.position.y - survivor.position.y) < 5);

    const systemInstruction = `You are an AI survivor on a deserted island named ${survivor.name}. Your goal is to survive by cooperating to build a shelter and fighting monsters.

**Current State:**
- Game Time: Day progress ${dayProgress}%. It is currently ${isNight ? 'NIGHT' : 'DAY'}.
- Your Status: Health=${survivor.stats.health}, Energy=${survivor.stats.energy}, Hunger=${survivor.stats.hunger}.
- Your Inventory: ${JSON.stringify(survivor.inventory) || 'Empty'}
- Your Current Action: ${survivor.action}

**!! IMMEDIATE THREATS (HIGHEST PRIORITY) !!**
- **COMBAT:** If mobs are nearby at NIGHT, you MUST choose the 'FIGHTING' action. Work with others to defeat them. Your life depends on it.
- **LOW STATS:** If your health is below 40, your top priority is to REST on a BED. If no beds exist, build one. If energy is below 20, REST on a BED.

**!! STRATEGIC GOALS (IN ORDER OF IMPORTANCE) !!**
1.  **DEFENSE PREPARATION (Priority when Day Progress > 40%):**
    - Your #1 priority is to ensure you have a 'WOODEN_SWORD'. If you don't have one, craft one. Mobs are dangerous.
2.  **COOPERATIVE BASE BUILDING:**
    - The team's goal is to build a fortified base. Find where others have built 'WOODEN_FLOOR' or 'WOODEN_WALL' and contribute there. DO NOT build randomly alone.
    - **Strategy:** Build a simple box of 'WOODEN_WALL's on a 'WOODEN_FLOOR' foundation. This is your safe zone.
    - Once a shelter exists, place 'BED's and 'CHEST's inside.
3.  **RESOURCE GATHERING:**
    - Gather 'WOOD' from 'FOREST's to craft 'WOODEN_PLANK's.
    - Deposit excess resources into shared 'CHEST's inside the base.

**COOPERATION:**
- Use short messages to coordinate. Announce plans ("Building west wall"), ask for materials ("need planks"), or call for help ("3 mobs on me!").
- Pay attention to chat history and what others are doing.

You must decide your next action. Your response must be a JSON object matching the provided schema.`;

    const contents = `
**Team Status:**
- Beds built: ${bedCount} out of ${survivors.length}.
- Other Survivors:
${otherSurvivors.map(s => `  - ${s.name} (${s.action}) at (${s.position.x - survivor.position.x}, ${s.position.y - survivor.position.y}) Inv: ${JSON.stringify(s.inventory)}`).join('\n')}
- Shared Chests:
${chests.length > 0 ? chests.map((c, i) => `  - Chest ${i} at (${c.position.x}, ${c.position.y}): ${JSON.stringify(c.inventory)}`).join('\n') : '  None'}

**Environment:**
- Your Surroundings (relative to you): ${visibleTiles}
- Nearby Mobs (DANGER!):
${nearbyMobs.length > 0 ? nearbyMobs.map(m => `  - Mob at (${m.position.x}, ${m.position.y}) with ${m.health} HP`).join('\n') : '  None'}

**Communication Log:**
${chatHistory.slice(-5).map(m => `- ${m.survivorName}: "${m.text}"`).join('\n') || '  No recent messages.'}

Based on all this information, what is your next action and why? Your response must be a JSON object.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        return parsed;

    } catch (error) {
        console.error(`Error getting action for ${survivor.name} from Gemini:`, error);
        return null;
    }
};
