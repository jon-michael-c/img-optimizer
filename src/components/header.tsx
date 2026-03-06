import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/use-theme";
import { Zap, Sun, Moon } from "lucide-react";

export function Header() {
  const { resolved, toggle } = useTheme();

  const Icon = resolved === "dark" ? Moon : Sun;

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-2">
          <Zap className="size-6 text-primary" />
          <h1 className="text-lg font-semibold">Image Optimizer</h1>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                aria-label="Toggle theme"
              >
                <Icon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle theme</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}
