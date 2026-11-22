import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Package, Plus, Trash2, Edit, Eye, MessageSquare, ShoppingBag, 
  ExternalLink, Copy, Check, Wand2, Sparkles, X, Settings, AlertCircle, ArrowUpRight, Target,
  ChevronUp, ChevronDown, ImagePlus
} from 'lucide-react';
import { Product, AnalyticsEvent, fetchProducts, saveProduct, deleteProduct, fetchAnalyticsSummary, fetchAppSettings, saveAppSettings, parseProductImages } from '../lib/supabase';
import { Logo } from './Logo';

interface AdminCMSProps {
  onOpenSettings: () => void;
  onSwitchToStore: (slug?: string) => void;
  isConfigured: boolean;
}

export const AdminCMS: React.FC<AdminCMSProps> = ({ onOpenSettings, onSwitchToStore, isConfigured }) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'products' | 'tracking'>('analytics');
  const [products, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<{
    totalViews: number;
    totalWaClicks: number;
    totalShopeeClicks: number;
    events: AnalyticsEvent[];
  }>({ totalViews: 0, totalWaClicks: 0, totalShopeeClicks: 0, events: [] });
  
  const [metaPixelId, setMetaPixelId] = useState('');
  const [defaultWaNumber, setDefaultWaNumber] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [copiedRlsSql, setCopiedRlsSql] = useState(false);

  const [loading, setLoading] = useState(true);
  const [selectedUtmCampaign, setSelectedUtmCampaign] = useState<string>('all');

  // Product Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const prods = await fetchProducts(false);
    const summary = await fetchAnalyticsSummary();
    const settings = await fetchAppSettings();
    setProducts(prods);
    setAnalytics(summary);
    if (settings) {
      setMetaPixelId(settings.meta_pixel_id || '');
      setDefaultWaNumber(settings.default_wa_number || '');
    }
    setLoading(false);
  };

  const handleSaveTrackingSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsError(null);
    setSettingsSavedMsg(false);
    const { success, error } = await saveAppSettings({
      meta_pixel_id: metaPixelId,
      default_wa_number: defaultWaNumber
    });
    setSavingSettings(false);
    if (success) {
      setSettingsSavedMsg(true);
      setTimeout(() => setSettingsSavedMsg(false), 2500);
    } else {
      setSettingsError(error || 'Gagal menyimpan settings.');
    }
  };

  const appSettingsRlsSql = `CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  meta_pixel_id TEXT,
  default_wa_number TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;`;

  const copyAppSettingsSql = () => {
    navigator.clipboard.writeText(appSettingsRlsSql);
    setCopiedRlsSql(true);
    setTimeout(() => setCopiedRlsSql(false), 2000);
  };

  useEffect(() => {
    if (isConfigured) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isConfigured]);

  const handleOpenAdd = () => {
    setEditingProduct({
      title: '',
      subtitle: '',
      slug: '',
      original_price: 299000,
      promo_price: 149000,
      image_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
      images: ['https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80'],
      description: '',
      highlights: ['100% Breathable Tech Fabric', 'Pro Athletic Fit', 'Ultra Durable Stitching', 'Sweat Wicking Technology'],
      faq: [
        { q: 'Bagaimana cara menentukan ukuran?', a: 'Gunakan tabel ukuran standar atletik kami atau pilih ukuran biasa Anda.' },
        { q: 'Apakah garansi tukar ukuran berlaku?', a: 'Ya, garansi penukaran ukuran berlaku dalam 3 hari setelah barang diterima.' }
      ],
      shopee_url: 'https://shopee.co.id',
      wa_number: '6281234567890',
      wa_message: 'Halo PRIME STYLE, saya ingin memesan produk ini.',
      cta_mode: 'dual',
      is_active: true
    });
    setAiPrompt('');
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    const imgs = parseProductImages(p.image_url, p.images);
    setEditingProduct({ ...p, images: imgs, image_url: imgs[0] });
    setAiPrompt('');
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Hapus produk ini dari database?')) {
      const success = await deleteProduct(id);
      if (success) {
        loadData();
      } else {
        alert('Gagal menghapus produk.');
      }
    }
  };

  const handleToggleActive = async (p: Product) => {
    const updated = { ...p, is_active: !p.is_active };
    const { error } = await saveProduct(updated);
    if (!error) {
      loadData();
    } else {
      alert('Gagal mengubah status: ' + error);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSaveError(null);

    const { data, error } = await saveProduct(editingProduct);
    if (error) {
      setSaveError(error);
    } else {
      setIsModalOpen(false);
      loadData();
    }
  };

  const handleGenerateAiCopy = async () => {
    if (!editingProduct?.title) {
      alert('Masukkan nama produk terlebih dahulu sebelum generate copy AI.');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt || editingProduct.subtitle || 'High performance athletic wear',
          productName: editingProduct.title,
        })
      });
      const data = await res.json();
      if (data.error) {
        alert('AI Error: ' + data.error);
      } else {
        setEditingProduct(prev => prev ? ({
          ...prev,
          subtitle: data.subtitle || prev.subtitle,
          description: data.description || prev.description,
          highlights: data.highlights || prev.highlights,
          faq: data.faq || prev.faq,
          wa_message: data.waMessage || prev.wa_message
        }) : null);
      }
    } catch (err: any) {
      alert('Gagal menghubungi AI Server: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyAdLink = (slug: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const link = `${baseUrl}?product=${slug}&utm_source=meta&utm_medium=cpc&utm_campaign=launch`;
    navigator.clipboard.writeText(link);
    setCopiedId(slug);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Calculate CTR
  const waCtr = analytics.totalViews > 0 ? ((analytics.totalWaClicks / analytics.totalViews) * 100).toFixed(1) : '0.0';
  const shopeeCtr = analytics.totalViews > 0 ? ((analytics.totalShopeeClicks / analytics.totalViews) * 100).toFixed(1) : '0.0';
  const totalClicks = analytics.totalWaClicks + analytics.totalShopeeClicks;
  const overallCtr = analytics.totalViews > 0 ? ((totalClicks / analytics.totalViews) * 100).toFixed(1) : '0.0';

  // Filter analytics by UTM campaign
  const filteredEvents = selectedUtmCampaign === 'all' 
    ? analytics.events 
    : analytics.events.filter(e => (e.utm_campaign || 'general') === selectedUtmCampaign);

  const uniqueCampaigns = Array.from(new Set(analytics.events.map(e => e.utm_campaign || 'general')));

  return (
    <div className="min-h-screen bg-[#ECEFF1] text-black pb-16">
      {/* Top Header Bar */}
      <header className="bg-black text-white border-b-4 border-black px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo variant="dark" size="sm" />
            <span className="hidden md:inline-block bg-white text-black font-heading font-black text-xs uppercase px-2 py-0.5 border border-black">
              ADMIN CMS & ANALYTICS
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSwitchToStore()}
              className="px-3 py-1.5 bg-white text-black font-heading font-bold text-xs uppercase tracking-wider hover:bg-gray-100 border-2 border-black flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Public Storefront
            </button>
            <button
              onClick={onOpenSettings}
              className="px-3 py-1.5 bg-gray-800 text-white font-heading font-bold text-xs uppercase tracking-wider hover:bg-gray-700 border-2 border-gray-700 flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-white" /> Supabase Settings
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {!isConfigured && (
          <div className="mb-6 p-4 bg-gray-200 border-2 border-black text-black flex items-center justify-between shadow-[4px_4px_0px_0px_#000]">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-heading font-bold uppercase text-sm">Supabase Not Connected</p>
                <p className="text-xs">Connect your Supabase project credentials to store products and record real-time Meta Ads analytics.</p>
              </div>
            </div>
            <button
              onClick={onOpenSettings}
              className="px-4 py-2 bg-black text-white font-heading font-bold uppercase text-xs hover:bg-gray-800 border-2 border-black"
            >
              Configure Now
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b-2 border-black mb-6 bg-white">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 md:flex-none px-6 py-3 font-heading font-black text-base uppercase tracking-wider border-r-2 border-black flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'analytics' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-5 h-5" /> Performance Analytics
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 md:flex-none px-6 py-3 font-heading font-black text-base uppercase tracking-wider border-r-2 border-black flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'products' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            <Package className="w-5 h-5" /> Product Management ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`flex-1 md:flex-none px-6 py-3 font-heading font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'tracking' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            <Target className="w-5 h-5" /> Tracking Settings
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center font-heading font-bold uppercase text-lg">Loading CMS data from Supabase...</div>
        ) : activeTab === 'tracking' ? (
          /* TRACKING SETTINGS TAB */
          <div className="bg-white border-2 border-black p-6 shadow-[6px_6px_0px_0px_#000] max-w-2xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-black">
              <div className="p-2 bg-black text-white border border-black">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-black text-xl uppercase tracking-wider">Meta Pixel & Global Tracking Settings</h3>
                <p className="text-xs text-gray-600">Saved directly to Supabase `app_settings` table for real-time tracking.</p>
              </div>
            </div>

            {settingsSavedMsg && (
              <div className="mb-4 p-3 bg-black text-white font-bold flex items-center gap-2 border-2 border-black">
                <Check className="w-5 h-5 text-white" /> Tracking settings successfully saved to Supabase!
              </div>
            )}

            {settingsError && (
              <div className="mb-5 p-4 bg-red-50 border-2 border-red-600 text-red-900 space-y-3">
                <div className="flex items-start gap-2 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p>Gagal menyimpan settings: {settingsError}</p>
                    {settingsError.toLowerCase().includes('row-level security') && (
                      <p className="text-xs font-normal text-red-800 mt-1">
                        Tabel <code className="font-mono font-bold">app_settings</code> di Supabase masih mengaktifkan Row Level Security (RLS). Jalankan SQL berikut di <strong>Supabase Dashboard &rarr; SQL Editor</strong>:
                      </p>
                    )}
                  </div>
                </div>
                {settingsError.toLowerCase().includes('row-level security') && (
                  <div className="space-y-2">
                    <pre className="bg-black text-white p-3 text-xs font-mono overflow-x-auto border border-black">
                      {appSettingsRlsSql}
                    </pre>
                    <button
                      type="button"
                      onClick={copyAppSettingsSql}
                      className="px-3 py-1.5 bg-black text-white hover:bg-gray-800 text-xs font-heading font-bold uppercase tracking-wider inline-flex items-center gap-1.5 border border-black"
                    >
                      {copiedRlsSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedRlsSql ? 'SQL Disalin!' : 'Copy SQL Fix'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSaveTrackingSettings} className="space-y-5">
              <div>
                <label className="block font-heading font-bold text-sm uppercase tracking-wider mb-1">
                  Meta Pixel ID (e.g., 123456789012345)
                </label>
                <input
                  type="text"
                  value={metaPixelId}
                  onChange={(e) => setMetaPixelId(e.target.value)}
                  placeholder="Enter Meta Pixel ID"
                  className="w-full bg-[#ECEFF1] border-2 border-black px-3 py-2.5 text-sm font-mono focus:outline-none focus:bg-white"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  When configured, the official Meta Pixel base script is automatically injected into the public store head with PageView tracking.
                </p>
              </div>

              <div>
                <label className="block font-heading font-bold text-sm uppercase tracking-wider mb-1">
                  Default WhatsApp Number (Fallback)
                </label>
                <input
                  type="text"
                  value={defaultWaNumber}
                  onChange={(e) => setDefaultWaNumber(e.target.value)}
                  placeholder="6281234567890"
                  className="w-full bg-[#ECEFF1] border-2 border-black px-3 py-2.5 text-sm font-mono focus:outline-none focus:bg-white"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Used as fallback WhatsApp number for products without an individual number.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-3 bg-black text-white font-heading font-black uppercase tracking-wider hover:bg-gray-800 border-2 border-black shadow-[4px_4px_0px_0px_#000]"
                >
                  {savingSettings ? 'Saving...' : 'Save Tracking Settings'}
                </button>
              </div>
            </form>
          </div>
        ) : activeTab === 'analytics' ? (
          /* ANALYTICS TAB */
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_#000]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-heading font-bold text-xs uppercase tracking-wider text-gray-600">Total Page Views</span>
                  <Eye className="w-5 h-5 text-black" />
                </div>
                <div className="font-heading font-black text-4xl text-black">{analytics.totalViews}</div>
                <div className="text-[11px] text-gray-500 mt-1">Real-time Meta Ads traffic</div>
              </div>

              <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_#000]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-heading font-bold text-xs uppercase tracking-wider text-gray-600">WhatsApp Clicks</span>
                  <MessageSquare className="w-5 h-5 text-black" />
                </div>
                <div className="font-heading font-black text-4xl text-black">{analytics.totalWaClicks}</div>
                <div className="text-[11px] text-gray-500 mt-1">CTR: {waCtr}%</div>
              </div>

              <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_#000]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-heading font-bold text-xs uppercase tracking-wider text-gray-600">Shopee Clicks</span>
                  <ShoppingBag className="w-5 h-5 text-black" />
                </div>
                <div className="font-heading font-black text-4xl text-black">{analytics.totalShopeeClicks}</div>
                <div className="text-[11px] text-gray-500 mt-1">CTR: {shopeeCtr}%</div>
              </div>

              <div className="bg-black border-2 border-black p-5 shadow-[4px_4px_0px_0px_#000] text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-heading font-bold text-xs uppercase tracking-wider text-white">Overall Conversion CTR</span>
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div className="font-heading font-black text-4xl text-white">{overallCtr}%</div>
                <div className="text-[11px] text-gray-300 font-semibold mt-1">Combined WA + Shopee CTR</div>
              </div>
            </div>

            {/* Per-Product Performance & UTM Breakdown */}
            <div className="bg-white border-2 border-black p-6 shadow-[6px_6px_0px_0px_#000]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-black">
                <div>
                  <h3 className="font-heading font-black text-xl uppercase tracking-wider">Per-Product & UTM Campaign Breakdown</h3>
                  <p className="text-xs text-gray-600">Real-time performance tracked across Meta Ads campaigns and UTM sources.</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-xs uppercase">Filter UTM Campaign:</span>
                  <select
                    value={selectedUtmCampaign}
                    onChange={(e) => setSelectedUtmCampaign(e.target.value)}
                    className="bg-[#ECEFF1] border-2 border-black px-3 py-1.5 text-xs font-bold uppercase"
                  >
                    <option value="all">All Campaigns ({analytics.events.length})</option>
                    {uniqueCampaigns.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Performance Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black text-white font-heading font-bold uppercase text-xs">
                      <th className="p-3 border border-black">Product Title</th>
                      <th className="p-3 border border-black">Views</th>
                      <th className="p-3 border border-black">WA Clicks</th>
                      <th className="p-3 border border-black">Shopee Clicks</th>
                      <th className="p-3 border border-black">Conversion Rate</th>
                      <th className="p-3 border border-black text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-gray-500 font-medium">No products found. Add your first product to view metrics.</td>
                      </tr>
                    ) : (
                      products.map(prod => {
                        const prodEvents = analytics.events.filter(e => e.product_id === prod.id);
                        const pViews = prodEvents.filter(e => e.event_type === 'view').length;
                        const pWa = prodEvents.filter(e => e.event_type === 'click_wa').length;
                        const pShopee = prodEvents.filter(e => e.event_type === 'click_shopee').length;
                        const pClicks = pWa + pShopee;
                        const pCtr = pViews > 0 ? ((pClicks / pViews) * 100).toFixed(1) : '0.0';

                        return (
                          <tr key={prod.id} className="hover:bg-gray-50 border-b border-black text-sm">
                            <td className="p-3 border border-black font-bold flex items-center gap-3">
                              <img src={prod.image_url} alt="" className="w-10 h-10 object-cover border border-black" />
                              <div>
                                <div>{prod.title}</div>
                                <div className="text-xs text-gray-500 font-normal">/{prod.slug}</div>
                              </div>
                            </td>
                            <td className="p-3 border border-black font-mono font-bold">{pViews}</td>
                            <td className="p-3 border border-black font-mono font-bold">{pWa}</td>
                            <td className="p-3 border border-black font-mono font-bold">{pShopee}</td>
                            <td className="p-3 border border-black font-mono font-bold">{pCtr}%</td>
                            <td className="p-3 border border-black text-right">
                              <button
                                onClick={() => onSwitchToStore(prod.slug)}
                                className="px-3 py-1 bg-black text-white font-heading font-bold text-xs uppercase hover:bg-gray-800 border border-black"
                              >
                                View Landing <ArrowUpRight className="w-3 h-3 inline ml-1" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* PRODUCTS MANAGEMENT TAB */
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000]">
              <div>
                <h3 className="font-heading font-black text-xl uppercase tracking-wider">Active & Draft Products</h3>
                <p className="text-xs text-gray-600">Manage your landing page products, pricing, affiliate links, and Gemini AI copy.</p>
              </div>
              <button
                onClick={handleOpenAdd}
                className="px-5 py-2.5 bg-black text-white font-heading font-black text-sm uppercase tracking-wider hover:bg-gray-800 border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add New Product
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(prod => (
                <div key={prod.id} className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#000] flex flex-col justify-between">
                  <div>
                    <div className="relative h-48 bg-[#ECEFF1] border-b-2 border-black overflow-hidden">
                      <img src={prod.image_url} alt={prod.title} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 flex gap-1">
                        <span className={`px-2 py-0.5 text-[10px] font-heading font-bold uppercase border border-black ${prod.is_active ? 'bg-black text-white' : 'bg-gray-300 text-black'}`}>
                          {prod.is_active ? 'ACTIVE' : 'DRAFT'}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-heading font-bold uppercase bg-white text-black border border-black">
                          {prod.cta_mode.toUpperCase()}
                        </span>
                      </div>
                      {(prod.images?.length || 1) > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black text-white px-2 py-0.5 text-[10px] font-heading font-bold uppercase border border-black">
                          {prod.images?.length} GAMBAR
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="text-xs font-mono text-gray-500">/{prod.slug}</div>
                      <h4 className="font-heading font-black text-xl uppercase leading-tight">{prod.title}</h4>
                      <p className="text-xs text-gray-600 line-clamp-2">{prod.subtitle || prod.description}</p>

                      <div className="flex items-center gap-2 pt-2">
                        <span className="font-heading font-black text-lg text-black">Rp {prod.promo_price?.toLocaleString('id-ID')}</span>
                        {prod.original_price > prod.promo_price && (
                          <span className="text-xs text-gray-400 line-through font-mono">Rp {prod.original_price?.toLocaleString('id-ID')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0 border-t border-gray-200 mt-4 space-y-2">
                    <button
                      onClick={() => copyAdLink(prod.slug)}
                      className="w-full py-2 bg-black text-white hover:bg-gray-900 font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border border-black"
                    >
                      {copiedId === prod.slug ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === prod.slug ? 'Copied Ad URL + UTM!' : 'Copy Ad Link + UTM'}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(prod)}
                        className={`flex-1 py-1.5 font-heading font-bold text-xs uppercase border border-black flex items-center justify-center gap-1 ${
                          prod.is_active ? 'bg-gray-100 text-black' : 'bg-black text-white'
                        }`}
                      >
                        {prod.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        className="p-1.5 bg-gray-100 text-black hover:bg-gray-200 border border-black"
                        title="Edit Product"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(prod.id)}
                        className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 border border-black"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT PRODUCT MODAL DRAWER */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white text-black w-full max-w-3xl border-4 border-black shadow-[10px_10px_0px_0px_#000000] p-6 relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 bg-black text-white hover:bg-gray-800 p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-black border-2 border-black text-white">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-heading font-black text-2xl uppercase tracking-wider">
                  {editingProduct.id ? 'Edit Athletic Product' : 'Add New Product'}
                </h2>
                <p className="text-xs text-gray-600 font-medium">Configure landing page details, pricing, affiliate links, and Gemini AI copy.</p>
              </div>
            </div>

            {saveError && (
              <div className="mb-4 p-3 bg-red-100 border-2 border-red-500 text-red-700 font-bold text-sm">
                Error saving product: {saveError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Gemini AI Copywriter Box */}
              <div className="bg-[#ECEFF1] border-2 border-black p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-black" />
                  <span className="font-heading font-bold text-sm uppercase">Gemini AI Copywriter Assistant</span>
                </div>
                <p className="text-xs text-gray-700">
                  Enter raw product notes or keywords below and click generate to instantly populate high-converting Indonesian marketing copy, highlights, and FAQs.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. Sepatu running profesional, ultra ringan, sol anti slip, hitam neon"
                    className="flex-1 bg-white border-2 border-black px-3 py-2 text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAiCopy}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-black text-white font-heading font-black text-xs uppercase tracking-wider hover:bg-gray-800 border-2 border-black whitespace-nowrap flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" /> {isGenerating ? 'Generating...' : 'Generate Copy with AI'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-heading font-bold text-xs uppercase tracking-wider mb-1">Product Title</label>
                  <input
                    type="text"
                    value={editingProduct.title || ''}
                    onChange={(e) => {
                      const title = e.target.value;
                      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                      setEditingProduct(prev => prev ? ({ ...prev, title, slug }) : null);
                    }}
                    placeholder="PRIME RUNNER X-1"
                    className="w-full bg-[#ECEFF1] border-2 border-black px-3 py-2 text-sm font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-heading font-bold text-xs uppercase tracking-wider mb-1">URL Slug</label>
                  <input
                    type="text"
                    value={editingProduct.slug || ''}
                    onChange={(e) => setEditingProduct(prev => prev ? ({ ...prev, slug: e.target.value }) : null)}
                    placeholder="prime-runner-x1"
                    className="w-full bg-[#ECEFF1] border-2 border-black px-3 py-2 text-sm font-medium font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-heading font-bold text-xs uppercase tracking-wider mb-1">Subtitle / Tagline</label>
                <input
                  type="text"
                  value={editingProduct.subtitle || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? ({ ...prev, subtitle: e.target.value }) : null)}
                  placeholder="Official Pro Athletic Running Shoes"
                  className="w-full bg-[#ECEFF1] border-2 border-black px-3 py-2 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-heading font-bold text-xs uppercase tracking-wider mb-1">Original Price (Rp)</label>
                  <input
                    type="number"
                    value={editingProduct.original_price || 0}
                    onChange={(e) => setEditingProduct(prev => prev ? ({ ...prev, original_price: Number(e.target.value) }) : null)}
                    className="w-full bg-[#ECEFF1] border-2 border-black px-3 py-2 text-sm font-medium font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-heading font-bold text-xs uppercase tracking-wider mb-1">Promo Price (Rp)</label>
                  <input
                    type="number"
                    value={editingProduct.promo_price || 0}
                    onChange={(e) => setEditingProduct(prev => prev ? ({ ...prev, promo_price: Number(e.target.value) }) : null)}
                    className="w-full bg-[#ECEFF1] border-2 border-black px-3 py-2 text-sm font-medium font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-heading font-bold text-xs uppercase tracking-wider mb-1">CTA Mode</label>
                  <select
                    value={editingProduct.cta_mode || 'dual'}
                    onChange={(e) => setEditingProduct(prev => prev ? ({ ...prev, cta_mode: e.target.value as any }) : null)}
                    className="w-full bg-[#ECEFF1] border-2 border-black px-3 py-2 text-sm font-bold uppercase"
                  >
                    <option value="dual">Dual (WhatsApp & Shopee)</option>
                    <option value="shopee">Shopee Only</option>
                    <option value="wa">WhatsApp Only</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-heading font-bold text-xs uppercase tracking-wider">
                    Product Images ({(editingProduct.images && editingProduct.images.length > 0 ? editingProduct.images : [editingProduct.image_url || '']).length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const current = editingProduct.images && editingProduct.images.length > 0
                        ? [...editingProduct.images]
                        : [editingProduct.image_url || ''];
                      current.push('');
                      setEditingProduct(prev => prev ? ({ ...prev, images: current }) : null);
                    }}
                    className="px-2.5 py-1 bg-black text-white hover:bg-gray-800 text-[11px] font-heading font-bold uppercase tracking-wider flex items-center gap-1 border border-black"
                  >
                    <ImagePlus className="w-3.5 h-3.5" /> Tambah Gambar
                  </button>
                </div>

                <div className="space-y-2 bg-[#ECEFF1] border-2 border-black p-3">
                  {(editingProduct.images && editingProduct.images.length > 0
                    ? editingProduct.images
                    : [editingProduct.image_url || '']
                  ).map((imgUrl, index, arr) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-white border border-black flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {imgUrl ? (
                          <img src={imgUrl} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-mono text-gray-400">#{index + 1}</span>
                        )}
                      </div>

                      <input
                        type="text"
                        value={imgUrl}
                        onChange={(e) => {
                          const updated = [...arr];
                          updated[index] = e.target.value;
                          setEditingProduct(prev => prev ? ({
                            ...prev,
                            images: updated,
                            image_url: updated[0] || ''
                          }) : null);
                        }}
                        placeholder={index === 0 ? 'Main image URL (https://...)' : `Gallery image #${index + 1} URL (https://...)`}
                        className="flex-1 bg-white border-2 border-black px-3 py-1.5 text-xs font-medium font-mono"
                      />

                      <div className="flex items-center gap-1">
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...arr];
                              [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
                              setEditingProduct(prev => prev ? ({
                                ...prev,
                                images: updated,
                                image_url: updated[0] || ''
                              }) : null);
                            }}
                            className="p-1.5 bg-white text-black hover:bg-gray-200 border border-black"
                            title="Geser ke atas"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {index < arr.length - 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...arr];
                              [updated[index + 1], updated[index]] = [updated[index], updated[index + 1]];
                              setEditingProduct(prev => prev ? ({
                                ...prev,
                                images: updated,
                                image_url: updated[0] || ''
                              }) : null);
                            }}
                            className="p-1.5 bg-white text-black hover:bg-gray-200 border border-black"
                            title="Geser ke bawah"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {arr.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = arr.filter((_, i) => i !== index);
                              setEditingProduct(prev => prev ? ({
                                ...prev,
                                images: updated,
                                image_url: updated[0] || ''
                              }) : null);
                            }}
                            className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 border border-black"
                            title="Hapus gambar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-gray-600">
                    Gambar pertama akan menjadi gambar utama. Anda dapat menambahkan beberapa URL gambar untuk galeri slide di halaman produk.
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-heading font-bold text-xs uppercase tracking-wider mb-1">Description</label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                  rows={3}
                  placeholder="Detailed product description..."
                  className="w-full bg-[#ECEFF1] border-2 border-black p-3 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-heading font-bold text-xs uppercase tracking-wider mb-1">Shopee Affiliate Link</label>
                  <input
                    type="text"
                    value={editingProduct.shopee_url || ''}
                    onChange={(e) => setEditingProduct(prev => prev ? ({ ...prev, shopee_url: e.target.value }) : null)}
                    placeholder="https://shopee.co.id/..."
                    className="w-full bg-[#ECEFF1] border-2 border-black px-3 py-2 text-sm font-medium font-mono"
                  />
                </div>

                <div>
                  <label className="block font-heading font-bold text-xs uppercase tracking-wider mb-1">WhatsApp Number (e.g. 628...)</label>
                  <input
                    type="text"
                    value={editingProduct.wa_number || ''}
                    onChange={(e) => setEditingProduct(prev => prev ? ({ ...prev, wa_number: e.target.value }) : null)}
                    placeholder="6281234567890"
                    className="w-full bg-[#ECEFF1] border-2 border-black px-3 py-2 text-sm font-medium font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-heading font-bold text-xs uppercase tracking-wider mb-1">Pre-filled WhatsApp Message</label>
                <input
                  type="text"
                  value={editingProduct.wa_message || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? ({ ...prev, wa_message: e.target.value }) : null)}
                  placeholder="Halo PRIME STYLE, saya ingin memesan..."
                  className="w-full bg-[#ECEFF1] border-2 border-black px-3 py-2 text-sm font-medium"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active_checkbox"
                  checked={editingProduct.is_active ?? true}
                  onChange={(e) => setEditingProduct(prev => prev ? ({ ...prev, is_active: e.target.checked }) : null)}
                  className="w-5 h-5 accent-black"
                />
                <label htmlFor="is_active_checkbox" className="font-heading font-bold text-sm uppercase">
                  Active & Published on Public Storefront
                </label>
              </div>

              <div className="pt-4 border-t-2 border-black flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-200 text-black font-heading font-bold uppercase tracking-wider hover:bg-gray-300 border-2 border-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-black text-white font-heading font-black uppercase tracking-wider hover:bg-gray-800 border-2 border-black shadow-[4px_4px_0px_0px_#000]"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
