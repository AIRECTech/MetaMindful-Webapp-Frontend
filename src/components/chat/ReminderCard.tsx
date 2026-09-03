import { AlarmClockCheck } from "lucide-react";

interface ReminderCardProps {
  reminders: any[];
  onClick?: () => void;
}

export function ReminderCard({ reminders, onClick }: ReminderCardProps) {
  if (!reminders || reminders.length === 0) return null;

  // Only display the latest reminder for a message
  const reminder = reminders[reminders.length - 1];
  const titleText = reminder.actionDescription || reminder.reminder_description || "a Task";
  const displayTitle = titleText.toLowerCase().startsWith("reminder") 
    ? titleText 
    : `Reminder for ${titleText}`;

  return (
    <div className="mt-3 w-full">
      <div 
        onClick={onClick}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3 shadow-sm rounded-[24px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="bg-[#fef9c3] dark:bg-yellow-900/40 p-2 rounded-full flex-shrink-0">
          <AlarmClockCheck className="h-5 w-5 text-[#d97706] dark:text-yellow-500" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 truncate">
            {displayTitle}
          </div>
          {reminder.remindAt || reminder.remind_at ? (
            <div className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5">
              {new Date(reminder.remindAt || reminder.remind_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
