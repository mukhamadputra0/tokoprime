import React, { useState, useEffect } from 'react';
import { X, Database, CheckCircle2, AlertCircle, Copy, Check, Terminal } from 'lucide-react';
import { getSupabaseCredentials, saveSupabaseCredentials } from '../lib/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setKey(creds.key);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(url, key);
    setSavedMsg(true);
    setTimeout(() => {
      setSavedMsg(false);
      onSaved();
      onClose();
    }, 800);
  };

  const sqlScript = `-- 1. Full Products Table Schema
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  original_price NUMERIC DEFAULT 0,
  promo_price NUMERIC DEFAULT 0,
  image_url TEXT,
  description TEXT,
  highlights JSONB DEFAULT '[]'::jsonb,
  faq JSONB DEFAULT '[]'::jsonb,
  shopee_url TEXT,
  wa_number TEXT,
  wa_message TEXT,
  cta_mode TEXT DEFAULT 'dual',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  utm_source TEXT DEFAULT 'direct',
  utm_campaign TEXT DEFAULT 'general',
  utm_content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. FIX RLS (Row Level Security) POLICIES FOR PUBLIC ACCESS
-- Run this to allow public read/write from the storefront and admin CMS:
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events DISABLE ROW LEVEL SECURITY;

-- OR if you prefer keeping RLS enabled, run these policies:
-- DROP POLICY IF EXISTS "Public access products" ON products;
-- CREATE POLICY "Public access products" ON products FOR ALL USING (true) WITH CHECK (true);
-- DROP POLICY IF EXISTS "Public access analytics" ON analytics_events;
-- CREATE POLICY "Public access analytics" ON analytics_events FOR ALL USING (true) WITH CHECK (true);

-- 4. App Settings Table for Meta Pixel ID & Default WA
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  meta_pixel_id TEXT,
  default_wa_number TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;

-- 5. If missing columns on existing table, run this:
ALTER TABLE products ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_price NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shopee_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS wa_number TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS wa_message TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cta_mode TEXT DEFAULT 'dual';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white text-black w-full max-w-2xl border-2 border-black shadow-[8px_8px_0px_0px_#000000] p-6 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black text-white hover:bg-gray-800 p-2 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-black border-2 border-black text-white">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-black text-2xl uppercase tracking-wider">Supabase Connection Settings</h2>
            <p className="text-xs text-gray-600 font-medium">Connect your live Supabase database for persistent products & real-time analytics.</p>
          </div>
        </div>

        {savedMsg && (
          <div className="mb-4 p-3 bg-black text-white font-bold flex items-center gap-2 border-2 border-black">
            <CheckCircle2 className="w-5 h-5 text-white" /> Credentials saved successfully! Reloading connection...
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block font-heading font-bold text-sm uppercase tracking-wider mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full bg-[#ECEFF1] border-2 border-black px-3 py-2.5 text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-black"
              required
            />
          </div>

          <div>
            <label className="block font-heading font-bold text-sm uppercase tracking-wider mb-1">
              Supabase Anon / Public API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJhbGciOi..."
              className="w-full bg-[#ECEFF1] border-2 border-black px-3 py-2.5 text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-black"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-200 text-black font-heading font-bold uppercase tracking-wider hover:bg-gray-300 border-2 border-black"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-black text-white font-heading font-extrabold uppercase tracking-wider hover:bg-gray-800 border-2 border-black shadow-[4px_4px_0px_0px_#000]"
            >
              Save Credentials
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-black" />
              <h3 className="font-heading font-bold uppercase text-sm">Supabase SQL Schema & RLS Fix</h3>
            </div>
            <button
              onClick={copySql}
              className="flex items-center gap-1.5 px-3 py-1 bg-black text-white hover:bg-gray-800 text-xs font-heading font-bold uppercase tracking-wider transition-colors border border-black"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied SQL!' : 'Copy SQL Schema'}
            </button>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            If you encounter RLS (Row Level Security) errors, run this script in your Supabase SQL Editor to disable RLS or allow public access:
          </p>
          <pre className="bg-black text-white p-3 text-xs font-mono overflow-x-auto max-h-48 border-2 border-black">
            {sqlScript}
          </pre>
        </div>
      </div>
    </div>
  );
};
