import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, DollarSign, Calendar, Tag, FileText, X, AlertCircle, TrendingDown, Landmark, Briefcase, Zap, HelpCircle } from 'lucide-react';
import api from '../services/api';

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  expense_date: string;
  notes: string;
  created_at: string;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Rent',
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const categories = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Maintenance', 'Marketing', 'Other'];

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/expenses');
      if (res.data.success) {
        setExpenses(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const res = await api.post('/expenses', formData);
      if (res.data.success) {
        setIsAddModalOpen(false);
        setFormData({
          title: '',
          amount: '',
          category: 'Rent',
          expense_date: new Date().toISOString().split('T')[0],
          notes: '',
        });
        loadExpenses();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to record expense.');
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (window.confirm(`Are you sure you want to delete the expense: "${title}"?`)) {
      try {
        await api.delete(`/expenses/${id}`);
        loadExpenses();
      } catch (err) {
        console.error('Failed to delete expense:', err);
      }
    }
  };

  // Filtered lists
  const filteredExpenses = expenses.filter(exp => {
    const titleMatch = String(exp.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                       (exp.notes && String(exp.notes).toLowerCase().includes(searchQuery.toLowerCase()));
    const categoryMatch = categoryFilter === 'all' || exp.category === categoryFilter;
    return titleMatch && categoryMatch;
  });

  // Aggregated values
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const rentTotal = expenses.filter(e => e.category === 'Rent').reduce((sum, item) => sum + Number(item.amount), 0);
  const utilitiesTotal = expenses.filter(e => e.category === 'Utilities').reduce((sum, item) => sum + Number(item.amount), 0);
  const salariesTotal = expenses.filter(e => e.category === 'Salaries').reduce((sum, item) => sum + Number(item.amount), 0);

  // Category styling helper
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'Rent':
        return {
          bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30',
          dot: 'bg-blue-500',
          icon: Landmark
        };
      case 'Utilities':
        return {
          bg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30',
          dot: 'bg-purple-500',
          icon: Zap
        };
      case 'Salaries':
        return {
          bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30',
          dot: 'bg-emerald-500',
          icon: Briefcase
        };
      case 'Supplies':
        return {
          bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30',
          dot: 'bg-amber-500',
          icon: Tag
        };
      case 'Maintenance':
        return {
          bg: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/20 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900/30',
          dot: 'bg-cyan-500',
          icon: FileText
        };
      case 'Marketing':
        return {
          bg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30',
          dot: 'bg-indigo-500',
          icon: Landmark
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800',
          dot: 'bg-slate-400',
          icon: HelpCircle
        };
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase flex items-center">
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-500 mr-3">
              <TrendingDown className="w-6 h-6" />
            </span>
            <span>Expenses Journal</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Track and manage gym operating costs, salaries, rent, and utility bills</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-premium-primary flex items-center space-x-2 text-sm py-2.5 px-5"
        >
          <Plus className="w-5 h-5 animate-pulse" />
          <span>Record Gym Expense</span>
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Cost */}
        <div className="glass-card glass-card-hover p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-between shadow-rose-500/5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-1">Total Expenses (Filtered)</p>
            <h3 className="text-xl font-black text-rose-600 dark:text-rose-450">
              ₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/10">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Rent Card */}
        <div className="glass-card glass-card-hover p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-between shadow-blue-500/5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-555 dark:text-slate-400 mb-1">Building Rent (Monthly)</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              ₹{rentTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/10">
            <Landmark className="w-5 h-5" />
          </div>
        </div>

        {/* Salaries Card */}
        <div className="glass-card glass-card-hover p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-between shadow-violet-500/5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-555 dark:text-slate-400 mb-1">Staff Salaries</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              ₹{salariesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-md shadow-purple-500/10">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        {/* Utilities Card */}
        <div className="glass-card glass-card-hover p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-between shadow-emerald-500/5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-555 dark:text-slate-400 mb-1">Utilities & Electric</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              ₹{utilitiesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/10">
            <Zap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Panel */}
      <div className="glass-card p-5 flex flex-col lg:flex-row items-center justify-between gap-5">
        <div className="relative w-full lg:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by description or transaction reference..."
            className="input-premium pl-11 py-2.5 text-sm"
          />
        </div>

        {/* Category Filters Badge Strips */}
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/15'
                : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200/85 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            All Categories
          </button>
          {categories.map((c) => {
            const isSelected = categoryFilter === c;
            const meta = getCategoryStyles(c);
            return (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center ${
                  isSelected
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/15'
                    : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200/85 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isSelected ? 'bg-white' : meta.dot}`}></span>
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="glass-card overflow-hidden border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-850">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4.5 text-left">Expense Date</th>
                <th className="px-6 py-4.5 text-left">Description</th>
                <th className="px-6 py-4.5 text-left">Category</th>
                <th className="px-6 py-4.5 text-left">Notes / Reference</th>
                <th className="px-6 py-4.5 text-right">Amount</th>
                <th className="px-6 py-4.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-950 divide-y divide-slate-100 dark:divide-slate-900/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-450 text-sm">
                    <span className="inline-block animate-spin mr-3">⚙️</span>
                    Syncing expense books...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-450 text-sm">
                    <TrendingDown className="w-8 h-8 mx-auto mb-2 text-slate-350 dark:text-slate-750" />
                    No expense vouchers matching current filter guidelines.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const meta = getCategoryStyles(exp.category);
                  const Icon = meta.icon;
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {new Date(exp.expense_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-900 dark:text-white flex items-center">
                        <span className={`p-1.5 rounded-lg mr-2.5 ${meta.bg.split(' ')[0]}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        {exp.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.bg}`}>
                          <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${meta.dot}`}></span>
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {exp.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-right text-rose-500 dark:text-rose-455">
                        ₹{Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleDelete(exp.id, exp.title)}
                          className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD EXPENSE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">Record Gym Expense</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center space-x-2 text-xs font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Expense Title / Description *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <FileText className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Gym Building Rent"
                    className="input-premium pl-9 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Amount Paid (₹) *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <DollarSign className="w-4 h-4" />
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="e.g. 15000"
                      className="input-premium pl-9 py-2 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Category *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Tag className="w-4 h-4" />
                    </span>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input-premium pl-9 py-2 text-xs"
                    >
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Expense Date *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="input-premium pl-9 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Transaction Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional billing details or transaction reference"
                  rows={3}
                  className="input-premium py-2 text-xs"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-premium-secondary text-xs py-2 px-4 border border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-premium-primary text-xs py-2 px-6"
                >
                  Record Entry
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
