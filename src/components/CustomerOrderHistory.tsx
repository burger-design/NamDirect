import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Order, Product, Farmer } from '../types';
import { formatPrice, cn } from '../lib/utils';
import { Package, Clock, Truck, CheckCircle2, AlertCircle, Phone, ArrowRight, User as UserIcon, X as CloseIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, User } from 'firebase/auth';

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

  const openCancelModal = (orderId: string) => {
    setCancelReason('');
    setCancelComments('');
    setCancelOrderModalId(orderId);
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
      const date = new Date(order.createdAt);
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
  }, [orders]);

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
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-nam-gold/20 text-nam-green px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-nam-gold/30">
              My Profile
            </span>
          </div>
          <h2 className="text-5xl font-black text-nam-green tracking-tighter">ORDER HISTORY</h2>
          <p className="text-gray-500 font-medium mt-4">Track your purchases and view delivery status.</p>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white p-16 rounded-[3rem] text-center border-2 border-dashed border-gray-200">
            <Package size={48} className="mx-auto text-gray-300 mb-6" />
            <p className="text-gray-500 font-bold mb-6">You haven't placed any orders yet.</p>
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
              <div key={order.id} className="bg-white p-8 rounded-[2.5rem] shadow-lg shadow-nam-green/5 border border-gray-100 flex flex-col md:flex-row gap-8">
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

                  <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-50">
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Order Status</p>
                      <div className="flex items-center gap-2">
                        {order.status === 'pending' ? <Clock size={16} className="text-yellow-500" /> :
                         order.status === 'confirmed' ? <AlertCircle size={16} className="text-blue-500" /> :
                         order.status === 'cancelled' ? <AlertCircle size={16} className="text-red-500" /> :
                         <CheckCircle2 size={16} className="text-green-500" />}
                        <span className="text-sm font-bold capitalize text-gray-700">{order.status}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Delivery Status</p>
                      <div className="flex items-center gap-2">
                        <Truck size={16} className={order.deliveryStatus === 'delivered' ? 'text-green-500' : 'text-nam-gold'} />
                        <span className="text-sm font-bold text-gray-700 capitalize">
                          {order.deliveryStatus ? order.deliveryStatus.replace('_', ' ') : 'Pending'}
                        </span>
                      </div>
                      {order.trackingNumber && (
                        <p className="text-xs font-bold text-nam-green mt-1">Tracking: {order.trackingNumber}</p>
                      )}
                    </div>
                  </div>

                  {order.farmer?.whatsappNumber && (
                    <div className="mt-6 pt-6 border-t border-gray-50 flex justify-between items-center">
                      {(order.status === 'pending' || order.status === 'confirmed') ? (
                        <button
                          onClick={() => openCancelModal(order.id)}
                          className="text-red-500 font-bold uppercase tracking-widest text-xs hover:text-red-600 transition-colors px-4 py-2"
                        >
                          Cancel Order
                        </button>
                      ) : <div />}
                      <a 
                        href={`https://wa.me/${order.farmer.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I am inquiring about my order #${order.id.slice(-6).toUpperCase()} for ${order.product?.name || 'the product'}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-50 text-green-700 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-100 transition-colors"
                      >
                        <Phone size={16} /> Contact Farmer
                      </a>
                    </div>
                  )}
                  {!order.farmer?.whatsappNumber && (order.status === 'pending' || order.status === 'confirmed') && (
                    <div className="mt-6 pt-6 border-t border-gray-50 flex justify-start items-center">
                      <button
                        onClick={() => openCancelModal(order.id)}
                        className="text-red-500 font-bold uppercase tracking-widest text-xs hover:text-red-600 transition-colors px-4 py-2"
                      >
                        Cancel Order
                      </button>
                    </div>
                  )}
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
              
              <div className="flex gap-4">
                <button
                  onClick={() => setCancelOrderModalId(null)}
                  disabled={isCancelling}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Keep It
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                  className="flex-1 bg-red-500 text-white font-bold py-4 rounded-xl hover:bg-red-600 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {isCancelling ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : "Cancel Order"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
