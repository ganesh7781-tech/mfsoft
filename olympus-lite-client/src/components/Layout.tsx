import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, ShoppingBag, Settings, LogOut, Menu, X, Dumbbell, DollarSign, FileText, MessageSquare } from 'lucide-react';
import ModeToggle from './ui/ModeToggle';
import api from '../services/api';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [gymName, setGymName] = useState('Muscle Factory Hub');
  const [logoUrl, setLogoUrl] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch gym name and logo
    api.get('/settings')
      .then(res => {
        if (res.data.data) {
          if (res.data.data.gym_name) {
            setGymName(res.data.data.gym_name);
          }
          if (res.data.data.logo_url) {
            setLogoUrl(res.data.data.logo_url);
          }
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
    { name: 'Expenses', path: '/expenses', icon: DollarSign },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'Enquiries', path: '/enquiries', icon: MessageSquare },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80">
        {/* Sidebar Header Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center space-x-2.5">
            {logoUrl ? (
              <img 
                src={logoUrl.startsWith('http') ? logoUrl : `${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api/v1', '')}${logoUrl}`} 
                alt="Gym Logo" 
                className="h-8 w-8 object-contain rounded-lg shadow-sm" 
              />
            ) : (
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-600 to-red-500 text-white shadow-md">
                <Dumbbell className="w-5 h-5" />
              </div>
            )}
            <span className="font-extrabold text-lg text-red-600 dark:text-red-500 tracking-tight uppercase">
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
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-l-4 border-red-500'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-950 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Logout */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-col space-y-2">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 w-full rounded-xl text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 dark:hover:text-rose-400 font-medium text-sm transition-all duration-150 cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-rose-500" />
            <span>Sign Out</span>
          </button>
          <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800/50">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-wide uppercase">
              Developed by <a href="https://buildlabs.in" target="_blank" rel="noopener noreferrer" className="text-red-500 dark:text-red-400 hover:underline">buildlabs.in</a>
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile menu slideover */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative flex flex-col w-64 bg-white dark:bg-slate-900 h-full shadow-xl z-50">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center space-x-2.5">
                {logoUrl ? (
                  <img 
                    src={logoUrl.startsWith('http') ? logoUrl : `${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api/v1', '')}${logoUrl}`} 
                    alt="Gym Logo" 
                    className="h-7 w-7 object-contain rounded-lg shadow-sm" 
                  />
                ) : (
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-600 to-red-500 text-white">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                )}
                <span className="font-extrabold text-base text-red-600 dark:text-red-500 uppercase tracking-tight">Muscle Factory Hub</span>
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
                        ? 'bg-red-500/10 text-red-500'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-col space-y-2">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 px-4 py-3 w-full rounded-xl text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 dark:hover:text-rose-450 font-medium text-sm transition-all duration-150 cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
              <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800/50">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-wide uppercase">
                  Developed by <a href="https://buildlabs.in" target="_blank" rel="noopener noreferrer" className="text-red-500 dark:text-red-400 hover:underline">buildlabs.in</a>
                </span>
              </div>
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
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navbar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 lg:hidden print:hidden shadow-lg shadow-slate-950/10">
        <div className="flex justify-around items-center h-16">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition-colors ${
              location.pathname === '/'
                ? 'text-red-500'
                : 'text-slate-550 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/members"
            className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition-colors ${
              location.pathname === '/members'
                ? 'text-red-500'
                : 'text-slate-550 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>Members</span>
          </Link>
          <Link
            to="/store"
            className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition-colors ${
              location.pathname === '/store'
                ? 'text-red-500'
                : 'text-slate-550 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-5 h-5 mb-0.5" />
            <span>Store POS</span>
          </Link>
          <Link
            to="/enquiries"
            className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition-colors ${
              location.pathname === '/enquiries'
                ? 'text-red-500'
                : 'text-slate-550 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-5 h-5 mb-0.5" />
            <span>Enquiries</span>
          </Link>
          <button
            onClick={() => setIsOpen(true)}
            className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition-colors cursor-pointer ${
              isOpen
                ? 'text-red-500'
                : 'text-slate-550 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span>More</span>
          </button>
        </div>
      </div>

    </div>
  );
}
