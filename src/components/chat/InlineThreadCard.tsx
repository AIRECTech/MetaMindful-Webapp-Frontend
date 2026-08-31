import { useEffect, useRef, useState } from "react";
import { ChevronDown, MessagesSquare, ListChecks } from "lucide-react";

interface InlineThreadCardProps {
  details: { label: string; value: string }[];
  isOpen: boolean;
  onToggle: () => void;
}

export function InlineThreadCard({ details, isOpen, onToggle }: InlineThreadCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setHasBeenOpened(true);

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
      className="inline-flex z-20 pointer-events-none relative"
    >
      {/* Container to handle positioning and overflow */}
      <div className="relative pointer-events-none flex">
        {/* The Card - slides up/down */}
        <div 
          className={`
            bg-white dark:bg-gray-800 
            border-t border-l border-r border-yellow-400 
            rounded-t-2xl shadow-sm
            overflow-hidden transition-all duration-300 ease-in-out transform origin-bottom
            w-full md:w-auto md:min-w-[400px]
            absolute bottom-full mb-3 left-0
            ${isOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-4 opacity-0 pointer-events-none'}
          `}
        >
          <div className="p-5 border-b border-white dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessagesSquare className="h-5 w-5 text-gray-500 fill-current" />
                <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">Thread Card</h2>
              </div>
              <button onClick={onToggle} className="text-gray-400 hover:text-gray-600 transition pointer-events-auto">
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
            <p className="text-[13px] text-gray-400 italic mb-4">This card shows your current progress</p>
            <div className="bg-[#eff4f9] dark:bg-gray-700/50 rounded-[10px] px-5 py-4 space-y-4 max-h-[300px] overflow-y-auto pointer-events-auto">
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
        <div className={`flex pointer-events-none transition-all duration-300 ${isOpen ? 'h-0 opacity-0 overflow-hidden' : 'h-[44px] opacity-100'}`}>
          <div className="flex items-center gap-2 pointer-events-auto overflow-visible">
            <button
              onClick={onToggle}
              className={`
                bg-yellow-300 dark:bg-yellow-400
                ${hasBeenOpened ? 'rounded-[14px] h-[44px] w-[44px] px-0 justify-center' : 'rounded-[12px] px-4 py-2.5 gap-2'}
                flex items-center
                hover:bg-yellow-400 dark:hover:bg-yellow-500 transition-colors
                pointer-events-auto shadow-md flex-shrink-0
              `}
              title={hasBeenOpened ? "View threadcard" : undefined}
            >
              <ListChecks className="h-5 w-5 text-gray-900 flex-shrink-0" />
              {!hasBeenOpened && <span className="text-gray-900 font-medium text-[14px] whitespace-nowrap">View threadcard</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

