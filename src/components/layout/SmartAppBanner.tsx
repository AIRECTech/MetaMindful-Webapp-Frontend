import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function SmartAppBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile but NOT Android (per user request)
    const ua = window.navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(ua);
    const isMobileDevice = (/mobile|iphone|ipad|ipod/.test(ua) || window.innerWidth < 768) && !isAndroid;
    setIsMobile(isMobileDevice);

    if (isMobileDevice) {
      // Check if banner is closed and the timer
      const closedAt = localStorage.getItem('smart_banner_closed_at');
      if (closedAt) {
        const timeSinceClosed = Date.now() - parseInt(closedAt, 10);
        if (timeSinceClosed < 20000) {
          // If less than 20 seconds ago, wait for the remainder
          const timer = setTimeout(() => setIsVisible(true), 20000 - timeSinceClosed);
          return () => clearTimeout(timer);
        } else {
          setIsVisible(true);
        }
      } else {
        setIsVisible(true);
      }
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('smart_banner_closed_at', Date.now().toString());
    
    // Automatically redisplay after 20 seconds
    setTimeout(() => {
      setIsVisible(true);
    }, 20000);
  };

  const handleGetApp = () => {
    const ua = window.navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) {
      // TODO: Replace with the actual Google Play Store link for MetaMindful
      window.open("https://play.google.com/store/apps/details?id=com.metamindful", "_blank");
    } else {
      window.open("https://apps.apple.com/us/app/metamindful/id6569248759", "_blank");
    }
  };

  if (!isMobile || !isVisible) {
    return null;
  }

  return (
    <div className="flex items-center justify-between w-full bg-[#1c1c1e] text-white px-3 py-2.5 sm:px-4 z-[100] relative border-b border-black">
      <div className="flex items-center gap-3">
        {/* App Icon approximation */}
        <div className="w-10 h-10 bg-[#2c2c2e] rounded-[10px] flex flex-col justify-center items-center overflow-hidden border border-[#3c3c3e] p-1">
          <div className="w-full flex-1 flex flex-wrap gap-[1px] justify-center items-center p-0.5">
             {/* Fake colorful app grid */}
             <div className="w-1.5 h-1.5 bg-[#ff3b30] rounded-[2px]"></div>
             <div className="w-1.5 h-1.5 bg-[#ff9500] rounded-[2px]"></div>
             <div className="w-1.5 h-1.5 bg-[#ffcc00] rounded-[2px]"></div>
             <div className="w-1.5 h-1.5 bg-[#4cd964] rounded-[2px]"></div>
             <div className="w-1.5 h-1.5 bg-[#5ac8fa] rounded-[2px]"></div>
             <div className="w-1.5 h-1.5 bg-[#007aff] rounded-[2px]"></div>
             <div className="w-1.5 h-1.5 bg-[#5856d6] rounded-[2px]"></div>
             <div className="w-1.5 h-1.5 bg-[#ff2d55] rounded-[2px]"></div>
             <div className="w-1.5 h-1.5 bg-[#ff3b30] rounded-[2px]"></div>
          </div>
          <div className="w-full h-1.5 bg-[#3c3c3e] rounded-sm mt-0.5"></div>
        </div>
        <div className="flex flex-col justify-center h-full">
          <span className="font-semibold text-[15px] leading-snug">MetaMindful</span>
          <span className="text-[#98989f] text-[13px] leading-snug">AI Mental Wellness Coach</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button 
          onClick={handleGetApp}
          className="bg-[#007aff] hover:bg-[#0062cc] text-white font-semibold py-1.5 px-4 rounded-[16px] text-[14px] transition mr-1"
        >
          Get App
        </button>
        <button 
          onClick={handleClose}
          className="p-1 text-[#8e8e93] hover:text-white transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
