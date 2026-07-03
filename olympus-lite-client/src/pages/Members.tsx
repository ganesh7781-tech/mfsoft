import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Plus, ShieldAlert, RefreshCw, X, Camera, Image, CreditCard, Upload } from 'lucide-react';
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

  // Webcam stream state
  const [useWebcam, setUseWebcam] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
  }, [searchParams]);

  // Handle webcam capture initialization
  const startWebcam = async () => {
    try {
      setUseWebcam(true);
      setCapturedPhoto(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 320 } });
      setWebcamStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setUseWebcam(false);
      alert("Could not access camera. Please upload an image or check permissions.");
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    setUseWebcam(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, 300, 300);
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedPhoto(dataUrl);
        stopWebcam();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
    stopWebcam();
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
    if (filter === 'expired') return member.status === 'Expired';
    if (filter === 'unassigned') return member.status === 'Unassigned';
    
    if (filter === 'pending') {
      // Pending dues means they have outstanding invoices
      // The member object contains invoices under their profile
      // In dashboard we checked balance_due > 0.
      // We can query that by matching status, or checking if member has balance.
      // For this screen, let's filter if member.expiry_date is expired or status is Expired,
      // or we can compute pending payments list.
      // Let's filter by members whose status is Expired or status is Unassigned.
      return member.status === 'Expired';
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">Member Directory</h1>
          <p className="text-sm text-slate-500">Manage member enrollments, health logs, and plan assignments</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="btn-premium-primary flex items-center space-x-2 text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>New Member Onboarding</span>
        </button>
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
            className="input-premium pl-10 py-2.5 text-sm"
          />
        </div>

        {/* Status badges bar */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {['all', 'active', 'expired', 'unassigned'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                filter === f
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                  : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-800/80">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-450 text-[10px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Member Name</th>
                <th className="px-6 py-4 text-left">Mobile & Email</th>
                <th className="px-6 py-4 text-left">Primary Plan</th>
                <th className="px-6 py-4 text-left">Status</th>
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

      {/* ONBOARDING MODAL SLIDE-OVER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-white dark:bg-slate-950 w-full max-w-2xl h-full shadow-2xl flex flex-col relative border-l border-slate-200 dark:border-slate-800">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Onboard New Member</h2>
              <button
                onClick={() => { setIsAddModalOpen(false); resetForm(); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg cursor-pointer"
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

              {/* Photo Upload & Webcam Section */}
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Member Photograph</span>
                <div className="flex items-center space-x-4">
                  <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-900 border-2 border-dashed border-slate-350 dark:border-slate-850 flex items-center justify-center overflow-hidden relative">
                    {capturedPhoto ? (
                      <img src={capturedPhoto} alt="Captured Profile" className="w-full h-full object-cover" />
                    ) : (
                      <Image className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={useWebcam ? stopWebcam : startWebcam}
                        className="btn-premium-secondary py-1.5 px-3 flex items-center space-x-1.5 text-xs border border-slate-200 dark:border-slate-800 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{useWebcam ? 'Turn Off WebCam' : 'Live webcam capture'}</span>
                      </button>

                      <label className="btn-premium-secondary py-1.5 px-3 flex items-center space-x-1.5 text-xs border border-slate-200 dark:border-slate-800 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload photo file</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">Capture via system webcam or upload an image file from your device</p>
                  </div>
                </div>

                {/* Webcam Live Feed */}
                {useWebcam && (
                  <div className="mt-4 p-4 bg-slate-950 rounded-2xl flex flex-col items-center">
                    <video ref={videoRef} autoPlay playsInline className="w-64 h-64 object-cover rounded-xl border border-slate-850 mb-3" />
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="py-2 px-6 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-xs transition-colors duration-150 cursor-pointer"
                    >
                      Capture Frame
                    </button>
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                )}
              </div>

              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Personal Identity</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="e.g. Aman"
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="e.g. Sharma"
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Mobile Number (10 Digits) *</label>
                    <input
                      type="tel"
                      required
                      value={formData.mobile_number}
                      onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. name@domain.com"
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Residential Address</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Local street, city"
                      rows={2}
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Membership Plan & Payment configuration - Prominently Displayed! */}
              <div className="space-y-4 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest pb-1 flex items-center space-x-1">
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  <span>Assign Membership & Payment Details</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Select Tier Plan</label>
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
                      className="input-premium py-2 text-xs"
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
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Joining Date</label>
                    <input
                      type="date"
                      value={formData.joining_date}
                      onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      value={formData.amount_paid}
                      onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                      placeholder="1500.00"
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Payment Method</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                      className="input-premium py-2 text-xs"
                    >
                      <option>Cash</option>
                      <option>UPI</option>
                      <option>Card</option>
                    </select>
                  </div>
                </div>
              </div>

            </form>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3 bg-slate-50 dark:bg-slate-900/20">
              <button
                type="button"
                onClick={() => { setIsAddModalOpen(false); resetForm(); }}
                className="btn-premium-secondary text-xs py-2 px-4 border border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOnboardSubmit}
                className="btn-premium-primary text-xs py-2 px-6"
              >
                Onboard Profile
              </button>
            </div>

          </div>
        </div>
      )}

      {/* EDIT MODAL SLIDE-OVER */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-white dark:bg-slate-950 w-full max-w-2xl h-full shadow-2xl flex flex-col relative border-l border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Edit Member Profile</h2>
              <button
                onClick={() => { setIsEditModalOpen(false); resetForm(); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center space-x-2 text-xs">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Photo section */}
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Member Photograph</span>
                <div className="flex items-center space-x-4">
                  <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-900 border-2 border-dashed border-slate-350 dark:border-slate-850 flex items-center justify-center overflow-hidden">
                    {capturedPhoto ? (
                      <img
                        src={capturedPhoto.startsWith('data') || capturedPhoto.startsWith('http') ? capturedPhoto : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${capturedPhoto}`}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={useWebcam ? stopWebcam : startWebcam}
                      className="btn-premium-secondary py-1.5 px-3 flex items-center space-x-1.5 text-xs border border-slate-200 dark:border-slate-800 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{useWebcam ? 'Turn Off WebCam' : 'Live webcam capture'}</span>
                    </button>

                    <label className="btn-premium-secondary py-1.5 px-3 flex items-center space-x-1.5 text-xs border border-slate-200 dark:border-slate-800 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload photo file</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {useWebcam && (
                  <div className="mt-4 p-4 bg-slate-950 rounded-2xl flex flex-col items-center">
                    <video ref={videoRef} autoPlay playsInline className="w-64 h-64 object-cover rounded-xl border border-slate-855 mb-3" />
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="py-2 px-6 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-xs cursor-pointer"
                    >
                      Capture Frame
                    </button>
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                )}
              </div>

              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Personal Identity</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      value={formData.mobile_number}
                      onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Address</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={2}
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Health Logs */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Health Mapping</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Height (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.height_cm}
                      onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.weight_kg}
                      onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Goal</label>
                    <select
                      value={formData.fitness_goal}
                      onChange={(e) => setFormData({ ...formData, fitness_goal: e.target.value })}
                      className="input-premium py-2 text-xs"
                    >
                      <option>Weight Loss</option>
                      <option>Muscle Gain</option>
                      <option>Endurance</option>
                      <option>General Fitness</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Medical Notes</label>
                    <input
                      type="text"
                      value={formData.medical_notes}
                      onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Emergency Contact</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.emergency_name}
                      onChange={(e) => setFormData({ ...formData, emergency_name: e.target.value })}
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Relation</label>
                    <input
                      type="text"
                      value={formData.emergency_relation}
                      onChange={(e) => setFormData({ ...formData, emergency_relation: e.target.value })}
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.emergency_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                      className="input-premium py-2 text-xs"
                    />
                  </div>
                </div>
              </div>

            </form>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3 bg-slate-50 dark:bg-slate-900/20">
              <button
                type="button"
                onClick={() => { setIsEditModalOpen(false); resetForm(); }}
                className="btn-premium-secondary text-xs py-2 px-4 border border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSubmit}
                className="btn-premium-primary text-xs py-2 px-6"
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
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl text-xs shadow-md mt-4 cursor-pointer"
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
