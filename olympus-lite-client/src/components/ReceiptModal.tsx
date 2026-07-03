import { useEffect, useState } from 'react';
import { X, Printer } from 'lucide-react';
import api from '../services/api';

interface ReceiptModalProps {
  invoiceId: number | null;
  onClose: () => void;
}

interface InvoiceDetail {
  id: number;
  member_id: number;
  first_name: string;
  last_name: string;
  mobile_number: string;
  invoice_type: 'Membership' | 'Store';
  total_amount: number;
  tax_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_method: string;
  payment_status: string;
  due_date: string | null;
  created_at: string;
}

interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface GymProfile {
  gym_name: string;
  logo_url: string | null;
  contact_phone: string;
  address: string;
  tax_percentage: number;
  receipt_footer_text: string;
}

export default function ReceiptModal({ invoiceId, onClose }: ReceiptModalProps) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [gym, setGym] = useState<GymProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) return;

    api.get('/settings')
      .then(res => {
        setGym(res.data.data);
      })
      .catch(err => {
        console.error("Error fetching settings for receipt", err);
      });
  }, [invoiceId]);

  // Let's write the fetch in a very robust way. Let's make sure our backend has a route:
  // GET `/settings/invoices/:id`
  // Returns `{ success: true, invoice, items }`.
  // Let's do this first! We will update `settings.js` backend file to include this endpoint.
  // Wait, let's write the React component to assume this API exists.
  
  const handlePrint = () => {
    window.print();
  };

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const logoPath = gym?.logo_url
    ? gym.logo_url.startsWith('http')
      ? gym.logo_url
      : `${API_URL.replace('/api/v1', '')}${gym.logo_url}`
    : null;

  useEffect(() => {
    if (invoiceId) {
      api.get(`/settings/invoices/${invoiceId}`)
        .then(res => {
          setInvoice(res.data.invoice);
          setItems(res.data.items);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching receipt details via endpoint", err);
          setLoading(false);
        });
    }
  }, [invoiceId]);

  if (!invoiceId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-950 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden print:shadow-none print:border-none">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 print:hidden">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Print Receipt</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors duration-150 cursor-pointer flex items-center space-x-1"
            >
              <Printer className="w-4 h-4" />
              <span className="text-xs font-semibold">Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg transition-colors duration-150 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Container */}
        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading receipt details...</div>
        ) : !invoice ? (
          <div className="p-8 text-center text-red-500">Failed to load invoice details.</div>
        ) : (
          <div id="print-receipt-modal" className="p-8 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950 font-mono text-xs">
            {/* Gym Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4 mb-4">
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white uppercase mb-1">
                  {gym?.gym_name || "Olympus Gym"}
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[250px] leading-tight">
                  {gym?.address || "Mount Olympus Base Camp"}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Phone: {gym?.contact_phone || "N/A"}
                </p>
              </div>
              <div className="text-right">
                {logoPath ? (
                  <img src={logoPath} alt="Gym Logo" className="h-10 w-auto object-contain mb-2 ml-auto" />
                ) : (
                  <div className="text-amber-500 font-extrabold text-base tracking-wider mb-2 uppercase">OLYMPUS</div>
                )}
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Date: {new Date(invoice.created_at).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Bill Details */}
            <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-100">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Billed To:</p>
                <p className="font-bold text-slate-900 dark:text-white">
                  {invoice.first_name} {invoice.last_name}
                </p>
                <p className="text-slate-500">Mobile: {invoice.mobile_number}</p>
                <p className="text-slate-500">Member ID: #{invoice.member_id || 'Walk-In'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Receipt Info:</p>
                <p className="font-bold text-slate-900 dark:text-white">#{invoice.id.toString().padStart(6, '0')}</p>
                <p className="text-slate-500">Type: {invoice.invoice_type}</p>
                <p className="text-slate-500">Method: {invoice.payment_method}</p>
              </div>
            </div>

            {/* Itemized Table */}
            <table className="w-full text-left mb-6">
              <thead>
                <tr className="border-b border-slate-200 text-slate-450 text-[10px] uppercase font-semibold">
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Rate</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-2 font-medium">{item.description}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">₹{parseFloat(item.unit_price.toString()).toFixed(2)}</td>
                    <td className="py-2 text-right">₹{parseFloat(item.total_price.toString()).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Breakdown */}
            <div className="flex justify-end mb-6">
              <div className="w-48 text-right space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>₹{parseFloat((invoice.total_amount - invoice.tax_amount).toString()).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GST ({gym?.tax_percentage || 0}%):</span>
                  <span>₹{parseFloat(invoice.tax_amount.toString()).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-slate-900 dark:text-white font-bold text-sm">
                  <span>Net Total:</span>
                  <span>₹{parseFloat(invoice.total_amount.toString()).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Paid:</span>
                  <span>₹{parseFloat(invoice.amount_paid.toString()).toFixed(2)}</span>
                </div>
                {invoice.balance_due > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-450 font-bold border-t border-dashed border-slate-200 pt-1">
                    <span>Balance Due:</span>
                    <span>₹{parseFloat(invoice.balance_due.toString()).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Footer */}
            <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
              <p className="font-semibold mb-1">{gym?.receipt_footer_text || "Focus. Commit. Achieve."}</p>
              <p>This is a computer generated receipt. No signature required.</p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
