// src/config/gameConfig.ts

export type Cell = {
  id: number;
  isGold: boolean; 
};

export type SymbolConfig = {
  id: number;
  weight: number;
};

// MODE BANDAR: SUSAH MENANG
export const SYMBOLS_POOL: SymbolConfig[] = [
  // --- SAMPAH UTAMA (Pengganggu Absolut) ---
  // Kita naikkan bobotnya supaya mereka mendominasi layar
  { id: 8, weight: 60 }, // Angka "8" (Sangat Sering)
  { id: 7, weight: 60 }, // Angka "9" (Sangat Sering)

  // --- SAMPAH LEVEL 2 (Kadang Connect) ---
  { id: 1, weight: 25 }, // 10
  { id: 2, weight: 25 }, // J
  { id: 3, weight: 20 }, // Q
  
  // --- MEDIUM (Mulai Jarang) ---
  { id: 4, weight: 10 }, // K
  { id: 5, weight: 8 },  // A
  
  // --- MAHAL (Sangat Langka) ---
  { id: 6, weight: 3 },  // M (Mahjong Hijau)
  
  // --- SPESIAL ---
  // WILD: Hampir mustahil muncul natural (Weight: 1 dari total ~200)
  // Di game asli, Wild itu barang mahal!
  { id: 99, weight: 1 },   
  
  // SCATTER: Tetap langka
  { id: 100, weight: 1 },  
];

export const GRID_ROWS = 4; 
export const GRID_COLS = 5;