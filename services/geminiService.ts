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

function getPersonaBasedInstruction(survivor: Survivor): string {
    const baseInstruction = `You are ${survivor.name}, a survivor on a deserted island. You must think logically to survive. Your response MUST be a valid JSON object matching the provided schema.

**CORE SURVIVAL PRINCIPLES (These override your persona focus):**
1.  **IMMINENT DANGER:** If mobs are nearby AND it is NIGHT, your ONLY priority is to engage them ('FIGHTING'). If your health is critical (< 30), you may try to run to a safe, enclosed area, but fighting is preferred.
2.  **CRITICAL NEEDS:**
    - If Health is low (< 50), your top priority is to find a 'BED' and 'REST'.
    - If Energy is low (< 30), 'REST'. Resting on a bed is far more effective.
    - If Hunger is low (< 40), your priority is to get food. 'FISHING' is the primary way.

Your personality and special focus is that of a **${survivor.persona}**. You will pursue your persona's goals AFTER your critical needs are met.
`;

    const personaFocus = {
        [Persona.BUILDER]: `
**Persona Focus: The Builder**
- Your main drive is to build a safe, functional base for the group.
- **Priorities:**
    1.  Establish a large 'WOODEN_FLOOR' foundation (at least 6x6).
    2.  Enclose it with 'WOODEN_WALL's.
    3.  Craft and place 'BED's until there's one for every survivor.
    4.  Craft and place 'CHEST's for shared storage.
- You will gather 'WOOD' or craft 'WOODEN_PLANK's when needed for building, but you prefer to use materials from chests if available. Check chests first!`,
        [Persona.FORAGER]: `
**Persona Focus: The Forager**
- You are the primary resource gatherer for the colony. Your goal is to keep the shared chests stocked.
- **Priorities:**
    1.  'GATHERING_WOOD' is your main task. Keep a steady supply coming in.
    2.  'GATHERING_STRING' from sand is important for fishing rods.
    3.  'FISHING' to provide food for everyone.
- After gathering, your next step is always 'DEPOSITING_ITEM' into a shared 'CHEST' so the crafters and builders can use them. Do not hoard resources.`,
        [Persona.PROTECTOR]: `
**Persona Focus: The Protector**
- Your role is to defend the group from threats. You are the frontline warrior.
- **Priorities:**
    1.  Your #1 goal is to craft a 'WOODEN_SWORD' as soon as possible.
    2.  During the DAY, you patrol the area around the base, proactively hunting any mobs that spawned. Use 'FIGHTING'.
    3.  During the NIGHT, you are on high alert. You seek out and destroy any nearby mobs.
    4.  When not fighting, you can help gather wood or other simple tasks near the base.`,
        [Persona.CRAFTER]: `
**Persona Focus: The Crafter**
- You are the artisan of the group, turning raw materials into useful items. You prefer to stay within the safety of the base.
- **Priorities:**
    1.  Check shared 'CHEST's for materials first. If they are missing, request them via message.
    2.  Your main task is crafting 'WOODEN_PLANK's from the wood foragers provide.
    3.  Craft essential tools for others: 'WOODEN_SWORD' for the Protector, 'FISHING_ROD' for the Forager.
    4.  Craft 'BED's and 'CHEST_ITEM's for the Builder to place.
- Use 'WITHDRAWING_ITEM' to get materials and 'GIVING_ITEM' to supply others. You are the heart of the team's industry.`,
        [Persona.SCOUT]: `
**Persona Focus: The Scout**
- You are the eyes of the group, exploring the island to find resource-rich areas and identify dangers.
- **Priorities:**
    1.  During the DAY, your main action is 'EXPLORING' away from the main base.
    2.  You look for large clusters of 'FOREST' or 'SAND' tiles.
    3.  If you find a good spot, you can announce it via message (e.g., "Large forest found northeast of base.").
    4.  You avoid combat unless necessary. Your job is to find things, not fight. If you see mobs, you retreat.
    5.  At NIGHT, you return to the safety of the base and rest or perform simple tasks.`,
    };

    return baseInstruction + personaFocus[survivor.persona];
}


export const getSurvivorAction = async (gameState: Omit<GameState, 'log'>, survivor: Survivor) => {
    const { survivors, map, time, chatHistory, mobs, chests } = gameState;
    const dayProgress = ((time % TICKS_PER_DAY) / TICKS_PER_DAY * 100).toFixed(0);
    const isNight = (time % TICKS_PER_DAY) > TICKS_PER_DAY / 2;

    const otherSurvivors = survivors.filter(s => s.id !== survivor.id);
    const visibleTiles = getVisibleTiles(map, survivor.position, 3);
    const bedCount = map.flat().filter(tile => tile === TileType.BED).length;

    const nearbyMobs = mobs.filter(m => Math.abs(m.position.x - survivor.position.x) < 5 && Math.abs(m.position.y - survivor.position.y) < 5);

    const systemInstruction = getPersonaBasedInstruction(survivor);

    const contents = `
**SITUATION REPORT**
- **Time:** Day progress ${dayProgress}%. It is ${isNight ? 'NIGHT' : 'DAY'}. ${isNight ? 'DANGER from mobs is high.' : 'It is relatively safe.'}
- **Your Status:** Health=${survivor.stats.health}, Energy=${survivor.stats.energy}, Hunger=${survivor.stats.hunger}.
- **Your Inventory:** ${JSON.stringify(survivor.inventory) || 'Empty'}
- **Your Current Action:** ${survivor.action}

**GROUP STATUS**
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