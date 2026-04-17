import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMonthLabel, prevMonth, nextMonth } from "@/lib/utils";

interface MonthPickerProps {
  month: string;
  onChange: (month: string) => void;
}

export default function MonthPicker({ month, onChange }: MonthPickerProps) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      <button
        onClick={() => onChange(prevMonth(month))}
        className="p-1.5 rounded-md hover:bg-background transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm font-medium px-3 min-w-[140px] text-center">
        {getMonthLabel(month)}
      </span>
      <button
        onClick={() => onChange(nextMonth(month))}
        className="p-1.5 rounded-md transition-colors hover:bg-background"
        aria-label="Next month"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
