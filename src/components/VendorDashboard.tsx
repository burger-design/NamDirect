import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { auth, db, storage, handleFirestoreError, googleProvider, OperationType } from '../lib/firebase';
import { signInWithPopup, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { LayoutDashboard, Plus, Package, MapPin, Truck, AlertCircle, CheckCircle2, ChevronRight, Camera, Phone, LogIn, Navigation, Upload, X as CloseIcon } from 'lucide-react';
import { NAMIBIA_REGIONS, NamibiaRegion, SERVICE_TYPES, ServiceType } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { Farmer, Product } from '../types';
import { cn, formatPrice } from '../lib/utils';
import confetti from 'canvas-confetti';

const farmerSchema = z.object({
  businessName: z.string().min(2, "Business name is too short").max(100),
  region: z.enum(NAMIBIA_REGIONS),
  whatsappNumber: z.string().min(7, "Number is too short").max(20),
  serviceType: z.enum(SERVICE_TYPES),
});

const productSchema = z.object({
  name: z.string().min(1, "Product name required"),
  description: z.string().min(10, "Provide a more detailed description"),
  price: z.number().min(0, "Price cannot be negative"),
  unit: z.string().min(1, "e.g. kg, bunch, crate"),
  category: z.string().min(1, "Category required"),
  shippingOptions: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, "Option name required"),
    cost: z.number().min(0),
    estimatedDays: z.string().min(1, "Estimate required"),
  })),
});

type FarmerFormValues = z.infer<typeof farmerSchema>;
type ProductFormValues = z.infer<typeof productSchema>;

