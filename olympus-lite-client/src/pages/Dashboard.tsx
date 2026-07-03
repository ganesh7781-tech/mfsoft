import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, RefreshCw, ArrowUpRight, DollarSign, Dumbbell, ShoppingBag } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import api from '../services/api';
import DashboardMetrics from '../components/DashboardMetrics';

interface ExpiringMember {
  id: number;
  first_name: string;
  last_name: string;
  mobile_number: string;
  expiry_date: string;
  days_left: number;
}

interface Metrics {
  total_members: number;
  active_members: number;
  expired_members: number;
  pending_payments: number;
  membership_revenue_today: number;
  membership_revenue_month: number;
  store_revenue_today: number;
  store_revenue_month: number;
}

interface StoreSummary {
  today: number;
  month: number;
}

interface ChartData {
  date: string;
  revenue: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics>({
    total_members: 0,
    active_members: 0,
    expired_members: 0,
    pending_payments: 0,
    membership_revenue_today: 0,
    membership_revenue_month: 0,
    store_revenue_today: 0,
    store_revenue_month: 0,
  });
  const [expiringMembers, setExpiringMembers] = useState<ExpiringMember[]>([]);
  const [storeSummary, setStoreSummary] = useState<StoreSummary>({ today: 0, month: 0 });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentStorePurchases, setRecentStorePurchases] = useState<any[]>([]);
  
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const start = performance.now();
      
      const res = await api.get('/dashboard/summary');
      
      const duration = performance.now() - start;
      console.log(`Dashboard data loaded in ${duration.toFixed(2)}ms`);

      if (res.data.success) {
        setMetrics({
          total_members: res.data.metrics.total_members,
          active_members: res.data.metrics.active_members,
          expired_members: res.data.metrics.expired_members,
          pending_payments: res.data.metrics.pending_payments,
          membership_revenue_today: res.data.membership_sales_summary?.today || 0,
          membership_revenue_month: res.data.membership_sales_summary?.month || 0,
          store_revenue_today: res.data.store_sales_summary?.today || 0,
          store_revenue_month: res.data.store_sales_summary?.month || 0,
        });
        setExpiringMembers(res.data.expiring_soon || []);
        setStoreSummary(res.data.store_sales_summary || { today: 0, month: 0 });
        setChartData(res.data.chart_data || []);
      }

      // Let's get invoices from members details or setting backups
      // We can fetch invoices list directly. Wait! We have `GET /members` and settings routes.
      // Let's query recent invoices from settings backups or fetch all members.
      // Wait, in `store.js` or setting routes, we don't have list invoices, but we can query them from `/settings/backup` or filter from a quick fetch.
      // Let's do a quick fetch of recent invoices from settings backup, or just mock them beautifully if not found, or write a quick GET /invoices endpoint!
      // Wait! We can fetch all invoices using settings backup or by calling our settings backup JSON itself!
      // Yes, fetching settings backup fetches the entire raw JSON of all tables including invoices!
      // This is extremely simple and works perfectly because settings backup endpoint returns all invoices as a JSON structure.
      // Let's do a fetch of `/settings/backup` or handle it gracefully.
      // Wait! Let's check: does `/settings/backup` require admin token? Yes, it does.
      // Let's write the fetch logic.
      try {
        const backupRes = await api.get('/settings/backup');
        if (backupRes.data && backupRes.data.invoices) {
          const storeInvs = backupRes.data.invoices
            .filter((inv: any) => inv.invoice_type === 'Store')
            .slice(0, 5)
            .map((inv: any) => {
              const member = (backupRes.data.members || []).find((m: any) => m.id === inv.member_id) || {};
              return {
                id: inv.id,
                name: member.first_name ? `${member.first_name} ${member.last_name}` : 'Walk-In Customer',
                amount: parseFloat(inv.total_amount),
                method: inv.payment_method,
                status: inv.payment_status,
                time: new Date(inv.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
              };
            });
          setRecentStorePurchases(storeInvs);
        }
      } catch (err) {
        console.error("Error loading store purchase feed", err);
      }

    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMetricCardClick = (filterKey: string) => {
    if (filterKey === 'active' || filterKey === 'expired' || filterKey === 'all') {
      navigate(`/members?filter=${filterKey}`);
    } else if (filterKey === 'pending') {
      navigate(`/members?filter=pending`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">Command Center</h1>
          <p className="text-sm text-slate-500">Real-time facility tracking dashboard</p>
        </div>
        <button
          onClick={loadData}
          className="btn-premium-secondary flex items-center space-x-2 text-xs py-2 px-3 border border-slate-200 dark:border-slate-800"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <DashboardMetrics metrics={metrics} onCardClick={handleMetricCardClick} />

      {/* Dual Column Layout Grid Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Side: Expiring members widget */}
        <div className="glass-card p-6 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Expiring in 7 Days</h3>
            </div>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              {expiringMembers.length} Expiring
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {expiringMembers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Dumbbell className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                <p className="text-xs">No active memberships expiring this week!</p>
              </div>
            ) : (
              expiringMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => navigate(`/members?q=${member.mobile_number}`)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-150"
                >
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                      {member.first_name} {member.last_name}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Mob: {member.mobile_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-rose-500 dark:text-rose-400">
                      {member.days_left === 0 ? 'Expires Today' : `${member.days_left} Days Left`}
                    </p>
                    <p className="text-[9px] text-slate-555 dark:text-slate-500">Exp: {new Date(member.expiry_date).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Store Sales Summary Feed */}
        <div className="glass-card p-6 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Store Sales Summary</h3>
            </div>
            <div className="text-right text-[10px] text-slate-500 font-medium">
              Month: <span className="font-bold text-slate-800 dark:text-slate-200">₹{storeSummary.month.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {recentStorePurchases.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                <p className="text-xs">No store checkout transactions processed today</p>
              </div>
            ) : (
              recentStorePurchases.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">{inv.name}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Receipt: #{inv.id.toString().padStart(6, '0')} &bull; Method: {inv.method}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-amber-500">₹{inv.amount.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-500">{inv.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Analytics Chart */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">Revenue Timeline</h3>
            <p className="text-xs text-slate-500">Gross processed daily collection history (Last 7 Days)</p>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg">
            <ArrowUpRight className="w-4 h-4" />
            <span>Active Operations</span>
          </div>
        </div>

        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={(str) => {
                    const parts = str.split('-');
                    return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : str;
                  }}
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(51, 65, 85, 0.5)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                  formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">No chart details generated yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
