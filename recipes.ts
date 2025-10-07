import { Item, Recipe } from './types.ts';

export const recipes: Recipe[] = [
    {
        name: 'Wooden Planks',
        output: { item: Item.WOODEN_PLANK, quantity: 4 },
        shape: [
            [Item.WOOD, null, null],
            [null, null, null],
            [null, null, null],
        ],
    },
    {
        name: 'Bed',
        output: { item: Item.BED, quantity: 1 },
        shape: [
            [Item.WOODEN_PLANK, Item.WOODEN_PLANK, Item.WOODEN_PLANK],
            [Item.WOODEN_PLANK, Item.WOODEN_PLANK, Item.WOODEN_PLANK],
            [null, null, null],
        ],
    },
    {
        name: 'Wooden Sword',
        output: { item: Item.WOODEN_SWORD, quantity: 1 },
        shape: [
            [Item.WOODEN_PLANK, null, null],
            [Item.WOODEN_PLANK, null, null],
            [Item.WOOD, null, null],
        ],
    },
    {
        name: 'Chest',
        output: { item: Item.CHEST_ITEM, quantity: 1 },
        shape: [
            [Item.WOODEN_PLANK, Item.WOODEN_PLANK, Item.WOODEN_PLANK],
            [Item.WOODEN_PLANK, null, Item.WOODEN_PLANK],
            [Item.WOODEN_PLANK, Item.WOODEN_PLANK, Item.WOODEN_PLANK],
        ],
    },
    {
        name: 'Fishing Rod',
        output: { item: Item.FISHING_ROD, quantity: 1 },
        shape: [
            [Item.WOOD, null, Item.STRING],
            [Item.WOOD, Item.STRING, null],
            [Item.WOOD, null, null],
        ],
    }
];

export const findRecipeByName = (name: string): Recipe | undefined => {
    return recipes.find(r => r.name === name);
};