import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, MessagesSquare } from "lucide-react";

interface InlineThreadCardProps {
  details: { label: string; value: string }[];
  isOpen: boolean;
  onToggle: () => void;
}

export function InlineThreadCard({ details, isOpen, onToggle }: InlineThreadCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onToggle();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen, onToggle]);

  if (details.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 flex justify-center px-4 md:px-0 z-0"
    >
      {/* Container to handle positioning and overflow */}
      <div className="relative flex flex-col items-center w-full max-w-4xl">
        {/* The Card - slides up/down */}
        <div 
          className={`
            bg-white dark:bg-gray-800 
            border-t border-l border-r border-yellow-400 
            rounded-t-2xl shadow-sm
            overflow-hidden transition-all duration-300 ease-in-out transform origin-bottom
            w-full md:w-auto md:min-w-[400px]
            ${isOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'}
          `}
        >
          <div className="p-5 border-b border-white dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessagesSquare className="h-5 w-5 text-gray-500 fill-current" />
                <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">Thread Card</h2>
              </div>
              <button onClick={onToggle} className="text-gray-400 hover:text-gray-600 transition">
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
            <p className="text-[13px] text-gray-400 italic mb-4">This card shows your current progress</p>
            <div className="bg-[#eff4f9] dark:bg-gray-700/50 rounded-[10px] px-5 py-4 space-y-4 max-h-[300px] overflow-y-auto">
              {details.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-medium text-gray-800 dark:text-gray-200">
                    {item.label}
                  </span>
                  <span className="text-[12px] leading-relaxed text-gray-500 dark:text-gray-400">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* The Trigger Tab */}
        {!isOpen && (
          <button
            onClick={onToggle}
            className={`
              bg-white dark:bg-gray-800
              border border-yellow-400 md:border-b-0
              rounded-t-xl md:rounded-t-2xl
              flex items-center justify-center
              hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
              px-6 py-1 md:py-1 md:px-6
              translate-y-[2px] md:translate-y-1
            `}
          >
            <ChevronUp className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>
    </div>
  );
}

