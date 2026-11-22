import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Zap, ArrowRight, MessageSquare, ShoppingBag, ChevronDown, 
  ChevronUp, CheckCircle, Flame, Star, Award, Lock, ExternalLink, Settings,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Product, trackEvent, fetchAppSettings, parseProductImages } from '../lib/supabase';
import { Logo } from './Logo';

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.766.469 3.484 1.344 5l-1.406 5.156 5.281-1.375c1.469.797 3.109 1.219 4.75 1.219 5.516 0 9.969-4.453 9.969-9.969S17.547 2 12.031 2zm5.813 14.125c-.25.703-1.438 1.344-2 1.438-.516.078-1.172.109-1.891-.125-.438-.141-.984-.328-1.703-.641-3-1.297-4.953-4.328-5.109-4.531-.156-.203-1.219-1.625-1.219-3.094 0-1.469.766-2.188 1.047-2.484.266-.297.594-.375.797-.375.203 0 .406.016.578.016.188 0 .438-.078.688.516.25.609.859 2.094.938 2.25.078.156.125.344.031.547-.094.203-.141.328-.297.5-.156.172-.313.375-.453.516-.141.156-.297.313-.125.609.172.297.766 1.266 1.641 2.047 1.125 1 2.078 1.313 2.375 1.469.297.141.469.125.641-.078.172-.203.75-.875.953-1.172.203-.297.406-.25.672-.156.266.094 1.719.813 2.016.953.297.156.484.219.563.344.078.125.078.734-.172 1.438z" />
  </svg>
);

const ShopeeIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M16.5 6.5h-1.2a3.3 3.3 0 0 0-6.6 0H7.5A2.5 2.5 0 0 0 5 9v10.5A2.5 2.5 0 0 0 7.5 22h9a2.5 2.5 0 0 0 2.5-2.5V9a2.5 2.5 0 0 0-2.5-2.5zM12 4.7a1.8 1.8 0 0 1 1.8 1.8h-3.6A1.8 1.8 0 0 1 12 4.7zm.2 14.3c-1.45 0-2.58-.53-3.27-1.3l1.07-1.18c.54.56 1.28.93 2.17.93.86 0 1.41-.35 1.41-.9 0-.52-.43-.79-1.36-1.01l-.67-.16c-1.39-.32-2.29-1.06-2.29-2.37 0-1.44 1.21-2.44 2.93-2.44 1.27 0 2.26.43 2.95 1.12l-1.01 1.15c-.55-.49-1.19-.76-1.95-.76-.73 0-1.24.31-1.24.83 0 .51.45.74 1.29.94l.69.16c1.54.36 2.38 1.07 2.38 2.41 0 1.52-1.2 2.58-3.1 2.58z" />
  </svg>
);

interface PublicStorefrontProps {
  products: Product[];
  initialSlug?: string;
  onOpenAdmin: () => void;
  onOpenSettings: () => void;
  isConfigured: boolean;
}

