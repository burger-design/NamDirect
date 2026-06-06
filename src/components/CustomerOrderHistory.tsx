import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { Order, Product, Farmer } from '../types';
import { formatPrice, cn } from '../lib/utils';
import { Package, Clock, Truck, CheckCircle2, AlertCircle, Phone, ArrowRight, User as UserIcon, X as CloseIcon, Printer, Download, ShoppingCart, Star, Sparkles, MessageSquareHeart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useCart } from '../lib/CartContext';

interface OrderWithProduct extends Order {
  product?: Product;
  farmer?: Farmer;
}

export default function CustomerOrderHistory({ user }: { user: User | null }) {
  const [orders, setOrders] = useState<OrderWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelOrderModalId, setCancelOrderModalId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelComments, setCancelComments] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [showSecondaryConfirm, setShowSecondaryConfirm] = useState(false);

  const [rateOrderModalId, setRateOrderModalId] = useState<string | null>(null);
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingReview, setRatingReview] = useState<string>('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  
  const [noteModalId, setNoteModalId] = useState<string | null>(null);
  const [deliveryNote, setDeliveryNote] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  const [showAIGuide, setShowAIGuide] = useState(false);
  
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const handleDownloadHistory = () => {
    const dataStr = JSON.stringify(orders, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `order_history_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReorder = (product?: Product) => {
    if (product) {
      addToCart(product);
      navigate('/cart');
    }
  };

  const submitRating = async () => {
    if (!rateOrderModalId || !user) return;
    setIsSubmittingRating(true);
    try {
      const order = orders.find(o => o.id === rateOrderModalId);
      if (!order || !order.productId) throw new Error("Order not found");
      
      await addDoc(collection(db, 'ratings'), {
        productId: order.productId,
        userId: user.uid,
        orderId: order.id,
        score: ratingScore,
        review: ratingReview,
        createdAt: new Date().toISOString()
      });
      
      setRateOrderModalId(null);
      alert('Thank you for your review!');
    } catch (err) {
      console.error(err);
      alert('Failed to submit review.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const openCancelModal = (orderId: string) => {
    setCancelReason('');
    setCancelComments('');
    setShowSecondaryConfirm(false);
    setCancelOrderModalId(orderId);
  };

  const openNoteModal = (orderId: string, currentNote?: string) => {
    setDeliveryNote(currentNote || '');
    setNoteModalId(orderId);
  };

  const handleSaveNote = async () => {
    if (!noteModalId) return;
    setIsSavingNote(true);
    try {
      const orderRef = doc(db, 'orders', noteModalId);
      await updateDoc(orderRef, { notes: deliveryNote });
      setOrders(prev => prev.map(o => o.id === noteModalId ? { ...o, notes: deliveryNote } : o));
      setNoteModalId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save note.");
    } finally {
      setIsSavingNote(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        const q = query(collection(db, 'orders'), where('customerId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const orderDocs = querySnapshot.docs.map(d => ({ ...(d.data() as Order), id: d.id })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Fetch product and farmer details for each order
        const ordersWithProducts = await Promise.all(
          orderDocs.map(async (order) => {
            let productData: Product | undefined;
            let farmerData: Farmer | undefined;

            const productRef = doc(db, 'products', order.productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
              productData = { ...(productSnap.data() as Product), id: productSnap.id };
            }

            const farmerRef = doc(db, 'farmers', order.farmerId);
            const farmerSnap = await getDoc(farmerRef);
            if (farmerSnap.exists()) {
              farmerData = { ...(farmerSnap.data() as Farmer), uid: farmerSnap.id };
            }

            return { ...order, product: productData, farmer: farmerData };
          })
        );
        
        setOrders(ordersWithProducts);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const handleCancelOrder = async () => {
    if (!cancelOrderModalId) return;
    if (!cancelReason) {
      alert("Please select a reason for cancellation");
      return;
    }

    if (!showSecondaryConfirm) {
      setShowSecondaryConfirm(true);
      return;
    }

    setIsCancelling(true);
    try {
      const orderRef = doc(db, 'orders', cancelOrderModalId);
      await updateDoc(orderRef, { 
        status: 'cancelled',
        cancelReason,
        cancelComments
      });
      setOrders(prev => prev.map(o => o.id === cancelOrderModalId ? { ...o, status: 'cancelled' } : o));
    } catch (err) {
      console.error("Error cancelling order:", err);
    } finally {
      setIsCancelling(false);
      setCancelOrderModalId(null);
    }
  };

  const groupedOrders = React.useMemo(() => {
    return orders.reduce((acc, order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return acc;
      }
      
      const date = new Date(order.createdAt);
      if (monthFilter) {
        const orderMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (orderMonth !== monthFilter) {
          return acc;
        }
      }

      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!acc[monthYear]) {
        acc[monthYear] = { orders: [], totalSpending: 0 };
      }
      acc[monthYear].orders.push(order);
      if (order.status !== 'cancelled') {
        acc[monthYear].totalSpending += order.totalPrice;
      }
      return acc;
    }, {} as Record<string, { orders: OrderWithProduct[], totalSpending: number }>);
  }, [orders, statusFilter, monthFilter]);

  const hasOrdersToDisplay = Object.keys(groupedOrders).length > 0;
  
  const activeOrdersCount = orders.filter(o => 
    o.status !== 'cancelled' && o.status !== 'delivered' && o.deliveryStatus !== 'delivered'
  ).length;

  const handlePrintInvoice = (order: OrderWithProduct) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice - Order #${order.id.slice(-6).toUpperCase()}</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; line-height: 1.6; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
              .logo { font-size: 24px; font-weight: 900; color: #2C5E3B; letter-spacing: -1px; }
              .invoice-title { font-size: 32px; font-weight: 900; text-transform: uppercase; color: #111; margin: 0 0 10px 0; letter-spacing: -1px; }
              .section { margin-bottom: 40px; }
              .section-title { font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #999; margin-bottom: 15px; font-weight: 800; border-bottom: 1px solid #eee; padding-bottom: 8px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
              table { border-collapse: collapse; margin-top: 20px; width: 100%; }
              th, td { text-align: left; padding: 15px 10px; border-bottom: 1px solid #eee; }
              th { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #999; font-weight: 800; }
              .total-row td { font-weight: 900; font-size: 20px; border-top: 2px solid #111; color: #111; padding-top: 20px; }
              .footer { text-align: center; margin-top: 60px; font-size: 14px; color: #999; font-weight: 500; }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">NAMIBIA NATURALS</div>
              <div style="text-align: right;">
                <h1 class="invoice-title">Invoice</h1>
                <div><strong>Order #:</strong> ${order.id.slice(-6).toUpperCase()}</div>
                <div style="color: #666; font-size: 14px;"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            
            <div class="grid section">
              <div>
                <div class="section-title">Billed To</div>
                <div style="font-weight: 600; font-size: 16px;">${user?.displayName || 'Customer'}</div>
                <div style="color: #666;">${user?.email}</div>
                ${order.notes ? `<div style="margin-top: 10px; font-size: 14px; color: #666;">Notes: ${order.notes}</div>` : ''}
              </div>
              <div>
                <div class="section-title">Sold By</div>
                <div style="font-weight: 600; font-size: 16px;">${order.farmer?.farmName || order.farmer?.name || 'Farmer'}</div>
                ${order.farmer?.whatsappNumber ? `<div style="color: #666;">Contact: ${order.farmer.whatsappNumber}</div>` : ''}
              </div>
            </div>

            <div class="section">
              <div class="section-title">Order Details</div>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: right;">Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="font-weight: 600;">${order.product?.name || 'Unknown Product'}</td>
                    <td style="text-align: center;">${order.quantity}</td>
                    <td style="text-align: right; font-weight: 600;">${formatPrice(order.totalPrice)}</td>
                  </tr>
                  <tr class="total-row">
                    <td colspan="2" style="text-align: right;">Total Paid</td>
                    <td style="text-align: right;">${formatPrice(order.totalPrice)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="footer">
              <p>Thank you for supporting Namibian farmers!</p>
              <p style="font-size: 12px;">This is a computer-generated document and does not require a signature.</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gray-50">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-12 h-12 border-4 border-nam-green border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl shadow-nam-green/10 max-w-lg w-full text-center border border-gray-100">
          <div className="w-20 h-20 bg-nam-green text-nam-gold rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-nam-green/20">
            <UserIcon size={40} />
          </div>
          <h2 className="text-4xl font-black text-nam-green tracking-tighter mb-4">SIGN IN REQUIRED</h2>
          <p className="text-gray-500 font-medium mb-12">
            Please log in to view your order history.
          </p>
          <Link to="/registration" className="w-full bg-nam-green text-white p-6 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-nam-green/20 hover:scale-[1.02] active:scale-95 transition-all">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-nam-gold/20 text-nam-green px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-nam-gold/30">
                My Profile
              </span>
              {activeOrdersCount > 0 && (
                <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-xs box-border">
                  {activeOrdersCount} Active Order{activeOrdersCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-5xl font-black text-nam-green tracking-tighter">ORDER HISTORY</h2>
              <button onClick={() => setShowAIGuide(true)} className="flex items-center gap-2 bg-gradient-to-r from-nam-green to-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                <Sparkles size={16} /> AI Assistant
              </button>
            </div>
            <p className="text-gray-500 font-medium mt-4">Track your purchases and view delivery status.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
            <button
              onClick={handleDownloadHistory}
              className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors text-sm uppercase tracking-widest shrink-0"
            >
              <Download size={16} /> Export JSON
            </button>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <label className="text-sm font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap sr-only sm:not-sr-only">Filter by Month:</label>
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-nam-green/20 focus:border-nam-green transition-all"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-nam-green/20 focus:border-nam-green transition-all"
              >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            </div>
          </div>
        </div>

        {!hasOrdersToDisplay ? (
          <div className="bg-white p-16 rounded-[3rem] text-center border-2 border-dashed border-gray-200">
            <Package size={48} className="mx-auto text-gray-300 mb-6" />
            <p className="text-gray-500 font-bold mb-6">
              {orders.length === 0 ? "You haven't placed any orders yet." : "No orders match the selected filter."}
            </p>
            <Link to="/marketplace" className="inline-flex items-center justify-center bg-nam-green text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-nam-green/20 hover:scale-105 active:scale-95 transition-all">
              Go to Marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.keys(groupedOrders).map((monthYear) => {
              const group = groupedOrders[monthYear];
              return (
              <div key={monthYear} className="space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="text-2xl font-black text-nam-green tracking-tight">{monthYear}</h3>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">Total Spent</span>
                    <span className="text-xl font-black text-nam-gold tracking-tighter">{formatPrice(group.totalSpending)}</span>
                  </div>
                </div>
                {group.orders.map((order) => (
              <div key={order.id} className="bg-white p-8 rounded-[2.5rem] shadow-lg shadow-nam-green/5 border border-gray-100 flex flex-col md:flex-row gap-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                {order.product?.imageUrl ? (
                  <div className="w-full md:w-48 h-48 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                    <img src={order.product.imageUrl} alt={order.product.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full md:w-48 h-48 rounded-2xl bg-gray-100 shrink-0 flex items-center justify-center text-gray-300">
                    <Package size={48} />
                  </div>
                )}
                
                <div className="flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-black text-nam-green tracking-tight">{order.product?.name || 'Unknown Product'}</h3>
                        <p className="text-sm text-gray-400 font-bold mb-1">Order #{order.id.slice(-6).toUpperCase()}</p>
                        <p className="text-xs text-gray-400 font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-nam-gold tracking-tighter block">{formatPrice(order.totalPrice)}</span>
                        <span className="text-sm text-gray-500 font-bold block mt-1">Qty: {order.quantity}</span>
                      </div>
                    </div>
                  </div>

                  {order.status === 'cancelled' ? (
                    <div className="mt-6 pt-6 border-t border-gray-50">
                      <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3">
                         <AlertCircle size={20} />
                         <div>
                           <p className="font-bold">Order Cancelled</p>
                           {order.cancelReason && <p className="text-sm mt-1 opacity-80 text-red-500">{order.cancelReason}</p>}
                         </div>
                      </div>
                    </div>
                  ) : (() => {
                    const currentStep = order.status === 'delivered' || order.deliveryStatus === 'delivered' ? 3 :
                                      (order.deliveryStatus === 'shipped' || order.deliveryStatus === 'out_for_delivery' ? 2 :
                                      (order.status === 'confirmed' ? 1 : 0));
                    const steps = ['Pending', 'Confirmed', 'Shipped', 'Delivered'];
                    return (
                      <div className="mt-6 pt-6 border-t border-gray-50">
                        <div className="relative px-2">
                          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 rounded-full overflow-hidden">
                            <div className="h-full bg-nam-green transition-all duration-500" style={{ width: `${(currentStep / 3) * 100}%` }} />
                          </div>
                          <div className="relative flex justify-between">
                            {steps.map((step, idx) => {
                              const isActive = currentStep >= idx;
                              const isCurrentAndAnimating = currentStep === idx && currentStep > 0 && currentStep < 3;
                              return (
                                <div key={step} className="flex flex-col items-center gap-2">
                                  <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all z-10",
                                    isActive ? "bg-nam-green text-white shadow-md shadow-nam-green/20" : "bg-gray-100 text-gray-400 border border-gray-200",
                                    isCurrentAndAnimating ? "animate-pulse ring-4 ring-nam-green/30" : ""
                                  )}>
                                    {currentStep > idx ? <CheckCircle2 size={16} /> : (idx + 1)}
                                  </div>
                                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isActive ? "text-nam-green" : "text-gray-400")}>{step}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {order.trackingNumber && (
                           <p className="text-xs font-bold text-nam-green mt-6 text-center">Tracking Number: {order.trackingNumber}</p>
                        )}
                      </div>
                    );
                  })()}

                  <div className="mt-6 pt-6 border-t border-gray-50 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex flex-wrap gap-4 items-center">
                      {(order.status === 'pending' || order.status === 'confirmed') && (
                        <>
                          <button
                            onClick={() => openNoteModal(order.id, order.notes)}
                            className="text-gray-500 border border-gray-200 rounded-xl font-bold uppercase tracking-widest text-xs hover:text-gray-700 hover:bg-gray-50 transition-colors px-4 py-2"
                          >
                            {order.notes ? 'Edit Note' : 'Add Note'}
                          </button>
                          <button
                            onClick={() => openCancelModal(order.id)}
                            className="text-red-500 font-bold uppercase tracking-widest text-xs hover:text-red-600 transition-colors px-4 py-2"
                          >
                            Cancel Order
                          </button>
                        </>
                      )}
                      
                      {(order.status === 'delivered' || order.deliveryStatus === 'delivered') && (
                        <>
                          <button
                            onClick={() => setRateOrderModalId(order.id)}
                            className="bg-nam-gold/10 text-nam-gold px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-nam-gold/20 transition-colors text-xs uppercase tracking-widest"
                          >
                            <Star size={14} className="fill-current" /> Rate Order
                          </button>
                          <button
                            onClick={() => handleReorder(order.product)}
                            className="bg-nam-green text-white px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-nam-green/90 transition-colors text-xs uppercase tracking-widest shadow-md shadow-nam-green/20"
                          >
                            <ShoppingCart size={14} /> Reorder
                          </button>
                          <button
                            onClick={() => handlePrintInvoice(order)}
                            className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors text-xs uppercase tracking-widest"
                          >
                            <Printer size={14} /> Invoice
                          </button>
                        </>
                      )}
                    </div>
                    {order.farmer?.whatsappNumber && (
                      <a 
                        href={`https://wa.me/${order.farmer.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I am inquiring about my order #${order.id.slice(-6).toUpperCase()} for ${order.product?.name || 'the product'}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-50 text-green-700 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-100 transition-colors"
                      >
                        <Phone size={16} /> Contact Farmer
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
              </div>
            );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {cancelOrderModalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isCancelling && setCancelOrderModalId(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md text-center"
            >
              <button 
                onClick={() => setCancelOrderModalId(null)}
                disabled={isCancelling}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                <CloseIcon size={24} />
              </button>
              
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>

              {!showSecondaryConfirm ? (
                <>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Cancel Order?</h3>
                  <p className="text-gray-500 font-medium mb-6">
                    Are you sure you want to cancel this order? This action cannot be undone.
                  </p>
                  
                  <div className="mb-6 text-left">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Reason for cancellation *</label>
                    <div className="space-y-2">
                      {['Changed my mind', 'No longer needed', 'Issue with delivery'].map(reason => (
                        <label key={reason} className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                          <input 
                            type="radio" 
                            name="cancelReason" 
                            value={reason} 
                            checked={cancelReason === reason} 
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="w-4 h-4 text-nam-green focus:ring-nam-green"
                          />
                          <span className="text-sm font-medium text-gray-700">{reason}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mb-8 text-left">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Additional Comments (Optional)</label>
                    <textarea 
                      value={cancelComments}
                      onChange={(e) => setCancelComments(e.target.value)}
                      className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-nam-green outline-none text-sm"
                      rows={3}
                      placeholder="Tell us more about why you are cancelling..."
                    />
                  </div>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                  <h3 className="text-3xl font-black text-gray-900 mb-4">Final Confirmation</h3>
                  <p className="text-red-500 font-bold mb-2">
                    Are you absolutely sure you want to cancel?
                  </p>
                  <p className="text-gray-500 font-medium">
                    This order will be permanently marked as cancelled and cannot be reopened.
                  </p>
                </motion.div>
              )}
              
              <div className="flex gap-4">
                <button
                  onClick={() => showSecondaryConfirm ? setShowSecondaryConfirm(false) : setCancelOrderModalId(null)}
                  disabled={isCancelling}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {showSecondaryConfirm ? "Go Back" : "Keep It"}
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                  className="flex-1 bg-red-500 text-white font-bold py-4 rounded-xl hover:bg-red-600 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {isCancelling ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : showSecondaryConfirm ? "Yes, Cancel Order" : "Cancel Order"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {rateOrderModalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmittingRating && setRateOrderModalId(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md"
            >
              <button 
                onClick={() => setRateOrderModalId(null)}
                disabled={isSubmittingRating}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                <CloseIcon size={24} />
              </button>
              
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-nam-gold/10 text-nam-gold rounded-full flex items-center justify-center mx-auto mb-6">
                  <Star size={32} className="fill-current" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Rate Your Order</h3>
                <p className="text-gray-500 font-medium">
                  How was the product? Your feedback helps the farmer and other customers!
                </p>
              </div>
              
              <div className="mb-6 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRatingScore(star)}
                    className={cn(
                      "transition-all hover:scale-110",
                      ratingScore >= star ? "text-nam-gold" : "text-gray-200"
                    )}
                  >
                    <Star size={32} className={ratingScore >= star ? "fill-current" : ""} />
                  </button>
                ))}
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-gray-700 mb-2">Write a review (Optional)</label>
                <textarea 
                  value={ratingReview}
                  onChange={(e) => setRatingReview(e.target.value)}
                  className="w-full border p-4 rounded-xl focus:ring-2 focus:ring-nam-green outline-none text-sm bg-gray-50 text-gray-700"
                  rows={4}
                  placeholder="Tell us what you liked about the product..."
                />
              </div>
              
              <button
                onClick={submitRating}
                disabled={isSubmittingRating}
                className="w-full bg-nam-green text-white font-black py-4 rounded-xl hover:bg-nam-green/90 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 text-lg shadow-xl shadow-nam-green/20"
              >
                {isSubmittingRating ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : "Submit Review"}
              </button>
            </motion.div>
          </div>
        )}

        {noteModalId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingNote && setNoteModalId(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md"
            >
              <button 
                onClick={() => setNoteModalId(null)}
                disabled={isSavingNote}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                <CloseIcon size={24} />
              </button>
              
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquareHeart size={32} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Delivery Instructions</h3>
                <p className="text-gray-500 font-medium text-sm">
                  Add special notes for the farmer or delivery person to ensure a smooth drop-off.
                </p>
              </div>
              
              <div className="mb-8">
                <textarea 
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  className="w-full border p-4 rounded-xl focus:ring-2 focus:ring-nam-green outline-none text-sm bg-gray-50 text-gray-700"
                  rows={4}
                  placeholder="e.g., Please leave at the back door..."
                />
              </div>
              
              <button
                onClick={handleSaveNote}
                disabled={isSavingNote}
                className="w-full bg-nam-green text-white font-black py-4 rounded-xl hover:bg-nam-green/90 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 text-lg shadow-xl shadow-nam-green/20"
              >
                {isSavingNote ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : "Save Note"}
              </button>
            </motion.div>
          </div>
        )}

        {showAIGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAIGuide(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, x: 20 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0.9, opacity: 0, x: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-lg overflow-hidden flex flex-col max-h-full"
            >
              <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-8 text-white relative shrink-0">
                <button 
                  onClick={() => setShowAIGuide(false)}
                  className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
                >
                  <CloseIcon size={24} />
                </button>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                  <Sparkles size={24} className="text-blue-300" />
                </div>
                <h3 className="text-3xl font-black mb-2 tracking-tight">AI Assistant</h3>
                <p className="text-blue-200 font-medium">Hello there! I'm here to comfortably guide you through your Order History dashboard.</p>
              </div>
              
              <div className="p-8 overflow-y-auto bg-gray-50">
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-50 p-2 rounded-xl text-blue-500 shrink-0">
                        <Truck size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">Tracking Your Orders</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          Your orders are grouped by month. You can quickly see the progression of your purchase via the bright green step indicator. Look out for the pulsating ring which highlights the current valid step!
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-start gap-4">
                      <div className="bg-green-50 p-2 rounded-xl text-green-600 shrink-0">
                        <MessageSquareHeart size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">Direct Farmer Contact</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          We believe in transparency. If an order is pending or confirmed, you can directly tap "Contact Farmer" to reach them on WhatsApp. Need to share special delivery rules? Simply tap "Add Note".
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-start gap-4">
                      <div className="bg-red-50 p-2 rounded-xl text-red-500 shrink-0">
                        <AlertCircle size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">Cancellations & Returns</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          You can cancel an order unconditionally before it's shipped. We'll ask you twice just to be absolutely sure. If an order is already delivered and you're unsatisfied, please leave a swift rating or touch base directly with the farmer.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-white border-t border-gray-100 text-center shrink-0">
                <button 
                  onClick={() => setShowAIGuide(false)}
                  className="bg-gray-100 text-gray-700 font-bold px-8 py-3 rounded-xl hover:bg-gray-200 transition-colors w-full"
                >
                  I understand, close guide
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
