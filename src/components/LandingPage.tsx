import React from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, ArrowRight, MapPin, Truck, CheckCircle, ShieldCheck, Users, Store, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NAMIBIA_REGIONS } from '../constants';
import { GoogleMapsWrapper } from './GoogleMapsWrapper';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const featuredLocations = [
  { name: "Khomas", count: "120+ Farmers", img: "https://images.unsplash.com/photo-1547448415-e9f5b28e570d?auto=format&fit=crop&q=80&w=800" },
  { name: "Erongo", count: "85+ SMEs", img: "https://images.unsplash.com/photo-1521747116042-5a810fda9664?auto=format&fit=crop&q=80&w=800" },
  { name: "Oshana", count: "60+ Producers", img: "https://images.unsplash.com/photo-1500382017468-9049fee74a62?auto=format&fit=crop&q=80&w=800" },
  { name: "Otjozondjupa", count: "45+ Livestock Owners", img: "https://images.unsplash.com/photo-1444858291040-58f756a3bdd6?auto=format&fit=crop&q=80&w=800" },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=2000" 
            className="w-full h-full object-cover brightness-[0.5] contrast-[1.1]"
            alt="Namibian Harvest"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-nam-white via-transparent to-nam-blue/20" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-nam-orange/20 backdrop-blur-md border border-nam-orange/30 text-nam-orange px-4 py-2 rounded-full mb-8"
            >
              <Users size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Empowering Local Producers</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] mb-8"
            >
              FROM FARM <br /> 
              <span className="text-nam-orange italic">TO DOORSTEP.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-white/80 max-w-xl mb-12 leading-relaxed"
            >
              The most trusted marketplace for Namibian SMEs and Farmers. 
              Connecting rural excellence with urban convenience.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link 
                to="/marketplace"
                className="bg-nam-orange text-white px-8 py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-2xl shadow-nam-orange/40 hover:scale-105 active:scale-95 transition-all"
              >
                Start Buying <ShoppingBag />
              </Link>
              <Link 
                to="/dashboard"
                className="bg-white/10 backdrop-blur-xl border border-white/20 text-white px-8 py-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-white/20 active:scale-95 transition-all"
              >
                Register as Vendor <ArrowRight />
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Feature Strips */}
        <div className="absolute bottom-10 left-0 right-0 overflow-hidden hidden lg:block">
           <div className="flex gap-4 animate-marquee whitespace-nowrap opacity-50 select-none">
              {Array(6).fill(NAMIBIA_REGIONS).flat().map((region, i) => (
                <span key={i} className="text-4xl font-black text-white/50 tracking-tighter">
                  {region.toUpperCase()} • 
                </span>
              ))}
           </div>
        </div>
      </section>

      {/* Trust & Region Section */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-6xl font-black text-nam-green tracking-tighter leading-none mb-6">
                PROUDLY SERVING <br /> THE ENTIRE NATION.
              </h2>
              <p className="text-gray-500 font-medium">
                We empower farmers from Khomas to Zambezi, ensuring every Namibian has access 
                to fresh, local goods without middle-man markups.
              </p>
            </div>
            <Link to="/suppliers" className="text-nam-green font-bold flex items-center gap-2 group">
              View All Regions <ArrowRight className="group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredLocations.map((loc, i) => (
              <motion.div
                key={loc.name}
                whileHover={{ y: -10 }}
                className="group relative h-96 rounded-[2rem] overflow-hidden shadow-2xl shadow-nam-green/10"
              >
                <img src={loc.img} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={loc.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-nam-green via-nam-green/20 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8 text-white">
                   <p className="text-xs font-bold uppercase tracking-widest text-nam-gold mb-2">{loc.count}</p>
                   <h3 className="text-3xl font-black tracking-tight">{loc.name}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 bg-gray-50 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-20">
              <span className="text-nam-green font-bold uppercase tracking-widest text-sm mb-4 block underline decoration-nam-gold decoration-4 underline-offset-8">Our Ecosystem</span>
              <h2 className="text-5xl md:text-7xl font-black text-nam-green tracking-tighter">HOW NAMDIRECT WORKS</h2>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Store className="text-nam-gold" size={40} />}
                title="Farmers List Products"
                description="Our simple mobile dashboard lets farmers upload photos and set NAD prices in under 2 minutes."
              />
              <FeatureCard 
                icon={<MapPin className="text-nam-gold" size={40} />}
                title="GPS Precision"
                description="Customers pin their exact delivery location. No complicated addresses needed."
              />
              <FeatureCard 
                icon={<Truck className="text-nam-gold" size={40} />}
                title="Direct Delivery"
                description="Local drivers or farmers deliver products safely to the customer's doorstep."
              />
           </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2">
              <span className="text-nam-gold font-bold uppercase tracking-widest text-sm mb-4 block">Interactive GPS</span>
              <h2 className="text-5xl md:text-7xl font-black text-nam-green tracking-tighter mb-8 italic">
                LOCATE <span className="text-nam-orange">FRESHNESS</span> NEAR YOU.
              </h2>
              <p className="text-gray-500 font-medium text-lg leading-relaxed mb-10">
                Our interactive map shows you exactly where your food is coming from. 
                Connect with suppliers in your local community and reduce carbon footprint.
              </p>
              <div className="space-y-6 mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-nam-gold/20 rounded-xl flex items-center justify-center text-nam-green">
                    <MapPin size={20} />
                  </div>
                  <span className="font-bold text-gray-700">Real-time producer locations</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-nam-gold/20 rounded-xl flex items-center justify-center text-nam-green">
                    <Navigation size={20} />
                  </div>
                  <span className="font-bold text-gray-700">Direct navigation to farm shops</span>
                </div>
              </div>
              <Link 
                to="/suppliers"
                className="inline-flex items-center gap-4 bg-nam-green text-white px-10 py-5 rounded-2xl font-black text-lg shadow-2xl shadow-nam-green/20 hover:scale-105 transition-all"
              >
                Explore Supply Map <ArrowRight />
              </Link>
            </div>

            <div className="lg:w-1/2 w-full h-[500px] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-gray-50 relative group">
              <GoogleMapsWrapper>
                <Map
                  defaultCenter={{ lat: -22.5609, lng: 17.0658 }}
                  defaultZoom={11}
                  gestureHandling={'greedy'}
                  disableDefaultUI={true}
                  style={{ height: '100%', width: '100%' }}
                >
                  <AdvancedMarker position={{ lat: -22.5609, lng: 17.0658 }}>
                    <Pin background="#F4B400" borderColor="#FFFFFF" glyphColor="#FFFFFF" />
                  </AdvancedMarker>
                </Map>
              </GoogleMapsWrapper>
              <div className="absolute inset-0 bg-nam-green/10 pointer-events-none group-hover:opacity-0 transition-opacity" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-nam-red relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-nam-orange/10 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter mb-8 max-w-4xl mx-auto">
            READY TO GROW YOUR BUSINESS?
          </h2>
          <p className="text-white/80 text-xl font-medium mb-12 max-w-2xl mx-auto">
            Join thousands of Namibian SMEs reaching more customers today. 
            Registration is free and takes less than 5 minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link to="/dashboard" className="bg-nam-orange text-white px-10 py-6 rounded-3xl font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-nam-orange/20">
              Register My Business
            </Link>
            <div className="flex items-center gap-8 py-4 px-8 bg-nam-green/5 rounded-3xl">
               <div className="flex flex-col items-start">
                  <span className="text-2xl font-black text-nam-green tracking-tight">264+</span>
                  <span className="text-xs uppercase text-nam-green/60 font-bold">Trusted Farms</span>
               </div>
               <div className="w-[1px] h-8 bg-nam-green/20" />
               <div className="flex flex-col items-start">
                  <span className="text-2xl font-black text-nam-green tracking-tight">15k+</span>
                  <span className="text-xs uppercase text-nam-green/60 font-bold">Local Orders</span>
               </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white p-12 rounded-[3.5rem] shadow-xl shadow-nam-green/5 border border-gray-100 flex flex-col items-center text-center group hover:bg-nam-green transition-all duration-500"
    >
      <div className="mb-8 p-6 bg-gray-50 rounded-3xl group-hover:bg-white/10 transition-colors">
        {icon}
      </div>
      <h3 className="text-3xl font-black text-nam-green tracking-tight mb-6 group-hover:text-nam-gold transition-colors">{title}</h3>
      <p className="text-gray-500 font-medium leading-relaxed group-hover:text-white/80 transition-colors">{description}</p>
    </motion.div>
  );
}
