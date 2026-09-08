import React from 'react';

export const AppDownloadCard: React.FC = () => {
  return (
    <div className="mt-4 mb-2 w-full max-w-full">
      {/* Mobile Design (visible on small screens) */}
      <div className="flex sm:hidden items-center justify-between bg-gray-50/80 dark:bg-gray-800/80 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm w-full">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
            {/* MetaMindful Logo placeholder */}
            <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 8C15.1634 8 8 15.1634 8 24C8 32.8366 15.1634 40 24 40C32.8366 40 40 32.8366 40 24C40 15.1634 32.8366 8 24 8Z" fill="#EBF3FF"/>
              <path d="M24 12C17.3726 12 12 17.3726 12 24C12 30.6274 17.3726 36 24 36C30.6274 36 36 30.6274 36 24C36 17.3726 30.6274 12 24 12Z" stroke="#4B5563" strokeWidth="2"/>
              <path d="M24 16C19.5817 16 16 19.5817 16 24C16 28.4183 19.5817 32 24 32C28.4183 32 32 28.4183 32 24C32 19.5817 28.4183 16 24 16Z" stroke="#3B82F6" strokeWidth="2"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-900 dark:text-gray-100 font-bold text-[15px] leading-tight">MetaMindful</span>
            <span className="text-gray-500 dark:text-gray-400 text-xs font-medium mt-0.5">5.2mb</span>
          </div>
        </div>
        <button 
          className="bg-[#FCD34D] hover:bg-[#FBBF24] text-gray-900 font-semibold px-5 py-2.5 rounded-full text-sm transition-colors flex-shrink-0"
          onClick={() => window.open('https://metamindful.app', '_blank')}
        >
          Download
        </button>
      </div>

      {/* Web Design (visible on medium and larger screens) */}
      <div className="hidden sm:flex items-center justify-between bg-gray-50/80 dark:bg-gray-800/80 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm w-full">
        <div className="flex flex-col pr-4">
          <h3 className="text-gray-900 dark:text-gray-100 font-bold text-base md:text-lg flex items-center gap-2">
            Take MetaMindful with you <span role="img" aria-label="mobile">📱</span>
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">
            Continue your journey wherever you are.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button 
            className="flex-shrink-0 hover:opacity-90 transition-opacity"
            onClick={() => window.open('https://apps.apple.com/us/app/metamindful/id6569248759', '_blank')}
          >
            <img src="/app-store-badge.svg" alt="Download on the App Store" className="h-10 md:h-12 w-auto bg-black rounded-lg" 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }} 
            />
            {/* Fallback if image is missing */}
            <div className="hidden h-10 md:h-12 px-4 bg-black text-white rounded-lg flex items-center justify-center gap-2 border border-gray-700">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
              <div className="flex flex-col items-start leading-none">
                <span className="text-[10px]">Download on the</span>
                <span className="text-[14px] font-semibold">App Store</span>
              </div>
            </div>
          </button>
          
          <button 
            className="flex-shrink-0 hover:opacity-90 transition-opacity"
            onClick={() => window.open('https://play.google.com/store/apps/details?id=com.metamindful', '_blank')}
          >
            <img src="/google-play-badge.svg" alt="Get it on Google Play" className="h-10 md:h-12 w-auto bg-black rounded-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }} 
            />
            {/* Fallback if image is missing */}
            <div className="hidden h-10 md:h-12 px-4 bg-black text-white rounded-lg flex items-center justify-center gap-2 border border-gray-700">
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 20.5v-17c0-.5.4-.9.9-.9.2 0 .4.1.5.2l12 11.1L3.2 20.7c-.1.1-.3.2-.5.2-.4 0-.7-.4-.7-.9z" fill="#00e676"/>
                <path d="M16.4 13.9l4.5-2.6c.7-.4.7-1.4 0-1.8l-4.5-2.6-3.2 3.5 3.2 3.5z" fill="#ffc107"/>
                <path d="M3.2 3.5L16.4 15.6l-3.2-3.5L3.2 3.5z" fill="#f44336"/>
                <path d="M3.2 20.7L16.4 8.6l-3.2 3.5-10 8.6z" fill="#2196f3"/>
              </svg>
              <div className="flex flex-col items-start leading-none">
                <span className="text-[10px]">GET IT ON</span>
                <span className="text-[14px] font-semibold">Google Play</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
