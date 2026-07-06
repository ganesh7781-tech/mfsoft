import { useEffect, useState } from 'react';
import { Save, Download, Upload, ShieldAlert, CheckCircle, RefreshCw, Dumbbell, ShieldCheck, HelpCircle, FileText } from 'lucide-react';
import api from '../services/api';

export default function Settings() {
  const [gymData, setGymData] = useState({
    gym_name: '',
    contact_phone: '',
    address: '',
    tax_percentage: '18.00',
    receipt_footer_text: '',
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Restore file
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data.success && res.data.data) {
        const data = res.data.data;
        setGymData({
          gym_name: data.gym_name || '',
          contact_phone: data.contact_phone || '',
          address: data.address || '',
          tax_percentage: data.tax_percentage !== undefined ? data.tax_percentage.toString() : '18.00',
          receipt_footer_text: data.receipt_footer_text || '',
        });
        setLogoPreview(data.logo_url || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSaving(true);

    const formData = new FormData();
    formData.append('gym_name', gymData.gym_name);
    formData.append('contact_phone', gymData.contact_phone);
    formData.append('address', gymData.address);
    formData.append('tax_percentage', gymData.tax_percentage);
    formData.append('receipt_footer_text', gymData.receipt_footer_text);
    if (selectedFile) {
      formData.append('logo', selectedFile);
    }

    try {
      const res = await api.put('/settings', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        setSuccessMsg('Gym configuration profile saved successfully!');
        loadSettings();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportBackup = () => {
    const token = localStorage.getItem('olympus_token');
    // Direct link trigger to server download endpoint
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    const downloadUrl = `${API_URL}/settings/backup?token=${token}`;
    
    // Create direct download trigger
    const link = document.createElement('a');
    link.href = downloadUrl;
    // Embed authorization header inside download URL query or use fetch
    // To make sure JWT headers are passed, let's fetch using Axios as a blob!
    // This is much safer and respects authorization tokens.
    api.get('/settings/backup', { responseType: 'blob' })
      .then(res => {
        const blob = new Blob([res.data], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `olympus_lite_backup_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        setSuccessMsg('Database state exported successfully!');
      })
      .catch(err => {
        console.error("Backup download failed", err);
        setErrorMsg('Failed to download system database backup.');
      });
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/members');
      if (!res.data.success) {
        throw new Error('Failed to fetch members data');
      }
      const membersList = res.data.data;

      // Define CSV Headers
      const headers = [
        'Member ID',
        'Full Name',
        'Mobile Number',
        'Email Address',
        'Residential Address',
        'Status',
        'Assigned Plan',
        'Joining Date',
        'Expiry (Ending) Date',
        'Total Balance Due (Pending)'
      ];

      // Format Rows
      const csvRows = [headers.join(',')];

      for (const m of membersList) {
        const row = [
          m.id,
          `"${m.first_name || ''} ${m.last_name || ''}"`,
          `"${m.mobile_number || ''}"`,
          `"${m.email || ''}"`,
          `"${(m.address || '').replace(/"/g, '""')}"`,
          m.status || 'Unassigned',
          `"${m.current_plan || 'No Plan'}"`,
          m.joining_date ? new Date(m.joining_date).toLocaleDateString('en-IN') : 'N/A',
          m.expiry_date ? new Date(m.expiry_date).toLocaleDateString('en-IN') : 'N/A',
          m.balance_due !== undefined ? m.balance_due : 0
        ];

        csvRows.push(row.join(','));
      }

      const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for Excel readability
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `olympus_gym_members_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setSuccessMsg('Members spreadsheet report downloaded successfully!');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to generate spreadsheet export.');
    }
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!restoreFile) {
      setErrorMsg('Please select a valid backup JSON file first.');
      return;
    }

    if (!window.confirm('WARNING: Restoring database state clears and overwrites all existing profiles, plans, store sales ledgers, and inventory counts. Do you wish to proceed?')) {
      return;
    }

    setRestoring(true);
    const formData = new FormData();
    formData.append('backup_file', restoreFile);

    try {
      const res = await api.post('/settings/restore', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        setSuccessMsg('System database state restored successfully. Sync complete!');
        setRestoreFile(null);
        // Clear input element
        const fileInput = document.getElementById('restore-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        loadSettings();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Restore procedure failed. Ensure JSON backup file is valid.');
    } finally {
      setRestoring(false);
    }
  };

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const logoUrl = logoPreview
    ? logoPreview.startsWith('blob') || logoPreview.startsWith('http')
      ? logoPreview
      : `${API_URL.replace('/api/v1', '')}${logoPreview}`
    : null;

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex items-center space-x-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">System Settings</h1>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 rounded-xl flex items-center space-x-2 text-xs font-bold">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center space-x-2 text-xs font-bold">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Gym Profile Settings Form) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
              Gym Details Configuration
            </h3>

            {loading ? (
              <div className="text-center py-6 text-slate-550">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                <span>Loading configuration profile...</span>
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-4">
                
                {/* Logo Uploader */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase mb-2">Gym Logo Brand</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <Dumbbell className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-350 hover:file:bg-slate-200 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase mb-1">Gym Corporate Name *</label>
                    <input
                      type="text"
                      required
                      value={gymData.gym_name}
                      onChange={(e) => setGymData({ ...gymData, gym_name: e.target.value })}
                      className="input-premium py-2.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase mb-1">Primary Hotline Contact *</label>
                    <input
                      type="tel"
                      required
                      value={gymData.contact_phone}
                      onChange={(e) => setGymData({ ...gymData, contact_phone: e.target.value })}
                      className="input-premium py-2.5 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase mb-1">Physical Address</label>
                  <input
                    type="text"
                    value={gymData.address}
                    onChange={(e) => setGymData({ ...gymData, address: e.target.value })}
                    className="input-premium py-2.5 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase mb-1">Flat Tax percentage (GST %)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={gymData.tax_percentage}
                      onChange={(e) => setGymData({ ...gymData, tax_percentage: e.target.value })}
                      className="input-premium py-2.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase mb-1">Receipt FOOTER footer text</label>
                    <input
                      type="text"
                      value={gymData.receipt_footer_text}
                      onChange={(e) => setGymData({ ...gymData, receipt_footer_text: e.target.value })}
                      className="input-premium py-2.5 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn-premium-primary text-xs py-2 px-6 flex items-center space-x-1.5 cursor-pointer mt-6"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving Config...' : 'Save Configuration'}</span>
                </button>

              </form>
            )}
          </div>
        </div>

        {/* Right Column (Backup & Restore Panel) */}
        <div className="space-y-6">
          
          {/* Backup Box */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-1.5">
              <ShieldCheck className="w-4.5 h-4.5 text-amber-500" />
              <span>Security Database Backups</span>
            </h3>
            <p className="text-xs text-slate-500 leading-normal mb-6">
              Export the entire state of the application database (members list, plans, invoices ledger, inventory records) into a secure, single backup file.
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleExportBackup}
                className="btn-premium-secondary w-full py-2.5 text-xs border border-slate-200 dark:border-slate-800 flex items-center justify-center space-x-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                <Download className="w-4 h-4 text-amber-500" />
                <span>Export System JSON Backup</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full py-2.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center space-x-2 cursor-pointer transition-all shadow-md shadow-emerald-500/10"
              >
                <FileText className="w-4 h-4 text-white" />
                <span>Download Spreadsheet (Excel/CSV)</span>
              </button>
            </div>
          </div>

          {/* Restore Box */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-1.5">
              <Upload className="w-4.5 h-4.5 text-rose-500" />
              <span>Restore Database State</span>
            </h3>
            <p className="text-xs text-slate-500 leading-normal mb-6">
              Upload a previously exported JSON backup file to restore the database to that snapshot.
            </p>
            <form onSubmit={handleRestoreSubmit} className="space-y-4">
              <div>
                <input
                  id="restore-file-input"
                  type="file"
                  accept=".json"
                  required
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setRestoreFile(e.target.files[0]);
                    }
                  }}
                  className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-350 hover:file:bg-slate-250 cursor-pointer w-full"
                />
              </div>

              <button
                type="submit"
                disabled={restoring}
                className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs shadow-md active:scale-[0.99] transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {restoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Restoring Database State...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Restore Backup State</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Help Box */}
          <div className="glass-card p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-xs">
            <div className="flex items-start space-x-2 text-amber-600 dark:text-amber-400">
              <HelpCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold mb-1">PostgreSQL Backup Support</h5>
                <p className="leading-normal">
                  If the server is configured with PostgreSQL environment keys, the backup tool will restore directly into your PostgreSQL tables inside transaction statements. If running in fallback mode, the JSON file state is replaced.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
