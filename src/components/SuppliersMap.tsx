import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { GoogleMapsWrapper } from './GoogleMapsWrapper';
import { NamibiaRegion } from '../constants';
import { MapPin, Phone, Store, Navigation, X, Truck, Search } from 'lucide-react';
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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSuppliers = React.useMemo(() => {
    return suppliers.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const matchName = s.businessName?.toLowerCase().includes(q);
      const matchRegion = s.region?.toLowerCase().includes(q);
      const matchService = s.serviceType?.toLowerCase().includes(q);
      return matchName || matchRegion || matchService;
    });
  }, [suppliers, searchQuery]);

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

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting user location:", error);
          let errMsg = "Location access denied";
          if (error.code === error.POSITION_UNAVAILABLE) {
            errMsg = "Location unavailable";
          } else if (error.code === error.TIMEOUT) {
            errMsg = "Location request timed out";
          }
          setGeoError(errMsg);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGeoError("Geolocation not supported");
    }
  }, []);

  const requestLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.error("Error retry getting user location:", error);
        setGeoError("Failed to access location");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const distance = React.useMemo(() => {
    if (!userLocation || !selectedSupplier || !selectedSupplier.location) return null;
    const R = 6371; // Earth's radius in km
    const dLat = (selectedSupplier.location.lat - userLocation.lat) * Math.PI / 180;
    const dLng = (selectedSupplier.location.lng - userLocation.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(selectedSupplier.location.lat * Math.PI / 180) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }, [userLocation, selectedSupplier]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex-grow relative">
        {/* Search Bar */}
        <div className="absolute top-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-10 w-auto md:w-full md:max-w-md pointer-events-auto">
          <div className="relative bg-white/95 backdrop-blur-sm shadow-xl rounded-full border border-gray-100 flex items-center pr-2 pl-5 py-3">
            <Search size={18} className="text-gray-400 shrink-0 mr-3" />
            <input
              type="text"
              placeholder="Search by supplier name or region..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm font-bold text-gray-800 bg-transparent outline-none placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 mr-2"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <GoogleMapsWrapper>
          <Map
            defaultCenter={{ lat: -22.5609, lng: 17.0658 }} // Windhoek
            defaultZoom={12}
            gestureHandling={'greedy'}
            mapId="SUPPLIERS_MAP"
            style={{ height: '100%', width: '100%' }}
          >
            {filteredSuppliers.map(s => (
              <AdvancedMarker 
                key={s.id} 
                position={s.location!}
                onClick={() => setSelectedSupplier(s)}
              >
                  <div className="relative group/pin cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:scale-110 z-0 hover:z-10">
                    {selectedSupplier?.id === s.id ? (
                      <>
                        {/* Beautiful outer expanding pulse ripple */}
                        <motion.div
                          initial={{ scale: 1, opacity: 0.8 }}
                          animate={{ scale: 2.2, opacity: 0 }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.8,
                            ease: "easeOut"
                          }}
                          className="absolute -inset-1 rounded-full bg-nam-gold pointer-events-none"
                        />
                        {/* Secondary breathing halo */}
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.8,
                            ease: "easeInOut"
                          }}
                          className="absolute -inset-2 rounded-full bg-nam-gold/30 pointer-events-none"
                        />
                      </>
                    ) : (
                      /* Hover glow for unselected pins */
                      <div className="absolute -inset-1.5 rounded-full bg-nam-green/20 opacity-0 group-hover/pin:opacity-100 pointer-events-none transition-opacity duration-300" />
                    )}
                    <div className={cn(
                      "relative flex items-center justify-center w-12 h-12 rounded-full border-4 shadow-xl overflow-hidden transition-colors",
                      selectedSupplier?.id === s.id ? "bg-nam-gold border-white" : "bg-nam-green border-white group-hover/pin:bg-nam-green/90 group-hover/pin:border-nam-gold/30"
                    )}>
                      {s.businessName ? (
                        <span className="font-extrabold text-white text-lg uppercase tracking-tighter">
                          {s.businessName.substring(0, 2)}
                        </span>
                      ) : (
                        <Store size={20} className="text-white" />
                      )}
                    </div>
                  </div>
              </AdvancedMarker>
            ))}
          </Map>
        </GoogleMapsWrapper>
        
        {/* Legend */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-3xl shadow-xl z-0 border border-gray-100 flex flex-col gap-3 pointer-events-none">
          <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Map Legend</h4>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-nam-green border-2 border-white shadow-sm flex items-center justify-center shrink-0">
               <Store size={14} className="text-white" />
            </div>
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Available Supplier</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-nam-gold border-2 border-white shadow-sm flex items-center justify-center shrink-0">
               <Store size={14} className="text-white" />
            </div>
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Selected Supplier</span>
          </div>
        </div>

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

                <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Distance from You</label>
                  {distance !== null ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Navigation size={18} className="text-nam-gold shrink-0 animate-pulse" />
                      <span className="font-black text-nam-green text-lg tracking-tight">
                        {distance >= 1 
                          ? `${distance.toFixed(2)} km` 
                          : `${(distance * 1000).toFixed(0)} meters`
                        }
                      </span>
                    </div>
                  ) : geoError ? (
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-xs font-semibold text-red-500">{geoError}</span>
                      <button 
                        onClick={requestLocation} 
                        className="text-[10px] font-black text-nam-green uppercase tracking-widest hover:underline text-left self-start mt-1 cursor-pointer"
                      >
                        Retry Location
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-4 h-4 border-2 border-nam-green border-t-transparent rounded-full"
                      />
                      <span className="text-xs font-bold text-gray-500">Checking location...</span>
                    </div>
                  )}
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
            <span className="text-sm font-bold uppercase tracking-widest">
              {searchQuery ? `${filteredSuppliers.length} of ${suppliers.length} Match` : `${suppliers.length} Active Suppliers`}
            </span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <p className="text-xs font-medium text-white/60">
            {searchQuery && filteredSuppliers.length === 0 ? "No matching suppliers found" : "Click a marker to see details"}
          </p>
        </motion.div>
      )}
    </div>
  );
}
