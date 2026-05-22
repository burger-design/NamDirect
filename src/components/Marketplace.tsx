import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Search, MapPin, Filter, ShoppingCart, ArrowRight, Truck, Info, Tag, CheckCircle, Star, X, Map as MapIcon, Grid } from 'lucide-react';
import { NAMIBIA_REGIONS, NamibiaRegion, SERVICE_TYPES } from '../constants';
import { Product, Farmer } from '../types';
import { formatPrice, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../lib/CartContext';
import PromoBanner from './PromoBanner';
import { GoogleMapsWrapper } from './GoogleMapsWrapper';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

export default function Marketplace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [farmers, setFarmers] = useState<Record<string, Farmer>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [minRating, setMinRating] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);
  const [addedItem, setAddedItem] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const navigate = useNavigate();
  const { addToCart } = useCart();

  useEffect(() => {
    fetchProducts();
  }, [selectedRegion, selectedCategory, inStockOnly, priceRange, minRating]);

  useEffect(() => {
    const fetchFarmers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'farmers'));
        const farmerData: Record<string, Farmer> = {};
        querySnapshot.forEach(doc => {
           farmerData[doc.id] = { ...(doc.data() as Farmer), uid: doc.id };
        });
        setFarmers(farmerData);
      } catch (err) {
        console.error("Error fetching farmers:", err);
      }
    };
    fetchFarmers();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const path = 'products';
    try {
      let q = collection(db, path);
      let firestoreQuery;

      if (selectedRegion !== 'All') {
        firestoreQuery = query(q, where('region', '==', selectedRegion));
      } else {
        firestoreQuery = query(q);
      }

      const querySnapshot = await getDocs(firestoreQuery);
      let items = querySnapshot.docs.map(doc => ({ ...(doc.data() as Product), id: doc.id })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Client-side filtering
      if (selectedCategory !== 'All') {
        items = items.filter(p => p.category === selectedCategory);
      }

      if (searchTerm) {
        items = items.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase()));
      }

      if (inStockOnly) {
        items = items.filter(p => p.stockStatus === true);
      }

      items = items.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

      if (minRating > 0) {
        items = items.filter(p => (p.rating || 0) >= minRating);
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <PromoBanner />
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

                   <div>
                      <label className="text-xs font-black uppercase text-gray-400 tracking-widest pl-2 mb-4 block">Availability</label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                           type="checkbox" 
                           checked={inStockOnly} 
                           onChange={(e) => setInStockOnly(e.target.checked)}
                           className="w-5 h-5 rounded-md border-gray-300 text-nam-green focus:ring-nam-gold cursor-pointer"
                        />
                        <span className="text-sm font-bold text-gray-700">In Stock Only</span>
                      </label>
                   </div>

                   <div>
                      <label className="text-xs font-black uppercase text-gray-400 tracking-widest pl-2 mb-4 block flex justify-between">
                         <span>Price Range</span>
                         <span className="text-nam-green">{formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}</span>
                      </label>
                      <input 
                         type="range" 
                         min="0" 
                         max="10000" 
                         step="50"
                         value={priceRange[1]}
                         onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                         className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-nam-gold"
                      />
                   </div>

                   <div>
                      <label className="text-xs font-black uppercase text-gray-400 tracking-widest pl-2 mb-4 block">Minimum Rating</label>
                      <div className="flex flex-col gap-2">
                         {[4, 3, 2, 1, 0].map(rating => (
                           <button
                            key={rating}
                            onClick={() => setMinRating(rating)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-xl transition-all border w-full",
                              minRating === rating 
                                ? "bg-nam-gold/10 border-nam-gold text-nam-green font-bold" 
                                : "bg-transparent border-transparent text-gray-500 hover:bg-gray-50"
                            )}
                           >
                              <div className="flex">
                                 {Array.from({ length: 5 }).map((_, i) => (
                                    <Star 
                                       key={i} 
                                       size={14} 
                                       className={i < rating ? "text-nam-gold fill-nam-gold" : "text-gray-300"} 
                                    />
                                 ))}
                              </div>
                              <span className="text-xs">{rating === 0 ? "Any Rating" : `${rating} & Up`}</span>
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

          {/* Product Grid / Map Area */}
          <div className="flex-grow flex flex-col gap-6">
            <div className="flex justify-end gap-2 shrink-0">
               <button 
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-3 rounded-2xl flex items-center gap-2 font-bold transition-all",
                    viewMode === 'grid' ? "bg-nam-green text-white" : "bg-white text-gray-500 hover:bg-gray-100"
                  )}
               >
                  <Grid size={18} /> Grid
               </button>
               <button 
                  onClick={() => setViewMode('map')}
                  className={cn(
                    "p-3 rounded-2xl flex items-center gap-2 font-bold transition-all",
                    viewMode === 'map' ? "bg-nam-green text-white" : "bg-white text-gray-500 hover:bg-gray-100"
                  )}
               >
                  <MapIcon size={18} /> Map
               </button>
            </div>

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
                  onClick={() => { 
                    setSelectedRegion('All'); 
                    setSelectedCategory('All'); 
                    setSearchTerm(''); 
                    setInStockOnly(false);
                    setPriceRange([0, 10000]);
                    setMinRating(0);
                  }}
                  className="mt-10 text-nam-gold font-black underline underline-offset-8"
                 >
                    Clear All Filters
                 </button>
              </div>
            ) : viewMode === 'grid' ? (
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
                         <div 
                            className="h-64 relative overflow-hidden bg-gray-100 cursor-pointer"
                            onClick={() => setSelectedProduct(product)}
                         >
                            <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} />
                            <div className="absolute top-6 left-6 flex flex-col gap-2">
                               <span className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase text-nam-green tracking-widest shadow-sm w-fit">
                                  {product.category}
                               </span>
                               {product.stockStatus ? (
                                  <span className="bg-green-100/90 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase text-green-700 tracking-widest shadow-sm w-fit">
                                     In Stock
                                  </span>
                               ) : (
                                  <span className="bg-red-100/90 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase text-red-700 tracking-widest shadow-sm w-fit">
                                     Out of Stock
                                  </span>
                               )}
                            </div>
                         </div>
                         <div className="p-10 flex flex-col flex-grow">
                            <div className="flex justify-between items-start mb-4">
                               <div>
                                  <h3 
                                    className="text-2xl font-black text-nam-green tracking-tight leading-tight mb-2 cursor-pointer hover:underline"
                                    onClick={() => setSelectedProduct(product)}
                                  >
                                    {product.name}
                                  </h3>
                                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                     <span className="flex items-center gap-1 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                        <MapPin size={12} className="text-nam-gold" /> {product.region}
                                     </span>
                                     <span className="flex items-center gap-1 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                        <Truck size={12} className="text-nam-gold" /> Doorstep
                                     </span>
                                     {(product.rating || 0) > 0 && (
                                       <span className="flex items-center gap-1 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                          <Star size={12} className="text-nam-gold fill-nam-gold" /> {product.rating?.toFixed(1)} / 5
                                       </span>
                                     )}
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
            ) : (
                <div className="h-[600px] w-full rounded-[3rem] overflow-hidden shadow-sm border border-gray-100 relative">
                  <GoogleMapsWrapper>
                    <Map
                      defaultCenter={{ lat: -22.5609, lng: 17.0658 }}
                      defaultZoom={6}
                      gestureHandling={'greedy'}
                      mapId="MARKETPLACE_MAP"
                      style={{ height: '100%', width: '100%' }}
                    >
                      {products.map(product => {
                         const farmer = farmers[product.farmerId];
                         if (!farmer || !farmer.location) return null;
                         return (
                            <AdvancedMarker 
                              key={product.id} 
                              position={farmer.location}
                              onClick={() => setSelectedProduct(product)}
                            >
                               <div className="relative group/pin cursor-pointer">
                                  <motion.div
                                    animate={selectedProduct?.id === product.id ? { scale: [1, 1.3, 1] } : {}}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className={cn(
                                      "absolute -inset-2 bg-nam-gold/20 rounded-full",
                                      selectedProduct?.id === product.id ? "opacity-100" : "opacity-0 group-hover/pin:opacity-50"
                                    )}
                                  />
                                  <Pin 
                                    background={selectedProduct?.id === product.id ? "#F4B400" : "#2D5A27"} 
                                    borderColor="#FFFFFF" 
                                    glyphColor="#FFFFFF" 
                                  />
                               </div>
                            </AdvancedMarker>
                         );
                      })}
                    </Map>
                  </GoogleMapsWrapper>
                </div>
            )}
          </div>
        </div>
      </div>
      
      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          onRatingUpdated={(newRating, newCount) => {
             // Update the product in local state
             setProducts(products.map(p => p.id === selectedProduct.id ? { ...p, rating: newRating, ratingCount: newCount } : p));
             setSelectedProduct(prev => prev ? { ...prev, rating: newRating, ratingCount: newCount } : null);
          }}
        />
      )}
    </div>
  );
}

