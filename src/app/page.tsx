"use client";

import { useState, useEffect, useRef } from "react";
import SlotGrid from "@/components/game/SlotGrid";
import AuthModal from "@/components/AuthModal" 
import { generateNewGrid } from "@/utils/rng";
import { checkWin } from "@/utils/winLogic";
import { applyCascade } from "@/utils/cascadeLogic"; 
import { Cell, GRID_ROWS } from "@/config/gameConfig";
import { preloadSounds, playSound, stopSound, toggleMute } from "@/utils/audio";
import { supabase } from "@/utils/supabaseClient"; // Import Supabase

const STATIC_GRID: Cell[][] = Array.from({ length: 5 }, () => 
  Array(GRID_ROWS).fill({ id: 1, isGold: false })
);

const BET_LEVELS = [200, 400, 800, 1200, 2000, 4000, 10000];
const BASE_MULTIPLIERS = [1, 2, 3, 5]; 
const FREE_MULTIPLIERS = [2, 4, 6, 10]; 

export default function Home() {
  // --- STATE SUPABASE & AUTH ---
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(true); // Default tampilkan login
  const [isSyncing, setIsSyncing] = useState(false); // Indikator save data

  // --- STATE GAME ---
  const [grid, setGrid] = useState<Cell[][]>(STATIC_GRID);
  const [isSpinning, setIsSpinning] = useState(false);
  const [balance, setBalance] = useState(0); // Balance awal 0, nanti di-load dari DB
  const [betIndex, setBetIndex] = useState(0); 
  const currentBet = BET_LEVELS[betIndex];

  const [isTurbo, setIsTurbo] = useState(false);
  const [autoSpinCount, setAutoSpinCount] = useState(0);
  const [showAutoMenu, setShowAutoMenu] = useState(false);
  const autoSpinRef = useRef(autoSpinCount); 
  useEffect(() => { autoSpinRef.current = autoSpinCount; }, [autoSpinCount]);

  const [multiplierIdx, setMultiplierIdx] = useState(0);
  const [freeSpinCount, setFreeSpinCount] = useState(0); 
  const freeSpinRef = useRef(freeSpinCount);
  useEffect(() => { freeSpinRef.current = freeSpinCount; }, [freeSpinCount]);

  const isFreeSpinMode = freeSpinCount > 0;
  const ACTIVE_MULTIPLIERS = isFreeSpinMode ? FREE_MULTIPLIERS : BASE_MULTIPLIERS;

  const [winData, setWinData] = useState<{amount: number, isBigWin: boolean, title: string} | null>(null);
  const [winningCells, setWinningCells] = useState<string[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [isLocked, setIsLocked] = useState(false); 
  
  const [history, setHistory] = useState<{id: number, time: string, bet: number, win: number}[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const [hasStarted, setHasStarted] = useState(false); // Popup Awal Game
  const [isMutedState, setIsMutedState] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false); 

  useEffect(() => { preloadSounds(); }, []);

  // --- 1. CEK SESSION LOGIN ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setShowAuth(false);
        fetchBalance(session.user.id);
      } else {
        setShowAuth(true);
      }
    };
    checkUser();
  }, []);

  // --- 2. AMBIL SALDO DARI DATABASE ---
  const fetchBalance = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();
    
    if (data) {
      setBalance(data.balance);
    }
  };

  // --- 3. UPDATE SALDO KE DATABASE ---
  const saveBalanceToDB = async (newBalance: number) => {
    if (!user) return;
    // Jangan set loading state UI agar game tidak lag, biarkan background process
    const { error } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', user.id);
      
    if (error) console.error("Gagal save saldo:", error);
  };

  // --- TIMING CONFIG ---
  const DELAY_DROP = isTurbo ? 200 : 800; 
  const DELAY_RISE = isTurbo ? 200 : 800;
  const DELAY_WIN_VIEW  = isTurbo ? 300 : 800; 
  const DELAY_PRE_DROP = isTurbo ? 100 : 200;

  const handleStartGame = () => {
    setHasStarted(true);
    handleUserInteraction(); 
    setGrid(generateNewGrid()); 
  };

  const handleUserInteraction = () => {
    if (!hasInteracted) {
        setHasInteracted(true);
        if (!isMutedState) toggleMute(false); 
    }
  };

  const handleLoginSuccess = () => {
    // Dipanggil saat modal login sukses
    setShowAuth(false);
    // Reload halaman atau fetch ulang user
    window.location.reload(); 
  };

  // GAME LOOP LOGIC
  const processGameRound = async (currentGrid: Cell[][], currentMultiIdx: number, accumulatedWin: number, isTriggerPhase: boolean) => {
    const result = checkWin(currentGrid, currentBet); 
    const currentMultiVal = ACTIVE_MULTIPLIERS[Math.min(currentMultiIdx, ACTIVE_MULTIPLIERS.length - 1)];
    const roundWin = result.totalWin * currentMultiVal;

    let scattersFound = result.scatterCount;
    let bonusSpins = 0;
    if (scattersFound >= 3 && isTriggerPhase) {
        bonusSpins = 12 + ((scattersFound - 3) * 2); 
    }

    if (roundWin > 0 || bonusSpins > 0) {
      if (bonusSpins > 0) {
        setAutoSpinCount(0); 
        setFreeSpinCount(prev => prev + bonusSpins);
        
        playSound("scatter"); 
        setWinData({ amount: 0, isBigWin: true, title: `GET ${bonusSpins} FREE SPINS!` });
        setShowPopup(true);
        await new Promise(r => setTimeout(r, isTurbo ? 1500 : 2500));
        setShowPopup(false);
        setTimeout(() => { handleSpin(true); }, 500);
        return; 
      }

      if (roundWin > 0) {
        setWinningCells(result.winningCells);
        
        // UPDATE BALANCE LOKAL (Visual Cepat)
        const newTotalWin = accumulatedWin + roundWin;
        setBalance(prev => prev + roundWin);
        
        playSound("win"); 
        setWinData({ amount: roundWin, isBigWin: false, title: "WIN" });
        setShowPopup(true);

        await new Promise(r => setTimeout(r, DELAY_WIN_VIEW));
        
        setShowPopup(false); 
        setWinningCells([]); 
        
        await new Promise(r => setTimeout(r, DELAY_PRE_DROP));

        setIsSpinning(true);
        playSound("spin"); 
        
        await new Promise(r => setTimeout(r, DELAY_DROP));
        stopSound("spin");

        const nextGrid = applyCascade(currentGrid, result.winningCells);
        const nextMultiIdx = Math.min(currentMultiIdx + 1, ACTIVE_MULTIPLIERS.length - 1);
        setGrid(nextGrid);      
        setMultiplierIdx(nextMultiIdx); 
        setIsSpinning(false); 

        await new Promise(r => setTimeout(r, DELAY_RISE));

        // Recursive Loop
        processGameRound(nextGrid, nextMultiIdx, newTotalWin, false);
      } else {
        finishRound(accumulatedWin);
      }
    } else {
      finishRound(accumulatedWin);
    }
  };

  const finishRound = (totalWin: number) => {
    setIsSpinning(false);
    stopSound("spin"); 

    // --- SAVE TO DB ---
    // Di akhir ronde, kita simpan saldo terbaru ke database
    saveBalanceToDB(balance); 
    // ------------------

    const wasFreeSpin = freeSpinRef.current > 0;
    if (wasFreeSpin) setFreeSpinCount(prev => Math.max(0, prev - 1));

    const attemptNextSpin = () => {
        if (freeSpinRef.current > 1) { 
            setTimeout(() => { handleSpin(true); }, isTurbo ? 500 : 1000);
            return;
        } 
        if (autoSpinRef.current > 0 && !wasFreeSpin) {
            setAutoSpinCount(p => Math.max(0, p - 1));
            setTimeout(() => { handleSpin(true); }, isTurbo ? 200 : 500);
        }
    };

    if (totalWin > 0) {
        const isBig = totalWin >= (50 * currentBet);
        playSound("win");
        setWinData({ amount: totalWin, isBigWin: isBig, title: isBig ? "JACKPOT!" : "TOTAL WIN" });
        setShowPopup(true);
        
        const newHistory = { id: Date.now(), time: new Date().toLocaleTimeString('id-ID'), bet: currentBet, win: totalWin };
        setHistory(p => [newHistory, ...p].slice(0, 10));

        if (!isBig) {
          setTimeout(() => {
            handleCloseWin();
            attemptNextSpin(); 
          }, isTurbo ? 1000 : 2000);
        } else {
          if (wasFreeSpin) {
              setTimeout(() => { handleCloseWin(); attemptNextSpin(); }, 4000); 
          } else {
              setAutoSpinCount(0); 
          }
        }
    } else {
        setIsLocked(false);
        const newHistory = { id: Date.now(), time: new Date().toLocaleTimeString('id-ID'), bet: currentBet, win: 0 };
        setHistory(p => [newHistory, ...p].slice(0, 10));
        attemptNextSpin();
    }
  };

  const handleSpin = (isAutoTrigger = false) => {
    handleUserInteraction();

    if (!isAutoTrigger && autoSpinCount > 0) {
        setAutoSpinCount(0);
        return; 
    }
    if (isSpinning || isLocked) return;
    if (showPopup) { handleCloseWin(); return; }
    
    // Cek Saldo
    if (!isFreeSpinMode && balance < currentBet) {
        setAutoSpinCount(0);
        alert("Saldo tidak cukup!");
        return;
    }

    handleCloseWin();
    
    // Kurangi saldo (Lokal)
    if (!isFreeSpinMode) {
        const newBal = balance - currentBet;
        setBalance(newBal);
        // Kita tidak save ke DB disini biar cepat, save-nya nanti pas finishRound
        // Tapi kalau mau aman banget, bisa save disini juga.
    }
    
    playSound("spin");
    
    setIsSpinning(true); 
    setIsLocked(true);
    setMultiplierIdx(0); 

    setTimeout(() => {
      let newGrid = generateNewGrid();
      setGrid(newGrid);
      setIsSpinning(false); 
      
      setTimeout(() => { 
        stopSound("spin"); 
        processGameRound(newGrid, 0, 0, true); 
      }, DELAY_RISE);

    }, DELAY_DROP);
  };

  // ... (Fungsi Helper lain sama: handleCloseWin, changeBet, toggleTurbo, dll) ...
  const handleCloseWin = () => { playSound("click"); setShowPopup(false); setWinningCells([]); setWinData(null); setMultiplierIdx(0); setIsLocked(false); };
  const handleToggleMute = () => { const newState = !isMutedState; setIsMutedState(newState); toggleMute(newState); if (!hasInteracted && !newState) setHasInteracted(true); };
  const changeBet = (dir: 'UP' | 'DOWN') => { playSound("click"); if (isSpinning || isLocked) return; if (dir === 'UP' && betIndex < BET_LEVELS.length - 1) setBetIndex(p => p + 1); if (dir === 'DOWN' && betIndex > 0) setBetIndex(p => p - 1); };
  const toggleTurbo = () => { playSound("click"); setIsTurbo(!isTurbo); };
  const toggleAutoMenu = () => { playSound("click"); setShowAutoMenu(!showAutoMenu); };
  const setAuto = (val: number) => { playSound("click"); setAutoSpinCount(val); setShowAutoMenu(false); handleSpin(true); };

  // --- RENDER UTAMA ---
  const bgClass = isFreeSpinMode 
    ? "bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900 via-black to-black"
    : "bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#5e0b0b] via-[#2a0505] to-black";

  // Jika belum login, tampilkan AUTH MODAL saja
  if (showAuth) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} />;
  }

  // Jika sudah login, tampilkan Game
  return (
    <main 
        onClick={handleUserInteraction} 
        className={`h-[100dvh] w-full overflow-hidden flex flex-col items-center justify-between font-sans py-3 md:py-6 relative transition-colors duration-1000 ${bgClass}`}
    >
      {/* POPUP START GAME (Hanya muncul sekali setelah login) */}
      {!hasStarted && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
           <div className="absolute inset-0 bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-yellow-900/40 via-black to-black opacity-80"></div>
           <div className="relative z-10 flex flex-col items-center text-center gap-6 max-w-md">
             <div className="w-24 h-24 bg-[#FFD700] rounded-full flex items-center justify-center shadow-[0_0_50px_#FFD700] mb-2 animate-bounce">
                <span className="text-6xl">🐉</span>
             </div>
             <h1 className="text-4xl xs:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-md tracking-tighter">MAHJONG WAYS</h1>
             <p className="text-white/80 text-lg md:text-xl font-light leading-relaxed animate-pulse">
               Halo <span className="text-yellow-400 font-bold">{user?.email?.split('@')[0]}</span>!<br/>
               Saldo: {balance.toLocaleString('id-ID')}<br/>
               🔊 Besarkan volume supaya <span className="text-yellow-400 font-bold">GACOR!</span>
             </p>
             <button onClick={handleStartGame} className="mt-4 px-10 py-4 bg-gradient-to-b from-[#FFD700] to-[#FFA500] hover:from-white hover:to-yellow-300 rounded-full shadow-[0_0_30px_rgba(255,215,0,0.6)] border-b-[6px] border-[#B8860B] active:border-b-[2px] active:translate-y-[4px] transition-all duration-100 group">
                <span className="text-black font-black text-xl tracking-widest group-hover:scale-105 inline-block transition-transform">MAIN SEKARANG</span>
             </button>
             <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} className="text-white/30 text-sm hover:text-white underline">Logout</button>
           </div>
        </div>
      )}

      {/* HEADER, GRID, CONTROLS (Sama seperti sebelumnya) */}
      <div className="flex flex-col items-center flex-shrink-0 z-20 w-full gap-1">
        <div className="relative w-full flex justify-center">
          <button onClick={(e) => { e.stopPropagation(); handleToggleMute(); }} className="absolute left-16 top-1 text-lg bg-black/40 w-8 h-8 rounded-full border border-yellow-600/50 flex items-center justify-center font-bold text-yellow-500 z-50">
            {isMutedState ? "🔇" : "🔊"}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setShowInfo(true); playSound("click"); }} className="absolute left-4 top-1 text-lg bg-black/40 w-8 h-8 rounded-full border border-yellow-600/50 flex items-center justify-center font-serif font-bold text-yellow-500 z-50">i</button>
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-sm tracking-tighter select-none">{isFreeSpinMode ? "FREE SPIN" : "MAHJONG"}</h1>
          <button onClick={(e) => { e.stopPropagation(); setShowHistory(true); playSound("click"); }} className="absolute right-4 top-1 text-lg bg-black/40 w-8 h-8 rounded-full border border-yellow-600/50 flex items-center justify-center">📜</button>
        </div>
        
        {isFreeSpinMode && <div className="text-yellow-300 font-bold text-lg animate-pulse tracking-widest drop-shadow-md">{freeSpinCount} SPINS LEFT</div>}

        <div className={`flex gap-2 bg-black/40 p-1 rounded-full border ${isFreeSpinMode ? "border-red-500/50" : "border-[#FFD700]/20"} backdrop-blur-sm transform scale-90 xs:scale-100`}>
          {ACTIVE_MULTIPLIERS.map((m, idx) => {
            const isActive = multiplierIdx === idx;
            return <div key={m} className={`w-8 h-8 xs:w-10 xs:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 font-black text-xs md:text-base transition-all duration-300 ${isActive ? "bg-[#FFD700] border-white text-[#8B0000] scale-110 shadow-[0_0_15px_#FFD700]" : "bg-[#2a0a0a] border-[#555] text-gray-500 scale-100"}`}>x{m}</div>;
          })}
        </div>
      </div>

      <div className="flex-1 w-full flex items-center justify-center min-h-0 z-10 px-4 relative">
        <div className="transform scale-[0.70] xs:scale-[0.80] sm:scale-90 md:scale-100 transition-transform duration-300">
          <SlotGrid grid={grid} isSpinning={isSpinning} winningCells={winningCells} isTurbo={isTurbo} />
        </div>
        {/* ... (Auto Menu, History, Popup Win, Info Modal sama persis seperti sebelumnya) ... */}
        {showAutoMenu && <div className="absolute bottom-20 right-4 z-[70] bg-[#2a0a0a] border-2 border-[#FFD700] rounded-xl p-2 flex flex-col gap-2 shadow-2xl animate-in slide-in-from-bottom-5">{[10, 30, 50, 80, 1000].map(val => (<button key={val} onClick={() => setAuto(val)} className="px-4 py-2 bg-white/5 hover:bg-white/20 rounded text-white font-mono font-bold text-sm border border-white/10">{val === 1000 ? "∞" : val}</button>))}</div>}
        {showHistory && <div className="absolute inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-200"><div className="bg-[#2a0a0a] border-2 border-yellow-600 w-full max-w-sm rounded-xl p-4 shadow-2xl max-h-[80%] flex flex-col"><div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2"><h2 className="text-yellow-500 font-bold text-xl uppercase tracking-widest">History</h2><button onClick={() => { setShowHistory(false); playSound("click"); }} className="text-red-500 font-bold text-xl">✕</button></div><div className="overflow-y-auto flex-1 space-y-2 pr-1">{history.length === 0 ? <p className="text-white/30 text-center italic mt-10">Empty.</p> : history.map((item) => (<div key={item.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5"><div className="flex flex-col"><span className="text-xs text-white/50">{item.time}</span><span className="text-xs text-yellow-500">Bet: {item.bet}</span></div><span className={`font-mono font-bold ${item.win > 0 ? "text-green-400" : "text-white/30"}`}>{item.win > 0 ? `+${item.win.toLocaleString()}` : "-"}</span></div>))}</div></div></div>}
        {showInfo && <div className="absolute inset-0 bg-black/95 z-[80] flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-200"><div className="bg-[#2a0a0a] border-2 border-yellow-600 w-full max-w-md rounded-xl p-0 shadow-2xl h-[85%] flex flex-col overflow-hidden"><div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/20"><h2 className="text-yellow-500 font-bold text-xl uppercase tracking-widest">PAYTABLE</h2><button onClick={() => { setShowInfo(false); playSound("click"); }} className="text-red-500 font-bold text-xl">✕</button></div><div className="overflow-y-auto flex-1 p-4 space-y-6"><div className="space-y-3"><div className="bg-white/5 p-3 rounded-lg border border-yellow-500/30"><h3 className="text-yellow-400 font-bold text-sm mb-1">GOLD PLATED SYMBOLS</h3><p className="text-white/70 text-xs leading-relaxed">Simbol berbingkai <span className="text-yellow-300 font-bold">EMAS</span> hanya muncul di reel 2, 3, dan 4. Jika pecah (win), simbol emas akan berubah menjadi <span className="text-red-400 font-bold">WILD</span>.</p></div><div className="bg-white/5 p-3 rounded-lg border border-red-500/30"><h3 className="text-red-400 font-bold text-sm mb-1">FREE SPINS FEATURE</h3><p className="text-white/70 text-xs leading-relaxed">Dapatkan 3 simbol <span className="text-purple-400 font-bold">SCATTER</span> untuk memicu 12 Putaran Gratis. Selama fitur ini, multiplier ditingkatkan menjadi: x2, x4, x6, x10.</p></div></div></div></div></div>}
        {showPopup && winData && <div className="absolute inset-0 flex items-center justify-center z-50 animate-in fade-in zoom-in duration-300 cursor-pointer" onClick={() => handleCloseWin()}>{(winData.isBigWin || winData.title === "TOTAL WIN" || winData.title === "JACKPOT!") && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>}<div className={`relative flex flex-col items-center justify-center px-10 py-6 rounded-2xl ${winData.isBigWin ? "bg-gradient-to-b from-[#8B0000] to-black border-4 border-[#FFD700] scale-125 shadow-[0_0_50px_rgba(255,215,0,0.5)]" : "bg-black/80 border-2 border-[#FFD700] shadow-lg"}`}><span className={`font-black uppercase drop-shadow-md text-center ${winData.isBigWin ? "text-4xl text-[#FFD700] mb-2 animate-bounce" : "text-3xl text-[#FFD700]"}`}>{winData.title}</span>{winData.amount > 0 && <span className="text-white font-mono text-2xl font-bold">+ {winData.amount.toLocaleString("id-ID")}</span>}<span className="text-white/30 text-[10px] mt-2 font-light tracking-widest uppercase">Tap to Skip</span></div></div>}
      </div>
      
      <div className="flex flex-col items-center gap-2 flex-shrink-0 w-full px-4 z-20 pb-4">
        <div className="flex items-center justify-between w-full max-w-[380px] gap-2">
          <div className="flex-1 bg-black/60 px-2 py-2 rounded-lg border border-[#FFD700]/30 backdrop-blur-md flex flex-col items-center"><span className="text-[9px] text-yellow-500 font-bold tracking-wider">CREDIT</span><span className="text-white font-black tracking-wide font-mono text-sm">{balance.toLocaleString("id-ID")}</span></div>
          <div className={`flex-1 bg-black/60 p-1 rounded-lg border border-[#FFD700]/30 backdrop-blur-md flex items-center justify-between ${isFreeSpinMode ? 'opacity-50 pointer-events-none' : ''}`}><button onClick={() => changeBet('DOWN')} className="w-8 h-8 flex items-center justify-center bg-red-900/50 rounded hover:bg-red-800 text-yellow-500 font-bold">-</button><div className="flex flex-col items-center px-1"><span className="text-[9px] text-yellow-500 font-bold tracking-wider">BET</span><span className="text-white font-black font-mono text-sm">{currentBet.toLocaleString()}</span></div><button onClick={() => changeBet('UP')} className="w-8 h-8 flex items-center justify-center bg-green-900/50 rounded hover:bg-green-800 text-yellow-500 font-bold">+</button></div>
        </div>
        <div className="flex items-center justify-center gap-3 w-full max-w-[380px] mt-1">
            <button onClick={toggleTurbo} disabled={isSpinning || autoSpinCount > 0 || isLocked} className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${isTurbo ? "bg-yellow-500 border-yellow-200 shadow-[0_0_15px_#FFD700]" : "bg-black/40 border-gray-600 grayscale"} ${(isSpinning || autoSpinCount > 0 || isLocked) ? "opacity-50 cursor-not-allowed" : "hover:brightness-110 active:scale-95"}`}><span className="text-2xl">⚡</span></button>
            <button onClick={() => handleSpin(false)} disabled={isSpinning || (isLocked && !winData?.isBigWin && winData?.title !== "TOTAL WIN")} className={`flex-1 relative group py-3 ${winData?.isBigWin && showPopup ? "bg-gradient-to-b from-green-500 to-green-700 border-green-900" : (isFreeSpinMode ? "bg-gradient-to-b from-red-600 to-red-800 border-red-900" : "bg-gradient-to-b from-[#FFD700] to-[#FFA500] border-[#B8860B]")} rounded-full shadow-[0_0_20px_rgba(255,215,0,0.4)] border-b-[5px] transition-all duration-100 touch-manipulation ${(isSpinning || (isLocked && !winData?.isBigWin && winData?.title !== "TOTAL WIN" && winData?.title !== "JACKPOT!")) ? "brightness-75 cursor-not-allowed scale-95 border-b-[2px] translate-y-[3px] grayscale-[0.5]" : "active:border-b-[2px] active:translate-y-[3px] hover:brightness-110"}`}><span className="font-black text-[#4a0e0e] text-xl tracking-widest drop-shadow-sm flex items-center justify-center gap-2 relative z-10">{autoSpinCount > 0 ? (<div className="flex items-center gap-2"><span className="text-lg font-bold">AUTO</span><span className="text-xl font-mono">{autoSpinCount}</span></div>) : (isSpinning ? <span className="animate-pulse text-lg">...</span> : (winData?.isBigWin && showPopup ? <>CLAIM 💰</> : (isFreeSpinMode ? <>FREE ({freeSpinCount})</> : <>SPIN 🔄</>)))}</span></button>
            <button onClick={toggleAutoMenu} className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${autoSpinCount > 0 ? "bg-green-600 border-green-300 animate-pulse" : "bg-black/40 border-gray-600"}`}><span className="text-xl">▶️</span></button>
        </div>
      </div>
    </main>
  );
}