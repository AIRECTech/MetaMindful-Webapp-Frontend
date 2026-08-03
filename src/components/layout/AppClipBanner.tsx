import { useState, useEffect } from 'react';
import { isClipSession } from '../../lib/clipDetection';

const APP_STORE_URL = 'https://apps.apple.com/us/app/metamindful/id6569248759';
// The universal link that iOS intercepts to launch the App Clip
const CLIP_UNIVERSAL_LINK = 'https://airec.io/clip';

/**
 * AppClipBanner
 * Shows the native-style iOS App Clip card (white, top of screen) when a user
 * arrives via the /clip URL. Only shown on iOS/Safari devices.
 */
export function AppClipBanner() {
  const [visible, setVisible] = useState(false);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIos(ios);

    if (ios && isClipSession()) {
      setVisible(true);

      // Fetch the real App Store icon via iTunes lookup API
      fetch('https://itunes.apple.com/lookup?id=6569248759')
        .then((r) => r.json())
        .then((data) => {
          const url = data?.results?.[0]?.artworkUrl100;
          if (url) setIconUrl(url);
        })
        .catch(() => {
          // silently ignore — will fall back to styled div
        });
    }
  }, []);

  const handleOpen = () => {
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      // On iOS: try the universal link first — iOS routes it to the App Clip
      window.location.href = CLIP_UNIVERSAL_LINK;
      // Fallback to App Store after 2s if App Clip didn't open
      setTimeout(() => {
        window.location.href = APP_STORE_URL;
      }, 2000);
    } else {
      window.open(APP_STORE_URL, '_blank');
    }
  };

  if (!isIos || !visible) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        background: '#ffffff',
        borderBottom: '1px solid #e5e5ea',
        padding: '10px 14px',
        zIndex: 200,
        position: 'relative',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
      }}
    >
      {/* Left: chevron hint */}
      <div
        style={{
          color: '#c7c7cc',
          fontSize: 18,
          marginRight: 6,
          fontWeight: 300,
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        ‹
      </div>

      {/* Icon + text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        {/* App icon */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            overflow: 'hidden',
            flexShrink: 0,
            border: '1px solid #e5e5ea',
            background: 'linear-gradient(135deg, #e8f4fd 0%, #d6eaf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {iconUrl ? (
            <img
              src={iconUrl}
              alt="MetaMindful"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            /* Fallback gradient icon while loading */
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="14" fill="url(#g)" />
              <defs>
                <radialGradient id="g" cx="40%" cy="30%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </radialGradient>
              </defs>
              <path
                d="M9 14c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.65-.8 3.1-2.03 4H12.03C10.8 17.1 10 15.65 10 14z"
                fill="white"
                opacity="0.9"
              />
              <rect x="11" y="18" width="6" height="1.5" rx="0.75" fill="white" opacity="0.7" />
            </svg>
          )}
        </div>

        {/* Text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1c1c1e', lineHeight: 1.3 }}>
            MetaMindful
          </span>
          <span style={{ fontSize: 12, color: '#8e8e93', lineHeight: 1.3 }}>
            Open in the MetaMindful app clip
          </span>
        </div>
      </div>

      {/* OPEN button */}
      <button
        onClick={handleOpen}
        style={{
          background: '#007aff',
          color: '#fff',
          border: 'none',
          borderRadius: 20,
          padding: '7px 18px',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
          letterSpacing: '-0.2px',
          fontFamily: 'inherit',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        OPEN
      </button>
    </div>
  );
}
