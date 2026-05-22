import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Home, ShoppingBag, Store, MapPin, Search, User as UserIcon, LogOut, Menu, X, ChevronRight, Phone, ShoppingCart as CartIcon, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { CartProvider, useCart } from './lib/CartContext';

// Components
import LandingPage from './components/LandingPage';
import Marketplace from './components/Marketplace';
import VendorDashboard from './components/VendorDashboard';
import DeliveryTracker from './components/DeliveryTracker';
import SuppliersMap from './components/SuppliersMap';
import Registration from './components/Registration';
import CartSheet from './components/CartSheet';

import CustomerOrderHistory from './components/CustomerOrderHistory';

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { totalItems } = useCart();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-nam-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-nam-green border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-nam-white font-sans flex flex-col">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-nam-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-10 h-10 bg-nam-green rounded-xl flex items-center justify-center text-nam-gold group-hover:scale-110 transition-transform">
                  <ShoppingBag size={24} />
                </div>
                <span className="text-2xl font-black text-nam-green tracking-tighter">NamDirect</span>
              </Link>

              {/* Desktop Nav */}
              <div className="hidden md:flex items-center gap-8">
                <Link to="/marketplace" className="text-sm font-medium text-gray-600 hover:text-nam-green transition-colors">Marketplace</Link>
                <Link to="/suppliers" className="text-sm font-medium text-gray-600 hover:text-nam-green transition-colors">Suppliers</Link>
                <Link to="/dashboard" className="text-sm font-medium text-gray-600 hover:text-nam-green transition-colors">Vendor Portal</Link>
                
                <div className="flex items-center gap-4 border-l pl-8 border-gray-100">
                  <button 
                    onClick={() => setIsCartOpen(true)}
                    className="relative p-2 text-nam-green hover:bg-nam-gold/10 rounded-full transition-all group"
                  >
                    <CartIcon size={24} />
                    {totalItems > 0 && (
                      <span className="absolute top-0 right-0 w-5 h-5 bg-nam-gold text-nam-green text-[10px] font-black rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        {totalItems}
                      </span>
                    )}
                  </button>

                  {user ? (
                    <div className="flex items-center gap-4 border-l pl-4 border-gray-100">
                      <Link to="/orders" className="text-sm font-bold text-nam-green hover:text-nam-gold transition-colors">
                        My Orders
                      </Link>
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-full bg-nam-gold/20 flex items-center justify-center text-nam-green border border-nam-gold/30">
                          <UserIcon size={16} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 hidden lg:block">{user.email?.split('@')[0]}</span>
                      </div>
                      <button 
                        onClick={() => auth.signOut()}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Log Out"
                      >
                        <LogOut size={18} />
                      </button>
                    </div>
                  ) : (
                    <Link 
                      to="/registration"
                      className="bg-nam-green text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-nam-green/20 hover:bg-nam-green/90 transition-all active:scale-95"
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              </div>

              {/* Mobile Menu Button */}
              <div className="flex items-center gap-2 md:hidden">
                <button 
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-2 text-nam-green"
                >
                  <CartIcon size={28} />
                  {totalItems > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-nam-gold text-nam-green text-[10px] font-black rounded-full flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </button>
                <button 
                  className="p-2 text-nam-green"
                  onClick={() => setIsNavOpen(!isNavOpen)}
                >
                  {isNavOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Cart Sheet */}
        <CartSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {isNavOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsNavOpen(false)}
                className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 w-4/5 max-w-sm bg-nam-white z-[70] p-8 shadow-2xl"
              >
                <div className="flex flex-col gap-6 mt-8">
                  <MobileNavLink to="/marketplace" label="Marketplace" icon={<ShoppingBag />} onClick={() => setIsNavOpen(false)} />
                  <MobileNavLink to="/suppliers" label="Our Suppliers" icon={<MapPin />} onClick={() => setIsNavOpen(false)} />
                  <MobileNavLink to="/dashboard" label="Vendor Portal" icon={<Store />} onClick={() => setIsNavOpen(false)} />
                  {user && <MobileNavLink to="/orders" label="My Orders" icon={<ShoppingBag />} onClick={() => setIsNavOpen(false)} />}
                  <MobileNavLink to="/delivery" label="Track Delivery" icon={<Navigation />} onClick={() => setIsNavOpen(false)} />
                  
                  <div className="pt-6 border-t border-gray-100 mt-auto">
                    {user ? (
                      <button 
                        onClick={() => { auth.signOut(); setIsNavOpen(false); }}
                        className="flex items-center gap-4 text-red-500 font-bold p-4 bg-red-50 rounded-2xl w-full"
                      >
                        <LogOut />
                        Sign Out
                      </button>
                    ) : (
                      <Link 
                        to="/registration"
                        onClick={() => setIsNavOpen(false)}
                        className="bg-nam-green text-white p-5 rounded-2xl text-center font-bold shadow-xl shadow-nam-green/20"
                      >
                        Join NamDirect
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/dashboard" element={<VendorDashboard user={user} />} />
            <Route path="/delivery" element={<DeliveryTracker />} />
            <Route path="/orders" element={<CustomerOrderHistory user={user} />} />
            <Route path="/suppliers" element={<SuppliersMap />} />
            <Route path="/registration" element={<Registration />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-nam-green pt-20 pb-10 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-nam-white rounded-lg flex items-center justify-center text-nam-green">
                    <ShoppingBag size={20} />
                  </div>
                  <span className="text-2xl font-black tracking-tighter">NamDirect</span>
                </div>
                <p className="text-white/60 max-w-sm leading-relaxed">
                  Connecting Namibian farmers and SMEs directly with their local communities. 
                  Fresh products, delivered to your doorstep, at fair prices.
                </p>
              </div>
              <div>
                <h4 className="font-bold mb-6 text-nam-gold uppercase tracking-widest text-xs">Explore</h4>
                <ul className="space-y-4 text-sm text-white/80 font-medium">
                  <li><Link to="/marketplace" className="hover:text-nam-gold transition-colors">Browse Products</Link></li>
                  <li><Link to="/suppliers" className="hover:text-nam-gold transition-colors">Our Suppliers</Link></li>
                  <li><Link to="/delivery" className="hover:text-nam-gold transition-colors">Delivery Zones</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-6 text-nam-gold uppercase tracking-widest text-xs">Legal</h4>
                <ul className="space-y-4 text-sm text-white/80 font-medium">
                  <li><a href="#" className="hover:text-nam-gold transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-nam-gold transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-nam-gold transition-colors">Vendor Agreement</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/40">
              <p>© 2026 NamDirect. Built for Namibia with Pride.</p>
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-1"><Phone size={14} /> (+264817246373)</span>
                <span>Windhoek, Namibia</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

function MobileNavLink({ to, label, icon, onClick }: { to: string, label: string, icon: React.ReactNode, onClick: () => void }) {
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-nam-gold/10 group transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="text-nam-green group-hover:scale-110 transition-transform">{icon}</div>
        <span className="font-bold text-gray-700">{label}</span>
      </div>
      <ChevronRight size={18} className="text-gray-300 group-hover:text-nam-green" />
    </Link>
  );
}

export default function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}
