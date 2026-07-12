import { useState, useRef, useEffect } from 'react';
import { RefreshCw, ShoppingCart, Edit3, Trash2, FileText, ChevronDown } from 'lucide-react';

interface Member {
  id: number;
  first_name: string;
  last_name: string;
  mobile_number: string;
  email: string | null;
  status: 'Active' | 'Expired' | 'Unassigned';
  current_plan: string;
  expiry_date: string | null;
  photo_url: string | null;
  fitness_goal: string | null;
}

interface MemberRowProps {
  member: Member;
  onRenew: (member: Member) => void;
  onPOS: (member: Member) => void;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
  onPrintReceipt: (member: Member) => void;
}

export default function MemberRow({ member, onRenew, onPOS, onEdit, onDelete, onPrintReceipt }: MemberRowProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-450 border border-emerald-250 dark:border-emerald-900/30">
            <span className="w-2 h-2 mr-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Active
          </span>
        );
      case 'Expired':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-455 border border-rose-250 dark:border-rose-900/30">
            <span className="w-2 h-2 mr-1.5 rounded-full bg-rose-500"></span>
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-900/50 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
            <span className="w-2 h-2 mr-1.5 rounded-full bg-slate-400"></span>
            Unassigned
          </span>
        );
    }
  };

  const getInitials = () => {
    const f = member.first_name ? String(member.first_name)[0] || '' : '';
    const l = member.last_name ? String(member.last_name)[0] || '' : '';
    return `${f}${l}`.toUpperCase();
  };

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const photoUrl = member.photo_url
    ? member.photo_url.startsWith('http')
      ? member.photo_url
      : `${API_URL.replace('/api/v1', '')}${member.photo_url}`
    : null;

  const isCorruptName = String(member.first_name) === '2';
  const displayName = isCorruptName 
    ? 'Walk-in Customer' 
    : `${member.first_name || ''} ${member.last_name || ''}`;
  const displayInitials = isCorruptName ? 'WC' : getInitials();

  const getAvatarBg = () => {
    if (photoUrl) return '';
    switch (member.status) {
      case 'Active':
        return 'bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-200/30 dark:border-emerald-900/20';
      case 'Expired':
        return 'bg-rose-500/10 dark:bg-rose-955/20 border border-rose-200/30 dark:border-rose-900/20';
      default:
        return 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800';
    }
  };

  const getAvatarTextClass = () => {
    switch (member.status) {
      case 'Active':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'Expired':
        return 'text-rose-600 dark:text-rose-455';
      default:
        return 'text-slate-500 dark:text-slate-400';
    }
  };

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all duration-150">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center overflow-hidden font-black text-sm select-none ${getAvatarBg()}`}>
            {photoUrl ? (
              <img src={photoUrl} alt="Member Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className={getAvatarTextClass()}>{displayInitials}</span>
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {displayName}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{member.fitness_goal || 'General Fitness'}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-slate-900 dark:text-white">{member.mobile_number || 'N/A'}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{member.email || 'No Email'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-slate-900 dark:text-white">{member.current_plan}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {member.expiry_date && !isNaN(Date.parse(member.expiry_date))
            ? `Exp: ${new Date(member.expiry_date).toLocaleDateString('en-IN')}`
            : 'N/A'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        {getStatusBadge(member.status)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div ref={dropdownRef} className="relative inline-block text-left">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="inline-flex items-center px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all duration-150 cursor-pointer shadow-sm select-none"
          >
            <span>Actions</span>
            <ChevronDown className="w-3.5 h-3.5 ml-1 text-slate-455 dark:text-slate-500" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 shadow-xl z-30 py-1.5 text-left animate-fade-in">
              <button
                onClick={() => { onRenew(member); setShowDropdown(false); }}
                className="w-full px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors flex items-center space-x-2.5 cursor-pointer text-left"
              >
                <RefreshCw className="w-4 h-4 text-emerald-500" />
                <span>Renew Membership</span>
              </button>

              <button
                onClick={() => { onPOS(member); setShowDropdown(false); }}
                className="w-full px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors flex items-center space-x-2.5 cursor-pointer text-left"
              >
                <ShoppingCart className="w-4 h-4 text-amber-500" />
                <span>Log Store POS Sale</span>
              </button>

              <button
                onClick={() => { onPrintReceipt(member); setShowDropdown(false); }}
                className="w-full px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors flex items-center space-x-2.5 cursor-pointer text-left"
              >
                <FileText className="w-4 h-4 text-violet-500" />
                <span>Print Latest Receipt</span>
              </button>

              <button
                onClick={() => { onEdit(member); setShowDropdown(false); }}
                className="w-full px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors flex items-center space-x-2.5 cursor-pointer text-left"
              >
                <Edit3 className="w-4 h-4 text-blue-500" />
                <span>Edit Profile Details</span>
              </button>

              <div className="border-t border-slate-100 dark:border-slate-900/60 my-1"></div>

              <button
                onClick={() => { onDelete(member); setShowDropdown(false); }}
                className="w-full px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 transition-colors flex items-center space-x-2.5 cursor-pointer text-left"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Member</span>
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
