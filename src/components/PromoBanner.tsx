import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Banner } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function PromoBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'banners'));
        const fetchedBanners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner));
        
        // Filter by isActive and date locally
        const today = new Date().toISOString();
        const validBanners = fetchedBanners.filter(b => b.isActive && b.startDate <= today && b.endDate >= today);
        setBanners(validBanners);
      } catch (err) {
        console.error("Failed to fetch banners", err);
      }
    };
    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      }, 5000); // 5 seconds per banner
      return () => clearInterval(interval);
    }
  }, [banners]);

  if (banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  return (
    <div className="w-full relative h-[300px] overflow-hidden rounded-[2.5rem] bg-gray-900 group">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentBanner.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <img 
            src={currentBanner.imageUrl} 
            alt={currentBanner.title} 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
          
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4 shadow-sm">
              {currentBanner.title}
            </h2>
            {currentBanner.linkUrl && (
              <a 
                href={currentBanner.linkUrl}
                className="bg-nam-gold text-nam-green px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                Explore Offer
              </a>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
      
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-nam-gold w-6' : 'bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
