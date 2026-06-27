import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { LoginPopup } from "../LoginPopup";
import { SignupPopup } from "../SignupPopup";
import { ChatToasts } from "../chat/ChatToasts";

export function GuestTopbar() {
  const navigate = useNavigate();
  const params = useParams();
  const threadId = params.id;

  // Force light mode for guest users
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  const handleLogoClick = () => {
    navigate("/");
  };

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
    <header className="flex flex-wrap items-center justify-between px-4 py-3 min-h-[64px] bg-transparent">
      <button
        onClick={handleLogoClick}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-auto md:w-[200px] order-1"
      >
        <img
          src="/guest_logo.png"
          alt="Guest Mode"
          className="h-[3rem] md:h-[5rem] w-auto"
        />
      </button>

      {/* Center content - Toasts */}
      <div className="w-full md:w-auto md:flex-1 flex justify-center items-center px-4 order-3 md:order-2 mt-4 md:mt-0 min-h-[44px]">
        <ChatToasts />
      </div>

      <div className="flex justify-end items-center gap-3 w-auto md:w-[200px] order-2 md:order-3 ml-auto md:ml-0">
        {/* Guest users: Show Use app button on iOS/Safari mobile view, otherwise Sign up */}
        {isIosOrSafari ? (
          <a
            href="https://apps.apple.com/us/app/metamindful/id6569248759"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium rounded-full text-sm transition"
          >
            Use app
          </a>
        ) : (
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

