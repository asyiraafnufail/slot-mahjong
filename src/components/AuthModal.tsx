"use client";
import { useState } from 'react';
import { supabase } from '@/utils/supabaseClient';

export default function AuthModal({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. BERSIHKAN INPUT (Hapus spasi depan/belakang)
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    try {
      if (isLogin) {
        // LOGIN FLOW
        const { error } = await supabase.auth.signInWithPassword({ 
            email: cleanEmail, 
            password: cleanPassword 
        });
        if (error) throw error;
      } else {
        // REGISTER FLOW
        const { data, error } = await supabase.auth.signUp({ 
            email: cleanEmail, 
            password: cleanPassword,
            options: {
                // Opsional: Data tambahan jika mau
                data: { full_name: cleanEmail.split('@')[0] }
            }
        });
        
        if (error) throw error;

        // Cek jika user berhasil dibuat tapi butuh verifikasi (kalau lupa matikan confirm email)
        if (data.user && data.session === null) {
            alert("Registrasi berhasil! Cek email untuk verifikasi (Atau matikan 'Confirm Email' di Supabase agar otomatis login).");
            setIsLogin(true);
            setLoading(false);
            return;
        }

        alert("Registrasi Berhasil! Akun siap dimainkan.");
        // Auto login setelah register (jika confirm email mati)
        setIsLogin(true); 
      }
      
      onLoginSuccess(); 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-[#2a0a0a] border-2 border-yellow-600 w-full max-w-sm rounded-xl p-6 shadow-2xl">
        <h2 className="text-3xl font-black text-yellow-500 text-center mb-6">
          {isLogin ? "LOGIN" : "DAFTAR AKUN"}
        </h2>
        
        {error && <p className="text-red-500 text-sm text-center mb-4 bg-red-900/20 p-2 rounded border border-red-500/50">{error}</p>}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-yellow-500 font-bold ml-1">EMAIL</label>
            <input 
                type="email" 
                placeholder="contoh@email.com" 
                required
                className="p-3 bg-black/50 border border-yellow-600/30 rounded text-white focus:outline-none focus:border-yellow-500 font-mono"
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs text-yellow-500 font-bold ml-1">PASSWORD (Min 6 Karakter)</label>
            <input 
                type="password" 
                placeholder="******" 
                required
                minLength={6}
                className="p-3 bg-black/50 border border-yellow-600/30 rounded text-white focus:outline-none focus:border-yellow-500 font-mono"
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button disabled={loading} className="py-3 mt-2 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black font-bold rounded hover:brightness-110 transition disabled:opacity-50 active:scale-95 transform">
            {loading ? "Memproses..." : (isLogin ? "MASUK SEKARANG 🚀" : "DAFTAR & KLAIM 1 JUTA 💰")}
          </button>
        </form>

        <p className="text-white/50 text-center mt-4 text-sm">
          {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
          <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="text-yellow-400 font-bold underline hover:text-white transition">
            {isLogin ? "Daftar Disini" : "Login Disini"}
          </button>
        </p>
      </div>
    </div>
  );
}