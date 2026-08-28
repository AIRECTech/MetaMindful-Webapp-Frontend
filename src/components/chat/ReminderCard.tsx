import { Clock, ChevronRight } from "lucide-react";

interface ReminderCardProps {
  reminders: any[];
}

export function ReminderCard({ reminders }: ReminderCardProps) {
  if (!reminders || reminders.length === 0) return null;

  return (
    <div className="mt-3 space-y-2 w-full">
      {reminders.map((reminder, idx) => (
        <div 
          key={idx}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex items-center gap-3 shadow-sm"
        >
          <div className="bg-yellow-100 dark:bg-yellow-900/40 p-2 rounded-full flex-shrink-0">
            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-medium text-gray-800 dark:text-gray-200 truncate">
              {reminder.actionDescription || reminder.reminder_description || "Reminder"}
            </div>
            {reminder.remindAt || reminder.remind_at ? (
              <div className="text-[12px] text-gray-500 dark:text-gray-400">
                {new Date(reminder.remindAt || reminder.remind_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            ) : null}
          </div>
          <div className="text-gray-400 flex-shrink-0">
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      ))}
    </div>
  );
}
