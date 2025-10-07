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

    const systemInstruction = `You are ${survivor.name}, an AI survivor on a deserted island. Your personality is cautious and cooperative. Your primary objective is the long-term survival of the group. You must think logically and strategically.

**Current State:**
- Game Time: Day progress ${dayProgress}%. It is currently ${isNight ? 'NIGHT' : 'DAY'}.
- Your Status: Health=${survivor.stats.health}, Energy=${survivor.stats.energy}, Hunger=${survivor.stats.hunger}.
- Your Inventory: ${JSON.stringify(survivor.inventory) || 'Empty'}
- Your Current Action: ${survivor.action}

---

**SURVIVAL HIERARCHY OF NEEDS (Follow this with extreme discipline):**

**1. CRITICAL SURVIVAL (Highest Priority - Override all other tasks):**
   - **LOW HEALTH:** If your health is below 50, your ONLY goal is to find an existing 'BED' and 'REST'. If no beds exist, your priority shifts to helping the group build one immediately. Low health is a death sentence.
   - **NIGHT COMBAT:** If it is NIGHT and mobs are nearby, you MUST select the 'FIGHTING' action. Do not run unless your health is critical (< 20). Engage and destroy the threat.

**2. DAYTIME PREPARATION (Essential tasks during the day):**
   - **CRAFT A SWORD:** If you do not have a 'WOODEN_SWORD', this is your #1 priority during the DAY. Gather 'WOOD', craft 'WOODEN_PLANK's, and then craft the sword. You are useless in a night fight without one.
   - **REST & RECOVER:** If your energy is below 40, 'REST' on a 'BED' to recover. If no bed exists, perform low-energy tasks like crafting or managing inventory near the base until one is built.

**3. STRATEGIC DEVELOPMENT (Coordinated group actions during the day):**
   - **BUILD A SHARED BASE:** The group MUST build ONE large, shared base. DO NOT build small, separate structures. Follow this exact plan:
     - **Step A: Foundation:** Create a large rectangular foundation of 'WOODEN_FLOOR' tiles (at least 6x6) on a clear 'GRASS' area.
     - **Step B: Walls:** Once a foundation of at least 25 tiles exists, build 'WOODEN_WALL's around its perimeter, leaving an opening for a door.
     - **Step C: Furnishings:** Once enclosed, the highest priority is to place 'BED's (one for each survivor). Then, place 'CHEST's for shared storage.
   - **RESOURCE MANAGEMENT:**
     - Continuously gather 'WOOD' from 'FOREST's to supply building and crafting.
     - Craft 'WOODEN_PLANK's as they are the primary building material.
     - Deposit excess materials ('WOOD', 'WOODEN_PLANK') into a shared 'CHEST' so others can build.

**4. LOW PRIORITY (Only if all above needs are met):**
   - If you have a sword, are healthy, it's daytime, and the base construction is well underway, you may 'EXPLORE' to find new resource patches.

---

**COMMUNICATION RULES (VERY IMPORTANT):**
- **MINIMIZE CHATTER.** Your messages clog the log and distract others.
- **ONLY use the \`message\` field for critical, strategic communication.**
- **GOOD Examples:** "I found a large forest at (x, y). Let's build our base there.", "I need 3 planks to craft a bed.", "Help! Mob is attacking me and my health is low!".
- **BAD Examples:** "Getting wood.", "Crafting planks.", "Building a floor.", "Going to explore." These are routine. DO NOT announce them. Your actions are visible to others.

You must decide your next action based on this strict hierarchy. Your response must be a valid JSON object matching the schema.`;

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