// src/utils/winLogic.ts
import { Cell } from "@/config/gameConfig";

// Update: Tambah harga untuk ID 7 dan 8
const SYMBOL_VALUES: Record<number, number> = {
  8: 5,   // Simbol "8" (Paling Murah)
  7: 8,   // Simbol "9"
  1: 15,  // 10
  2: 30,  // J
  3: 60,  // Q
  4: 150, // K
  5: 600, // A
  6: 3000,// M
};

type WinResult = {
  totalWin: number;
  winningLines: string[];
  winningCells: string[]; 
  isBigWin: boolean;
  scatterCount: number;
};

export const checkWin = (grid: Cell[][], betAmount: number): WinResult => {
  let totalWin = 0;
  let winningLines: string[] = [];
  let winningCells: Set<string> = new Set();
  
  let scatterCount = 0;
  grid.forEach(col => {
    col.forEach(cell => {
      if (cell.id === 100) scatterCount++;
    });
  });

  const betScale = betAmount / 200; 

  // PENTING: Loop sekarang mencakup 1 s/d 8 (termasuk simbol baru)
  const targetSymbols = [1, 2, 3, 4, 5, 6, 7, 8];

  targetSymbols.forEach((targetSymbol) => {
    let consecutiveCols = 0;
    let tempCells: string[] = [];

    for (let col = 0; col < 5; col++) {
      const rowsInCol = grid[col]
        .map((cell, idx) => (cell.id === targetSymbol || cell.id === 99 ? idx : -1))
        .filter((idx) => idx !== -1);

      if (rowsInCol.length > 0) {
        consecutiveCols++;
        rowsInCol.forEach(row => tempCells.push(`${col}-${row}`));
      } else {
        break; 
      }
    }

    if (consecutiveCols >= 3) {
      let lengthMultiplier = 1;
      if (consecutiveCols === 4) lengthMultiplier = 2;
      if (consecutiveCols === 5) lengthMultiplier = 5;

      const baseWin = SYMBOL_VALUES[targetSymbol] * lengthMultiplier;
      const finalWin = baseWin * betScale;
      
      totalWin += finalWin;
      winningLines.push(`Simbol ${targetSymbol}`);
      tempCells.forEach(cell => winningCells.add(cell));
    }
  });

  return { 
    totalWin, 
    winningLines, 
    winningCells: Array.from(winningCells),
    isBigWin: totalWin >= (50 * betAmount),
    scatterCount 
  };
};