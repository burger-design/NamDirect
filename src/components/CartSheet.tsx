import React from 'react';
import { useCart } from '../lib/CartContext';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatPrice } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSheet({ isOpen, onClose }: CartSheetProps) {
  const { items, removeFromCart, updateQuantity, totalPrice, totalItems } = useCart();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-nam-white z-[110] flex flex-col shadow-2xl"
          >
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-nam-green rounded-xl flex items-center justify-center text-nam-gold">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-nam-green tracking-tighter uppercase">Your Basket</h2>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{totalItems} Items Selected</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <ShoppingBag size={64} className="text-gray-100 mb-6" />
                  <h3 className="text-2xl font-black text-nam-green tracking-tighter mb-2 italic">YOUR BASKET IS EMPTY</h3>
                  <p className="text-gray-400 font-medium max-w-[200px]">Start exploring the marketplace to add items to your basket.</p>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div 
                    layout
                    key={item.id}
                    className="flex gap-4 p-4 bg-white rounded-3xl border border-gray-50 shadow-sm"
                  >
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <ShoppingBag size={24} />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-grow flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-nam-green leading-tight">{item.name}</h4>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-nam-gold font-bold text-sm tracking-tight">{formatPrice(item.price)}</p>
                      </div>

                      <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-1 w-fit">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white text-gray-500 transition-all font-bold"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-xs font-black text-nam-green w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white text-gray-500 transition-all font-bold"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-8 bg-white border-t border-gray-100 space-y-6">
                <div className="flex justify-between items-end">
                  <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Total Amount</span>
                  <span className="text-4xl font-black text-nam-green tracking-tighter italic">{formatPrice(totalPrice)}</span>
                </div>

                <button 
                  className="w-full bg-nam-gold text-nam-green py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-2xl shadow-nam-gold/30 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Checkout Now
                  <ArrowRight size={24} />
                </button>
                
                <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Secure Payment • Fast Local Delivery
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
