"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Keyboard, Command } from "lucide-react";

interface Shortcut {
  key: string;
  action: string;
  icon: string;
}

interface KeyboardShortcutsHelpProps {
  shortcuts: Shortcut[];
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  shortcuts,
}) => {
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  const formatKey = (key: string) => {
    if (isMac) {
      return key.replace("Ctrl", "⌘").replace("Shift", "⇧").replace("Alt", "⌥");
    }
    return key;
  };

  return (
    <Dialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-gray-600"
              >
                <Keyboard className="h-4 w-4" />
                <span className="hidden sm:inline">Shortcuts</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Keyboard Shortcuts (Press ? for help)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{shortcut.icon}</span>
                <span className="text-sm">{shortcut.action}</span>
              </div>
              <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs font-mono">
                {formatKey(shortcut.key)}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-500 text-center">
            {isMac ? (
              <span className="flex items-center justify-center gap-1">
                Use <Command className="h-3 w-3" /> instead of Ctrl on Mac
              </span>
            ) : (
              "Press shortcuts while on the inventory page"
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsHelp;
