import { useEffect, useState } from 'react';
import { Search, Printer, Trash2, FileText, X, AlertCircle, RefreshCw, ShoppingBag, CreditCard, DollarSign, Sparkles, ChevronDown } from 'lucide-react';
import api from '../services/api';
import ReceiptModal from '../components/ReceiptModal';
import confetti from 'canvas-confetti';

interface Invoice {
  id: number;
  member_id: number | null;
  invoice_type: 'Membership' | 'Store';
  total_amount: number;
  tax_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_method: string;
  payment_status: 'Fully Paid' | 'Partially Paid' | 'Unpaid';
  due_date: string | null;
  created_at: string;
  member_name: string;
  member_mobile: string;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Membership' | 'Store'>('all');
  const [activeReceiptId, setActiveReceiptId] = useState<number | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  // Pay Dues Modal state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payError, setPayError] = useState('');
  const [paying, setPaying] = useState(false);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/invoices');
      if (res.data.success) {
        setInvoices(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    function handleClickOutside() {
      setActiveDropdownId(null);
    }
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const handleDelete = async (id: number) => {
    if (window.confirm(`Are you sure you want to delete Invoice Receipt #${id}? This will permanently remove the transaction details.`)) {
      try {
        await api.delete(`/invoices/${id}`);
        loadInvoices();
      } catch (err) {
        console.error('Failed to delete invoice:', err);
      }
    }
  };

  const handleOpenPayDues = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPayAmount(inv.balance_due.toString());
    setPayMethod('Cash');
    setPayError('');
    setIsPayModalOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setPayError('');
    setPaying(true);

    try {
      const res = await api.post(`/invoices/${selectedInvoice.id}/pay`, {
        amount_paid: parseFloat(payAmount),
        payment_method: payMethod
      });
      if (res.data.success) {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
        setIsPayModalOpen(false);
        loadInvoices();
      }
    } catch (err: any) {
      console.error(err);
      setPayError(err.response?.data?.message || 'Failed to submit payment.');
    } finally {
      setPaying(false);
    }
  };

  // Filtered lists
  const filteredInvoices = invoices.filter(inv => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      String(inv.id).includes(searchLower) ||
      inv.member_name.toLowerCase().includes(searchLower) ||
      inv.member_mobile.includes(searchLower) ||
      String(inv.payment_method || '').toLowerCase().includes(searchLower);

    const matchesType = typeFilter === 'all' || inv.invoice_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Aggregated values
  const totalBilled = filteredInvoices.reduce((sum, item) => sum + Number(item.total_amount), 0);
  const totalCollected = filteredInvoices.reduce((sum, item) => sum + Number(item.amount_paid), 0);
  const totalOutstanding = filteredInvoices.reduce((sum, item) => sum + Number(item.balance_due), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Fully Paid':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/30">
            Fully Paid
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-250 dark:border-amber-900/30">
            Partially Paid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-955/20 dark:text-rose-450 border border-rose-250 dark:border-rose-900/30">
            Unpaid
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase flex items-center">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 mr-3">
              <FileText className="w-6 h-6 animate-pulse" />
            </span>
            <span>Invoices & Billing History</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Search, print receipts, track client balances, and manage payment histories</p>
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card glass-card-hover p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-between shadow-indigo-500/5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-1">Total Billed Amt</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              ₹{totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/10">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card glass-card-hover p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-between shadow-emerald-500/5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-1">Total Amount Collected</p>
            <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-455">
              ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/10">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card glass-card-hover p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-between shadow-rose-500/5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-1">Total Outstanding Dues</p>
            <h3 className="text-xl font-bold text-rose-500 dark:text-rose-455">
              ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-red-650 text-white shadow-md shadow-rose-500/10">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-5 flex flex-col lg:flex-row items-center justify-between gap-5">
        <div className="relative w-full lg:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, member name, mobile, or payment method..."
            className="input-premium !pl-11 py-2.5 text-sm"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          {[
            { id: 'all', label: 'All Bills' },
            { id: 'Membership', label: 'Membership Receipts' },
            { id: 'Store', label: 'Retail Shop Sales' }
          ].map((btn) => {
            const isSelected = typeFilter === btn.id;
            return (
              <button
                key={btn.id}
                onClick={() => setTypeFilter(btn.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-red-500 text-white shadow-md shadow-red-500/15'
                    : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Invoices List Ledger - Desktop */}
      <div className="glass-card border border-slate-200/80 dark:border-slate-800/80 shadow-sm hidden md:block">
        <div className="overflow-x-visible">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-855">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-550 dark:text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4.5 text-left">Receipt #</th>
                <th className="px-6 py-4.5 text-left">Member / Customer</th>
                <th className="px-6 py-4.5 text-left">Billing Date</th>
                <th className="px-6 py-4.5 text-left">Category</th>
                <th className="px-6 py-4.5 text-left">Payment Method</th>
                <th className="px-6 py-4.5 text-right">Total Amount</th>
                <th className="px-6 py-4.5 text-right">Amount Paid</th>
                <th className="px-6 py-4.5 text-right">Pending Dues</th>
                <th className="px-6 py-4.5 text-center">Status</th>
                <th className="px-6 py-4.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-950 divide-y divide-slate-100 dark:divide-slate-900/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center text-slate-455 text-sm">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Syncing financial ledger...</span>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center text-slate-455 text-sm">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-350 dark:text-slate-750" />
                    No transactions matched your current filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isStore = inv.invoice_type === 'Store';
                  const initials = inv.member_name 
                    ? inv.member_name.split(' ').map((n: string) => n[0] || '').join('').toUpperCase().substring(0, 2)
                    : 'WC';
                  const displayName = inv.member_name === '2 undefined' ? 'Walk-in Customer' : inv.member_name;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-900 dark:text-white">
                        #{inv.id.toString().padStart(5, '0')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">{initials}</span>
                          </div>
                          <div className="ml-3">
                            <div className="text-xs font-bold text-slate-900 dark:text-white">{displayName}</div>
                            <div className="text-[10px] text-slate-550">{inv.member_mobile}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-650 dark:text-slate-350">
                        {new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isStore ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-955/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/20">
                            <ShoppingBag className="w-2.5 h-2.5 mr-1" />
                            Store POS
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-955/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/20">
                            <CreditCard className="w-2.5 h-2.5 mr-1" />
                            Membership
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-650 dark:text-slate-350">
                        {inv.payment_method || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-right text-slate-900 dark:text-white">
                        ₹{Number(inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-right text-emerald-600 dark:text-emerald-450">
                        ₹{Number(inv.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {Number(inv.balance_due) > 0 ? (
                          <div>
                            <span className="text-rose-500 dark:text-rose-455 font-extrabold text-xs block">
                              ₹{Number(inv.balance_due).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="inline-block text-[8px] font-black uppercase tracking-wider text-rose-500 bg-rose-50 dark:bg-rose-955/20 px-1 py-0.5 rounded mt-0.5 border border-rose-100 dark:border-rose-900/20">
                              Dues Pending
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-slate-400 dark:text-slate-500 font-medium text-xs block">
                              ₹0.00
                            </span>
                            <span className="inline-block text-[8px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-955/20 px-1 py-0.5 rounded mt-0.5 border border-emerald-100 dark:border-emerald-900/20">
                              Cleared
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(inv.payment_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === inv.id ? null : inv.id);
                            }}
                            className="inline-flex items-center px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer shadow-sm select-none"
                          >
                            <span>Actions</span>
                            <ChevronDown className="w-3.5 h-3.5 ml-1 text-slate-455 dark:text-slate-500" />
                          </button>

                          {activeDropdownId === inv.id && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 mt-1.5 w-44 rounded-2xl bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800/80 shadow-xl z-30 py-1.5 text-left animate-fade-in"
                            >
                              {Number(inv.balance_due) > 0 && (
                                <button
                                  onClick={() => { handleOpenPayDues(inv); setActiveDropdownId(null); }}
                                  className="w-full px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors flex items-center space-x-2.5 cursor-pointer text-left"
                                >
                                  <DollarSign className="w-4 h-4 text-emerald-500" />
                                  <span>Clear Dues</span>
                                </button>
                              )}

                              <button
                                onClick={() => { setActiveReceiptId(inv.id); setActiveDropdownId(null); }}
                                className="w-full px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors flex items-center space-x-2.5 cursor-pointer text-left"
                              >
                                <Printer className="w-4 h-4 text-amber-500" />
                                <span>Print Receipt</span>
                              </button>

                              <div className="border-t border-slate-100 dark:border-slate-900/60 my-1"></div>

                              <button
                                onClick={() => { handleDelete(inv.id); setActiveDropdownId(null); }}
                                className="w-full px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 transition-colors flex items-center space-x-2.5 cursor-pointer text-left"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete Record</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoices List Ledger - Mobile Cards */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="glass-card p-8 text-center text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
            <span>Syncing financial ledger...</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="glass-card p-8 text-center text-slate-500 dark:text-slate-400">
            No transactions matched your current filters.
          </div>
        ) : (
          filteredInvoices.map((inv) => {
            const isStore = inv.invoice_type === 'Store';
            const initials = inv.member_name 
              ? inv.member_name.split(' ').map((n: string) => n[0] || '').join('').toUpperCase().substring(0, 2)
              : 'WC';
            const displayName = inv.member_name === '2 undefined' ? 'Walk-in Customer' : inv.member_name;

            return (
              <div key={inv.id} className="glass-card p-4 space-y-3.5 shadow-sm border border-slate-200/80 dark:border-slate-800/80">
                {/* Header: Receipt # & Status */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Receipt ID</span>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">#{inv.id.toString().padStart(5, '0')}</h4>
                  </div>
                  <div>
                    {getStatusBadge(inv.payment_status)}
                  </div>
                </div>

                {/* Member Details */}
                <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-900/30 p-2 rounded-xl border border-slate-100 dark:border-slate-800/50">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">{initials}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{displayName}</div>
                    <div className="text-[9px] text-slate-500 font-medium">{inv.member_mobile || 'No Mobile'}</div>
                  </div>
                </div>

                {/* Date & category info */}
                <div className="grid grid-cols-3 gap-2 text-[10px] py-1 border-y border-slate-100 dark:border-slate-800/80">
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">Billing Date</span>
                    <span className="font-bold text-slate-700 dark:text-slate-350">
                      {new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">Category</span>
                    {isStore ? (
                      <span className="text-amber-500 font-bold flex items-center">
                        <ShoppingBag className="w-2.5 h-2.5 mr-0.5" /> Store
                      </span>
                    ) : (
                      <span className="text-indigo-500 font-bold flex items-center">
                        <CreditCard className="w-2.5 h-2.5 mr-0.5" /> Plan
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">Method</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{inv.payment_method || 'N/A'}</span>
                  </div>
                </div>

                {/* Financial summaries */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs py-1">
                  <div className="text-left">
                    <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">Total</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">₹{Number(inv.total_amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">Paid</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-450">₹{Number(inv.amount_paid).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">Dues</span>
                    <span className={`font-extrabold ${Number(inv.balance_due) > 0 ? 'text-rose-500 dark:text-rose-455' : 'text-slate-400'}`}>
                      ₹{Number(inv.balance_due).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  {Number(inv.balance_due) > 0 && (
                    <button
                      onClick={() => handleOpenPayDues(inv)}
                      className="flex-1 py-2 bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-[9px] uppercase tracking-wide rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Pay Dues</span>
                    </button>
                  )}
                  <button
                    onClick={() => setActiveReceiptId(inv.id)}
                    className="flex-1 py-2 bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white dark:text-amber-400 font-bold text-[9px] uppercase tracking-wide rounded-lg border border-amber-500/20 hover:border-transparent transition-all cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Receipt</span>
                  </button>
                  <button
                    onClick={() => handleDelete(inv.id)}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-all cursor-pointer flex items-center justify-center"
                    title="Delete Receipt"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PAY PENDING DUES MODAL */}
      {isPayModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center">
                <DollarSign className="w-4 h-4 mr-1 text-emerald-500" />
                <span>Record Dues Payment</span>
              </h2>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handlePaySubmit} className="p-6 space-y-4">
              {payError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs flex items-center space-x-1.5 font-bold animate-shake">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{payError}</span>
                </div>
              )}

              {/* Dues breakdown details */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/35 border border-slate-150 dark:border-slate-800 rounded-2xl text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-450 uppercase font-semibold">Bill Reference:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Invoice #{selectedInvoice.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-455 uppercase font-semibold">Billed Customer:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedInvoice.member_name === '2 undefined' ? 'Walk-in Customer' : selectedInvoice.member_name}</span>
                </div>
                <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-2 flex justify-between">
                  <span className="text-slate-450 uppercase font-semibold">Total Bill Amount:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">₹{parseFloat(selectedInvoice.total_amount.toString()).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-455 uppercase font-semibold">Amount Paid So Far:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{parseFloat(selectedInvoice.amount_paid.toString()).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between font-black text-sm text-rose-500">
                  <span className="uppercase">Remaining Dues:</span>
                  <span>₹{parseFloat(selectedInvoice.balance_due.toString()).toFixed(2)}</span>
                </div>
              </div>

              {/* Amount to pay */}
              <div>
                <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1.5 tracking-wider">Record Payment Amount (₹) *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payAmount}
                    max={selectedInvoice.balance_due}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-7 pr-3 py-2.5 focus:outline-none font-black text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Segmented Payment selector tabs */}
              <div>
                <label className="block text-[9px] font-bold text-slate-455 uppercase mb-1.5 tracking-wider">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Cash', 'UPI', 'Card'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={`py-2 rounded-xl text-xs font-bold uppercase transition-all duration-150 cursor-pointer border ${
                        payMethod === m
                          ? 'bg-red-500 text-white border-red-600 shadow-md shadow-red-500/10'
                          : 'bg-slate-55 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="btn-premium-secondary text-xs py-2 px-4 border border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="btn-premium-primary text-xs py-2.5 px-6 flex items-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{paying ? 'Recording...' : 'Clear Dues'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* RECEIPT MODAL ATTACHMENT */}
      {activeReceiptId !== null && (
        <ReceiptModal invoiceId={activeReceiptId} onClose={() => setActiveReceiptId(null)} />
      )}

    </div>
  );
}
