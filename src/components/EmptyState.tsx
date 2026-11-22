import React from 'react';
import { PackageX, PlusCircle, Settings, Wand2 } from 'lucide-react';

interface EmptyStateProps {
  onOpenAdmin: () => void;
  onOpenSettings: () => void;
  onSeedSample?: () => void;
  isConfigured: boolean;
  isRefreshing?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onOpenAdmin,
  onOpenSettings,
  onSeedSample,
  isConfigured,
  isRefreshing
}) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-white">
      <div className="max-w-md w-full bg-white border-4 border-black p-8 shadow-[10px_10px_0px_0px_#000000] text-center relative">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black text-white font-heading font-black text-xs uppercase tracking-widest px-4 py-1.5 border-2 border-black">
          PRIME STYLE SYSTEM
        </div>

        <div className="w-16 h-16 bg-[#ECEFF1] border-2 border-black flex items-center justify-center mx-auto mb-6 mt-4">
          <PackageX className="w-8 h-8 text-black" />
        </div>

        <h2 className="font-heading font-black text-3xl uppercase tracking-wider mb-2">
          No Active Products
        </h2>
        <p className="text-sm text-gray-700 font-medium mb-8">
          {!isConfigured
            ? "Your Supabase database connection is not yet configured. Please connect Supabase or add your first athletic product in the Admin CMS."
            : "The products table in Supabase is currently empty. Publish your first athletic apparel or gear item to launch the storefront."}
        </p>

        <div className="space-y-3">
          {!isConfigured ? (
            <button
              onClick={onOpenSettings}
              className="w-full py-3.5 bg-black text-white font-heading font-black text-lg uppercase tracking-wider hover:bg-white hover:text-black border-2 border-black shadow-[4px_4px_0px_0px_#000] flex items-center justify-center gap-2 transition-all"
            >
              <Settings className="w-5 h-5" /> Connect Supabase Now
            </button>
          ) : (
            <>
              <button
                onClick={onOpenAdmin}
                className="w-full py-3.5 bg-black text-white font-heading font-black text-lg uppercase tracking-wider hover:bg-white hover:text-black border-2 border-black shadow-[4px_4px_0px_0px_#000] flex items-center justify-center gap-2 transition-all"
              >
                <PlusCircle className="w-5 h-5" /> Open Admin CMS & Add Product
              </button>

              {onSeedSample && (
                <button
                  onClick={onSeedSample}
                  disabled={isRefreshing}
                  className="w-full py-3 bg-gray-100 text-black hover:bg-gray-200 font-heading font-bold uppercase tracking-wider border-2 border-black flex items-center justify-center gap-2 transition-all text-sm"
                >
                  <Wand2 className="w-4 h-4 text-black" /> {isRefreshing ? 'Creating Sample...' : 'Seed Sample Athletic Product'}
                </button>
              )}
            </>
          )}

          <button
            onClick={onOpenSettings}
            className="w-full py-2.5 bg-gray-100 text-black hover:bg-gray-200 font-heading font-bold uppercase tracking-wider border-2 border-black flex items-center justify-center gap-2 transition-all text-xs"
          >
            <Settings className="w-4 h-4" /> Database & Settings
          </button>
        </div>
      </div>
    </div>
  );
};
