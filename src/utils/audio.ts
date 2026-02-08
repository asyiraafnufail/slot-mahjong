// src/utils/audio.ts

const SOUNDS = {
  bgm: "/sounds/bgm.mp3",
  spin: "/sounds/spin.mp3",
  win: "/sounds/win.mp3",
  click: "/sounds/click.mp3",
  scatter: "/sounds/scatter.mp3",
};

type SoundType = keyof typeof SOUNDS;

// Global Variables
let audioContext: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
const audioBuffers: Record<string, AudioBuffer> = {}; // Simpan data suara mentah
const activeSources: Record<string, AudioBufferSourceNode> = {}; // Simpan suara yang sedang bunyi

let isMuted = false;

// 1. Inisialisasi Audio Context (Harus dipanggil setelah interaksi user)
const initContext = () => {
  if (!audioContext) {
    // @ts-ignore - Support Safari/Old browsers
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
    
    // Buat Master Volume (Gain Node)
    masterGainNode = audioContext.createGain();
    masterGainNode.gain.value = isMuted ? 0 : 1; // Set volume awal
    masterGainNode.connect(audioContext.destination);
  } else if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
};

// 2. Fungsi Load/Download Suara
const loadBuffer = async (key: string, url: string) => {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    if (audioContext) {
        const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffers[key] = decodedBuffer;
    }
  } catch (error) {
    console.error(`Gagal load audio: ${key}`, error);
  }
};

// 3. Preload Semua Suara
export const preloadSounds = () => {
  if (typeof window === "undefined") return;
  
  // Kita coba init context (mungkin gagal kalau belum klik, tapi gpp)
  try { initContext(); } catch(e) {}

  Object.entries(SOUNDS).forEach(([key, path]) => {
    // Load file hanya jika Context sudah ada, 
    // atau tunggu interaksi pertama nanti.
    // Trik: Kita fetch dulu, decode nanti pas context ready.
    if (!audioBuffers[key]) {
        // Init context lazily kalau belum ada
        if(!audioContext) {
             // @ts-ignore
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContextClass();
            masterGainNode = audioContext.createGain();
            masterGainNode.connect(audioContext.destination);
        }
        loadBuffer(key, path);
    }
  });
};

export const toggleMute = (muteStatus: boolean) => {
  isMuted = muteStatus;
  
  // Pastikan context jalan
  initContext();

  if (masterGainNode) {
    // Ramp to value agar transisi volume mulus (hindari suara 'pop')
    const currentTime = audioContext?.currentTime || 0;
    masterGainNode.gain.cancelScheduledValues(currentTime);
    masterGainNode.gain.setValueAtTime(masterGainNode.gain.value, currentTime);
    masterGainNode.gain.linearRampToValueAtTime(isMuted ? 0 : 1, currentTime + 0.1);
  }

  // Khusus BGM: Kalau di-unmute dan belum jalan, jalankan.
  if (!isMuted && !activeSources["bgm"]) {
     playSound("bgm");
  }
};

export const playSound = (type: SoundType) => {
  if (typeof window === "undefined") return;
  
  // Pastikan context sudah bangun
  initContext();
  if (!audioContext || !masterGainNode || !audioBuffers[type]) return;

  // Hentikan suara sebelumnya jika tipe yang sama (opsional, bagus untuk Spin loop)
  // Kecuali 'click' atau 'win', kita mau mereka bisa tumpuk-menumpuk (polyphonic)
  if (type === "bgm" || type === "spin") {
      stopSound(type);
  }

  // Buat Source Baru
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffers[type];
  source.connect(masterGainNode); // Sambung ke Master Volume
  
  // Looping untuk BGM dan Spin (Spin nanti dimatikan manual)
  if (type === "bgm" || type === "spin") {
      source.loop = true;
  }

  source.start(0);
  
  // Simpan referensi biar bisa di-stop
  activeSources[type] = source;

  // Cleanup saat selesai (khusus sound effect pendek)
  source.onended = () => {
    delete activeSources[type];
  };
};

export const stopSound = (type: SoundType) => {
  const source = activeSources[type];
  if (source) {
    try {
        source.stop();
        delete activeSources[type];
    } catch (e) {
        // Ignore error jika sudah stop duluan
    }
  }
};