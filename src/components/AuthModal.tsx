"use client";
import { useState } from 'react';
import { supabase } from '@/utils/supabaseClient';

export default function AuthModal({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true); // Toggle Login/Register
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Registrasi Berhasil! Silakan Login.");
        setIsLogin(true); // Pindah ke mode login
        setLoading(false);
        return;
      }
      onLoginSuccess(); // Tutup modal jika sukses login
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
        
        {error && <p className="text-red-500 text-sm text-center mb-4 bg-red-900/20 p-2 rounded">{error}</p>}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <input 
            type="email" placeholder="Email" required
            className="p-3 bg-black/50 border border-yellow-600/30 rounded text-white focus:outline-none focus:border-yellow-500"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Password" required
            className="p-3 bg-black/50 border border-yellow-600/30 rounded text-white focus:outline-none focus:border-yellow-500"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          
          <button disabled={loading} className="py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black font-bold rounded hover:brightness-110 transition disabled:opacity-50">
            {loading ? "Loading..." : (isLogin ? "MASUK SEKARANG" : "DAFTAR NEW MEMBER")}
          </button>
        </form>

        <p className="text-white/50 text-center mt-4 text-sm">
          {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-yellow-400 font-bold underline">
            {isLogin ? "Dapat 1 Juta Gratis!" : "Login disini"}
          </button>
        </p>
      </div>
    </div>
  );
}