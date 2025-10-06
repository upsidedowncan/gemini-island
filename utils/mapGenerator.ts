// Fix: Added .ts extension to the import paths.
import { TileType } from '../types.ts';
import { GRID_SIZE } from '../constants.ts';

export const generateMap = (): TileType[][] => {
  const map: TileType[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(TileType.WATER));
  
  const centerX = GRID_SIZE / 2;
  const centerY = GRID_SIZE / 2;
  const maxRadius = GRID_SIZE * 0.4;
  
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      const noise = (Math.random() - 0.5) * 5;
      
      if (distance + noise < maxRadius) {
         map[y][x] = TileType.GRASS;
      } else if (distance + noise < maxRadius + 2) {
         map[y][x] = TileType.SAND;
      }
    }
  }

  // Smooth out single water tiles surrounded by land
  for(let i=0; i < 2; i++){
      for (let y = 1; y < GRID_SIZE - 1; y++) {
          for (let x = 1; x < GRID_SIZE - 1; x++) {
              if (map[y][x] === TileType.WATER) {
                  const neighbors = [map[y-1][x], map[y+1][x], map[y][x-1], map[y][x+1]];
                  if (neighbors.filter(n => n === TileType.GRASS || n === TileType.SAND).length >= 3) {
                      map[y][x] = TileType.SAND;
                  }
              }
          }
      }
  }

  return map;
};
