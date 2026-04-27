
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { PantoneColor } from "@/lib/pantone"
import { cmykToRgb } from "@/lib/colors"
import { searchCMPToneColors } from "@/app/actions/color-actions"
import { Loader2 } from "lucide-react"

interface CMPToneComboboxProps {
    onSelect: (color: PantoneColor | null) => void;
    selectedColor: PantoneColor | null;
}

export function CMPToneCombobox({ onSelect, selectedColor }: CMPToneComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [filteredColors, setFilteredColors] = React.useState<PantoneColor[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);


  React.useEffect(() => {
    if (!open) {
      setInputValue("");
      setFilteredColors([]);
      return;
    }

    if (inputValue.length < 2) {
      setFilteredColors([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      const results = await searchCMPToneColors(inputValue);
      setFilteredColors(results);
      setIsLoading(false);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [inputValue, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedColor
            ? `${selectedColor.name} (${selectedColor.number})`
            : "Select a CMPTone color..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search CMPTone colors..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {isLoading && (
              <div className="p-4 text-sm flex items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}
            {!isLoading && inputValue.length > 1 && filteredColors.length === 0 && (
                <CommandEmpty>No color found.</CommandEmpty>
            )}
            {!isLoading && filteredColors.length > 0 && (
              <CommandGroup>
                {filteredColors.map((color, index) => (
                    <CommandItem
                    key={`${color.number}-${index}`}
                    value={`${color.name} ${color.number}`}
                    onSelect={() => {
                        onSelect(color.number === selectedColor?.number ? null : color)
                        setOpen(false)
                    }}
                    >
                    <Check
                        className={cn(
                        "mr-2 h-4 w-4",
                        selectedColor?.number === color.number ? "opacity-100" : "opacity-0"
                        )}
                    />
                      <div className="flex items-center gap-2">
                        <div
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: `rgb(${cmykToRgb(color.cmyk.c, color.cmyk.m, color.cmyk.y, color.cmyk.k).r}, ${cmykToRgb(color.cmyk.c, color.cmyk.m, color.cmyk.y, color.cmyk.k).g}, ${cmykToRgb(color.cmyk.c, color.cmyk.m, color.cmyk.y, color.cmyk.k).b})` }}
                        />
                        <span>{color.name} ({color.number})</span>
                    </div>
                    </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!inputValue && <CommandEmpty>Type to search for a color.</CommandEmpty>}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
