import { GoogleGenAI, Type } from "@google/genai";
import { GameState, ActionType, Survivor, Item, TileType, Mob, Chest, Persona } from '../types.ts';
import { recipes } from '../recipes.ts';
import { TICKS_PER_DAY } from "../constants.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const availableActions: ActionType[] = ['IDLE', 'GATHERING_WOOD', 'BUILDING_FLOOR', 'BUILDING_WALL', 'PLACING_ITEM', 'CRAFTING', 'EXPLORING', 'RESTING', 'FIGHTING', 'DEPOSITING_ITEM', 'WITHDRAWING_ITEM', 'GIVING_ITEM', 'FISHING', 'GATHERING_STRING'];
const craftableItems = recipes.map(r => r.name);
const placeableItems: Item[] = [Item.BED, Item.CHEST_ITEM];
const allItems: Item[] = Object.values(Item);

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        shortTermGoal: { type: Type.STRING, description: 'A concise description of your immediate objective. What are you trying to accomplish right now?' },
        action: { type: Type.STRING, enum: availableActions },
        reasoning: { type: Type.STRING, description: 'A brief explanation for your chosen action and how it achieves your shortTermGoal.' },
        message: { type: Type.STRING, description: 'An optional, short message for CRITICAL coordination. E.g., asking for help/items, warning about mobs. Do not announce routine actions.' },
        craftingRecipeName: { type: Type.STRING, enum: craftableItems, description: "If action is 'CRAFTING', specify the recipe name." },
        itemToPlace: { type: Type.STRING, enum: placeableItems, description: "If action is 'PLACING_ITEM', specify which item from your inventory to place." },
        depositItem: { type: Type.STRING, enum: allItems, description: "If action is 'DEPOSITING_ITEM', specify which item to deposit into a chest." },
        withdrawItem: { type: Type.STRING, enum: allItems, description: "If action is 'WITHDRAWING_ITEM', specify which item to take from a chest." },
        giveItem: { type: Type.STRING, enum: allItems, description: "If action is 'GIVING_ITEM', specify which item from your inventory to give." },
        targetSurvivorName: { type: Type.STRING, description: "If action is 'GIVING_ITEM', specify the name of the survivor to give the item to." },
    },
    required: ['shortTermGoal', 'action', 'reasoning'],
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

function getPersonaBasedInstruction(survivor: Survivor, isNight: boolean): string {
    const baseInstruction = `You are ${survivor.name}, a survivor on a deserted island. You must think logically to survive. Your response MUST be a valid JSON object matching the provided schema.

**CORE SURVIVAL PRINCIPLES (These override your persona focus):**
1.  **NIGHTFALL PROTOCOL (CRITICAL!):** It is currently ${isNight ? 'NIGHT' : 'DAY'}. During the NIGHT, all non-essential work stops. Your priority is safety.
    - If a base with walls exists, GET INSIDE. Your action should be 'IDLE' or 'RESTING' once safe.
    - If no base exists, find the **Base Camp** location and stay close to it and other survivors. Do not wander.
2.  **IMMINENT DANGER:** If a mob is within 5 tiles, your ONLY priority is to engage it ('FIGHTING'). If your health is critical (< 30), move inside a walled structure if possible before fighting.
3.  **CRITICAL NEEDS:**
    - Health < 50: Find a 'BED' and 'REST'. If no bed, 'REST' on the floor, preferably inside a shelter.
    - Energy < 30: 'REST'. Beds are more effective.
    - Hunger < 40: Get food. 'FISHING' is the primary method.
4.  **TEAMWORK:** The group survives together. Do not hoard resources. If the Builder needs planks, the Forager/Crafter must provide them. Use 'GIVING_ITEM' and deposit items in chests near the base camp.

Your personality and special focus is that of a **${survivor.persona}**. You will pursue your persona's goals AFTER your core principles are met.
`;

    const personaFocus = {
        [Persona.BUILDER]: `
**Persona Focus: The Builder**
- Your main drive is to build a safe base. SURVIVAL depends on you.
- **Priorities:**
    1.  **FIRST NIGHT SHELTER:** Your IMMEDIATE goal is a small (e.g., 3x3) room with 'WOODEN_FLOOR' and 'WOODEN_WALL's. This is more important than a large foundation.
    2.  Once a basic shelter exists, expand it.
    3.  Craft and place 'BED's inside the shelter for everyone.
    4.  Craft and place 'CHEST's for shared storage.
- **SELF-SUFFICIENCY:** Do not wait for others if they are busy. If you need 'WOODEN_PLANK's, check chests first. If there are none, gather 'WOOD' and craft them yourself. A small, completed shelter is infinitely better than a large, unfinished one.`,
        [Persona.FORAGER]: `
**Persona Focus: The Forager**
- You are the primary resource gatherer. Your goal is to keep the shared chests at the base camp stocked.
- **Priorities:**
    1.  'GATHERING_WOOD' is your main task. Keep a steady supply coming in.
    2.  'GATHERING_STRING' from sand is important for fishing rods.
    3.  'FISHING' to provide food for everyone.
- After gathering, your next step is always 'DEPOSITING_ITEM' into a shared 'CHEST' at the base camp. If no chest exists, drop resources near the base camp by moving there and waiting. Do not hoard resources.`,
        [Persona.PROTECTOR]: `
**Persona Focus: The Protector**
- Your role is to defend the group.
- **Priorities:**
    1.  Your #1 goal is to craft a 'WOODEN_SWORD'. Get materials from the crafter or chests.
    2.  During the DAY, patrol the area AROUND THE BASE CAMP, proactively hunting any mobs.
    3.  During the NIGHT, you are on high alert. Stay near the base camp entrance and destroy any approaching mobs.
    4.  If there are no threats, assist the builder by bringing them wood or planks.`,
        [Persona.CRAFTER]: `
**Persona Focus: The Crafter**
- You are the artisan of the group, turning raw materials into useful items. You work at the base camp.
- **Priorities:**
    1.  Check shared 'CHEST's for materials first.
    2.  Your main task is crafting 'WOODEN_PLANK's from the wood foragers provide.
    3.  Craft essential tools for others: 'WOODEN_SWORD' for the Protector, 'FISHING_ROD' for the Forager.
    4.  Craft 'BED's and 'CHEST_ITEM's for the Builder to place.
- Use 'WITHDRAWING_ITEM' to get materials and 'GIVING_ITEM' to supply others. If you are idle and have no materials, you can gather wood yourself, but you prefer to craft.`,
        [Persona.SCOUT]: `
**Persona Focus: The Scout**
- You are the eyes of the group, exploring the island.
- **Priorities:**
    1.  During the DAY, your main action is 'EXPLORING' away from the main base.
    2.  You look for large clusters of 'FOREST' or 'SAND' tiles. Announce findings via message.
    3.  You avoid combat. Your job is to find things, not fight. If you see mobs, you retreat towards the base camp.
    4.  At NIGHT, you return to the safety of the base camp and rest or perform simple tasks like organizing chests.`,
    };

    return baseInstruction + personaFocus[survivor.persona];
}


