import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { ShoppingBag, Store, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Registration() {
  const [role, setRole] = useState<'customer' | 'farmer' | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    if (!role) return;
    
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user already exists
      const userDoc = await getDoc(doc(db, role === 'farmer' ? 'farmers' : 'users', user.uid));
      
      if (!userDoc.exists()) {
        const timestamp = new Date().toISOString();
        if (role === 'farmer') {
          // Farmers need to complete their profile in the dashboard
          // But we create the initial record
          await setDoc(doc(db, 'farmers', user.uid), {
            uid: user.uid,
            email: user.email,
            isProfileComplete: false,
            createdAt: timestamp
          });
        } else {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: timestamp,
            role: 'customer'
          });
        }
      }

      navigate(role === 'farmer' ? '/dashboard' : '/marketplace');
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-7xl font-black text-nam-green tracking-tighter italic uppercase mb-4">
            JOIN <span className="text-nam-gold">THE TRIBE.</span>
          </h1>
          <p className="text-gray-500 font-medium text-lg">Choose how you want to participate in NamDirect.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Customer Option */}
          <RoleCard 
            selected={role === 'customer'}
            onClick={() => setRole('customer')}
            title="Buy Fresh"
            description="Access fresh produce and artisanal products directly from local Namibian producers."
            icon={<ShoppingBag size={48} />}
            color="bg-nam-gold"
          />

          {/* Farmer Option */}
          <RoleCard 
            selected={role === 'farmer'}
            onClick={() => setRole('farmer')}
            title="Start Selling"
            description="Grow your business by reaching thousands of customers across Namibia."
            icon={<Store size={48} />}
            color="bg-nam-green"
          />
        </div>

        <AnimatePresence>
          {role && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-12 flex justify-center"
            >
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className={cn(
                  "flex items-center gap-4 px-10 py-6 rounded-3xl font-black text-xl transition-all shadow-2xl",
                  role === 'customer' ? "bg-nam-gold text-nam-green shadow-nam-gold/30" : "bg-nam-green text-white shadow-nam-green/30",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <>
                    Continue with Google
                    <ChevronRight size={24} />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function RoleCard({ selected, onClick, title, description, icon, color }: { 
  selected: boolean, 
  onClick: () => void, 
  title: string, 
  description: string, 
  icon: React.ReactNode,
  color: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative p-8 rounded-[40px] text-left transition-all border-4 flex flex-col gap-8 h-full group",
        selected 
          ? `border-nam-green bg-white shadow-2xl scale-105 z-10` 
          : "border-transparent bg-gray-50 hover:bg-white hover:border-gray-100"
      )}
    >
      <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center text-white transition-transform group-hover:scale-110", color)}>
        {icon}
      </div>

      <div className="flex-grow">
        <h3 className="text-3xl font-black text-nam-green tracking-tight mb-4 uppercase italic">
          {title}
        </h3>
        <p className="text-gray-500 font-medium leading-relaxed">
          {description}
        </p>
      </div>

      {selected && (
        <div className="absolute top-6 right-6 text-nam-green">
          <CheckCircle2 size={32} />
        </div>
      )}
    </button>
  );
}

import { AnimatePresence } from 'motion/react';
