import { Users, UserCheck, UserX, DollarSign, Calendar, AlertTriangle, ShoppingCart, TrendingUp } from 'lucide-react';

interface MetricsProps {
  metrics: {
    total_members: number;
    active_members: number;
    expired_members: number;
    pending_payments: number;
    membership_revenue_today: number;
    membership_revenue_month: number;
    store_revenue_today: number;
    store_revenue_month: number;
  };
  onCardClick?: (filter: string) => void;
}

export default function DashboardMetrics({ metrics, onCardClick }: MetricsProps) {
  const cards = [
    {
      title: 'Total Members',
      value: metrics.total_members,
      icon: Users,
      color: 'from-blue-500 to-indigo-500',
      shadow: 'shadow-blue-500/5',
      filterKey: 'all',
    },
    {
      title: 'Active Members',
      value: metrics.active_members,
      icon: UserCheck,
      color: 'from-emerald-500 to-teal-500',
      shadow: 'shadow-emerald-500/5',
      filterKey: 'active',
    },
    {
      title: 'Expired Members',
      value: metrics.expired_members,
      icon: UserX,
      color: 'from-rose-500 to-pink-500',
      shadow: 'shadow-rose-500/5',
      filterKey: 'expired',
    },
    {
      title: 'Pending Payments',
      value: `₹${metrics.pending_payments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: AlertTriangle,
      color: 'from-yellow-500 to-amber-500',
      shadow: 'shadow-yellow-500/5',
      filterKey: 'pending',
    },
    {
      title: 'Membership Today',
      value: `₹${metrics.membership_revenue_today.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'from-orange-500 via-amber-500 to-yellow-500',
      shadow: 'shadow-orange-500/5',
      filterKey: 'revenue-today',
    },
    {
      title: 'Membership Month',
      value: `₹${metrics.membership_revenue_month.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: Calendar,
      color: 'from-violet-500 to-purple-500',
      shadow: 'shadow-violet-500/5',
      filterKey: 'revenue-month',
    },
    {
      title: 'Store POS Today',
      value: `₹${metrics.store_revenue_today.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'from-emerald-500 to-cyan-500',
      shadow: 'shadow-cyan-500/5',
      filterKey: 'store-today',
    },
    {
      title: 'Store POS Month',
      value: `₹${metrics.store_revenue_month.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: ShoppingCart,
      color: 'from-fuchsia-500 to-pink-500',
      shadow: 'shadow-fuchsia-500/5',
      filterKey: 'store-month',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            onClick={() => onCardClick && onCardClick(card.filterKey)}
            className={`glass-card glass-card-hover p-5 cursor-pointer flex items-center justify-between shadow-sm border border-slate-200/80 dark:border-slate-800/80 ${card.shadow}`}
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{card.title}</p>
              <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {card.value}
              </h3>
            </div>
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-sm`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
