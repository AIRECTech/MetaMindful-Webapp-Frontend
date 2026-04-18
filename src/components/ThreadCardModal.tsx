import { X, MessagesSquare } from "lucide-react";
import { useEffect } from "react";

interface ThreadCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Make these optional so we can show placeholder if no data is passed
  details?: { label: string; value: string }[];
}

const DEFAULT_DETAILS = [
  { label: "Pattern", value: "" },
  { label: "Goal", value: "" },
  { label: "Insight", value: "" },
  { label: "Move that help", value: "" },
  { label: "Current trigger", value: "" },
  { label: "Progress", value: "" },
];

export function ThreadCardModal({ isOpen, onClose, details = DEFAULT_DETAILS }: ThreadCardModalProps) {
  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 md:pt-28 px-4 pb-4 bg-white/30 backdrop-blur-sm transition-all duration-300">
      {/* Click outside to close (optional, but good UX) */}
      <div className="absolute inset-0" onClick={onClose}></div>
      
      {/* Modal Container */}
      <div className="relative bg-white border border-yellow-400 rounded-[10px] w-full max-w-[400px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col max-h-[80vh] md:max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <MessagesSquare className="h-6 w-6 text-gray-500 fill-current" />
            <h2 className="text-xl font-medium text-gray-800">Thread Card</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-300 hover:text-gray-500 transition-colors"
          >
            <X className="h-6 w-6" strokeWidth={2.5} />
          </button>
        </div>

        {/* Subtitle */}
        <div className="px-6 mb-4">
          <p className="text-[13px] text-gray-400 italic">This card shows your current progress</p>
        </div>

        {/* Scrollable Content Box */}
        <div className="px-6 pb-6 overflow-y-auto custom-scrollbar">
          <div className="bg-[#eff4f9] rounded-[10px] px-5 py-4 space-y-4">
            {details.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-0.5">
                <span className="text-[14px] font-medium text-gray-800">
                  {item.label}
                </span>
                <span className="text-[12px] leading-relaxed text-gray-400">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
