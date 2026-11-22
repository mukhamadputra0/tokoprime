/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, fetchProducts, getSupabaseCredentials, saveProduct } from './lib/supabase';
import { PublicStorefront } from './components/PublicStorefront';
import { AdminCMS } from './components/AdminCMS';
import { SettingsModal } from './components/SettingsModal';
import { EmptyState } from './components/EmptyState';
import { KeyRound, X } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'storefront' | 'admin'>('storefront');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(undefined);
  const [isSeeding, setIsSeeding] = useState(false);

  // Admin Security PIN Gate
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const checkConnectionAndLoad = async () => {
    const creds = getSupabaseCredentials();
    const configured = Boolean(creds.url && creds.key && !creds.url.includes('your-supabase-url'));
    setIsConfigured(configured);

    if (configured) {
      setLoading(true);
      const prods = await fetchProducts(false);
      setProducts(prods);
      setLoading(false);
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if session is already authenticated as admin
    const authSession = sessionStorage.getItem('prime_admin_auth');
    if (authSession === 'true') {
      setIsAdminAuthenticated(true);
    }

    // Parse URL query parameters
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const productParam = params.get('product');

    if (viewParam === 'admin' || window.location.pathname === '/admin') {
      if (authSession === 'true') {
        setCurrentView('admin');
      } else {
        setIsPinModalOpen(true);
      }
    }
    if (productParam) {
      setSelectedSlug(productParam);
    }

    checkConnectionAndLoad();
  }, []);

  const handleAdminAccessRequest = () => {
    if (isAdminAuthenticated) {
      setCurrentView('admin');
    } else {
      setAdminPinInput('');
      setPinError(false);
      setIsPinModalOpen(true);
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default admin pin is 7777 (or user can customize)
    const validPin = localStorage.getItem('prime_admin_pin') || '7777';
    if (adminPinInput.trim() === validPin) {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('prime_admin_auth', 'true');
      setIsPinModalOpen(false);
      setCurrentView('admin');
    } else {
      setPinError(true);
    }
  };

  const handleSeedSample = async () => {
    setIsSeeding(true);
    const sampleProduct: Partial<Product> = {
      slug: 'prime-runner-elite',
      title: 'PRIME RUNNER ELITE X-1',
      subtitle: 'Professional Carbon Plate Athletic Running Shoes',
      original_price: 1299000,
      promo_price: 699000,
      image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
      description: 'Engineered with full-length carbon fiber plate and responsive dual-foam cushioning for maximum explosive energy return during marathon and speed training.',
      highlights: [
        'Full-Length Carbon Fiber Plate',
        'Ultra-Responsive Nitrogen Foam',
        'Breathable Monofilament Mesh Upper',
        'Anti-Slip High Traction Rubber Sole'
      ],
      faq: [
        { q: 'Apakah ukuran sepatu ini true to size?', a: 'Ya, ukuran standar internasional. Disarankan naik 0.5 size jika kaki lebar.' },
        { q: 'Berapa lama garansi pengiriman?', a: 'Pengiriman dijamin aman dengan double box box pelindung.' }
      ],
      shopee_url: 'https://shopee.co.id',
      wa_number: '6281234567890',
      wa_message: 'Halo PRIME STYLE, saya ingin memesan PRIME RUNNER ELITE X-1.',
      cta_mode: 'dual',
      is_active: true
    };

    const { error } = await saveProduct(sampleProduct);
    if (error) {
      alert('Gagal seed sample product: ' + error);
    } else {
      await checkConnectionAndLoad();
      setCurrentView('storefront');
    }
    setIsSeeding(false);
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased relative">

      {loading ? (
        <div className="min-h-[80vh] flex items-center justify-center font-heading font-black text-xl uppercase tracking-wider">
          Loading PRIME STYLE...
        </div>
      ) : currentView === 'admin' && isAdminAuthenticated ? (
        <AdminCMS
          onOpenSettings={() => setIsSettingsOpen(true)}
          onSwitchToStore={(slug) => {
            if (slug) setSelectedSlug(slug);
            setCurrentView('storefront');
          }}
          isConfigured={isConfigured}
        />
      ) : products.filter(p => p.is_active).length === 0 ? (
        <EmptyState
          onOpenAdmin={handleAdminAccessRequest}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onSeedSample={handleSeedSample}
          isConfigured={isConfigured}
          isRefreshing={isSeeding}
        />
      ) : (
        <PublicStorefront
          products={products}
          initialSlug={selectedSlug}
          onOpenAdmin={handleAdminAccessRequest}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isConfigured={isConfigured}
        />
      )}

      {/* Admin PIN Passcode Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white text-black w-full max-w-md border-4 border-black shadow-[8px_8px_0px_0px_#000000] p-6 relative">
            <button
              onClick={() => setIsPinModalOpen(false)}
              className="absolute top-4 right-4 bg-black text-white hover:bg-gray-800 p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-black border-2 border-black text-white">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-black text-xl uppercase tracking-wider">Restricted Admin Access</h3>
                <p className="text-xs text-gray-600 font-medium">Enter Admin Passcode to access CMS & Analytics.</p>
              </div>
            </div>

            {pinError && (
              <div className="mb-4 p-3 bg-red-100 border-2 border-red-500 text-red-700 font-bold text-xs">
                Incorrect Admin PIN. Please try again.
              </div>
            )}

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <label className="block font-heading font-bold text-xs uppercase tracking-wider mb-1">
                  Admin Passcode (PIN)
                </label>
                <input
                  type="password"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  placeholder="Enter Admin PIN"
                  className="w-full bg-[#ECEFF1] border-2 border-black px-3 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:bg-white"
                  autoFocus
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-black font-heading font-bold uppercase text-xs hover:bg-gray-300 border-2 border-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-black text-white font-heading font-black uppercase text-xs hover:bg-gray-800 border-2 border-black shadow-[3px_3px_0px_0px_#000]"
                >
                  Unlock CMS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={checkConnectionAndLoad}
      />
    </div>
  );
}