export default function VendorDashboard({ user }: { user: User | null }) {
  const [profile, setProfile] = useState<Farmer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (user) {
      fetchProfile(user.uid);
      fetchProducts(user.uid);
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchProducts = async (uid?: string) => {
    const targetUid = uid || user?.uid;
    if (!targetUid) return;
    try {
      // Basic query for now to ensure no permission/index issues
      const q = query(collection(db, 'products'), where('farmerId', '==', targetUid), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({ ...(doc.data() as Product), id: doc.id }));
      setProducts(items);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'products');
    }
  };

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'farmers', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const farmerData = docSnap.data() as Farmer;
        setProfile(farmerData);
        fetchProducts(uid);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
    }
  };

  const onRegisterSubmit = async (data: FarmerFormValues) => {
    if (!user) return;
    try {
      const farmerData: Farmer = {
        uid: user.uid,
        ...data,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'farmers', user.uid), farmerData);
      setProfile(farmerData);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2D5A27', '#F4B400', '#FFFFFF']
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'farmers');
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onProductSubmit = async (data: ProductFormValues & { imageFile?: File }) => {
    if (!user || !profile) return;
    setIsSubmitting(true);
    try {
      let imageUrl = "https://images.unsplash.com/photo-1542838132-92c533bb046e?auto=format&fit=crop&q=80&w=800"; // Default
      
      if (data.imageFile) {
        const storageRef = ref(storage, `products/${user.uid}/${Date.now()}-${data.imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, data.imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      const { imageFile, ...restOfData } = data;
      const productData = {
        ...restOfData,
        farmerId: user.uid,
        region: profile.region,
        stockStatus: true,
        imageUrl,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'products'), productData);
      setProducts([...products, { id: docRef.id, ...productData, createdAt: new Date().toISOString() } as Product]);
      setShowAddProduct(false);
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'products');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  const updateLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      if (!user) return;
      try {
        const location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: "Auto-captured GPS"
        };
        await updateDoc(doc(db, 'farmers', user.uid), { location });
        setProfile(profile ? { ...profile, location } : null);
        alert("Farm location updated successfully!");
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `farmers/${user.uid}`);
      }
    });
  };

  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-[3rem] shadow-2xl shadow-nam-green/10 max-w-lg w-full text-center border border-gray-100"
        >
          <div className="w-20 h-20 bg-nam-green text-nam-gold rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-nam-green/20">
            <LogIn size={40} />
          </div>
          <h2 className="text-4xl font-black text-nam-green tracking-tighter mb-4">VENDOR ACCESS</h2>
          <p className="text-gray-500 font-medium mb-12">
            Sign in with your Google account to manage your farm or SME profile and start listing products.
          </p>
          <button 
            onClick={login}
            className="flex items-center justify-center gap-4 bg-nam-green text-white w-full py-6 rounded-2xl font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-nam-green/20"
          >
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return <div className="h-[80vh] flex items-center justify-center text-nam-green">Loading Profile...</div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen pt-32 pb-20 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-nam-green/10 border border-gray-100">
             <div className="mb-12">
                <span className="text-nam-green font-black uppercase text-xs tracking-widest bg-nam-gold/20 px-3 py-1 rounded-full mb-4 inline-block">Step {step} of 2</span>
                <h2 className="text-5xl font-black text-nam-green tracking-tighter">REGISTER YOUR BUSINESS</h2>
                <p className="text-gray-500 font-medium mt-4">Tell us about your production so customers can find you.</p>
             </div>

             <RegistrationForm onSubmit={onRegisterSubmit} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-nam-gold/20 text-nam-green px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-nam-gold/30">
                {profile.serviceType}
              </span>
              <span className="text-gray-400 font-bold flex items-center gap-1 text-sm"><MapPin size={14} /> {profile.region}</span>
            </div>
            <h2 className="text-5xl font-black text-nam-green tracking-tighter">{profile.businessName}</h2>
          </div>
          <button 
            onClick={() => setShowAddProduct(true)}
            className="flex items-center gap-3 bg-nam-green text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-nam-green/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={20} /> Add New Product
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
             <h3 className="text-2xl font-black text-nam-green tracking-tight flex items-center gap-3">
               <Package /> Active Inventory
             </h3>
             
             {products.length === 0 ? (
               <div className="bg-white p-16 rounded-[3rem] text-center border-2 border-dashed border-gray-200">
                  <Package size={48} className="mx-auto text-gray-300 mb-6" />
                  <p className="text-gray-500 font-bold">You haven't listed any products yet.</p>
                  <button onClick={() => setShowAddProduct(true)} className="text-nam-green font-black underline mt-4 underline-offset-4">Add your first item</button>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {products.map(product => (
                   <div key={product.id} className="bg-white p-8 rounded-[2.5rem] shadow-lg shadow-nam-green/5 border border-gray-100 group">
                      <div className="h-40 w-full mb-6 rounded-2xl overflow-hidden bg-gray-100">
                        <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={product.name} />
                      </div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-xl font-black text-nam-green tracking-tight">{product.name}</h4>
                          <p className="text-sm text-gray-400 font-bold">{product.unit}</p>
                        </div>
                        <span className="text-2xl font-black text-nam-gold tracking-tighter">{formatPrice(product.price)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-50">
                        <span className={cn(
                          "text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest",
                          product.stockStatus ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {product.stockStatus ? 'In Stock' : 'Out of Stock'}
                        </span>
                        <button 
                          onClick={() => deleteProduct(product.id)}
                          className="text-gray-300 hover:text-red-500 font-bold text-xs uppercase"
                        >
                          Remove
                        </button>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>

          <div className="space-y-8">
             <div className="bg-nam-green text-white p-10 rounded-[3rem] shadow-2xl shadow-nam-green/30">
                <h3 className="text-xl font-black tracking-tighter mb-6 flex items-center gap-3"><Truck /> Delivery Logistics</h3>
                <div className="space-y-6">
                   <div className="flex gap-4">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                         <Phone size={18} className="text-nam-gold" />
                      </div>
                      <div>
                         <p className="text-xs uppercase font-bold text-white/60 tracking-widest mb-1">WhatsApp Orders</p>
                         <p className="font-bold text-sm tracking-tight">{profile.whatsappNumber}</p>
                      </div>
                   </div>
                   <div className="flex gap-4">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                         <MapPin size={18} className="text-nam-gold" />
                      </div>
                      <div>
                         <p className="text-xs uppercase font-bold text-white/60 tracking-widest mb-1">Base Region</p>
                         <p className="font-bold text-sm tracking-tight">{profile.region}</p>
                      </div>
                   </div>
                   {profile.location && (
                     <div className="flex gap-4">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                           <Navigation size={18} className="text-nam-gold" />
                        </div>
                        <div>
                           <p className="text-xs uppercase font-bold text-white/60 tracking-widest mb-1">GPS Coordinates</p>
                           <p className="font-bold text-[10px] tracking-tight opacity-70">
                             {profile.location.lat.toFixed(4)}, {profile.location.lng.toFixed(4)}
                           </p>
                        </div>
                     </div>
                   )}
                </div>
                <button 
                  onClick={updateLocation}
                  className="mt-10 w-full bg-nam-gold text-nam-green py-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all"
                >
                   {profile.location ? 'Update Farm GPS' : 'Set Farm GPS Location'}
                </button>
             </div>

             <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                <h3 className="font-black text-nam-green mb-6 text-lg tracking-tight">Recent Orders</h3>
                <div className="flex flex-col items-center justify-center py-10 opacity-30">
                   <AlertCircle size={32} className="mb-4" />
                   <p className="text-sm font-bold">No orders yet</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddProduct(false)}
              className="absolute inset-0 bg-nam-green/60 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white p-10 rounded-[3.5rem] shadow-2xl relative z-10 w-full max-w-xl border border-gray-100"
            >
              <h3 className="text-4xl font-black text-nam-green tracking-tighter mb-8 italic">LIST NEW PRODUCT</h3>
              <ProductForm onSubmit={onProductSubmit} submitting={isSubmitting} />
              <button 
                disabled={isSubmitting}
                onClick={() => setShowAddProduct(false)}
                className="mt-8 text-gray-400 font-bold text-sm uppercase tracking-widest block mx-auto hover:text-nam-green transition-colors disabled:opacity-50"
              >
                Cancel Listing
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RegistrationForm({ onSubmit }: { onSubmit: (data: FarmerFormValues) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FarmerFormValues>({
    resolver: zodResolver(farmerSchema)
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="space-y-2">
        <label className="text-xs font-black uppercase text-gray-400 tracking-widest pl-2">Business or Farm Name</label>
        <input 
          {...register('businessName')}
          className="w-full bg-gray-50 border-0 p-6 rounded-2xl font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-nam-gold transition-all"
          placeholder="e.g. Swakop Greens Farm"
        />
        {errors.businessName && <p className="text-red-500 text-xs font-bold pl-2">{errors.businessName.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase text-gray-400 tracking-widest pl-2">Base Region</label>
          <select 
            {...register('region')}
            className="w-full bg-gray-50 border-0 p-6 rounded-2xl font-bold focus:ring-2 focus:ring-nam-gold appearance-none transition-all"
          >
            {NAMIBIA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="space-y-2">
           <label className="text-xs font-black uppercase text-gray-400 tracking-widest pl-2">Service Type</label>
           <select 
            {...register('serviceType')}
            className="w-full bg-gray-50 border-0 p-6 rounded-2xl font-bold focus:ring-2 focus:ring-nam-gold appearance-none transition-all"
          >
            {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black uppercase text-gray-400 tracking-widest pl-2">WhatsApp Number (For Orders)</label>
        <div className="relative">
          <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
          <input 
            {...register('whatsappNumber')}
            className="w-full bg-gray-50 border-0 p-6 pl-16 rounded-2xl font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-nam-gold transition-all"
            placeholder="+26481... (International Format)"
          />
        </div>
        {errors.whatsappNumber && <p className="text-red-500 text-xs font-bold pl-2">{errors.whatsappNumber.message}</p>}
      </div>

      <button 
        type="submit"
        className="w-full bg-nam-green text-white p-6 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-nam-green/20 hover:scale-[1.02] active:scale-95 transition-all"
      >
        Complete Registration <ChevronRight />
      </button>
    </form>
  );
}

function ProductForm({ onSubmit, submitting }: { onSubmit: (data: ProductFormValues & { imageFile?: File }) => void, submitting: boolean }) {
  const { register, handleSubmit, formState: { errors }, watch, control } = useForm<ProductFormValues & { imageFile?: FileList }>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      shippingOptions: [
        { id: crypto.randomUUID(), name: 'Standard', cost: 50, estimatedDays: '2-3 days' }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "shippingOptions"
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [tempData, setTempData] = useState<(ProductFormValues & { imageFile?: File }) | null>(null);
  
  const imageFiles = watch('imageFile');

  useEffect(() => {
    if (imageFiles && imageFiles.length > 0) {
      const file = imageFiles[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }, [imageFiles]);

  const handleInternalSubmit = (data: ProductFormValues & { imageFile?: FileList }) => {
    const { imageFile, ...rest } = data;
    const finalData = {
      ...rest,
      imageFile: imageFile && imageFile.length > 0 ? imageFile[0] : undefined
    };
    setTempData(finalData);
    setIsConfirming(true);
  };

  const handleFinalConfirm = () => {
    if (tempData) {
      onSubmit(tempData);
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit(handleInternalSubmit)} className={cn("space-y-6 transition-all duration-500", isConfirming ? "opacity-20 blur-sm pointer-events-none scale-95" : "opacity-100")}>
        {/* Image Upload Area */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase text-gray-400 tracking-widest pl-2 mb-2 block">Product Photo</label>
          <div className="relative group">
            <div className={cn(
              "h-48 w-full rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden relative bg-gray-50",
              preview ? "border-nam-gold" : "border-gray-200 hover:border-nam-green"
            )}>
              {preview ? (
                <img src={preview} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <div className="text-center p-6">
                  <Upload className="mx-auto text-gray-300 mb-2" size={32} />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Click or drag image to upload</p>
                </div>
              )}
              <input 
                type="file"
                accept="image/*"
                {...register('imageFile')}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            {preview && (
              <button 
                type="button" 
                onClick={() => {}} // Resetting via React Hook Form is complex here, but user can just click to change
                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <CloseIcon size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <input 
            {...register('name')}
            className="w-full bg-gray-50 border-0 p-6 rounded-2xl font-bold focus:ring-2 focus:ring-nam-gold transition-all"
            placeholder="Product Name (e.g. Fresh Red Peppers)"
          />
          {errors.name && <p className="text-red-500 text-xs font-bold">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <textarea 
            {...register('description')}
            className="w-full bg-gray-50 border-0 p-6 rounded-2xl font-bold focus:ring-2 focus:ring-nam-gold min-h-[120px] transition-all"
            placeholder="Detailed description..."
          />
          {errors.description && <p className="text-red-500 text-xs font-bold">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <input 
              type="number"
              {...register('price', { valueAsNumber: true })}
              className="w-full bg-gray-50 border-0 p-6 rounded-2xl font-bold focus:ring-2 focus:ring-nam-gold transition-all"
              placeholder="Price (NAD)"
            />
            {errors.price && <p className="text-red-500 text-xs font-bold">{errors.price.message}</p>}
          </div>
          <div className="space-y-2">
            <input 
              {...register('unit')}
              className="w-full bg-gray-50 border-0 p-6 rounded-2xl font-bold focus:ring-2 focus:ring-nam-gold transition-all"
              placeholder="Unit (per kg, etc.)"
            />
            {errors.unit && <p className="text-red-500 text-xs font-bold">{errors.unit.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
            <input 
              {...register('category')}
              className="w-full bg-gray-50 border-0 p-6 rounded-2xl font-bold focus:ring-2 focus:ring-nam-gold transition-all"
              placeholder="Category (Vegetables, Crafts, etc.)"
            />
            {errors.category && <p className="text-red-500 text-xs font-bold">{errors.category.message}</p>}
        </div>

        {/* Shipping Options Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Shipping Options</label>
            <button 
              type="button" 
              onClick={() => append({ id: crypto.randomUUID(), name: '', cost: 0, estimatedDays: '' })}
              className="text-nam-green text-xs font-black uppercase tracking-widest flex items-center gap-1 hover:text-nam-gold transition-colors"
            >
              <Plus size={14} /> Add Option
            </button>
          </div>
          
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="bg-gray-50 p-4 rounded-2xl space-y-3 border border-transparent hover:border-nam-gold/30 transition-all relative group">
                <button 
                  type="button" 
                  onClick={() => remove(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-white shadow-lg rounded-full flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-opacity border border-gray-100"
                >
                  <CloseIcon size={12} />
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    {...register(`shippingOptions.${index}.name` as const)}
                    placeholder="Option Name (e.g. Express)"
                    className="w-full bg-white border-0 p-3 rounded-xl text-sm font-bold focus:ring-1 focus:ring-nam-gold"
                  />
                  <input 
                    type="number"
                    {...register(`shippingOptions.${index}.cost` as const, { valueAsNumber: true })}
                    placeholder="Cost (NAD)"
                    className="w-full bg-white border-0 p-3 rounded-xl text-sm font-bold focus:ring-1 focus:ring-nam-gold"
                  />
                </div>
                <input 
                  {...register(`shippingOptions.${index}.estimatedDays` as const)}
                  placeholder="Delivery Estimate (e.g. 1-2 days)"
                  className="w-full bg-white border-0 p-3 rounded-xl text-sm font-bold focus:ring-1 focus:ring-nam-gold"
                />
              </div>
            ))}
          </div>
        </div>

        <button 
          type="submit" 
          className="w-full bg-nam-gold text-nam-green p-6 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-nam-gold/20 hover:scale-[1.02] active:scale-95 transition-all mt-4"
        >
          Review Listing <ChevronRight size={20} />
        </button>
      </form>

      <AnimatePresence>
        {isConfirming && tempData && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/90 backdrop-blur-md rounded-[3rem]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className="relative z-10 w-full text-center"
            >
              <h4 className="text-3xl font-black text-nam-green mb-8 italic uppercase tracking-tighter">Review Details</h4>
              
              <div className="bg-gray-50 p-6 rounded-3xl mb-8 flex items-center gap-6 text-left border border-gray-100">
                <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-gray-200">
                  <img src={preview || "https://images.unsplash.com/photo-1542838132-92c533bb046e?auto=format&fit=crop&q=80&w=800"} className="w-full h-full object-cover" alt="Review" />
                </div>
                <div className="min-w-0">
                  <h5 className="font-black text-nam-green text-xl leading-tight mb-1 truncate">{tempData.name}</h5>
                  <p className="text-2xl font-black text-nam-gold tracking-tighter mb-1">{formatPrice(tempData.price)}</p>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{tempData.unit} • {tempData.category}</p>
                </div>
              </div>

              <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl mb-8 border border-gray-100 space-y-2">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest text-left mb-2">Shipping Options Available</p>
                {tempData.shippingOptions?.map(opt => (
                  <div key={opt.id} className="flex justify-between items-center text-left">
                    <div>
                      <p className="text-xs font-bold text-nam-green">{opt.name}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{opt.estimatedDays}</p>
                    </div>
                    <p className="text-sm font-black text-nam-gold">+{formatPrice(opt.cost)}</p>
                  </div>
                ))}
              </div>

              <div className="text-gray-500 font-medium mb-10 text-sm max-h-32 overflow-y-auto px-4 leading-relaxed text-left scrollbar-hide">
                <p className="font-bold text-nam-green uppercase text-[10px] tracking-widest mb-2 opacity-50">Description</p>
                {tempData.description}
              </div>

              <div className="space-y-4">
                <button 
                  type="button"
                  disabled={submitting}
                  onClick={handleFinalConfirm}
                  className="w-full bg-nam-green text-white p-6 rounded-2xl font-black text-xl shadow-xl shadow-nam-green/20 hover:scale-[1.05] active:scale-95 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center gap-3">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>Listing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      Post to Marketplace <CheckCircle2 size={24} />
                    </div>
                  )}
                </button>
                <button 
                  type="button" 
                  disabled={submitting}
                  onClick={() => setIsConfirming(false)}
                  className="w-full py-2 text-gray-400 font-bold uppercase tracking-widest text-[10px] hover:text-nam-green transition-colors"
                >
                  Back to Edit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
