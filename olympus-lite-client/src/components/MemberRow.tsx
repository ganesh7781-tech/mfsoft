import { RefreshCw, ShoppingCart, Edit3, Trash2, FileText } from 'lucide-react';

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
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <span className="badge-active">Active</span>;
      case 'Expired':
        return <span className="badge-expired">Expired</span>;
      default:
        return <span className="badge-unassigned">Unassigned</span>;
    }
  };

  const getInitials = () => {
    const f = member.first_name ? member.first_name[0] || '' : '';
    const l = member.last_name ? member.last_name[0] || '' : '';
    return `${f}${l}`.toUpperCase();
  };

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const photoUrl = member.photo_url
    ? member.photo_url.startsWith('http')
      ? member.photo_url
      : `${API_URL.replace('/api/v1', '')}${member.photo_url}`
    : null;

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all duration-150">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
            {photoUrl ? (
              <img src={photoUrl} alt="Member Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{getInitials()}</span>
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {member.first_name} {member.last_name}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{member.fitness_goal || 'General Fitness'}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-slate-900 dark:text-white">{member.mobile_number}</div>
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
      <td className="px-6 py-4 whitespace-nowrap">
        {getStatusBadge(member.status)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => onRenew(member)}
            title="Renew Membership"
            className="p-2 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-800 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-350 transition-all duration-150 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onPOS(member)}
            title="Log Store Purchase"
            className="p-2 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-600 dark:bg-slate-800 dark:hover:bg-amber-950/30 dark:hover:text-amber-400 text-slate-700 dark:text-slate-350 transition-all duration-150 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>

          <button
            onClick={() => onPrintReceipt(member)}
            title="Print Latest Invoice"
            className="p-2 rounded-lg bg-slate-100 hover:bg-violet-50 hover:text-violet-600 dark:bg-slate-800 dark:hover:bg-violet-950/30 dark:hover:text-violet-400 text-slate-700 dark:text-slate-350 transition-all duration-150 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
          </button>

          <button
            onClick={() => onEdit(member)}
            title="Edit Details"
            className="p-2 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-blue-950/30 dark:hover:text-blue-400 text-slate-700 dark:text-slate-350 transition-all duration-150 cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(member)}
            title="Delete Member"
            className="p-2 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 text-slate-700 dark:text-slate-350 transition-all duration-150 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
