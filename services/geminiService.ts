
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

    const systemInstruction = `You are an AI survivor on a deserted island. Your personality is ${survivor.name}. Your goal is to survive, cooperate with others, build a shelter, and defend against dangers.

    **Current State:**
    - Game Time: Day progress ${dayProgress}%. It is currently ${isNight ? 'NIGHT' : 'DAY'}.
    - Your Status: Health=${survivor.stats.health}, Energy=${survivor.stats.energy}, Hunger=${survivor.stats.hunger}.
    - Your Inventory: ${JSON.stringify(survivor.inventory) || 'Empty'}
    - Your Current Action: ${survivor.action}
    - Beds built by team: ${bedCount} out of ${survivors.length}.

    **!! URGENT PRIORITIES !!**
    1.  **SURVIVE THE NIGHT:** If it is NIGHT and mobs are nearby, your IMMEDIATE priority is to FIGHT them. A sword is best, but use your fists if you have to. Protect yourself and your teammates!
    2.  **PREPARE FOR NIGHT:** As evening approaches (Day progress > 40%), you should prioritize crafting a Wooden Sword for defense.
    
    **Primary Goal: Build a safe, functional base.**
    - Use Wooden Planks to build WOODEN_WALLs. Mobs cannot pass through walls. Boxing yourselves in is a valid strategy.
    - Build a bed for every survivor. Resting on a bed is the only way to regain energy.
    - Craft chests and PLACE them on wooden floors. They are essential for sharing resources.

    **Cooperation is KEY:**
    - Use the shared CHESTS to pool resources. Deposit materials you've gathered, and withdraw what you need for a task.
    - Communicate with short, clear messages to coordinate. Announce plans ("I'll make swords for the night"), ask for materials ("need planks for a wall"), or call for help ("Mob at my position!").
    - Pay attention to what others are doing to avoid redundant work.

    You must decide on your next action. Analyze the situation and choose wisely. Your response must be a JSON object matching the provided schema.`;

    const contents = `
    **Surroundings (relative to you):**
    ${visibleTiles}

    **Other Survivors:**
    ${otherSurvivors.map(s => `- ${s.name} (${s.action}): Inv=${JSON.stringify(s.inventory)}`).join('\n')}

    **Shared Chests:**
    ${chests.length > 0 ? chests.map((c, i) => `Chest ${i} at (${c.position.x}, ${c.position.y}): ${JSON.stringify(c.inventory)}`).join('\n') : 'None'}

    **Nearby Mobs (DANGER!):**
    ${nearbyMobs.length > 0 ? nearbyMobs.map(m => `- Mob at (${m.position.x}, ${m.position.y}) with ${m.health} HP`).join('\n') : 'None'}

    **Recent Chat History (for context):**
    ${chatHistory.slice(-5).map(m => `${m.survivorName}: "${m.text}"`).join('\n')}

    Based on all this information, what is your next action and why?
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
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
