import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Product, Farmer } from '../types';
import { MapPin, Navigation, Truck, Phone, MessageCircle, AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleMapsWrapper } from './GoogleMapsWrapper';
import { formatPrice, cn } from '../lib/utils';

export default function DeliveryTracker() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId');
  const [product, setProduct] = useState<Product | null>(null);
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [distance, setDistance] = useState<number | null>(null); // in meters
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (productId) {
      fetchDetails();
    } else {
      setLoading(false);
    }
  }, [productId]);

  const fetchDetails = async () => {
    try {
      const pDoc = await getDoc(doc(db, 'products', productId!));
      if (pDoc.exists()) {
        const pData = { id: pDoc.id, ...pDoc.data() } as Product;
        setProduct(pData);
        if (pData.shippingOptions && pData.shippingOptions.length > 0) {
          setSelectedShippingId(pData.shippingOptions[0].id);
        }
        const fDoc = await getDoc(doc(db, 'farmers', pData.farmerId));
        if (fDoc.exists()) {
          setFarmer(fDoc.data() as Farmer);
        }
      } else {
        setError("Product not found");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        console.error(err);
        alert("Please enable location access to calculate delivery.");
      }
    );
  };

  const calculateDeliveryFee = (meters: number) => {
    if (product?.shippingOptions && product.shippingOptions.length > 0) {
      const selected = product.shippingOptions.find(o => o.id === selectedShippingId);
      return selected ? selected.cost : 0;
    }
    // Basic logic: 5 NAD per km, minimum 20 NAD
    const km = meters / 1000;
    return Math.max(20, km * 5);
  };

  const generateWhatsAppLink = () => {
    if (!farmer || !product || !userLocation) return "#";
    const googleMapsLink = `https://www.google.com/maps?q=${userLocation.lat},${userLocation.lng}`;
    const selectedShipping = product.shippingOptions?.find(o => o.id === selectedShippingId);
    
    const deliveryMethodStr = selectedShipping 
      ? `Delivery Method: ${selectedShipping.name} (${selectedShipping.estimatedDays})` 
      : `Delivery: Requested at Doorstep`;

    const message = `Hello ${farmer.businessName}! I would like to order ${product.name}.\n\n` + 
                    `Delivery Location: ${googleMapsLink}\n` + 
                    `Product: ${product.name} (${formatPrice(product.price)})\n` +
                    `${deliveryMethodStr}\n` +
                    `Total with Delivery: ${formatPrice(product.price + calculateDeliveryFee(distance || 0))}\n\n` + 
                    `Please confirm if you can deliver!`;
    return `https://wa.me/${farmer.whatsappNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-nam-green font-black">LOCATING...</div>;

  if (!productId || error) {
    return (
      <div className="pt-32 pb-20 px-4 min-h-screen bg-gray-50 flex items-center justify-center">
         <div className="bg-white p-16 rounded-[4rem] text-center shadow-xl shadow-nam-green/10 border border-gray-100 max-w-lg">
            <AlertTriangle size={64} className="mx-auto text-nam-gold mb-8" />
            <h2 className="text-4xl font-black text-nam-green tracking-tighter italic mb-4">OOPS!</h2>
            <p className="text-gray-400 font-medium mb-12">Please select a product from the marketplace first to use the delivery tracker.</p>
            <button onClick={() => navigate('/marketplace')} className="bg-nam-green text-white px-10 py-6 rounded-3xl font-black shadow-xl shadow-nam-green/20">Go to Marketplace</button>
         </div>
      </div>
    );
  }

  return (
    <>
      <div className="pt-24 min-h-screen bg-gray-50 flex flex-col">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left: Map & GPS */}
            <div className="space-y-8">
              <div className="bg-white p-10 rounded-[4rem] shadow-xl shadow-nam-green/5 border border-gray-100">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-4xl font-black text-nam-green tracking-tighter italic">DOORSTEP DELIVERY</h2>
                    <p className="text-gray-400 font-medium text-sm">Pin your exact location for the farmer.</p>
                  </div>
                  <button
                    onClick={captureLocation}
                    className="p-5 bg-nam-gold text-nam-green rounded-3xl shadow-xl shadow-nam-gold/30 hover:scale-110 active:scale-95 transition-all"
                    title="Use My GPS"
                  >
                    <Navigation size={28} />
                  </button>
                </div>

                <div className="h-[500px] w-full rounded-[3rem] overflow-hidden border-4 border-gray-50 shadow-inner relative">
                  <GoogleMapsWrapper>
                    <Map
                      defaultCenter={{ lat: -22.5609, lng: 17.0658 }} // Windhoek
                      defaultZoom={12}
                      center={userLocation}
                      gestureHandling={'greedy'}
                      mapId="DELIVERY_MAP"
                      style={{ height: '100%', width: '100%' }}
                    >
                      {userLocation && (
                        <AdvancedMarker position={userLocation}>
                          <div className="relative">
                            <motion.div
                              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className="absolute -inset-4 bg-nam-green/20 rounded-full"
                            />
                            <Pin background="#2D5A27" borderColor="#FFFFFF" glyphColor="#FFFFFF" />
                          </div>
                        </AdvancedMarker>
                      )}
                      <DistanceCalculator
                        origin={farmer?.location ? { lat: farmer.location.lat, lng: farmer.location.lng } : null}
                        destination={userLocation}
                        onDistanceCalculated={setDistance}
                      />
                    </Map>
                  </GoogleMapsWrapper>

                  {!userLocation && (
                    <div className="absolute inset-0 bg-nam-green/10 backdrop-blur-sm flex items-center justify-center p-8 text-center">
                      <div className="max-w-xs bg-white p-10 rounded-[3rem] shadow-2xl">
                        <MapPin className="mx-auto text-nam-gold mb-6" size={48} />
                        <h3 className="text-xl font-black text-nam-green tracking-tighter mb-4">WHERE ARE YOU?</h3>
                        <button
                          onClick={captureLocation}
                          className="w-full bg-nam-green text-white py-4 rounded-2xl font-black shadow-lg shadow-nam-green/20 active:scale-95 transition-all"
                        >
                          Capture My GPS
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <ServiceFeature icon={<Truck />} text="Fast Delivery" />
                <ServiceFeature icon={<ShieldCheck />} text="Safe Logistics" />
              </div>

              {product?.shippingOptions && product.shippingOptions.length > 0 && (
                <div className="bg-white p-10 rounded-[4rem] shadow-xl shadow-nam-green/5 border border-gray-100 border-nam-gold/20">
                  <h3 className="text-2xl font-black text-nam-green tracking-tighter mb-6 uppercase italic">Select Shipping Method</h3>
                  <div className="space-y-4">
                    {product.shippingOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setSelectedShippingId(option.id)}
                        className={cn(
                          "w-full p-6 rounded-3xl border-2 transition-all text-left flex justify-between items-center",
                          selectedShippingId === option.id
                            ? "border-nam-green bg-nam-green/5 shadow-inner"
                            : "border-gray-100 hover:border-nam-gold"
                        )}
                      >
                        <div>
                          <p className="font-black text-nam-green text-lg">{option.name}</p>
                          <p className="text-sm font-bold text-gray-400">{option.estimatedDays}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-nam-gold">{formatPrice(option.cost)}</p>
                          {selectedShippingId === option.id && (
                            <span className="text-[10px] font-black uppercase text-nam-green tracking-widest">Selected</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Order Summary */}
            <div className="bg-nam-green text-white p-12 rounded-[4rem] shadow-2xl shadow-nam-green/30 sticky top-32">
              <div className="flex items-center gap-4 mb-12 pb-8 border-b border-white/10">
                <div className="w-16 h-16 rounded-3xl overflow-hidden shrink-0 border-2 border-nam-gold">
                  <img src={product?.imageUrl} className="w-full h-full object-cover" alt={product?.name} />
                </div>
                <div>
                  <h3 className="text-3xl font-black tracking-tighter leading-none mb-1">{product?.name}</h3>
                  <p className="text-white/60 font-bold text-sm tracking-tight">Vendor: {farmer?.businessName}</p>
                </div>
              </div>

              <div className="space-y-6 mb-12">
                <div className="flex justify-between items-center text-white/60 font-bold uppercase tracking-widest text-xs">
                  <span>Product Price</span>
                  <span className="text-white">{formatPrice(product?.price || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-white/60 font-bold uppercase tracking-widest text-xs">
                  <span>Delivery Option</span>
                  <span className="text-white">
                    {product?.shippingOptions?.find((o) => o.id === selectedShippingId)?.name || (distance ? "Standard Delivery" : "---")}
                  </span>
                </div>
                <div className="flex justify-between items-center text-white/60 font-bold uppercase tracking-widest text-xs">
                  <span>Delivery Fee</span>
                  <span className="text-nam-gold">
                    {distance || (product?.shippingOptions && product.shippingOptions.length > 0)
                      ? formatPrice(calculateDeliveryFee(distance || 0))
                      : "Capture Location"}
                  </span>
                </div>
                <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-white/40 font-black uppercase tracking-widest text-[10px] mb-1">Total Amount Due</span>
                    <span className="text-5xl font-black text-nam-gold tracking-tighter">
                      {distance || (product?.shippingOptions && product.shippingOptions.length > 0)
                        ? formatPrice((product?.price || 0) + calculateDeliveryFee(distance || 0))
                        : formatPrice(product?.price || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => userLocation && setShowConfirmation(true)}
                  disabled={!userLocation}
                  className={cn(
                    "flex items-center justify-center gap-4 w-full py-8 rounded-[2.5rem] font-black text-2xl tracking-tighter transition-all shadow-2xl",
                    userLocation
                      ? "bg-nam-gold text-nam-green shadow-nam-gold/40 hover:scale-105 active:scale-95"
                      : "bg-white/10 text-white/30 cursor-not-allowed"
                  )}
                >
                  <MessageCircle size={32} /> WhatsApp Farmer
                </button>
                <div className="flex items-center justify-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
                  <ShieldCheck size={14} className="text-green-500" /> Secure Handover Guarantee
                </div>
              </div>

              {!userLocation && (
                <p className="mt-8 text-center text-nam-gold/60 text-xs font-bold animate-pulse italic">
                  * Capture your location to enable order button
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showConfirmation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmation(false)}
              className="absolute inset-0 bg-nam-green/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[4rem] p-12 shadow-2xl relative z-10 w-full max-w-lg border border-white/20 text-center"
            >
              <div className="w-24 h-24 bg-nam-gold/20 rounded-full flex items-center justify-center mx-auto mb-8">
                <MessageCircle size={48} className="text-nam-green" />
              </div>

              <h3 className="text-4xl font-black text-nam-green tracking-tighter italic mb-4">READY TO ORDER?</h3>
              <p className="text-gray-400 font-medium mb-10 leading-relaxed">
                This will open WhatsApp to message <span className="text-nam-green font-bold">{farmer?.businessName}</span> and finalize your order for{" "}
                <span className="text-nam-green font-bold">{product?.name}</span>.
              </p>

              <div className="space-y-4">
                <a
                  href={generateWhatsAppLink()}
                  onClick={() => setShowConfirmation(false)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-4 w-full py-6 bg-nam-green text-white rounded-3xl font-black text-xl shadow-xl shadow-nam-green/20 hover:scale-105 active:scale-95 transition-all"
                >
                  Continue to WhatsApp <ChevronRight size={20} />
                </a>
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="w-full py-4 text-gray-400 font-bold uppercase tracking-widest text-sm hover:text-nam-green transition-colors"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function DistanceCalculator({ origin, destination, onDistanceCalculated }: { 
  origin: google.maps.LatLngLiteral | null, 
  destination: google.maps.LatLngLiteral | null,
  onDistanceCalculated: (dist: number) => void
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    const start = origin || { lat: -22.56, lng: 17.065 };
    
    if (!routesLib || !map || !destination) return;

    polylinesRef.current.forEach(p => p.setMap(null));

    routesLib.Route.computeRoutes({
      origin: start,
      destination: destination,
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'viewport'],
    }).then(({ routes }) => {
      if (routes?.[0]) {
        const newPolylines = routes[0].createPolylines();
        newPolylines.forEach(p => {
          p.setOptions({ strokeColor: '#F4B400', strokeWeight: 6, strokeOpacity: 0.8 });
          p.setMap(map);
        });
        polylinesRef.current = newPolylines;
        onDistanceCalculated(routes[0].distanceMeters || 0);
        if (routes[0].viewport) map.fitBounds(routes[0].viewport);
      }
    });

    return () => polylinesRef.current.forEach(p => p.setMap(null));
  }, [routesLib, map, origin, destination]);

  return null;
}

function ServiceFeature({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-nam-green/5 border border-gray-100 flex flex-col items-center justify-center text-center">
       <div className="w-12 h-12 bg-nam-gold/20 text-nam-green rounded-xl flex items-center justify-center mb-4 italic">
          {icon}
       </div>
       <span className="text-xs font-black text-nam-green uppercase tracking-widest">{text}</span>
    </div>
  );
}
