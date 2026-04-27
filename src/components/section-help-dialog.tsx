"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ReactNode } from "react";
import { Button } from "./ui/button";
import { HelpCircle } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

interface SectionHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}

export function SectionHelpDialog({ open, onOpenChange, title, description, children }: SectionHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 text-sm text-foreground">
                 {children}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface HelpTriggerProps {
    onClick: () => void;
    className?: string;
}

export const HelpTrigger = ({ onClick, className }: HelpTriggerProps) => (
    <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        className={className}
        aria-label="Open help dialog"
    >
        <HelpCircle className="h-5 w-5 text-muted-foreground" />
    </Button>
);
