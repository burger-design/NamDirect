import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { GoogleMapsWrapper } from './GoogleMapsWrapper';
import { NamibiaRegion } from '../constants';
import { MapPin, Phone, Store, Navigation, X, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Supplier {
  id: string;
  businessName: string;
  region: NamibiaRegion;
  whatsappNumber: string;
  serviceType: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export default function SuppliersMap() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'farmers'));
        const supplierList = querySnapshot.docs.map(doc => ({
          ...(doc.data() as Supplier),
          id: doc.id
        })).filter(s => s.location);
        setSuppliers(supplierList);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSuppliers();
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex-grow relative">
        <GoogleMapsWrapper>
          <Map
            defaultCenter={{ lat: -22.5609, lng: 17.0658 }} // Windhoek
            defaultZoom={12}
            gestureHandling={'greedy'}
            mapId="SUPPLIERS_MAP"
            style={{ height: '100%', width: '100%' }}
          >
            {suppliers.map(s => (
              <AdvancedMarker 
                key={s.id} 
                position={s.location!}
                onClick={() => setSelectedSupplier(s)}
              >
                <div className="relative group/pin cursor-pointer">
                  <motion.div
                    animate={selectedSupplier?.id === s.id ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={cn(
                      "absolute -inset-2 bg-nam-gold/20 rounded-full",
                      selectedSupplier?.id === s.id ? "opacity-100" : "opacity-0 group-hover/pin:opacity-50"
                    )}
                  />
                  <Pin 
                    background={selectedSupplier?.id === s.id ? "#F4B400" : "#2D5A27"} 
                    borderColor="#FFFFFF" 
                    glyphColor="#FFFFFF" 
                  />
                </div>
              </AdvancedMarker>
            ))}
          </Map>
        </GoogleMapsWrapper>
        
        {/* Floating Sidebar/Drawer for selected supplier */}
        <AnimatePresence>
          {selectedSupplier && (
            <motion.div
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              className="absolute left-4 top-4 bottom-4 w-full max-w-[320px] bg-white shadow-2xl rounded-[3rem] p-8 z-10 flex flex-col gap-6"
            >
              <div className="flex justify-between items-start">
                <div className="w-14 h-14 bg-nam-green/10 rounded-2xl flex items-center justify-center text-nam-green">
                  <Store size={28} />
                </div>
                <button 
                  onClick={() => setSelectedSupplier(null)}
                  className="p-3 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div>
                <h2 className="text-3xl font-black text-nam-green tracking-tighter mb-2 italic uppercase leading-none">
                  {selectedSupplier.businessName}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="bg-nam-gold/20 text-nam-green text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                    {selectedSupplier.region}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Available Products</label>
                  <p className="font-bold text-nam-green leading-snug">{selectedSupplier.serviceType}</p>
                </div>

                <a 
                  href={`https://wa.me/${selectedSupplier.whatsappNumber.replace('+', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-3 w-full bg-[#25D366] text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-[#25D366]/30 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <Phone size={24} />
                  WhatsApp
                </a>
              </div>

              <div className="mt-auto">
                <div className="p-6 bg-nam-green text-white rounded-[2rem] shadow-xl">
                   <div className="flex items-center gap-2 mb-2">
                      <Truck size={16} className="text-nam-gold" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Local Delivery</span>
                   </div>
                   <p className="text-[10px] text-white/60 font-medium">This supplier offers direct delivery to your specified location within Windhoek and surrounding areas.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-12 h-12 border-4 border-nam-green border-t-transparent rounded-full"
            />
          </div>
        )}
      </div>

      {/* Quick Access Legend / Info */}
      {!selectedSupplier && !loading && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 bg-nam-green text-white px-8 py-4 rounded-full flex items-center gap-6 shadow-2xl"
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-nam-gold rounded-full animate-pulse" />
            <span className="text-sm font-bold uppercase tracking-widest">{suppliers.length} Active Suppliers</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <p className="text-xs font-medium text-white/60">Click a marker to see details</p>
        </motion.div>
      )}
    </div>
  );
}
