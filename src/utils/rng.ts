// src/utils/rng.ts
import { SYMBOLS_POOL, GRID_ROWS, GRID_COLS, Cell } from "@/config/gameConfig";

export const getWeightedSymbolId = (colIndex: number): number => {
  let currentPool = [...SYMBOLS_POOL];

  // Aturan Wild: Gak boleh di Reel 1 & 5
  if (colIndex === 0 || colIndex === 4) {
    currentPool = currentPool.filter(s => s.id !== 99);
  }

  const totalWeight = currentPool.reduce((sum, item) => sum + item.weight, 0);
  let randomNum = Math.random() * totalWeight;

  for (const symbol of currentPool) {
    if (randomNum < symbol.weight) return symbol.id;
    randomNum -= symbol.weight;
  }
  return 8; // Fallback ke simbol sampah (8)
};

export const generateNewCell = (colIndex: number): Cell => {
  const id = getWeightedSymbolId(colIndex);
  
  // LOGIKA EMAS (DIPERSULIT):
  // 1. Hanya di Reel 2, 3, 4
  // 2. Bukan Wild/Scatter
  // 3. Peluang DITURUNKAN jadi 6% (0.06) - Dulu 15%
  let isGold = false;
  if (colIndex >= 1 && colIndex <= 3) {
    if (id !== 99 && id !== 100) {
      isGold = Math.random() < 0.06; // <-- SUSAH DAPAT EMAS
    }
  }

  return { id, isGold };
};

export const generateNewGrid = (): Cell[][] => {
  const grid: Cell[][] = [];
  for (let col = 0; col < GRID_COLS; col++) {
    const column: Cell[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      column.push(generateNewCell(col));
    }
    grid.push(column);
  }
  return grid;
};