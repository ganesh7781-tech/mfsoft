import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Lock, User, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      if (res.data.success) {
        localStorage.setItem('olympus_token', res.data.token);
        localStorage.setItem('olympus_user', JSON.stringify(res.data.user));
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4 font-sans relative overflow-hidden">
      
      {/* Background Graphic Blobs */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-slate-950/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        
        {/* Logo and title */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-gradient-to-br from-red-650 to-red-500 rounded-2xl text-white shadow-xl shadow-red-500/10 mb-3 animate-pulse">
            <Dumbbell className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-red-650 via-rose-500 to-red-500 uppercase">
            Muscle Factory Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">Gym Management Software</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-800 focus:border-red-500/80 focus:ring-1 focus:ring-red-500/30 rounded-xl focus:outline-none text-sm transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-800 focus:border-red-500/80 focus:ring-1 focus:ring-red-500/30 rounded-xl focus:outline-none text-sm transition-all duration-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-red-600 via-red-500 to-rose-500 hover:from-red-700 hover:to-rose-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 active:scale-[0.99] transition-all duration-150 text-sm cursor-pointer mt-6 flex justify-center items-center"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center text-[10px] text-slate-600">
          <p>Muscle Factory Hub Management Suite &bull; Single-Tenant Edition</p>
        </div>

      </div>
    </div>
  );
}
