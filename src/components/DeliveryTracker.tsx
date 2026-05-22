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
  const [eta, setEta] = useState<string | null>(null); // e.g. "15 mins"
  const [vehicleLocation, setVehicleLocation] = useState<google.maps.LatLngLiteral | null>(null);
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
    const km = meters / 1000;
    if (product?.shippingOptions && product.shippingOptions.length > 0) {
      const selected = product.shippingOptions.find(o => o.id === selectedShippingId);
      if (!selected) return 0;
      
      // If pickup, delivery is free
      if (selected.name.toLowerCase().includes('pickup')) {
        return 0;
      }
      
      // Base cost from shipping option + 5 NAD per km
      return selected.cost + (km * 5);
    }
    // Basic logic: 5 NAD per km, minimum 20 NAD
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
                    (distance ? `Distance: ${(distance / 1000).toFixed(1)} km\n` : '') +
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
                      {vehicleLocation && (
                        <AdvancedMarker position={vehicleLocation} zIndex={100}>
                           <div className="w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center border-[3px] border-nam-gold">
                              <Truck className="text-nam-green" size={24} />
                           </div>
                        </AdvancedMarker>
                      )}
                      
                      <DistanceCalculator
                        origin={farmer?.location ? { lat: farmer.location.lat, lng: farmer.location.lng } : null}
                        destination={userLocation}
                        onRouteCalculated={(dist, duration, vehiclePos) => {
                          setDistance(dist);
                          setEta(duration);
                          if (vehiclePos) setVehicleLocation(vehiclePos);
                        }}
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
              {product && <ImageCarousel imageUrl={product.imageUrl} images={product.images} />}
              <div className="flex items-center gap-4 mb-12 pb-8 border-b border-white/10">
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
                {distance && (
                  <div className="flex justify-between items-center text-white/60 font-bold uppercase tracking-widest text-xs">
                    <span>Distance</span>
                    <span className="text-white">{(distance / 1000).toFixed(1)} km</span>
                  </div>
                )}
                {eta && (
                  <div className="flex justify-between items-center text-white/60 font-bold uppercase tracking-widest text-xs">
                    <span>Live Tracking ETA</span>
                    <span className="text-nam-gold animate-pulse">{eta}</span>
                  </div>
                )}
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

function DistanceCalculator({ origin, destination, onRouteCalculated }: { 
  origin: google.maps.LatLngLiteral | null, 
  destination: google.maps.LatLngLiteral | null,
  onRouteCalculated: (dist: number, durationStr: string, vehiclePos: google.maps.LatLngLiteral | null) => void
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const start = origin || { lat: -22.56, lng: 17.065 };
    
    if (!routesLib || !map || !destination) return;

    polylinesRef.current.forEach(p => p.setMap(null));
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    routesLib.Route.computeRoutes({
      origin: start,
      destination: destination,
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      fields: ['path', 'distanceMeters', 'duration', 'viewport'], // Changed 'durationMillis' to 'duration' assuming it returns string or object
    }).then(({ routes }) => {
      if (routes?.[0]) {
        const route = routes[0];
        
        // Traffic aware polylines if supported, otherwise normal
        const newPolylines = route.createPolylines();
        newPolylines.forEach(p => {
          p.setOptions({ strokeColor: '#F4B400', strokeWeight: 6, strokeOpacity: 0.8 });
          p.setMap(map);
        });
        polylinesRef.current = newPolylines;

        // Try extracting duration string, fallback if not simple string
        let durationStr = "Unknown";
        const anyRoute = route as any;
        if (typeof anyRoute.duration === 'string') {
          durationStr = anyRoute.duration.replace('s', ' seconds');
        } else if (anyRoute.duration) {
          // If it's an object or something else, handle safely
          durationStr = anyRoute.duration?.text || "Unknown";
        }
        
        // Convert 'duration' string if it's like '900s'
        if (typeof anyRoute.duration === 'string' && anyRoute.duration.endsWith('s')) {
             const seconds = parseInt(anyRoute.duration.replace('s', ''), 10);
             if (!isNaN(seconds)) {
                 const minutes = Math.ceil(seconds / 60);
                 durationStr = `${minutes} mins`;
             }
        }

        // Send initial state: Start vehicle at origin
        onRouteCalculated(
           route.distanceMeters || 0,
           durationStr,
           start
        );

        if (route.viewport) map.fitBounds(route.viewport);

        // Optional: animate vehicle along the path just for visual flair
        const allPoints: google.maps.LatLng[] = [];
        newPolylines.forEach(p => {
            const path = p.getPath();
            for (let i = 0; i < path.getLength(); i++) {
                allPoints.push(path.getAt(i));
            }
        });

        if (allPoints.length > 0) {
            let progress = 0;
            const animate = () => {
                progress += 0.005; // speed
                if (progress > 1) progress = 0;
                
                const exactPointIndex = progress * (allPoints.length - 1);
                const i1 = Math.floor(exactPointIndex);
                const i2 = Math.min(i1 + 1, allPoints.length - 1);
                const fraction = exactPointIndex - i1;
                
                const p1 = allPoints[i1];
                const p2 = allPoints[i2];
                const lat = p1.lat() + (p2.lat() - p1.lat()) * fraction;
                const lng = p1.lng() + (p2.lng() - p1.lng()) * fraction;
                
                onRouteCalculated(
                   route.distanceMeters || 0,
                   durationStr,
                   { lat, lng }
                );
                animationRef.current = requestAnimationFrame(animate);
            };
            animate();
        }
      }
    });

    return () => {
       polylinesRef.current.forEach(p => p.setMap(null));
       if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
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

function ImageCarousel({ imageUrl, images }: { imageUrl: string, images?: string[] }) {
  const allImages = React.useMemo(() => {
    const list = [imageUrl];
    if (images) {
       images.forEach(img => {
         if (!list.includes(img)) list.push(img);
       });
    }
    return list.filter(Boolean);
  }, [imageUrl, images]);

  const [currentIndex, setCurrentIndex] = useState(0);

  if (allImages.length === 0) return null;

  return (
    <div className="mb-8 flex flex-col gap-3">
      <div className="relative w-full h-64 rounded-[2rem] overflow-hidden border-[3px] border-nam-gold bg-white group shadow-xl">
        <AnimatePresence mode="wait">
          <motion.img 
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            src={allImages[currentIndex]} 
            alt="Product" 
            className="w-full h-full object-cover"
          />
        </AnimatePresence>
        
        {allImages.length > 1 && (
          <>
              <button 
                 onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev === 0 ? allImages.length - 1 : prev - 1) }}
                 className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
              >
                 <ChevronRight className="rotate-180" size={24} />
              </button>
              <button 
                 onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev === allImages.length - 1 ? 0 : prev + 1) }}
                 className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
              >
                 <ChevronRight size={24} />
              </button>
          </>
        )}
      </div>

      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
          {allImages.map((img, idx) => (
             <button 
               key={idx}
               onClick={() => setCurrentIndex(idx)}
               className={cn(
                 "relative h-16 w-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all snap-start",
                 currentIndex === idx ? "border-white opacity-100 shadow-lg scale-105" : "border-transparent opacity-60 hover:opacity-100"
               )}
             >
               <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
             </button>
          ))}
        </div>
      )}
    </div>
  );
}