export const PublicStorefront: React.FC<PublicStorefrontProps> = ({
  products,
  initialSlug,
  onOpenAdmin,
  onOpenSettings,
  isConfigured
}) => {
  const activeProducts = products.filter(p => p.is_active);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [defaultWaFallback, setDefaultWaFallback] = useState('6281234567890');

  // Load app settings (Meta Pixel & default WA) from Supabase
  useEffect(() => {
    if (isConfigured) {
      fetchAppSettings().then(settings => {
        if (settings) {
          if (settings.default_wa_number) {
            setDefaultWaFallback(settings.default_wa_number);
          }
          if (settings.meta_pixel_id) {
            const pixelId = settings.meta_pixel_id.trim();
            if (pixelId && !window.document.getElementById('meta-pixel-script')) {
              const script = document.createElement('script');
              script.id = 'meta-pixel-script';
              script.textContent = `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                if(s&&s.parentNode){s.parentNode.insertBefore(t,s)}else{b.head.appendChild(t)}}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', ${JSON.stringify(pixelId)});
                fbq('track', 'PageView');
              `;
              document.head.appendChild(script);
            }
          }
        }
      });
    }
  }, [isConfigured]);

  // Accordions open state
  const [openDesc, setOpenDesc] = useState(true);
  const [openHighlights, setOpenHighlights] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Parse UTM parameters from URL
  const getUtmParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || 'direct',
      utm_campaign: params.get('utm_campaign') || 'general',
      utm_content: params.get('utm_content') || '',
    };
  };

  useEffect(() => {
    if (activeProducts.length > 0) {
      let found: Product | undefined;
      if (initialSlug) {
        found = activeProducts.find(p => p.slug === initialSlug);
      }
      setSelectedProduct(found || activeProducts[0]);
    }
  }, [products, initialSlug]);

  // Reset active image and track page view on select product
  useEffect(() => {
    setActiveImageIndex(0);
    if (selectedProduct && isConfigured) {
      const utm = getUtmParams();
      trackEvent({
        product_id: selectedProduct.id,
        event_type: 'view',
        utm_source: utm.utm_source,
        utm_campaign: utm.utm_campaign,
        utm_content: utm.utm_content,
      });
    }
  }, [selectedProduct?.id, isConfigured]);

  if (!selectedProduct) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-4">
        <Logo variant="light" size="lg" />
        <p className="font-heading font-bold text-xl uppercase mt-4 mb-6">No active athletic products published.</p>
        <button
          onClick={onOpenAdmin}
          className="px-6 py-3 bg-black text-white font-heading font-black uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_0px_#000]"
        >
          Open Admin CMS to Publish Products
        </button>
      </div>
    );
  }

  const handleWhatsAppClick = () => {
    const utm = getUtmParams();
    if (isConfigured) {
      trackEvent({
        product_id: selectedProduct.id,
        event_type: 'click_wa',
        utm_source: utm.utm_source,
        utm_campaign: utm.utm_campaign,
        utm_content: utm.utm_content,
      });
    }

    // Fire Meta Pixel event if available
    if (typeof (window as any).fbq === 'function') {
      (window as any).fbq('track', 'Lead', {
        content_name: selectedProduct.title,
        value: selectedProduct.promo_price,
        currency: 'IDR'
      });
    }

    const phone = selectedProduct.wa_number || defaultWaFallback;
    const message = encodeURIComponent(
      (selectedProduct.wa_message || 'Halo PRIME STYLE, saya tertarik dengan produk ini.') + 
      `\n\nProduk: ${selectedProduct.title} (Rp ${selectedProduct.promo_price?.toLocaleString('id-ID')})`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleShopeeClick = () => {
    const utm = getUtmParams();
    if (isConfigured) {
      trackEvent({
        product_id: selectedProduct.id,
        event_type: 'click_shopee',
        utm_source: utm.utm_source,
        utm_campaign: utm.utm_campaign,
        utm_content: utm.utm_content,
      });
    }

    // Fire Meta Pixel event if available
    if (typeof (window as any).fbq === 'function') {
      (window as any).fbq('track', 'InitiateCheckout', {
        content_name: selectedProduct.title,
        value: selectedProduct.promo_price,
        currency: 'IDR'
      });
    }

    const url = selectedProduct.shopee_url || 'https://shopee.co.id';
    window.open(url, '_blank');
  };

  const discountPercent = selectedProduct.original_price > selectedProduct.promo_price
    ? Math.round(((selectedProduct.original_price - selectedProduct.promo_price) / selectedProduct.original_price) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-white text-black pb-28 md:pb-16 selection:bg-black selection:text-white">
      {/* Top Header */}
      <header className="bg-black text-white border-b-4 border-black px-4 py-3 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Logo variant="dark" size="sm" />

          <div className="flex items-center gap-3">
            {/* Admin button hidden from public storefront */}
          </div>
        </div>
      </header>

      {/* Product Selector Tabs (if multiple active products) */}
      {activeProducts.length > 1 && (
        <div className="bg-[#ECEFF1] border-b-2 border-black py-2 px-4">
          <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="font-heading font-bold text-xs uppercase text-gray-600 whitespace-nowrap">Select Model:</span>
            {activeProducts.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className={`px-3 py-1 font-heading font-black text-xs uppercase tracking-wider whitespace-nowrap border-2 border-black transition-all ${
                  selectedProduct.id === p.id ? 'bg-black text-white shadow-[2px_2px_0px_0px_#000]' : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Landing Container */}
      <main className="max-w-4xl mx-auto px-4 py-6 md:py-10 space-y-8">
        
        {/* Above The Fold Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white border-4 border-black p-4 md:p-8 shadow-[8px_8px_0px_0px_#000]">
          
          {/* Product Studio Image Gallery */}
          {(() => {
            const productImages = parseProductImages(selectedProduct.image_url, selectedProduct.images);
            const safeIndex = activeImageIndex < productImages.length ? activeImageIndex : 0;
            const currentImage = productImages[safeIndex];
            const hasMultiple = productImages.length > 1;

            return (
              <div className="space-y-3">
                <div className="relative bg-[#ECEFF1] border-2 border-black aspect-square overflow-hidden flex items-center justify-center">
                  <img 
                    src={currentImage} 
                    alt={`${selectedProduct.title} - ${safeIndex + 1}`} 
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  {discountPercent > 0 && (
                    <div className="absolute top-3 left-3 bg-black text-white font-heading font-black text-xs uppercase px-2.5 py-1 border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                      SAVE {discountPercent}% OFF
                    </div>
                  )}

                  {hasMultiple && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveImageIndex((safeIndex - 1 + productImages.length) % productImages.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-black hover:text-white text-black p-1.5 border-2 border-black transition-colors"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveImageIndex((safeIndex + 1) % productImages.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-black hover:text-white text-black p-1.5 border-2 border-black transition-colors"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-3 left-3 bg-white text-black font-heading font-black text-[11px] uppercase px-2 py-0.5 border border-black">
                        {safeIndex + 1} / {productImages.length}
                      </div>
                    </>
                  )}

                  <div className="absolute bottom-3 right-3 bg-black text-white font-heading font-bold text-[10px] uppercase px-2 py-0.5 border border-black">
                    PRIME STUDIO FRAME
                  </div>
                </div>

                {hasMultiple && (
                  <div className="grid grid-cols-5 gap-2">
                    {productImages.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        className={`aspect-square bg-[#ECEFF1] overflow-hidden border-2 transition-all ${
                          idx === safeIndex
                            ? 'border-black shadow-[2px_2px_0px_0px_#000] opacity-100'
                            : 'border-gray-300 opacity-65 hover:opacity-100 hover:border-black'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`${selectedProduct.title} thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Product Info & Pricing */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 bg-black text-white px-2.5 py-1 text-xs font-heading font-extrabold uppercase tracking-widest border border-black">
              <Flame className="w-3.5 h-3.5 fill-white" /> OFFICIAL ATHLETIC RELEASE
            </div>

            <h1 className="font-heading font-black text-3xl md:text-5xl uppercase tracking-tighter leading-none">
              {selectedProduct.title}
            </h1>

            <p className="text-sm font-medium text-gray-700">
              {selectedProduct.subtitle || selectedProduct.description}
            </p>

            {/* Pricing Box */}
            <div className="bg-[#ECEFF1] border-2 border-black p-4 space-y-1">
              <div className="text-xs font-heading font-bold uppercase text-gray-500">PROMO EXCLUSIVE PRICE</div>
              <div className="flex items-baseline gap-3">
                <span className="font-heading font-black text-3xl md:text-4xl text-black">
                  Rp {selectedProduct.promo_price?.toLocaleString('id-ID')}
                </span>
                {selectedProduct.original_price > selectedProduct.promo_price && (
                  <span className="text-base text-gray-500 line-through font-mono">
                    Rp {selectedProduct.original_price?.toLocaleString('id-ID')}
                  </span>
                )}
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="border border-black p-2 text-center bg-white">
                <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-black" />
                <span className="text-[10px] font-heading font-bold uppercase">100% Original</span>
              </div>
              <div className="border border-black p-2 text-center bg-white">
                <Award className="w-4 h-4 mx-auto mb-1 text-black" />
                <span className="text-[10px] font-heading font-bold uppercase">Pro Grade</span>
              </div>
              <div className="border border-black p-2 text-center bg-white">
                <Star className="w-4 h-4 mx-auto mb-1 text-black" />
                <span className="text-[10px] font-heading font-bold uppercase">Top Rated</span>
              </div>
            </div>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex flex-col gap-3 pt-2">
              {(selectedProduct.cta_mode === 'dual' || selectedProduct.cta_mode === 'wa') && (
                <button
                  onClick={handleWhatsAppClick}
                  className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#1EB954] text-white font-heading font-black text-base uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000] flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <WhatsAppIcon className="w-6 h-6 text-white flex-shrink-0" />
                  <span>Pesan via WhatsApp</span>
                  <span className="text-[10px] bg-black/20 px-1.5 py-0.5 font-sans font-bold tracking-normal">Fast Response</span>
                </button>
              )}

              {(selectedProduct.cta_mode === 'dual' || selectedProduct.cta_mode === 'shopee') && (
                <button
                  onClick={handleShopeeClick}
                  className="w-full py-3.5 px-4 bg-[#EE4D2D] hover:bg-[#D73211] text-white font-heading font-black text-base uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000] flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <ShopeeIcon className="w-6 h-6 text-white flex-shrink-0" />
                  <span>Beli di Shopee</span>
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Accordions Section: Description, Highlights, FAQ */}
        <div className="space-y-4">
          
          {/* Description Accordion */}
          <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000]">
            <button
              onClick={() => setOpenDesc(!openDesc)}
              className="w-full p-4 flex items-center justify-between font-heading font-black text-lg uppercase tracking-wider bg-[#ECEFF1] border-b-2 border-black"
            >
              <span>Product Description & Engineering</span>
              {openDesc ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {openDesc && (
              <div className="p-5 text-sm text-gray-800 leading-relaxed font-medium">
                {selectedProduct.description || 'Designed with high-density kinetic fabric, PRIME STYLE gear provides maximum ventilation, uncompromised structural support, and elite athletic aesthetics for heavy training sessions and daily conditioning.'}
              </div>
            )}
          </div>

          {/* Highlights Accordion */}
          <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000]">
            <button
              onClick={() => setOpenHighlights(!openHighlights)}
              className="w-full p-4 flex items-center justify-between font-heading font-black text-lg uppercase tracking-wider bg-[#ECEFF1] border-b-2 border-black"
            >
              <span>Key Performance Highlights</span>
              {openHighlights ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {openHighlights && (
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedProduct.highlights && selectedProduct.highlights.length > 0 ? (
                  selectedProduct.highlights.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 p-3 bg-[#ECEFF1] border-2 border-black font-medium text-sm">
                      <CheckCircle className="w-4 h-4 text-black flex-shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-600">Pro athletic grade durability and ergonomic comfort.</div>
                )}
              </div>
            )}
          </div>

          {/* FAQ Accordion */}
          <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000]">
            <div className="p-4 font-heading font-black text-lg uppercase tracking-wider bg-[#ECEFF1] border-b-2 border-black">
              Frequently Asked Questions (FAQ)
            </div>
            <div className="divide-y-2 divide-black">
              {selectedProduct.faq && selectedProduct.faq.length > 0 ? (
                selectedProduct.faq.map((item, idx) => (
                  <div key={idx} className="p-4">
                    <button
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="w-full flex items-center justify-between font-heading font-bold text-base uppercase text-left"
                    >
                      <span>{item.q}</span>
                      {openFaq === idx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {openFaq === idx && (
                      <p className="mt-2 text-sm text-gray-700 font-medium bg-[#ECEFF1] p-3 border border-black">
                        {item.a}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 text-sm text-gray-600">No FAQ questions added yet.</div>
              )}
            </div>
          </div>

        </div>

        {/* Meta Ads Compliant Footer Disclaimer */}
        <footer className="bg-black text-white border-4 border-black p-6 text-center space-y-4 shadow-[6px_6px_0px_0px_#000000]">
          <Logo variant="dark" size="sm" />
          <p className="text-xs text-gray-400 max-w-xl mx-auto leading-relaxed">
            This site is not a part of the Facebook website or Facebook Inc. Additionally, this site is NOT endorsed by Facebook in any way. FACEBOOK is a trademark of FACEBOOK, Inc.
          </p>
          <div className="text-xs font-heading font-bold uppercase text-white tracking-widest pt-2">
            © {new Date().getFullYear()} PRIME STYLE ATHLETICS. ALL RIGHTS RESERVED.
          </div>
        </footer>

      </main>

      {/* Sticky Bottom Bar on Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black p-3 z-40 shadow-[0px_-4px_12px_rgba(0,0,0,0.15)]">
        <div className="flex items-center gap-2.5">
          {(selectedProduct.cta_mode === 'dual' || selectedProduct.cta_mode === 'wa') && (
            <button
              onClick={handleWhatsAppClick}
              className="flex-1 py-3 px-3 bg-[#25D366] active:bg-[#1EB954] text-white font-heading font-black text-sm uppercase tracking-wider border-2 border-black flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_#000]"
            >
              <WhatsAppIcon className="w-5 h-5 text-white flex-shrink-0" />
              <span>WhatsApp</span>
            </button>
          )}

          {(selectedProduct.cta_mode === 'dual' || selectedProduct.cta_mode === 'shopee') && (
            <button
              onClick={handleShopeeClick}
              className="flex-1 py-3 px-3 bg-[#EE4D2D] active:bg-[#D73211] text-white font-heading font-black text-sm uppercase tracking-wider border-2 border-black flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_#000]"
            >
              <ShopeeIcon className="w-5 h-5 text-white flex-shrink-0" />
              <span>Beli di Shopee</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
