import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingCart, Trash2, ShieldAlert, User, Plus, Minus, Tag, CheckCircle, RefreshCw, X } from 'lucide-react';
import api from '../services/api';
import ReceiptModal from '../components/ReceiptModal';
import confetti from 'canvas-confetti';

interface Product {
  id: number;
  product_name: string;
  category: string;
  cost_price: number;
  selling_price: number;
  stock_qty: number;
  low_stock_threshold: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Member {
  id: number;
  first_name: string;
  last_name: string;
  mobile_number: string;
}

export default function StorePOS() {
  const [searchParams] = useSearchParams();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // POS State
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [amountPaid, setAmountPaid] = useState('');
  const [taxPercentage, setTaxPercentage] = useState(18); // Default 18% fallback
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [checkoutError, setCheckoutError] = useState('');
  const [activeReceiptId, setActiveReceiptId] = useState<number | null>(null);

  const loadStoreData = async () => {
    try {
      setLoading(true);
      const prodRes = await api.get('/store/products');
      setProducts(prodRes.data.data);

      const memRes = await api.get('/members');
      setMembers(memRes.data.data);

      const settingsRes = await api.get('/settings');
      if (settingsRes.data.data && settingsRes.data.data.tax_percentage !== undefined) {
        setTaxPercentage(parseFloat(settingsRes.data.data.tax_percentage));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStoreData();

    // Check if member ID was passed from dashboard/member directory
    const memberIdParam = searchParams.get('member_id');
    if (memberIdParam) {
      api.get(`/members/${memberIdParam}`)
        .then(res => {
          if (res.data.success) {
            setSelectedMember(res.data.data);
          }
        })
        .catch(() => {});
    }
  }, [searchParams]);

  const addToCart = (product: Product) => {
    setCheckoutError('');
    if (product.stock_qty <= 0) {
      setCheckoutError(`Cannot add '${product.product_name}'. Out of stock!`);
      return;
    }

    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    if (existingIndex !== -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= product.stock_qty) {
        setCheckoutError(`Cannot add more of '${product.product_name}'. Available stock is ${product.stock_qty}.`);
        return;
      }
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateCartQty = (productId: number, qty: number) => {
    setCheckoutError('');
    const newCart = [...cart];
    const index = newCart.findIndex(item => item.product.id === productId);
    if (index === -1) return;

    const maxStock = newCart[index].product.stock_qty;
    
    if (qty > maxStock) {
      setCheckoutError(`Cannot select ${qty} items. Only ${maxStock} in stock for '${newCart[index].product.product_name}'.`);
      return;
    }

    if (qty <= 0) {
      newCart.splice(index, 1);
    } else {
      newCart[index].quantity = qty;
    }
    setCart(newCart);
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  // Cart calculations
  const calculateTotals = () => {
    let subtotal = 0;
    cart.forEach(item => {
      subtotal += item.product.selling_price * item.quantity;
    });

    const discountAmount = (subtotal * discountPercent) / 100;
    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = (discountedSubtotal * taxPercentage) / 100;
    const total = discountedSubtotal + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total
    };
  };

  const { subtotal, discountAmount, taxAmount, total } = calculateTotals();

  // Auto-fill amount paid
  useEffect(() => {
    setAmountPaid(total.toFixed(2));
  }, [total]);

  // Checkout submission
  const handleCheckoutSubmit = async () => {
    setCheckoutError('');
    if (cart.length === 0) {
      setCheckoutError('Your POS cart is currently empty.');
      return;
    }

    const payload = {
      member_id: selectedMember?.id || null, // Nullable is okay for walk-ins
      payment_method: paymentMethod,
      amount_paid: parseFloat(amountPaid) || total,
      items: cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.selling_price
      }))
    };

    try {
      const res = await api.post('/store/checkout', payload);
      if (res.data.success) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 } });
        setCart([]);
        setSelectedMember(null);
        setMemberSearch('');
        setDiscountPercent(0);
        loadStoreData(); // Refresh product stock levels
        setActiveReceiptId(res.data.invoice_id); // Immediately open receipt
      }
    } catch (err: any) {
      console.error(err);
      setCheckoutError(err.response?.data?.message || 'Checkout failed. Verify transaction details.');
    }
  };

  // Filtered members list for lookup dropdown
  const searchedMembers = members.filter(m => {
    const searchLower = memberSearch.toLowerCase();
    const firstName = String(m.first_name || '').toLowerCase();
    const lastName = String(m.last_name || '').toLowerCase();
    const mobile = String(m.mobile_number || '');
    return firstName.includes(searchLower) ||
           lastName.includes(searchLower) ||
           mobile.includes(searchLower);
  });

  const categories = ['all', 'Supplements', 'Drinks', 'Apparel', 'Equipment'];
  const filteredProducts = categoryFilter === 'all'
    ? products
    : products.filter(p => p.category === categoryFilter);

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">Retail POS Checkout</h1>
          <p className="text-sm text-slate-500">Record retail sales, supplement purchases, and handle product checkout</p>
        </div>
      </div>

      {checkoutError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center space-x-2 text-xs font-bold">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{checkoutError}</span>
        </div>
      )}

      {/* POS Double-column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns (Products Catalog) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Categories select strip */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-505 dark:text-slate-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Items Grid */}
          {loading ? (
            <div className="text-center py-12 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
              <span>Syncing product inventory...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="glass-card p-12 text-center text-slate-400">
              No products found in this category.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map(prod => {
                const isLowStock = prod.stock_qty <= prod.low_stock_threshold;
                const outOfStock = prod.stock_qty <= 0;
                
                return (
                  <div
                    key={prod.id}
                    onClick={() => !outOfStock && addToCart(prod)}
                    className={`glass-card p-4 flex flex-col justify-between h-44 cursor-pointer relative select-none ${
                      outOfStock
                        ? 'opacity-40 border-red-500 bg-red-500/5'
                        : isLowStock
                        ? 'border-yellow-500/40 hover:border-yellow-500/60'
                        : 'glass-card-hover'
                    }`}
                  >
                    <div>
                      <span className="text-[9px] font-bold text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded-md">
                        {prod.category}
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-tight mt-2.5 line-clamp-2">
                        {prod.product_name}
                      </h4>
                    </div>

                    <div className="flex items-end justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Rate</p>
                        <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                          ₹{parseFloat(prod.selling_price.toString()).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right">
                        {outOfStock ? (
                          <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">
                            Sold Out
                          </span>
                        ) : (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                            isLowStock 
                              ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 animate-pulse'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            Stock: {prod.stock_qty}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (Cart Panel) */}
        <div className="space-y-6">
          <div className="glass-card p-6 flex flex-col justify-between h-[600px]">
            
            {/* Top Area */}
            <div className="space-y-5 flex-1 overflow-y-auto pr-1">
              
              {/* Member Selection Lookup Box */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Billed Member Customer</span>
                </label>
                
                {selectedMember ? (
                  <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {selectedMember.first_name} {selectedMember.last_name}
                      </p>
                      <p className="text-[10px] text-slate-500">Mob: {selectedMember.mobile_number}</p>
                    </div>
                    <button
                      onClick={() => setSelectedMember(null)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 rounded-md cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => {
                        setMemberSearch(e.target.value);
                        setShowMemberDropdown(true);
                      }}
                      onFocus={() => setShowMemberDropdown(true)}
                      placeholder="Walk-In Customer (search name/mobile)..."
                      className="input-premium py-2 text-xs"
                    />
                    
                    {showMemberDropdown && memberSearch && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto">
                        {searchedMembers.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 text-center">No member matches</div>
                        ) : (
                          searchedMembers.map(m => (
                            <div
                              key={m.id}
                              onClick={() => {
                                setSelectedMember(m);
                                setShowMemberDropdown(false);
                                setMemberSearch('');
                              }}
                              className="p-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer flex justify-between"
                            >
                              <span>{m.first_name} {m.last_name}</span>
                              <span className="text-slate-400">{m.mobile_number}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cart List */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center space-x-1">
                  <ShoppingCart className="w-3.5 h-3.5 text-slate-500" />
                  <span>Cart Items ({cart.length})</span>
                </label>

                {cart.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    Cart is empty. Tap products to add.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {cart.map(item => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-xl text-xs"
                      >
                        <div className="max-w-[120px]">
                          <h5 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight truncate">
                            {item.product.product_name}
                          </h5>
                          <span className="text-[10px] text-slate-500">₹{item.product.selling_price}</span>
                        </div>

                        {/* Qty increment controls */}
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                            className="p-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-350 rounded cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                            className="p-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-350 rounded cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right flex items-center space-x-2">
                          <span className="font-extrabold">₹{(item.product.selling_price * item.quantity).toLocaleString()}</span>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-rose-500 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Form Calculations Panel */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-4">
              
              {/* Discount selection */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center space-x-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>Apply Offer Discount:</span>
                </span>
                <select
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseInt(e.target.value))}
                  className="bg-transparent dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 focus:outline-none"
                >
                  <option value={0}>0% Flat</option>
                  <option value={5}>5% Off</option>
                  <option value={10}>10% Off</option>
                  <option value={15}>15% Off</option>
                  <option value={20}>20% Off</option>
                </select>
              </div>

              {/* Invoicing Breakdown */}
              <div className="space-y-1.5 border-t border-dashed border-slate-100 dark:border-slate-800 pt-3 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Cart Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>Discount ({discountPercent}%):</span>
                    <span>-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>GST Tax ({taxPercentage}%):</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-slate-900 dark:text-white border-t border-slate-100 dark:border-slate-800 pt-2">
                  <span>Checkout Net Total:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none"
                  >
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Amount Received (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckoutSubmit}
                disabled={cart.length === 0}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl text-xs shadow-lg active:scale-[0.99] transition-all cursor-pointer flex justify-center items-center space-x-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirm Purchase Checkout</span>
              </button>

            </div>

          </div>
        </div>

      </div>

      {/* A5 PRINT RECEIPT MODAL */}
      {activeReceiptId !== null && (
        <ReceiptModal invoiceId={activeReceiptId} onClose={() => setActiveReceiptId(null)} />
      )}

    </div>
  );
}