function ProductModal({ product, onClose, onRatingUpdated }: { product: Product; onClose: () => void; onRatingUpdated: (rating: number, count: number) => void }) {
  const [hasPurchased, setHasPurchased] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const { addToCart } = useCart();
  const [addedItem, setAddedItem] = useState(false);

  useEffect(() => {
    const checkPurchase = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, 'orders'), where('customerId', '==', auth.currentUser.uid), where('productId', '==', product.id));
        const docs = await getDocs(q);
        const purchased = docs.docs.some(doc => doc.data().status === 'delivered' || doc.data().status === 'confirmed');
        setHasPurchased(purchased);

        const rQ = query(collection(db, 'ratings'), where('customerId', '==', auth.currentUser.uid), where('productId', '==', product.id));
        const rDocs = await getDocs(rQ);
        if (!rDocs.empty) {
          setUserRating(rDocs.docs[0].data().rating);
        }
      } catch (err) {
        console.error("Failed to fetch purchase/rating history", err);
      }
    };
    checkPurchase();
  }, [product.id]);

  const submitRating = async (rating: number) => {
    if (!auth.currentUser || submittingRating) return;
    setSubmittingRating(true);
    try {
      if (userRating !== null) {
        // Already rated
        return;
      }
      // Add rating
      const ratingDoc = doc(collection(db, 'ratings'));
      await setDoc(ratingDoc, {
        id: ratingDoc.id,
        customerId: auth.currentUser.uid,
        productId: product.id,
        rating: rating,
        createdAt: new Date().toISOString()
      });

      // Recalculate average
      const prevCount = product.ratingCount || 0;
      const prevRating = product.rating || 0;
      const newCount = prevCount + 1;
      const newRating = ((prevRating * prevCount) + rating) / newCount;

      await updateDoc(doc(db, 'products', product.id), {
        rating: newRating,
        ratingCount: newCount
      });
      setUserRating(rating);
      onRatingUpdated(newRating, newCount);
    } catch (err) {
      console.error("Failed to submit rating", err);
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-[3.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 bg-gray-100 p-3 rounded-full hover:scale-110 transition-transform z-10"
        >
          <X size={20} className="text-gray-600" />
        </button>

        <div className="h-72 relative">
          <img src={product.imageUrl} className="w-full h-full object-cover" alt={product.name} />
        </div>

        <div className="p-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="bg-nam-green/10 text-nam-green px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mb-4">
                 {product.category}
              </span>
              <h2 className="text-4xl font-black text-nam-green tracking-tighter mb-2">{product.name}</h2>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-sm font-bold text-gray-500">
                  <MapPin size={16} className="text-nam-gold" /> {product.region}
                </span>
                {(product.rating || 0) > 0 && (
                  <span className="flex items-center gap-1 text-sm font-bold text-gray-500">
                    <Star size={16} className="text-nam-gold fill-nam-gold" /> {product.rating?.toFixed(1)} / 5 ({product.ratingCount || 0} reviews)
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
               <span className="text-4xl font-black text-nam-gold tracking-tighter block">{formatPrice(product.price)}</span>
               <span className="text-xs uppercase font-bold text-gray-400">per {product.unit}</span>
            </div>
          </div>

          <p className="text-gray-600 font-medium leading-relaxed mb-8">
            {product.description}
          </p>

          {hasPurchased && (
            <div className="bg-gray-50 p-8 rounded-[2rem] mb-8 border border-gray-100">
              <h4 className="font-black text-sm uppercase text-nam-green tracking-widest mb-4">Rate this product</h4>
              {userRating ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-500">You rated:</span>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={20} className={i < userRating ? "text-nam-gold fill-nam-gold" : "text-gray-300"} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const ratingValue = i + 1;
                    return (
                      <button
                        key={ratingValue}
                        disabled={submittingRating}
                        onClick={() => submitRating(ratingValue)}
                        className="hover:scale-110 transition-transform disabled:opacity-50"
                      >
                        <Star size={32} className="text-gray-300 hover:text-nam-gold hover:fill-nam-gold focus:fill-nam-gold fill-transparent transition-colors" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <button 
            disabled={!product.stockStatus}
            onClick={() => {
              addToCart(product);
              setAddedItem(true);
              setTimeout(() => setAddedItem(false), 2000);
            }}
            className={cn(
              "w-full p-6 rounded-2xl font-black flex items-center justify-center transition-all shadow-xl",
              addedItem 
                ? "bg-nam-gold text-nam-green" 
                : "bg-nam-green text-white hover:scale-[1.02] active:scale-95",
              !product.stockStatus && "opacity-50 cursor-not-allowed hover:scale-100"
            )}
          >
            {addedItem ? (
              <span className="flex items-center gap-2"><CheckCircle size={24} /> Added to Basket</span>
            ) : (
              <span className="flex items-center gap-2"><ShoppingCart size={24} /> {product.stockStatus ? 'Add to Basket' : 'Out of Stock'}</span>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
