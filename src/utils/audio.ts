// src/utils/audio.ts

const SOUNDS = {
  bgm: "/sounds/bgm.mp3",
  spin: "/sounds/spin.mp3",
  win: "/sounds/win.mp3",
  click: "/sounds/click.mp3",
  scatter: "/sounds/scatter.mp3",
};

type SoundType = keyof typeof SOUNDS;

let audioContext: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
const audioBuffers: Record<string, AudioBuffer> = {};
const activeSources: Record<string, AudioBufferSourceNode> = {};

let isMuted = false;

const initContext = () => {
  if (!audioContext) {
    // @ts-ignore
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
    
    masterGainNode = audioContext.createGain();
    masterGainNode.gain.value = isMuted ? 0 : 1;
    masterGainNode.connect(audioContext.destination);
  } else if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
};

const loadBuffer = async (key: string, url: string) => {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    if (audioContext) {
        const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffers[key] = decodedBuffer;
        
        // JIKA INI BGM, LANGSUNG PLAY SETELAH LOAD (JIKA TIDAK MUTE)
        if (key === 'bgm' && !isMuted) {
            playSound('bgm');
        }
    }
  } catch (error) {
    console.error(`Gagal load audio: ${key}`, error);
  }
};

export const preloadSounds = () => {
  if (typeof window === "undefined") return;
  initContext();
  Object.entries(SOUNDS).forEach(([key, path]) => {
    if (!audioBuffers[key]) {
        loadBuffer(key, path);
    }
  });
};

export const toggleMute = (muteStatus: boolean) => {
  isMuted = muteStatus;
  initContext();

  if (masterGainNode) {
    const currentTime = audioContext?.currentTime || 0;
    masterGainNode.gain.cancelScheduledValues(currentTime);
    masterGainNode.gain.setValueAtTime(masterGainNode.gain.value, currentTime);
    masterGainNode.gain.linearRampToValueAtTime(isMuted ? 0 : 1, currentTime + 0.1);
  }

  // Pastikan BGM tetap jalan jika unmute
  if (!isMuted) {
    if (!activeSources["bgm"]) {
      playSound("bgm");
    } else if (audioContext?.state === 'suspended') {
      audioContext.resume();
    }
  }
};

export const playSound = (type: SoundType) => {
  if (typeof window === "undefined") return;
  
  initContext();
  if (!audioContext || !masterGainNode || !audioBuffers[type]) return;

  // Cek jika BGM sudah jalan, jangan ditumpuk
  if (type === "bgm" && activeSources["bgm"]) return;

  // Hentikan suara spin sebelumnya jika ada
  if (type === "spin") {
      stopSound("spin");
  }

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffers[type];
  source.connect(masterGainNode);
  
  // LOGIKA LOOPING YANG LEBIH KUAT
  if (type === "bgm" || type === "spin") {
      source.loop = true;
      // Opsional: tentukan loop start/end jika perlu, tapi default biasanya cukup
      source.loopStart = 0;
      source.loopEnd = source.buffer.duration;
  }

  source.start(0);
  activeSources[type] = source;

  source.onended = () => {
    // Jika BGM berhenti tanpa sengaja (bukan karena stopSound), putar lagi
    if (type === "bgm" && !isMuted && activeSources["bgm"] === source) {
        delete activeSources[type];
        playSound("bgm");
    } else {
        delete activeSources[type];
    }
  };
};

export const stopSound = (type: SoundType) => {
  const source = activeSources[type];
  if (source) {
    try {
        // Hapus dulu dari list agar onended tidak memicu play ulang
        delete activeSources[type];
        source.stop();
    } catch (e) {}
  }
};