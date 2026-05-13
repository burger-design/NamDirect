import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Search, MapPin, Filter, ShoppingCart, ArrowRight, Truck, Info, Tag, CheckCircle } from 'lucide-react';
import { NAMIBIA_REGIONS, NamibiaRegion, SERVICE_TYPES } from '../constants';
import { Product } from '../types';
import { formatPrice, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../lib/CartContext';

export default function Marketplace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [addedItem, setAddedItem] = useState<string | null>(null);
  const navigate = useNavigate();
  const { addToCart } = useCart();

  useEffect(() => {
    fetchProducts();
  }, [selectedRegion, selectedCategory]);

  const fetchProducts = async () => {
    setLoading(true);
    const path = 'products';
    try {
      let q = collection(db, path);
      let firestoreQuery;

      if (selectedRegion !== 'All') {
        firestoreQuery = query(q, where('region', '==', selectedRegion), orderBy('createdAt', 'desc'));
      } else {
        firestoreQuery = query(q, orderBy('createdAt', 'desc'));
      }

      const querySnapshot = await getDocs(firestoreQuery);
      let items = querySnapshot.docs.map(doc => ({ ...(doc.data() as Product), id: doc.id }));
      
      // Client-side filtering for category and search
      if (selectedCategory !== 'All') {
        items = items.filter(p => p.category === selectedCategory);
      }

      if (searchTerm) {
        items = items.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase()));
      }

      setProducts(items);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  return (
    <div className="min-h-screen pt-24 bg-gray-50/50">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-100 py-12 mb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex flex-col md:flex-row gap-8 items-end justify-between">
              <div className="max-w-2xl">
                 <h1 className="text-5xl md:text-7xl font-black text-nam-green tracking-tighter italic mb-4">THE MARKETPLACE</h1>
                 <p className="text-gray-500 font-medium">Discover fresh produce and crafts from every corner of Namibia.</p>
              </div>
              <form onSubmit={handleSearch} className="w-full md:w-auto flex flex-col sm:flex-row gap-4 flex-grow max-w-xl">
                 <div className="relative flex-grow">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                    <input 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search items, farms..."
                      className="w-full bg-gray-50 border-0 p-6 pl-16 rounded-[2rem] font-bold focus:ring-2 focus:ring-nam-gold transition-all"
                    />
                 </div>
                 <button 
                  type="submit"
                  className="bg-nam-green text-white px-10 py-6 rounded-[2rem] font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-nam-green/10"
                 >
                    Explore
                 </button>
              </form>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-72 shrink-0">
             <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 sticky top-32">
                <div className="flex items-center gap-3 mb-10 pb-6 border-b border-gray-50">
                   <Filter size={20} className="text-nam-gold" />
                   <h3 className="text-xl font-black text-nam-green tracking-tight">Refine Results</h3>
                </div>

                <div className="space-y-10">
                   <div>
                       <label className="text-xs font-black uppercase text-gray-400 tracking-widest pl-2 mb-4 block">Categories</label>
                       <div className="flex flex-wrap gap-2">
                          {['All', ...SERVICE_TYPES].map(type => (
                            <button
                             key={type}
                             onClick={() => setSelectedCategory(type)}
                             className={cn(
                               "px-4 py-2 text-xs font-bold rounded-full transition-all border flex items-center gap-2",
                               selectedCategory === type 
                                 ? "bg-nam-gold text-nam-green border-nam-gold shadow-lg shadow-nam-gold/20" 
                                 : "bg-gray-50 text-gray-500 border-gray-100 hover:border-nam-gold"
                             )}
                            >
                               <Tag size={12} />
                               {type}
                            </button>
                          ))}
                       </div>
                    </div>

                   <div>
                      <label className="text-xs font-black uppercase text-gray-400 tracking-widest pl-2 mb-4 block">Select Region</label>
                      <div className="flex flex-wrap gap-2">
                         {['All', ...NAMIBIA_REGIONS].map(region => (
                           <button
                            key={region}
                            onClick={() => setSelectedRegion(region)}
                            className={cn(
                              "px-4 py-2 text-xs font-bold rounded-full transition-all border",
                              selectedRegion === region 
                                ? "bg-nam-green text-white border-nam-green shadow-lg shadow-nam-green/20" 
                                : "bg-gray-50 text-gray-500 border-gray-100 hover:border-nam-gold"
                            )}
                           >
                              {region}
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="p-6 bg-nam-gold/5 rounded-3xl border border-nam-gold/20">
                      <div className="flex items-center gap-2 text-nam-green mb-4">
                         <Info size={16} />
                         <span className="font-black text-xs uppercase tracking-widest leading-none mt-1">Delivery Info</span>
                      </div>
                      <p className="text-[10px] uppercase font-black text-nam-green/60 tracking-wider leading-relaxed">
                        Prices exclude delivery fees. Fees are calculated at checkout based on distance.
                      </p>
                   </div>
                </div>
             </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-grow">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                 {[1,2,3,4,5,6].map(i => (
                   <div key={i} className="bg-white h-[450px] rounded-[3rem] animate-pulse border border-gray-50" />
                 ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white p-24 rounded-[4rem] text-center shadow-sm border border-gray-100">
                 <Search size={64} className="mx-auto text-gray-200 mb-8" />
                 <h3 className="text-4xl font-black text-nam-green tracking-tighter mb-4 italic">CRICKETS...</h3>
                 <p className="text-gray-400 font-medium max-w-sm mx-auto">
                    We couldn't find any products matching your criteria.
                 </p>
                 <button 
                  onClick={() => { setSelectedRegion('All'); setSelectedCategory('All'); setSearchTerm(''); }}
                  className="mt-10 text-nam-gold font-black underline underline-offset-8"
                 >
                    Clear All Filters
                 </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                 <AnimatePresence mode="popLayout">
                    {products.map(product => (
                      <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-[3.5rem] overflow-hidden shadow-xl shadow-nam-green/5 border border-gray-100 group flex flex-col h-full"
                      >
                         <div className="h-64 relative overflow-hidden bg-gray-100">
                            <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} />
                            <div className="absolute top-6 left-6">
                               <span className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase text-nam-green tracking-widest shadow-sm">
                                  {product.category}
                               </span>
                            </div>
                         </div>
                         <div className="p-10 flex flex-col flex-grow">
                            <div className="flex justify-between items-start mb-4">
                               <div>
                                  <h3 className="text-2xl font-black text-nam-green tracking-tight leading-tight mb-2">{product.name}</h3>
                                  <div className="flex items-center gap-6">
                                     <span className="flex items-center gap-1 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                        <MapPin size={12} className="text-nam-gold" /> {product.region}
                                     </span>
                                     <span className="flex items-center gap-1 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                        <Truck size={12} className="text-nam-gold" /> Doorstep
                                     </span>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <span className="text-3xl font-black text-nam-gold tracking-tighter block">{formatPrice(product.price)}</span>
                                  <span className="text-[10px] uppercase font-bold text-gray-300">per {product.unit}</span>
                                  {product.shippingOptions && product.shippingOptions.length > 0 && (
                                     <span className="text-[10px] uppercase font-bold text-nam-green block mt-1">
                                        Shipping from {formatPrice(Math.min(...product.shippingOptions.map(o => o.cost)))}
                                     </span>
                                  )}
                               </div>
                            </div>
                            
                            <p className="text-gray-400 text-sm font-medium line-clamp-2 mb-8 leading-relaxed">
                               {product.description}
                            </p>

                            <div className="mt-auto grid grid-cols-5 gap-3">
                               <button 
                                onClick={() => {
                                  addToCart(product);
                                  setAddedItem(product.id);
                                  setTimeout(() => setAddedItem(null), 2000);
                                }}
                                className={cn(
                                  "col-span-2 p-5 rounded-2xl font-black flex items-center justify-center transition-all active:scale-95 shadow-lg",
                                  addedItem === product.id 
                                    ? "bg-nam-gold text-nam-green" 
                                    : "bg-nam-gold/10 text-nam-green hover:bg-nam-gold/20"
                                )}
                                title="Add to Basket"
                               >
                                  {addedItem === product.id ? <CheckCircle size={20} /> : <ShoppingCart size={20} />}
                               </button>
                               <button 
                                onClick={() => navigate(`/delivery?productId=${product.id}`)}
                                className="col-span-3 bg-nam-green text-white p-5 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-nam-green/90 group/btn transition-all active:scale-95 shadow-lg shadow-nam-green/20"
                               >
                                  Checkout <ArrowRight size={18} className="group-hover/btn:translate-x-2 transition-transform" />
                               </button>
                            </div>
                         </div>
                      </motion.div>
                    ))}
                 </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
