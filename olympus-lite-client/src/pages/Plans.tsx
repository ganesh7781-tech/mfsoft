import { useEffect, useState } from 'react';
import { Plus, CreditCard, Edit3, X, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';

interface Plan {
  id: number;
  plan_name: string;
  duration_days: number;
  plan_price: number;
  is_active: boolean;
}

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals / forms state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const [formData, setFormData] = useState({
    plan_name: '',
    duration_days: '',
    plan_price: '',
  });

  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/plans');
      if (res.data.success) {
        setPlans(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!formData.plan_name || !formData.duration_days || !formData.plan_price) {
      setFormError('All fields are required.');
      return;
    }

    try {
      const res = await api.post('/plans', {
        plan_name: formData.plan_name,
        duration_days: parseInt(formData.duration_days),
        plan_price: parseFloat(formData.plan_price),
      });

      if (res.data.success) {
        setSuccessMsg('Plan created successfully!');
        setIsAddOpen(false);
        resetForm();
        loadPlans();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create plan.');
    }
  };

  const handleEditPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!selectedPlan) return;

    try {
      const res = await api.put(`/plans/${selectedPlan.id}`, {
        plan_name: formData.plan_name,
        duration_days: parseInt(formData.duration_days),
        plan_price: parseFloat(formData.plan_price),
      });

      if (res.data.success) {
        setSuccessMsg('Plan updated successfully!');
        setIsEditOpen(false);
        resetForm();
        loadPlans();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to update plan.');
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    try {
      const res = await api.put(`/plans/${plan.id}`, {
        is_active: !plan.is_active,
      });
      if (res.data.success) {
        loadPlans();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({ plan_name: '', duration_days: '', plan_price: '' });
    setSelectedPlan(null);
  };

  const openEdit = (plan: Plan) => {
    setSelectedPlan(plan);
    setFormData({
      plan_name: plan.plan_name,
      duration_days: plan.duration_days.toString(),
      plan_price: plan.plan_price.toString(),
    });
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">Membership Plans Matrix</h1>
          <p className="text-sm text-slate-500">Configure core access durations and customized dynamic tiers</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsAddOpen(true); }}
          className="btn-premium-primary flex items-center space-x-2 text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Add Custom Promotion Tier</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 rounded-xl flex items-center space-x-2 text-xs font-bold">
          <CheckCircle className="w-4.5 h-4.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Plans List Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mb-2 text-amber-500" />
          <span>Loading membership configs...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`glass-card p-4 border flex flex-col justify-between h-40 relative ${
                plan.is_active ? 'border-slate-200 dark:border-slate-800' : 'opacity-60 border-slate-150'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1">{plan.plan_name}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">{plan.duration_days} Days Validity</p>
                </div>
                <span className={`px-2 py-0.5 text-[8px] font-bold rounded-full uppercase tracking-wider ${
                  plan.is_active 
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/30' 
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {plan.is_active ? 'Active' : 'Disabled'}
                </span>
              </div>

              {/* Price Details */}
              <div className="my-2 flex items-baseline">
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">₹{parseFloat(plan.plan_price.toString()).toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-slate-450 dark:text-slate-500 ml-1 font-medium">/ term</span>
              </div>

              {/* Actions footer */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                <button
                  onClick={() => openEdit(plan)}
                  className="text-[10px] text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 font-bold transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Rate</span>
                </button>

                <button
                  onClick={() => handleToggleActive(plan)}
                  className={`text-[10px] font-bold transition-colors cursor-pointer ${
                    plan.is_active 
                      ? 'text-rose-500 hover:text-rose-600' 
                      : 'text-emerald-500 hover:text-emerald-600'
                  }`}
                >
                  {plan.is_active ? 'Deactivate' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT PLAN MODAL */}
      {(isAddOpen || isEditOpen) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                <CreditCard className="w-4 h-4 text-amber-500" />
                <span>{isAddOpen ? 'Add Membership Plan' : 'Edit Plan Details'}</span>
              </h2>
              <button
                onClick={() => { isAddOpen ? setIsAddOpen(false) : setIsEditOpen(false); resetForm(); }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={isAddOpen ? handleCreatePlan : handleEditPlan} className="p-6 space-y-4">
              
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs flex items-center space-x-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  value={formData.plan_name}
                  onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                  placeholder="e.g. Premium Annual Promotion"
                  className="input-premium py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase mb-1">Duration Validity (Days) *</label>
                <input
                  type="number"
                  required
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                  placeholder="e.g. 365"
                  className="input-premium py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase mb-1">Selling Rate price (₹) *</label>
                <input
                  type="number"
                  required
                  value={formData.plan_price}
                  onChange={(e) => setFormData({ ...formData, plan_price: e.target.value })}
                  placeholder="e.g. 12500"
                  className="input-premium py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-red-600 via-red-500 to-rose-500 hover:from-red-700 hover:via-red-600 hover:to-rose-600 text-white font-bold rounded-xl text-xs shadow-md mt-4 cursor-pointer"
              >
                {isAddOpen ? 'Create Membership Plan' : 'Save Plan Configuration'}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
