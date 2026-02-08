// src/utils/cascadeLogic.ts
import { generateNewCell } from "./rng";
import { GRID_ROWS, GRID_COLS, Cell } from "@/config/gameConfig";

export const applyCascade = (currentGrid: Cell[][], winningCells: string[]): Cell[][] => {
  const newGrid: Cell[][] = [];

  for (let col = 0; col < GRID_COLS; col++) {
    const oldColumn = currentGrid[col];
    
    // FILTER: Siapa yang bertahan?
    const survivingSymbols: Cell[] = [];

    oldColumn.forEach((cell, rowIndex) => {
      const cellKey = `${col}-${rowIndex}`;
      const isWinner = winningCells.includes(cellKey);

      if (isWinner) {
        // JIKA MENANG & EMAS -> JADI WILD (Selamat!)
        if (cell.isGold) {
          survivingSymbols.push({ id: 99, isGold: false }); // Transform jadi Wild Biasa
        } 
        // JIKA MENANG & BIASA -> HILANG (Gak di-push ke survivor)
      } else {
        // JIKA KALAH -> BERTAHAN
        survivingSymbols.push(cell);
      }
    });

    // Hitung berapa yang hilang (yang tidak masuk survivor)
    const missingCount = GRID_ROWS - survivingSymbols.length;

    // Isi kekosongan di ATAS
    const newSymbols = Array.from({ length: missingCount }, () => generateNewCell(col));

    // Gabung: [Baru, Lama/Wild]
    const newColumn = [...newSymbols, ...survivingSymbols];
    
    newGrid.push(newColumn);
  }

  return newGrid;
};