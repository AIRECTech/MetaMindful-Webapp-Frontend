import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { LoginPopup } from "../LoginPopup";
import { SignupPopup } from "../SignupPopup";
import { ChatToasts } from "../chat/ChatToasts";
import { Menu } from "lucide-react";
import { useLayout } from "../../contexts/LayoutContext";
import { isClipSession } from "../../lib/clipDetection";

export function GuestTopbar() {
  const params = useParams();
  const threadId = params.id;
  const { toggleSidebar } = useLayout();

  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showSignupPopup, setShowSignupPopup] = useState(false);
  const [isIosOrSafari, setIsIosOrSafari] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|crios|crmodo|firefox|fxios|opera|opios|ucbrowser/.test(ua);
    const isMobile = /mobile|android|iphone|ipad|ipod/.test(ua) || window.innerWidth < 768;
    setIsIosOrSafari(isMobile && (isIos || isSafari));
  }, []);

  return (
    <header className="flex items-center justify-between px-4 py-3 h-[64px] flex-shrink-0 z-30 relative bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-3 w-auto md:w-[200px] order-1">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Center content - Toasts */}
      <div className="w-full md:w-auto md:flex-1 flex justify-center items-center px-4 order-2 mt-4 md:mt-0 min-h-[44px]">
        <ChatToasts />
      </div>

      <div className="flex justify-end items-center gap-3 w-auto md:w-[200px] order-3 ml-auto md:ml-0">
        {!isIosOrSafari && !isClipSession() && (
          <button
            onClick={() => setShowSignupPopup(true)}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium rounded-lg text-sm transition"
          >
            Sign up
          </button>
        )}
      </div>

      {/* Popups */}
      <LoginPopup
        isOpen={showLoginPopup}
        onClose={() => {
          setShowLoginPopup(false);
          setShowSignupPopup(false);
        }}
        currentThreadId={threadId || undefined}
        onSwitchToSignup={() => {
          setShowLoginPopup(false);
          setShowSignupPopup(true);
        }}
      />
      <SignupPopup
        isOpen={showSignupPopup}
        onClose={() => {
          setShowLoginPopup(false);
          setShowSignupPopup(false);
        }}
        currentThreadId={threadId || undefined}
        onSwitchToLogin={() => {
          setShowSignupPopup(false);
          setShowLoginPopup(true);
        }}
      />
    </header>
  );
}

