import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Product {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  original_price: number;
  promo_price: number;
  image_url: string;
  images?: string[];
  description: string;
  highlights: string[];
  faq: { q: string; a: string }[];
  shopee_url: string;
  wa_number: string;
  wa_message: string;
  cta_mode: 'dual' | 'shopee' | 'wa';
  is_active: boolean;
  created_at?: string;
}

const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80';

export function parseProductImages(imageUrl?: string | null, imagesField?: unknown): string[] {
  if (Array.isArray(imagesField)) {
    const cleaned = imagesField.map(u => String(u || '').trim()).filter(Boolean);
    if (cleaned.length > 0) return cleaned;
  }

  if (typeof imageUrl === 'string' && imageUrl.trim()) {
    const trimmed = imageUrl.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.map(u => String(u || '').trim()).filter(Boolean);
          if (cleaned.length > 0) return cleaned;
        }
      } catch {
        // Fallback to treating as raw URL string
      }
    }
    return [trimmed];
  }

  return [DEFAULT_PRODUCT_IMAGE];
}

function normalizeProduct(row: any): Product {
  const images = parseProductImages(row.image_url, row.images);
  return {
    ...row,
    original_price: Number(row.original_price ?? row.price_original ?? 0),
    promo_price: Number(row.promo_price ?? row.price_promo ?? 0),
    wa_message: row.wa_message ?? row.wa_text ?? '',
    image_url: images[0] || DEFAULT_PRODUCT_IMAGE,
    images,
  };
}

export interface AnalyticsEvent {
  id?: string;
  product_id?: string;
  event_type: 'view' | 'click_wa' | 'click_shopee';
  utm_source?: string;
  utm_campaign?: string;
  utm_content?: string;
  created_at?: string;
}

export interface AppSettings {
  id?: number;
  meta_pixel_id: string;
  default_wa_number: string;
  updated_at?: string;
}

// Get credentials from env or runtime memory/localStorage for settings modal
export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('prime_supabase_url') : '';
  const savedKey = typeof window !== 'undefined' ? localStorage.getItem('prime_supabase_key') : '';

  return {
    url: savedUrl || envUrl,
    key: savedKey || envKey,
  };
}

export function saveSupabaseCredentials(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('prime_supabase_url', url.trim());
    localStorage.setItem('prime_supabase_key', key.trim());
  }
}

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key || url.includes('your-supabase-url')) {
    return null;
  }
  if (cachedClient && url === lastUrl && key === lastKey) {
    return cachedClient;
  }
  try {
    cachedClient = createClient(url, key);
    lastUrl = url;
    lastKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

// Database helper functions
export async function fetchProducts(activeOnly = false): Promise<Product[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  let query = supabase.from('products').select('*').order('created_at', { ascending: false });
  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching products:', error.message);
    return [];
  }
  return (data || []).map(normalizeProduct);
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching product by slug:', error.message);
    return null;
  }
  return data ? normalizeProduct(data) : null;
}

export async function saveProduct(product: Partial<Product>): Promise<{ data: Product | null; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: 'Supabase is not connected' };

  const rawImages = product.images && product.images.length > 0
    ? product.images
    : parseProductImages(product.image_url);
  const cleanImages = rawImages.map(u => String(u || '').trim()).filter(Boolean);
  const finalImages = cleanImages.length > 0 ? cleanImages : [DEFAULT_PRODUCT_IMAGE];
  const serializedImageUrl = finalImages.length > 1 ? JSON.stringify(finalImages) : finalImages[0];

  const isUpdate = Boolean(product.id);
  const payload = {
    slug: product.slug || product.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    title: product.title,
    subtitle: product.subtitle || '',
    price_original: Number(product.original_price) || 0,
    price_promo: Number(product.promo_price) || 0,
    promo_price: Number(product.promo_price) || 0,
    image_url: serializedImageUrl,
    description: product.description || '',
    highlights: product.highlights || [],
    faq: product.faq || [],
    shopee_url: product.shopee_url || '',
    wa_number: product.wa_number || '',
    wa_text: product.wa_message || '',
    cta_mode: product.cta_mode || 'dual',
    is_active: product.is_active ?? true,
  };

  if (isUpdate) {
    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', product.id)
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data ? normalizeProduct(data) : null, error: null };
  } else {
    const { data, error } = await supabase
      .from('products')
      .insert([payload])
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data ? normalizeProduct(data) : null, error: null };
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) {
    console.error('Error deleting product:', error.message);
    return false;
  }
  return true;
}

export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('analytics_events').insert([{
      product_id: event.product_id || null,
      event_type: event.event_type,
      utm_source: event.utm_source || 'direct',
      utm_campaign: event.utm_campaign || 'general',
      utm_content: event.utm_content || '',
    }]);
  } catch (err) {
    console.error('Failed to track analytics event:', err);
  }
}

export async function fetchAnalyticsSummary(): Promise<{
  totalViews: number;
  totalWaClicks: number;
  totalShopeeClicks: number;
  events: AnalyticsEvent[];
}> {
  const supabase = getSupabaseClient();
  if (!supabase) return { totalViews: 0, totalWaClicks: 0, totalShopeeClicks: 0, events: [] };

  const { data, error } = await supabase
    .from('analytics_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('Error fetching analytics:', error.message);
    return { totalViews: 0, totalWaClicks: 0, totalShopeeClicks: 0, events: [] };
  }

  const events = data || [];
  const totalViews = events.filter(e => e.event_type === 'view').length;
  const totalWaClicks = events.filter(e => e.event_type === 'click_wa').length;
  const totalShopeeClicks = events.filter(e => e.event_type === 'click_shopee').length;

  return { totalViews, totalWaClicks, totalShopeeClicks, events };
}

export async function fetchAppSettings(): Promise<AppSettings | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    return null;
  }
  return data;
}

export async function saveAppSettings(settings: AppSettings): Promise<{ success: boolean; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase is not connected' };

  const fields = {
    meta_pixel_id: settings.meta_pixel_id?.trim() || '',
    default_wa_number: settings.default_wa_number?.trim() || '',
    updated_at: new Date().toISOString()
  };

  const { data: existing } = await supabase
    .from('app_settings')
    .select('id')
    .eq('id', 1)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from('app_settings').update(fields).eq('id', 1)
    : await supabase.from('app_settings').insert([{ id: 1, ...fields }]);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, error: null };
}

