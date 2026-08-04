import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { isClipSession } from '../../lib/clipDetection';

const REAPPEAR_MS = 10_000; // 10 seconds
const CLOSED_AT_KEY = 'smart_banner_closed_at';

export function SmartAppBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detect eligible device (non-Android mobile/iOS/Safari on mobile)
  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(ua);
    const isMobileDevice =
      (/mobile|iphone|ipad|ipod/.test(ua) || window.innerWidth < 768) && !isAndroid;

    setIsMobile(isMobileDevice);

    if (!isMobileDevice || isClipSession()) return;

    // Fetch real App Store icon
    fetch('https://itunes.apple.com/lookup?id=6569248759')
      .then((r) => r.json())
      .then((data) => {
        const url = data?.results?.[0]?.artworkUrl100;
        if (url) setIconUrl(url);
      })
      .catch(() => {});
  }, []);

  // Visibility logic — poll every second to handle both initial load and post-close re-appear
  useEffect(() => {
    if (!isMobile || isClipSession()) return;

    const check = () => {
      const closedAt = localStorage.getItem(CLOSED_AT_KEY);
      if (!closedAt) {
        setIsVisible(true);
        return;
      }
      const elapsed = Date.now() - parseInt(closedAt, 10);
      if (elapsed >= REAPPEAR_MS) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    check(); // run immediately
    intervalRef.current = setInterval(check, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isMobile]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(CLOSED_AT_KEY, Date.now().toString());
    // The interval will automatically pick up re-appear after REAPPEAR_MS
  };

  const handleGetApp = () => {
    const ua = window.navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) {
      window.open('https://play.google.com/store/apps/details?id=com.metamindful', '_blank');
    } else {
      window.open('https://apps.apple.com/us/app/metamindful/id6569248759', '_blank');
    }
  };

  if (!isMobile || !isVisible) return null;

  return (
    <div className="flex items-center justify-between w-full bg-white text-[#1c1c1e] px-3 py-2.5 sm:px-4 z-[100] relative border-b border-[#e5e5ea]" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="flex items-center gap-3">
        {/* App Icon */}
        <div className="w-10 h-10 rounded-[10px] overflow-hidden border border-[#e5e5ea] flex-shrink-0">
          {iconUrl ? (
            <img
              src={iconUrl}
              alt="MetaMindful"
              className="w-full h-full object-cover"
            />
          ) : (
            /* Fallback while icon loads */
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="10" r="5" fill="white" opacity="0.9" />
                <rect x="8" y="15" width="6" height="1.5" rx="0.75" fill="white" opacity="0.7" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <span className="font-semibold text-[15px] leading-snug text-[#1c1c1e]">MetaMindful</span>
          <span className="text-[#98989f] text-[11px] leading-snug">
            One conversation can change your next step
          </span>
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
          className="p-1 text-[#8e8e93] hover:text-[#1c1c1e] transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
