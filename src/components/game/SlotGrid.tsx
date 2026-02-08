"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { Cell } from "@/config/gameConfig";

type GridProps = {
  grid: Cell[][];
  isSpinning: boolean;
  winningCells: string[]; 
  isTurbo: boolean;
};

const SYMBOL_MAP: Record<number, string> = {
  8: "8", 7: "9",
  1: "10", 2: "J", 3: "Q", 4: "K", 5: "A", 6: "M", 99: "W", 100: "S",
};

export default function SlotGrid({ grid, isSpinning, winningCells, isTurbo }: GridProps) {
  const isWinMode = winningCells.length > 0;

  return (
    <div className="relative inline-flex flex-col items-center justify-center p-2 md:p-4 bg-[#2a0a0a] rounded-xl border-[4px] border-[#FFD700] shadow-[0_0_40px_rgba(255,215,0,0.2)]">
      
      {/* BADGE */}
      <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-30">
        <div className="bg-[#8B0000] px-5 py-0.5 border-2 border-[#FFD700] rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
          <span className="font-bold text-[#FFD700] text-[10px] md:text-xs tracking-[0.2em] uppercase whitespace-nowrap shadow-black drop-shadow-md">
            Win Ways
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-[#150505] shadow-inner"> 
        {/* GAP DI HP KITA PERKECIL AGAR KOTAK BISA LEBIH LEBAR */}
        <div className="flex gap-1.5 md:gap-3">
          {grid.map((column, colIndex) => (
            <Reel 
              key={colIndex} 
              column={column} 
              colIndex={colIndex} 
              isSpinning={isSpinning}
              winningCells={winningCells}
              isWinMode={isWinMode}
              isTurbo={isTurbo}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Reel({ column, colIndex, isSpinning, winningCells, isWinMode, isTurbo }: any) {
  const exitDuration = isTurbo ? 0.15 : 0.25; 
  const enterDuration = isTurbo ? 0.15 : 0.4;
  const waveDelay = colIndex * (isTurbo ? 0.03 : 0.08);

  const variants: Variants = {
    startExit: { y: "0%" },
    exit: { 
      y: "120%", 
      transition: { duration: exitDuration, ease: "easeIn", delay: waveDelay } 
    },
    startEnter: { y: "-150%" },
    enter: { 
      y: "0%", 
      transition: { 
        type: "spring", 
        damping: isTurbo ? 20 : 14, 
        stiffness: isTurbo ? 300 : 180,
        mass: 1,
        duration: enterDuration, 
        delay: waveDelay 
      } 
    }
  };

  return (
    /* UKURAN REEL DISESUAIKAN DENGAN TILECARD */
    <div className="relative flex flex-col gap-1.5 md:gap-3 w-[65px] xs:w-[70px] md:w-20 h-[270px] xs:h-[300px] md:h-[400px]">
      <motion.div
        className="absolute inset-0 z-20 flex flex-col gap-1.5 md:gap-3"
        key={isSpinning ? "out" : "in"} 
        initial={isSpinning ? "startExit" : "startEnter"}
        animate={isSpinning ? "exit" : "enter"}
        variants={variants}
      >
        {column.map((cell: Cell, rowIndex: number) => {
          const cellKey = `${colIndex}-${rowIndex}`;
          const isWinner = winningCells.includes(cellKey);
          return (
            <TileCard key={rowIndex} cell={cell} isWinner={isWinner} isDimmed={isWinMode && !isWinner} />
          );
        })}
      </motion.div>
    </div>
  );
}

function TileCard({ cell, isWinner, isDimmed }: { cell: Cell, isWinner: boolean, isDimmed: boolean }) {
  const { id, isGold } = cell;
  const char = SYMBOL_MAP[id];
  let textColor = "text-slate-800";
  let bgColor = "bg-[#FFFFF0]";
  let borderColor = "border-[#dcdcdc]";

  if (isGold) {
    bgColor = "bg-gradient-to-br from-[#FFD700] via-[#FDB931] to-[#D4AF37]";
    borderColor = "border-[#B8860B]";
  }

  if (!isGold) {
    switch (id) {
        case 8: textColor = "text-gray-500"; break;
        case 7: textColor = "text-gray-600"; break;
        case 1: textColor = "text-blue-600"; break;
        case 2: textColor = "text-emerald-600"; break;
        case 3: textColor = "text-purple-600"; break;
        case 4: textColor = "text-orange-600"; break;
        case 5: textColor = "text-red-600"; break;
        case 6: textColor = "text-[#8B0000]"; break;
        case 99: 
          bgColor = "bg-gradient-to-b from-yellow-300 to-yellow-500"; textColor = "text-[#4a0e0e]"; borderColor = "border-yellow-700"; break;
        case 100: 
          bgColor = "bg-gradient-to-b from-purple-300 to-purple-500"; textColor = "text-white"; borderColor = "border-purple-700"; break;
    }
  } else {
    switch (id) {
        case 8: textColor = "text-gray-700"; break;
        case 7: textColor = "text-gray-800"; break;
        case 1: textColor = "text-blue-800"; break;
        case 2: textColor = "text-emerald-800"; break;
        case 3: textColor = "text-purple-800"; break;
        case 4: textColor = "text-orange-800"; break;
        case 5: textColor = "text-red-900"; break;
        case 6: textColor = "text-[#8B0000]"; break;
    }
  }

  const winnerStyle = isWinner ? "brightness-150 z-10 scale-105" : "";
  const dimStyle = isDimmed ? "opacity-40 grayscale brightness-75" : "opacity-100";

  return (
    <div className={`
      relative 
      /* UKURAN FIX UNTUK MOBILE AGAR TIDAK KEKECILAN */
      w-[65px] h-[65px] 
      xs:w-[70px] xs:h-[70px] 
      md:w-20 md:h-20 
      flex items-center justify-center rounded-md 
      ${bgColor} 
      border-b-[4px] border-r-[3px] md:border-b-[6px] md:border-r-[5px] 
      ${borderColor} shadow-md select-none transition-all duration-300 
      ${winnerStyle} ${dimStyle}
    `}>
      <span className={`${textColor} font-serif font-black text-3xl xs:text-4xl md:text-5xl`}>
        {char}
      </span>
      {isGold && <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full opacity-50"></div>}
    </div>
  );
}