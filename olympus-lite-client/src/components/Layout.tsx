import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, ShoppingBag, Settings, LogOut, Menu, X, Dumbbell } from 'lucide-react';
import ModeToggle from './ui/ModeToggle';
import api from '../services/api';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [gymName, setGymName] = useState('Olympus Gym');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch gym name
    api.get('/settings')
      .then(res => {
        if (res.data.data && res.data.data.gym_name) {
          setGymName(res.data.data.gym_name);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('olympus_token');
    localStorage.removeItem('olympus_user');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Members', path: '/members', icon: Users },
    { name: 'Plans Matrix', path: '/plans', icon: CreditCard },
    { name: 'Store POS', path: '/store', icon: ShoppingBag },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80">
        {/* Sidebar Header Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md">
              <Dumbbell className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 tracking-tight uppercase">
              Muscle Factory Hub
            </span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-l-4 border-amber-500'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-950 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Logout */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 w-full rounded-xl text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 dark:hover:text-rose-400 font-medium text-sm transition-all duration-150 cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-rose-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile menu slideover */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative flex flex-col w-64 bg-white dark:bg-slate-900 h-full shadow-xl z-50">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-base text-slate-900 dark:text-white uppercase tracking-tight">Muscle Factory Hub</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 text-slate-500 dark:text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800/80">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 px-4 py-3 w-full rounded-xl text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 dark:hover:text-rose-450 font-medium text-sm transition-all duration-150 cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* Top Navbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between px-6 z-10 print:hidden">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight uppercase">
              {gymName}
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            <ModeToggle />
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Administrator</span>
              <span className="text-[10px] text-slate-500">Active Session</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>

    </div>
  );
}
