import { useMemo } from "react";
import { Check, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  maxVisibleBadges?: number;
  emptyMessage?: string;
}

export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select options",
  className,
  maxVisibleBadges = 2,
  emptyMessage = "No options available right now.",
}: MultiSelectProps) {
  const selectedSet = useMemo(() => new Set(value), [value]);

  const toggle = (optionValue: string) => {
    if (selectedSet.has(optionValue)) {
      onValueChange(value.filter((v) => v !== optionValue));
      return;
    }
    onValueChange([...value, optionValue]);
  };

  const selectedLabels = options
    .filter((option) => selectedSet.has(option.value))
    .map((option) => option.label);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between min-h-10 h-auto px-3 py-2 text-left font-normal border-border/60",
            className
          )}
        >
          <span className="flex flex-wrap gap-1.5 pr-2">
            {selectedLabels.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <>
                {selectedLabels.slice(0, maxVisibleBadges).map((label) => (
                  <Badge key={label} variant="secondary" className="text-xs">
                    {label}
                  </Badge>
                ))}
                {selectedLabels.length > maxVisibleBadges ? (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedLabels.length - maxVisibleBadges}
                  </Badge>
                ) : null}
              </>
            )}
          </span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[320px] max-w-[min(92vw,420px)] p-2" align="start">
        <div className="max-h-64 overflow-y-auto pr-1 space-y-1">
          {options.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            options.map((option) => {
              const checked = selectedSet.has(option.value);
              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => toggle(option.value)}
                  className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted transition-colors"
                >
                  <Checkbox checked={checked} className="pointer-events-none" />
                  <span className="text-sm flex-1">{option.label}</span>
                  {checked ? <Check className="h-4 w-4 text-primary" /> : null}
                </button>
              );
            })
          )}
        </div>

        <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onValueChange([])}
            disabled={value.length === 0}
          >
            Clear all
          </button>
          <span className="text-xs text-muted-foreground">{value.length} selected</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default MultiSelect;
