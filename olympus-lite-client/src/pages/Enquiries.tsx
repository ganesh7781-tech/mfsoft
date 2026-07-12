import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Search, Plus, Trash2, UserPlus, RefreshCw, AlertCircle, X, ChevronDown, CheckCircle, Mail, Phone, Calendar, Sparkles } from 'lucide-react';
import api from '../services/api';
import confetti from 'canvas-confetti';

interface Enquiry {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  message: string;
  source: string;
  status: 'New' | 'Contacted' | 'Converted' | 'Ignored';
  created_at: string;
}

export default function Enquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'New' | 'Contacted' | 'Converted' | 'Ignored'>('All');
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  // New Enquiry Modal Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newEnquiryData, setNewEnquiryData] = useState({
    full_name: '',
    email: '',
    phone: '',
    message: '',
    source: 'Website'
  });

  const navigate = useNavigate();

  const loadEnquiries = async () => {
    try {
      setLoading(true);
      const res = await api.get('/enquiries');
      if (res.data.success) {
        setEnquiries(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load enquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnquiries();
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

  const handleCreateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnquiryData.full_name || !newEnquiryData.phone) {
      setFormError('Name and Phone Number are required fields.');
      return;
    }
    setFormError('');
    setSubmitting(true);

    try {
      const res = await api.post('/enquiries', newEnquiryData);
      if (res.data.success) {
        setIsModalOpen(false);
        setNewEnquiryData({
          full_name: '',
          email: '',
          phone: '',
          message: '',
          source: 'Website'
        });
        loadEnquiries();
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to submit enquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: 'New' | 'Contacted' | 'Converted' | 'Ignored') => {
    try {
      const res = await api.put(`/enquiries/${id}`, { status });
      if (res.data.success) {
        if (status === 'Converted') {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.8 } });
        }
        loadEnquiries();
      }
    } catch (err) {
      console.error('Failed to update enquiry status:', err);
    }
  };

  const handleDeleteEnquiry = async (id: number) => {
    if (window.confirm('Are you sure you want to permanently delete this enquiry record?')) {
      try {
        await api.delete(`/enquiries/${id}`);
        loadEnquiries();
      } catch (err) {
        console.error('Failed to delete enquiry:', err);
      }
    }
  };

  const handleOnboardRedirect = (enq: Enquiry) => {
    // Split full name into first and last name if possible
    const nameParts = enq.full_name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Mark as converted automatically when they onboard
    handleUpdateStatus(enq.id, 'Converted');

    // Redirect to members onboarding
    navigate(`/members?onboard=true&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&phone=${encodeURIComponent(enq.phone)}&email=${encodeURIComponent(enq.email || '')}`);
  };

  // Filter list
  const filteredEnquiries = enquiries.filter(enq => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      enq.full_name.toLowerCase().includes(searchLower) ||
      enq.phone.includes(searchLower) ||
      enq.email.toLowerCase().includes(searchLower) ||
      (enq.message || '').toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'All' || enq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Analytics Metrics
  const countTotal = enquiries.length;
  const countNew = enquiries.filter(e => e.status === 'New').length;
  const countContacted = enquiries.filter(e => e.status === 'Contacted').length;
  const countConverted = enquiries.filter(e => e.status === 'Converted').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30">
            <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            New Enquiry
          </span>
        );
      case 'Contacted':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-250 dark:border-amber-900/30">
            <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-500"></span>
            Contacted
          </span>
        );
      case 'Converted':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/30">
            <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500"></span>
            Converted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 dark:bg-slate-900/50 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
            <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-slate-400"></span>
            Ignored
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
              <MessageSquare className="w-6 h-6" />
            </span>
            <span>Lead Enquiries Ledger</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Monitor web lead enquiries, coordinate callbacks, and onboard prospects</p>
        </div>
        <button
          onClick={() => { setFormError(''); setIsModalOpen(true); }}
          className="btn-premium-primary flex items-center space-x-2 text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Add Manual Enquiry</span>
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-5 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-1">Total Leads</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{countTotal}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-650 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between shadow-sm shadow-blue-500/5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-1">New Enquiries</p>
            <h3 className="text-2xl font-black text-blue-500">{countNew}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-550 border border-blue-200/30">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
          </div>
        </div>

        <div className="glass-card p-5 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between shadow-sm shadow-amber-500/5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-1">Contacted Leads</p>
            <h3 className="text-2xl font-black text-amber-500">{countContacted}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-550 border border-amber-200/30">
            <Phone className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-5 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between shadow-sm shadow-emerald-500/5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-1">Converted Success</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-455">{countConverted}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-200/30">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Tabs Filtering */}
      <div className="glass-card p-4 flex flex-col xl:flex-row items-center justify-between gap-4">
        <div className="relative w-full xl:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, mobile, email, or message contents..."
            className="input-premium !pl-11 py-2.5 text-sm"
          />
        </div>

        {/* Status segment controllers */}
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          {[
            { id: 'All', label: 'All Leads' },
            { id: 'New', label: 'New Enquiries' },
            { id: 'Contacted', label: 'In Call / Followup' },
            { id: 'Converted', label: 'Converted' },
            { id: 'Ignored', label: 'Closed / Ignored' }
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-red-500 text-white shadow-md shadow-red-500/15'
                    : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Enquiries Ledger Grid - Desktop */}
      <div className="glass-card border border-slate-200/80 dark:border-slate-800/80 shadow-sm hidden md:block">
        <div className="overflow-x-visible">
          <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-855">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-550 dark:text-slate-405 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4.5 text-left">Submitted Date</th>
                <th className="px-6 py-4.5 text-left">Lead Prospect</th>
                <th className="px-6 py-4.5 text-left">Message / Query Details</th>
                <th className="px-6 py-4.5 text-center">Channel Source</th>
                <th className="px-6 py-4.5 text-center">Status</th>
                <th className="px-6 py-4.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-950 divide-y divide-slate-100 dark:divide-slate-900/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-455 text-sm">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Syncing database enquiries...</span>
                  </td>
                </tr>
              ) : filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-455 text-sm">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-350 dark:text-slate-750" />
                    No lead enquiries match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredEnquiries.map((enq) => {
                  const avatarInitials = enq.full_name
                    ? enq.full_name.split(/\s+/).map(n => n[0] || '').join('').toUpperCase().substring(0, 2)
                    : 'LQ';

                  return (
                    <tr key={enq.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-650 dark:text-slate-350">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {new Date(enq.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-9 w-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center overflow-hidden">
                            <span className="text-[11px] font-black text-amber-600 dark:text-amber-450">{avatarInitials}</span>
                          </div>
                          <div className="ml-3">
                            <div className="text-xs font-bold text-slate-900 dark:text-white">{enq.full_name}</div>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className="text-[10px] text-slate-500 flex items-center">
                                <Phone className="w-2.5 h-2.5 mr-1" />
                                {enq.phone}
                              </span>
                              {enq.email && enq.email !== 'No Email' && (
                                <span className="text-[10px] text-slate-550 flex items-center">
                                  <Mail className="w-2.5 h-2.5 mr-1" />
                                  {enq.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-700 dark:text-slate-300 max-w-sm whitespace-pre-line leading-relaxed">
                          {enq.message || <span className="text-slate-400 italic">No message provided.</span>}
                        </p>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                          {enq.source}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(enq.status)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === enq.id ? null : enq.id);
                            }}
                            className="inline-flex items-center px-3 py-1.5 border border-slate-205 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer shadow-sm select-none"
                          >
                            <span>Actions</span>
                            <ChevronDown className="w-3.5 h-3.5 ml-1 text-slate-450 dark:text-slate-500" />
                          </button>

                          {activeDropdownId === enq.id && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 mt-1.5 w-48 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 shadow-xl z-30 py-1.5 text-left animate-fade-in"
                            >
                              <button
                                onClick={() => { handleOnboardRedirect(enq); setActiveDropdownId(null); }}
                                className="w-full px-4 py-2 text-xs font-bold text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-955/20 transition-colors flex items-center space-x-2.5 cursor-pointer text-left"
                              >
                                <UserPlus className="w-4 h-4" />
                                <span>Onboard Member</span>
                              </button>

                              <div className="border-t border-slate-100 dark:border-slate-900/60 my-1"></div>

                              <button
                                onClick={() => { handleUpdateStatus(enq.id, 'Contacted'); setActiveDropdownId(null); }}
                                className="w-full px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-305 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors flex items-center space-x-2.5 cursor-pointer text-left"
                              >
                                <Phone className="w-4 h-4 text-indigo-500" />
                                <span>Mark Contacted</span>
                              </button>

                              <button
                                onClick={() => { handleUpdateStatus(enq.id, 'Converted'); setActiveDropdownId(null); }}
                                className="w-full px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-305 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors flex items-center space-x-2.5 cursor-pointer text-left"
                              >
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span>Mark Converted</span>
                              </button>

                              <button
                                onClick={() => { handleUpdateStatus(enq.id, 'Ignored'); setActiveDropdownId(null); }}
                                className="w-full px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-305 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors flex items-center space-x-2.5 cursor-pointer text-left"
                              >
                                <X className="w-4 h-4 text-slate-400" />
                                <span>Mark Closed/Ignored</span>
                              </button>

                              <div className="border-t border-slate-100 dark:border-slate-900/60 my-1"></div>

                              <button
                                onClick={() => { handleDeleteEnquiry(enq.id); setActiveDropdownId(null); }}
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

      {/* Enquiries Ledger Grid - Mobile Cards */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="glass-card p-8 text-center text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
            <span>Syncing database enquiries...</span>
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="glass-card p-8 text-center text-slate-500 dark:text-slate-400">
            No lead enquiries match the selected filters.
          </div>
        ) : (
          filteredEnquiries.map((enq) => {
            const avatarInitials = enq.full_name
              ? enq.full_name.split(/\s+/).map(n => n[0] || '').join('').toUpperCase().substring(0, 2)
              : 'LQ';

            return (
              <div key={enq.id} className="glass-card p-4 space-y-3.5 shadow-sm border border-slate-200/80 dark:border-slate-800/80">
                {/* Header: Lead Name & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center overflow-hidden">
                      <span className="text-[11px] font-black text-amber-600 dark:text-amber-450">{avatarInitials}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase">{enq.full_name}</h4>
                      <div className="flex items-center space-x-1.5 text-[9px] text-slate-550 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>
                          {new Date(enq.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(enq.status)}
                  </div>
                </div>

                {/* Lead Contact Info & Source */}
                <div className="grid grid-cols-2 gap-2 text-[10px] py-2 border-y border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10 p-2.5 rounded-xl">
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">Contact</span>
                    <span className="font-bold text-slate-800 dark:text-slate-250 flex items-center">
                      <Phone className="w-2.5 h-2.5 mr-1 text-slate-400" /> {enq.phone}
                    </span>
                    {enq.email && enq.email !== 'No Email' && (
                      <span className="text-slate-500 flex items-center mt-0.5 truncate max-w-[120px]">
                        <Mail className="w-2.5 h-2.5 mr-1 text-slate-400" /> {enq.email}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">Source Channel</span>
                    <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 mt-0.5">
                      {enq.source}
                    </span>
                  </div>
                </div>

                {/* Message detail */}
                {enq.message && (
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Message Details</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/50 leading-relaxed max-h-24 overflow-y-auto pr-1">
                      {enq.message}
                    </p>
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => handleOnboardRedirect(enq)}
                    className="flex-1 py-2 bg-amber-500 text-white hover:bg-amber-600 font-bold text-[9px] uppercase tracking-wide rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Onboard</span>
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(enq.id, 'Contacted')}
                      className="p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-955/20 dark:hover:bg-indigo-955/40 text-indigo-600 dark:text-indigo-400 rounded-lg transition-all cursor-pointer flex items-center justify-center border border-indigo-200/20"
                      title="Mark Contacted"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(enq.id, 'Converted')}
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-955/20 dark:hover:bg-emerald-955/40 text-emerald-600 dark:text-emerald-450 rounded-lg transition-all cursor-pointer flex items-center justify-center border border-emerald-200/20"
                      title="Mark Converted"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(enq.id, 'Ignored')}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition-all cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-800"
                      title="Close/Ignore"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEnquiry(enq.id)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-505 text-rose-500 hover:text-white rounded-lg transition-all cursor-pointer flex items-center justify-center"
                      title="Delete Enquiry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE MANUAL ENQUIRY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center">
                <Plus className="w-4.5 h-4.5 mr-1 text-amber-500" />
                <span>Add Manual Enquiry</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-550 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateEnquiry} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs flex items-center space-x-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1 tracking-wider">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aman Sharma"
                  value={newEnquiryData.full_name}
                  onChange={(e) => setNewEnquiryData({ ...newEnquiryData, full_name: e.target.value })}
                  className="input-premium py-2.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1 tracking-wider">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={newEnquiryData.phone}
                    onChange={(e) => setNewEnquiryData({ ...newEnquiryData, phone: e.target.value })}
                    className="input-premium py-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-455 dark:text-slate-400 uppercase mb-1 tracking-wider">Enquiry Source</label>
                  <select
                    value={newEnquiryData.source}
                    onChange={(e) => setNewEnquiryData({ ...newEnquiryData, source: e.target.value })}
                    className="input-premium py-2.5 text-xs select-premium appearance-none bg-no-repeat"
                  >
                    <option value="Website">Website</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Phone Call">Phone Call</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1 tracking-wider">Email Address</label>
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={newEnquiryData.email}
                  onChange={(e) => setNewEnquiryData({ ...newEnquiryData, email: e.target.value })}
                  className="input-premium py-2.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1 tracking-wider">Query / Requirements Message</label>
                <textarea
                  rows={3}
                  placeholder="Describe member requirements or follow up details here..."
                  value={newEnquiryData.message}
                  onChange={(e) => setNewEnquiryData({ ...newEnquiryData, message: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 focus:outline-none text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-premium-secondary text-xs py-2 px-4 border border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-premium-primary text-xs py-2.5 px-6 flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Saving...' : 'Add Enquiry'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
