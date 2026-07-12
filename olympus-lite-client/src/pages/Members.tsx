import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Plus, ShieldAlert, RefreshCw, X, CreditCard, Download, ShoppingCart, Edit3, Trash2, FileText } from 'lucide-react';
import api from '../services/api';
import MemberRow from '../components/MemberRow';
import ReceiptModal from '../components/ReceiptModal';
import confetti from 'canvas-confetti';

interface Plan {
  id: number;
  plan_name: string;
  duration_days: number;
  plan_price: number;
}

export default function Members() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [members, setMembers] = useState<any[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [activeReceiptId, setActiveReceiptId] = useState<number | null>(null);

  // Active member for edits/renewals
  const [selectedMember, setSelectedMember] = useState<any>(null);


  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Onboarding Form fields
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    mobile_number: '',
    email: '',
    date_of_birth: '',
    address: '',
    height_cm: '',
    weight_kg: '',
    fitness_goal: 'General Fitness',
    medical_notes: '',
    emergency_name: '',
    emergency_relation: '',
    emergency_phone: '',
    // Optional initial plan setup
    plan_id: '',
    joining_date: new Date().toISOString().split('T')[0],
    amount_paid: '',
    payment_method: 'Cash',
  });

  // Renewal Form state
  const [renewalData, setRenewalData] = useState({
    plan_id: '',
    joining_date: new Date().toISOString().split('T')[0],
    amount_paid: '',
    payment_method: 'Cash',
  });

  const [formError, setFormError] = useState('');

  // Fetch plans and members
  const loadData = async () => {
    try {
      setLoading(true);
      const mRes = await api.get('/members');
      setMembers(mRes.data.data);

      const pRes = await api.get('/plans');
      setPlans(pRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Check URL parameters for active filters (e.g. from Dashboard click)
    const filterParam = searchParams.get('filter');
    if (filterParam) {
      setFilter(filterParam);
    }
    const qParam = searchParams.get('q');
    if (qParam) {
      setSearchQuery(qParam);
    }

    // Check if redirecting to onboard an enquiry
    const onboardParam = searchParams.get('onboard');
    if (onboardParam === 'true') {
      const fn = searchParams.get('first_name') || '';
      const ln = searchParams.get('last_name') || '';
      const phone = searchParams.get('phone') || '';
      const email = searchParams.get('email') || '';
      setFormData(prev => ({
        ...prev,
        first_name: fn,
        last_name: ln,
        mobile_number: phone,
        email: email
      }));
      setIsAddModalOpen(true);
      navigate('/members', { replace: true });
    }
  }, [searchParams, navigate]);





  // Onboarding Form Submit
  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const payload = {
      ...formData,
      emergency_contact: {
        name: formData.emergency_name,
        relation: formData.emergency_relation,
        phone: formData.emergency_phone
      },
      photo_data_url: capturedPhoto // Webcam capture base64
    };

    try {
      const res = await api.post('/members', payload);
      if (res.data.success) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
        setIsAddModalOpen(false);
        if (res.data.data && res.data.data.invoice_id) {
          setActiveReceiptId(res.data.data.invoice_id);
        }
        resetForm();
        loadData();
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to register member. Check fields.');
    }
  };

  // Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const payload = {
      ...formData,
      emergency_contact: {
        name: formData.emergency_name,
        relation: formData.emergency_relation,
        phone: formData.emergency_phone
      },
      photo_data_url: capturedPhoto
    };

    try {
      const res = await api.put(`/members/${selectedMember.id}`, payload);
      if (res.data.success) {
        setIsEditModalOpen(false);
        resetForm();
        loadData();
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to update member.');
    }
  };

  // Renewal Submit
  const handleRenewalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    try {
      const res = await api.post(`/members/${selectedMember.id}/renew`, renewalData);
      if (res.data.success) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.8 } });
        setIsRenewModalOpen(false);
        setActiveReceiptId(res.data.invoice_id); // Show Receipt modal immediately!
        loadData();
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Renewal failed.');
    }
  };

  // Soft Delete Member
  const handleDeleteMember = async (member: any) => {
    if (window.confirm(`Are you sure you want to delete member: ${member.first_name} ${member.last_name}? (This soft-deletes the profile to preserve payment history).`)) {
      try {
        await api.delete(`/members/${member.id}`);
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handlePrintLastInvoice = async (member: any) => {
    try {
      const res = await api.get(`/members/${member.id}/invoices/latest`);
      if (res.data.success && res.data.invoice_id) {
        setActiveReceiptId(res.data.invoice_id);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'No invoice found for this member.');
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      mobile_number: '',
      email: '',
      date_of_birth: '',
      address: '',
      height_cm: '',
      weight_kg: '',
      fitness_goal: 'General Fitness',
      medical_notes: '',
      emergency_name: '',
      emergency_relation: '',
      emergency_phone: '',
      plan_id: '',
      joining_date: new Date().toISOString().split('T')[0],
      amount_paid: '',
      payment_method: 'Cash',
    });
    setRenewalData({
      plan_id: '',
      joining_date: new Date().toISOString().split('T')[0],
      amount_paid: '',
      payment_method: 'Cash',
    });
    setCapturedPhoto(null);
    setFormError('');
  };

  const handleOpenEdit = (member: any) => {
    setSelectedMember(member);
    
    // Parse emergency details
    let emergency = { name: '', relation: '', phone: '' };
    if (member.emergency_contact) {
      try {
        emergency = typeof member.emergency_contact === 'string'
          ? JSON.parse(member.emergency_contact)
          : member.emergency_contact;
      } catch (e) {}
    }

    setFormData({
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      mobile_number: member.mobile_number || '',
      email: member.email || '',
      date_of_birth: member.date_of_birth ? member.date_of_birth.split('T')[0] : '',
      address: member.address || '',
      height_cm: member.height_cm ? member.height_cm.toString() : '',
      weight_kg: member.weight_kg ? member.weight_kg.toString() : '',
      fitness_goal: member.fitness_goal || 'General Fitness',
      medical_notes: member.medical_notes || '',
      emergency_name: emergency.name || '',
      emergency_relation: emergency.relation || '',
      emergency_phone: emergency.phone || '',
      plan_id: '',
      joining_date: '',
      amount_paid: '',
      payment_method: '',
    });
    
    setCapturedPhoto(member.photo_url || null);
    setIsEditModalOpen(true);
  };

  const handleOpenRenew = (member: any) => {
    setSelectedMember(member);
    setRenewalData({
      plan_id: plans[0]?.id?.toString() || '',
      joining_date: new Date().toISOString().split('T')[0],
      amount_paid: plans[0]?.plan_price?.toString() || '0',
      payment_method: 'Cash',
    });
    setIsRenewModalOpen(true);
  };

  // Filter computation
  const filteredMembers = members.filter(member => {
    const searchLower = searchQuery.toLowerCase();
    const firstName = String(member.first_name || '').toLowerCase();
    const lastName = String(member.last_name || '').toLowerCase();
    const mobile = String(member.mobile_number || '');
    const matchesSearch = 
      firstName.includes(searchLower) ||
      lastName.includes(searchLower) ||
      mobile.includes(searchLower);

    if (!matchesSearch) return false;

    if (filter === 'active') return member.status === 'Active';
    if (filter === 'inactive') return member.status !== 'Active';
    if (filter === 'expired') return member.status === 'Expired';
    if (filter === 'unassigned') return member.status === 'Unassigned';
    
    if (filter === 'pending') {
      return member.has_pending_payment === true || (Number(member.balance_due) > 0);
    }

    return true;
  });

  const handleExportCSV = () => {
    if (filteredMembers.length === 0) {
      alert("No members to export!");
      return;
    }

    // Define the headers
    const headers = [
      "ID",
      "First Name",
      "Last Name",
      "Mobile Number",
      "Email",
      "Date of Birth",
      "Address",
      "Height (cm)",
      "Weight (kg)",
      "Fitness Goal",
      "Medical Notes",
      "Status",
      "Joined Date"
    ];

    // Map the members data to rows
    const rows = filteredMembers.map(m => [
      m.id,
      m.first_name || '',
      m.last_name || '',
      m.mobile_number || '',
      m.email || '',
      m.date_of_birth ? m.date_of_birth.split('T')[0] : '',
      m.address || '',
      m.height_cm || '',
      m.weight_kg || '',
      m.fitness_goal || '',
      m.medical_notes || '',
      m.status || '',
      m.created_at ? m.created_at.split('T')[0] : ''
    ]);

    // Create CSV content (escaping double quotes for safety)
    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `gym_members_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">Member Directory</h1>
          <p className="text-sm text-slate-500">Manage member enrollments, health logs, and plan assignments</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="btn-premium-secondary flex items-center space-x-2 text-sm border border-slate-200 dark:border-slate-800"
          >
            <Download className="w-5 h-5 text-amber-500" />
            <span>Export to CSV</span>
          </button>
          <button
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="btn-premium-primary flex items-center space-x-2 text-sm"
          >
            <Plus className="w-5 h-5" />
            <span>New Member Onboarding</span>
          </button>
        </div>
      </div>

      {/* Instant Filter Box search & status filters */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type name or mobile number..."
            className="input-premium !pl-10 py-2.5 text-sm"
          />
        </div>

        {/* Status badges bar */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {['all', 'active', 'inactive', 'pending', 'expired', 'unassigned'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                filter === f
                  ? 'bg-red-500 text-white shadow-md shadow-red-500/10'
                  : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Table - Desktop */}
      <div className="glass-card hidden md:block">
        <div className="overflow-x-visible">
          <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-800/80">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-550 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Member Name</th>
                <th className="px-6 py-4 text-left">Mobile & Email</th>
                <th className="px-6 py-4 text-left">Primary Plan</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-950 divide-y divide-slate-100 dark:divide-slate-850/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-550 dark:text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Loading gym profile records...</span>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-550 dark:text-slate-400">
                    No members match your criteria. Onboard a new member to begin!
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    onRenew={handleOpenRenew}
                    onPOS={(m) => {
                      // Navigate to POS and set member active
                      navigate(`/store?member_id=${m.id}`);
                    }}
                    onEdit={handleOpenEdit}
                    onDelete={handleDeleteMember}
                    onPrintReceipt={handlePrintLastInvoice}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Directory Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="glass-card p-8 text-center text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
            <span>Loading gym profile records...</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="glass-card p-8 text-center text-slate-500 dark:text-slate-400">
            No members match your criteria. Onboard a new member to begin!
          </div>
        ) : (
          filteredMembers.map((member) => {
            const isCorruptName = String(member.first_name) === '2';
            const displayName = isCorruptName 
              ? 'Walk-in Customer' 
              : `${member.first_name || ''} ${member.last_name || ''}`;
            
            const initials = (() => {
              const f = member.first_name ? String(member.first_name)[0] || '' : '';
              const l = member.last_name ? String(member.last_name)[0] || '' : '';
              return `${f}${l}`.toUpperCase();
            })();
            const displayInitials = isCorruptName ? 'WC' : initials;

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const photoUrl = member.photo_url
              ? member.photo_url.startsWith('http')
                ? member.photo_url
                : `${API_URL.replace('/api/v1', '')}${member.photo_url}`
              : null;

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
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-955/30 dark:text-rose-455 border border-rose-250 dark:border-rose-900/30">
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

            const getAvatarBg = () => {
              if (photoUrl) return '';
              switch (member.status) {
                case 'Active':
                  return 'bg-emerald-500/10 dark:bg-emerald-955/20 border border-emerald-200/30 dark:border-emerald-900/20';
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
              <div key={member.id} className="glass-card p-4 space-y-3.5 shadow-sm border border-slate-200/80 dark:border-slate-800/80">
                {/* Header info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center overflow-hidden font-black text-sm select-none ${getAvatarBg()}`}>
                      {photoUrl ? (
                        <img src={photoUrl} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <span className={getAvatarTextClass()}>{displayInitials}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">{displayName}</h4>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">Goal: {member.fitness_goal || 'General Fitness'}</p>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(member.status)}
                  </div>
                </div>

                {/* Details layout */}
                <div className="grid grid-cols-2 gap-3 py-2.5 border-y border-slate-100 dark:border-slate-800/80 text-[11px]">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-0.5">Contact Details</span>
                    <span className="font-bold text-slate-800 dark:text-slate-250 block">{member.mobile_number || 'N/A'}</span>
                    <span className="text-[9px] text-slate-550 dark:text-slate-450 truncate block max-w-[140px]">{member.email || 'No Email'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-0.5">Primary Plan</span>
                    <span className="font-bold text-slate-800 dark:text-slate-250 block truncate max-w-[140px]">{member.current_plan}</span>
                    <span className="text-[9px] text-rose-500 dark:text-rose-455 font-semibold block">
                      {member.expiry_date && !isNaN(Date.parse(member.expiry_date))
                        ? `Expires: ${new Date(member.expiry_date).toLocaleDateString('en-IN')}`
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons Grid */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-1 gap-2">
                    <button
                      onClick={() => handleOpenRenew(member)}
                      className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white dark:text-emerald-400 font-bold text-[9px] uppercase tracking-wide rounded-lg border border-emerald-500/20 hover:border-transparent transition-all cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Renew</span>
                    </button>
                    <button
                      onClick={() => navigate(`/store?member_id=${member.id}`)}
                      className="flex-1 py-2 bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white dark:text-amber-400 font-bold text-[9px] uppercase tracking-wide rounded-lg border border-amber-500/20 hover:border-transparent transition-all cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      <span>POS Shop</span>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePrintLastInvoice(member)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 rounded-lg transition-all cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-800"
                      title="Print Receipt"
                    >
                      <FileText className="w-3.5 h-3.5 text-violet-500" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(member)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 rounded-lg transition-all cursor-pointer flex items-center justify-center border border-slate-200 dark:border-slate-800"
                      title="Edit Member"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-all cursor-pointer flex items-center justify-center"
                      title="Delete Member"
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

      {/* ONBOARDING MODAL SLIDE-OVER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-white dark:bg-slate-950 w-full max-w-2xl h-full shadow-2xl flex flex-col relative border-l border-slate-200 dark:border-slate-800 transition-all duration-300">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Plus className="w-5 h-5 animate-pulse" />
                </span>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">Onboard New Member</h2>
              </div>
              <button
                onClick={() => { setIsAddModalOpen(false); resetForm(); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleOnboardSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {formError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center space-x-2 text-xs font-bold">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}



              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/80 pb-1.5 flex items-center">
                  <span className="w-1.5 h-3 bg-amber-500 rounded-sm mr-2"></span>
                  Personal Identity
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="e.g. Aman"
                      className="input-premium py-2.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="e.g. Sharma"
                      className="input-premium py-2.5 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">Mobile Number (10 Digits) *</label>
                    <input
                      type="tel"
                      required
                      value={formData.mobile_number}
                      onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="input-premium py-2.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="input-premium py-2.5 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. name@domain.com"
                      className="input-premium py-2.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">Residential Address</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Local street, city, state"
                      rows={2}
                      className="input-premium py-2.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Membership Plan & Payment configuration */}
              <div className="space-y-4 bg-slate-50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-150 dark:border-slate-800">
                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest pb-1.5 flex items-center space-x-1.5 border-b border-slate-150 dark:border-slate-800 pb-2 mb-2">
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  <span>Assign Membership & Payment Details</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Select Tier Plan</label>
                    <select
                      value={formData.plan_id}
                      onChange={(e) => {
                        const plan = plans.find(p => p.id.toString() === e.target.value);
                        setFormData({
                          ...formData,
                          plan_id: e.target.value,
                          amount_paid: plan ? plan.plan_price.toString() : ''
                        });
                      }}
                      className="input-premium py-2.5 text-xs font-semibold bg-white dark:bg-slate-950"
                    >
                      <option value="">No Plan Assigned (Unassigned status)</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.plan_name} (₹{p.plan_price} &bull; {p.duration_days} Days)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Joining Date</label>
                    <input
                      type="date"
                      value={formData.joining_date}
                      onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                      className="input-premium py-2.5 text-xs font-semibold bg-white dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Amount Paid (₹)</label>
                    <input
                      type="number"
                      value={formData.amount_paid}
                      onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                      placeholder="1500.00"
                      className="input-premium py-2.5 text-xs font-bold bg-white dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Payment Method</label>
                    {/* Visual Segmented Buttons instead of boring dropdown */}
                    <div className="grid grid-cols-3 gap-2">
                      {['Cash', 'UPI', 'Card'].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setFormData({ ...formData, payment_method: m })}
                          className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer border ${
                            formData.payment_method === m
                              ? 'bg-red-500 text-white border-red-600 shadow-md shadow-red-500/10'
                              : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </form>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3 bg-slate-50 dark:bg-slate-900/20">
              <button
                type="button"
                onClick={() => { setIsAddModalOpen(false); resetForm(); }}
                className="btn-premium-secondary text-xs py-2.5 px-5 border border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOnboardSubmit}
                className="btn-premium-primary text-xs py-2.5 px-7"
              >
                Onboard Profile
              </button>
            </div>

          </div>
        </div>
      )}        {/* EDIT MODAL SLIDE-OVER */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-white dark:bg-slate-950 w-full max-w-2xl h-full shadow-2xl flex flex-col relative border-l border-slate-200 dark:border-slate-800 transition-all duration-300">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse">
                  <Edit3 className="w-5 h-5" />
                </span>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">Edit Member Profile</h2>
              </div>
              <button
                onClick={() => { setIsEditModalOpen(false); resetForm(); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {formError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center space-x-2 text-xs font-bold">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}



              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/80 pb-1.5 flex items-center">
                  <span className="w-1.5 h-3 bg-amber-500 rounded-sm mr-2"></span>
                  Personal Identity
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="input-premium py-2.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="input-premium py-2.5 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      value={formData.mobile_number}
                      onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                      className="input-premium py-2.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="input-premium py-2.5 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-premium py-2.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">Residential Address</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={2}
                      className="input-premium py-2.5 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Health Logs */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/80 pb-1.5 flex items-center">
                  <span className="w-1.5 h-3 bg-amber-500 rounded-sm mr-2"></span>
                  Health Mapping
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">Height (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.height_cm}
                      onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                      className="input-premium py-2.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.weight_kg}
                      onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                      className="input-premium py-2.5 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">Fitness Goal</label>
                    <select
                      value={formData.fitness_goal}
                      onChange={(e) => setFormData({ ...formData, fitness_goal: e.target.value })}
                      className="input-premium py-2.5 text-xs font-bold bg-white dark:bg-slate-950"
                    >
                      <option>Weight Loss</option>
                      <option>Muscle Gain</option>
                      <option>Endurance</option>
                      <option>General Fitness</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">Medical Notes / Conditions</label>
                    <input
                      type="text"
                      value={formData.medical_notes}
                      onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                      placeholder="e.g. Hypertension, Asthma"
                      className="input-premium py-2.5 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/80 pb-1.5 flex items-center">
                  <span className="w-1.5 h-3 bg-amber-500 rounded-sm mr-2"></span>
                  Emergency Contact Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">Contact Name</label>
                    <input
                      type="text"
                      value={formData.emergency_name}
                      onChange={(e) => setFormData({ ...formData, emergency_name: e.target.value })}
                      className="input-premium py-2.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">Relation</label>
                    <input
                      type="text"
                      value={formData.emergency_relation}
                      onChange={(e) => setFormData({ ...formData, emergency_relation: e.target.value })}
                      className="input-premium py-2.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.emergency_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                      className="input-premium py-2.5 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

            </form>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3 bg-slate-50 dark:bg-slate-900/20">
              <button
                type="button"
                onClick={() => { setIsEditModalOpen(false); resetForm(); }}
                className="btn-premium-secondary text-xs py-2.5 px-5 border border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSubmit}
                className="btn-premium-primary text-xs py-2.5 px-7"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENEWAL MODAL */}
      {isRenewModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                <RefreshCw className="w-4 h-4 text-emerald-500" />
                <span>Renew Gym Access</span>
              </h2>
              <button
                onClick={() => { setIsRenewModalOpen(false); resetForm(); }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRenewalSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs flex items-center space-x-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Member details:</p>
                <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  {selectedMember?.first_name} {selectedMember?.last_name}
                </p>
                <p className="text-[10px] text-slate-500">Mobile: {selectedMember?.mobile_number}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Select Tier Plan</label>
                <select
                  value={renewalData.plan_id}
                  onChange={(e) => {
                    const plan = plans.find(p => p.id.toString() === e.target.value);
                    setRenewalData({
                      ...renewalData,
                      plan_id: e.target.value,
                      amount_paid: plan ? plan.plan_price.toString() : '0'
                    });
                  }}
                  className="input-premium py-2 text-xs"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.plan_name} (₹{p.plan_price} &bull; {p.duration_days} Days)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Start Date</label>
                <input
                  type="date"
                  value={renewalData.joining_date}
                  onChange={(e) => setRenewalData({ ...renewalData, joining_date: e.target.value })}
                  className="input-premium py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    value={renewalData.amount_paid}
                    onChange={(e) => setRenewalData({ ...renewalData, amount_paid: e.target.value })}
                    className="input-premium py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Payment Method</label>
                  <select
                    value={renewalData.payment_method}
                    onChange={(e) => setRenewalData({ ...renewalData, payment_method: e.target.value })}
                    className="input-premium py-2 text-xs"
                  >
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Card</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-red-600 via-red-500 to-rose-500 hover:from-red-700 hover:via-red-600 hover:to-rose-600 text-white font-bold rounded-xl text-xs shadow-md mt-4 cursor-pointer"
              >
                Confirm Renewal & Generate Invoice
              </button>
            </form>
          </div>
        </div>
      )}

      {/* A5 RECEIPT MODAL MODAL */}
      {activeReceiptId !== null && (
        <ReceiptModal invoiceId={activeReceiptId} onClose={() => setActiveReceiptId(null)} />
      )}

    </div>
  );
}
