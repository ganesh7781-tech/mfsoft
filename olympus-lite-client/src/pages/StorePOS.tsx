import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingCart, Trash2, ShieldAlert, User, Plus, Minus, Tag, RefreshCw, X, Receipt, Sparkles, CreditCard, Landmark, Smartphone } from 'lucide-react';
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

  // Category Badge Colors helper
  const getProductCategoryStyles = (category: string) => {
    switch (category) {
      case 'Supplements':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30';
      case 'Drinks':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30';
      case 'Apparel':
        return 'bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30';
      case 'Equipment':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30';
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800';
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase flex items-center">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 mr-3">
              <ShoppingCart className="w-6 h-6 animate-bounce" />
            </span>
            <span>Retail Shop POS</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Checkout sports supplements, health drinks, energy products, and gym equipment</p>
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
            {categories.map(cat => {
              const isSelected = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 border border-amber-550'
                      : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-50/50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Product Items Grid */}
          {loading ? (
            <div className="text-center py-20 text-slate-550">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-500" />
              <span className="text-sm font-semibold">Syncing product inventory...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="glass-card p-20 text-center text-slate-450 font-bold border border-dashed border-slate-200">
              No products found in this category.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {filteredProducts.map(prod => {
                const isLowStock = prod.stock_qty <= prod.low_stock_threshold;
                const outOfStock = prod.stock_qty <= 0;
                const catStyle = getProductCategoryStyles(prod.category);
                
                return (
                  <div
                    key={prod.id}
                    onClick={() => !outOfStock && addToCart(prod)}
                    className={`glass-card p-4 flex flex-col justify-between h-48 cursor-pointer relative select-none border transition-all duration-200 ${
                      outOfStock
                        ? 'opacity-40 border-red-500/40 bg-red-500/5 cursor-not-allowed'
                        : isLowStock
                        ? 'border-yellow-500/40 hover:border-yellow-500/80 hover:shadow-lg shadow-yellow-500/5'
                        : 'border-slate-200/80 dark:border-slate-800/80 hover:border-amber-500/50 hover:shadow-xl shadow-slate-500/5'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${catStyle}`}>
                          {prod.category}
                        </span>
                        {!outOfStock && (
                          <span className={`w-2 h-2 rounded-full ${isLowStock ? 'bg-yellow-500 animate-ping' : 'bg-emerald-500'}`}></span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight mt-3 line-clamp-2">
                        {prod.product_name}
                      </h4>
                    </div>

                    <div className="flex items-end justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      <div>
                        <p className="text-[9px] text-slate-450 uppercase font-bold tracking-wider">Unit Price</p>
                        <p className="font-black text-base text-slate-900 dark:text-white">
                          ₹{parseFloat(prod.selling_price.toString()).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right">
                        {outOfStock ? (
                          <span className="text-[9px] font-black text-rose-600 bg-rose-100 dark:bg-rose-950/20 px-2.5 py-1 rounded-full uppercase tracking-wider border border-rose-200/50">
                            Sold Out
                          </span>
                        ) : (
                          <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            isLowStock 
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700'
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
          <div className="glass-card p-6 flex flex-col justify-between h-[500px] lg:h-[650px] border border-slate-200/80 dark:border-slate-800/80 shadow-md">
            
            {/* Top Area */}
            <div className="space-y-6 flex-1 overflow-y-auto pr-1">
              
              {/* Member Selection Lookup Box */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center space-x-1.5">
                  <User className="w-4 h-4 text-amber-500" />
                  <span>Billed Member / Walk-in</span>
                </label>
                
                {selectedMember ? (
                  <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white uppercase">
                        {selectedMember.first_name} {selectedMember.last_name}
                      </p>
                      <p className="text-[10px] text-slate-550">Phone: {selectedMember.mobile_number}</p>
                    </div>
                    <button
                      onClick={() => setSelectedMember(null)}
                      className="p-1 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer transition-colors"
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
                      placeholder="Walk-In Customer (type search query)..."
                      className="input-premium py-2.5 text-xs"
                    />
                    
                    {showMemberDropdown && memberSearch && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-20 max-h-48 overflow-y-auto">
                        {searchedMembers.length === 0 ? (
                          <div className="p-4 text-xs text-slate-450 text-center font-semibold">No member directory matches</div>
                        ) : (
                          searchedMembers.map(m => (
                            <div
                              key={m.id}
                              onClick={() => {
                                setSelectedMember(m);
                                setShowMemberDropdown(false);
                                setMemberSearch('');
                              }}
                              className="p-3 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer flex justify-between border-b border-slate-100 last:border-b-0"
                            >
                              <span className="font-bold">{m.first_name} {m.last_name}</span>
                              <span className="text-slate-450 font-medium">{m.mobile_number}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cart List */}
              <div className="flex flex-col flex-1">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <ShoppingCart className="w-4 h-4 text-amber-500" />
                    <span>Cart Items ({cart.length})</span>
                  </span>
                  {cart.length > 0 && (
                    <button onClick={() => setCart([])} className="text-[10px] text-rose-500 hover:underline uppercase font-bold cursor-pointer">
                      Clear All
                    </button>
                  )}
                </label>

                {cart.length === 0 ? (
                  <div className="py-16 text-center text-slate-450 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-2">
                    <ShoppingCart className="w-8 h-8 text-slate-300 dark:text-slate-750" />
                    <p className="font-bold">POS cart is currently empty</p>
                    <p className="text-[10px] text-slate-400">Tap catalog products on left to add</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {cart.map(item => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-xl text-xs hover:border-slate-200 dark:hover:border-slate-700/80 transition-colors"
                      >
                        <div className="max-w-[130px] space-y-0.5">
                          <h5 className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-tight truncate">
                            {item.product.product_name}
                          </h5>
                          <span className="text-[10px] font-semibold text-slate-500">₹{item.product.selling_price}</span>
                        </div>

                        {/* Qty increment controls */}
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                            className="p-1 bg-slate-250 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                          >
                            <Minus className="w-3 h-3 text-slate-700 dark:text-slate-300" />
                          </button>
                          <span className="font-black w-6 text-center text-slate-800 dark:text-slate-200">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                            className="p-1 bg-slate-250 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                          >
                            <Plus className="w-3 h-3 text-slate-700 dark:text-slate-300" />
                          </button>
                        </div>

                        <div className="text-right flex items-center space-x-2">
                          <span className="font-black text-slate-900 dark:text-white">
                            ₹{(item.product.selling_price * item.quantity).toLocaleString()}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg cursor-pointer transition-colors"
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
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
              
              {/* Discount selection */}
              <div className="flex items-center justify-between text-xs border-b border-dashed border-slate-150 dark:border-slate-800 pb-3">
                <span className="text-slate-500 flex items-center space-x-1.5">
                  <Tag className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold">Offer Discount:</span>
                </span>
                <select
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseInt(e.target.value))}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-1 font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value={0}>0% Flat</option>
                  <option value={5}>5% Off</option>
                  <option value={10}>10% Off</option>
                  <option value={15}>15% Off</option>
                  <option value={20}>20% Off</option>
                </select>
              </div>

              {/* Invoicing Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-550">
                  <span>Cart Subtotal:</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-500 font-semibold">
                    <span>Discount ({discountPercent}%):</span>
                    <span>-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-550">
                  <span>GST Tax ({taxPercentage}%):</span>
                  <span className="font-semibold">₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white border-t border-slate-150 dark:border-slate-800 pt-2.5">
                  <span className="flex items-center text-amber-500">
                    <Receipt className="w-4 h-4 mr-1" />
                    <span>Net Amount Due:</span>
                  </span>
                  <span className="text-base text-slate-950 dark:text-white">₹{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-3">
                {/* Visual Segmented Payment Select Tabs */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1.5 tracking-wider">Payment Channel</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: 'Cash', icon: Landmark },
                      { name: 'UPI', icon: Smartphone },
                      { name: 'Card', icon: CreditCard }
                    ].map(method => {
                      const isSelected = paymentMethod === method.name;
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.name}
                          type="button"
                          onClick={() => setPaymentMethod(method.name)}
                          className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center border text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/10 scale-102'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <Icon className="w-4 h-4 mb-1" />
                          <span>{method.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1.5 tracking-wider">Amount Collected (₹)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-7 pr-3 py-2.5 focus:outline-none font-black text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckoutSubmit}
                disabled={cart.length === 0}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl text-xs shadow-lg hover:shadow-orange-500/25 active:scale-[0.99] transition-all cursor-pointer flex justify-center items-center space-x-2"
              >
                <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                <span className="uppercase tracking-wider">Checkout & Print Receipt</span>
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