export const getSurvivorAction = async (gameState: Omit<GameState, 'log'>, survivor: Survivor, baseCampPosition: {x: number, y: number} | null) => {
    const { survivors, map, time, chatHistory, mobs, chests } = gameState;
    const dayProgress = ((time % TICKS_PER_DAY) / TICKS_PER_DAY * 100).toFixed(0);
    const isNight = (time % TICKS_PER_DAY) > TICKS_PER_DAY / 2;

    const otherSurvivors = survivors.filter(s => s.id !== survivor.id);
    const visibleTiles = getVisibleTiles(map, survivor.position, 3);
    const bedCount = map.flat().filter(tile => tile === TileType.BED).length;

    const nearbyMobs = mobs.filter(m => Math.abs(m.position.x - survivor.position.x) < 5 && Math.abs(m.position.y - survivor.position.y) < 5);

    const systemInstruction = getPersonaBasedInstruction(survivor, isNight);
    
    const relativeBaseCamp = baseCampPosition ? { x: baseCampPosition.x - survivor.position.x, y: baseCampPosition.y - survivor.position.y } : null;

    const contents = `
**SITUATION REPORT**
- **Time:** Day progress ${dayProgress}%. It is ${isNight ? 'NIGHT' : 'DAY'}. ${isNight ? 'DANGER! Follow NIGHTFALL PROTOCOL.' : 'It is relatively safe.'}
- **Your Status:** Health=${survivor.stats.health}, Energy=${survivor.stats.energy}, Hunger=${survivor.stats.hunger}.
- **Your Inventory:** ${JSON.stringify(survivor.inventory) || 'Empty'}
- **Your Current Action:** ${survivor.action}

**GROUP STATUS**
- **Base Camp:** ${baseCampPosition ? `The group's central point is at relative position (${relativeBaseCamp!.x}, ${relativeBaseCamp!.y}). Focus activities around this point.` : 'No base camp established yet. Focus on building one near others.'}
- Beds built: ${bedCount} of ${survivors.length} needed.
- Other Survivors:
${otherSurvivors.map(s => `  - ${s.name} (${s.persona}, Action: ${s.action}) is at relative position (${s.position.x - survivor.position.x}, ${s.position.y - survivor.position.y}). Inv: ${JSON.stringify(s.inventory)}`).join('\n')}
- Shared Chests:
${chests.length > 0 ? chests.map((c, i) => `  - Chest ${i} at relative position (${c.position.x - survivor.position.x}, ${c.position.y - survivor.position.y}): ${JSON.stringify(c.inventory)}`).join('\n') : '  None'}

**ENVIRONMENT**
- Your immediate surroundings (relative coordinates): ${visibleTiles}
- Nearby Mobs (DANGER!):
${nearbyMobs.length > 0 ? nearbyMobs.map(m => `  - Mob at relative position (${m.position.x - survivor.position.x}, ${m.position.y - survivor.position.y}) with ${m.health} HP`).join('\n') : '  None'}

**RECENT MESSAGES**
${chatHistory.slice(-5).map(m => `- ${m.survivorName}: "${m.text}"`).join('\n') || '  No recent messages.'}

Based on your CORE SURVIVAL PRINCIPLES and your persona as a **${survivor.persona}**, determine your next \`shortTermGoal\` and the \`action\` to achieve it.
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