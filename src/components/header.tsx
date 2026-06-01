import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/use-theme";
import { Zap, Sun, Moon, Monitor } from "lucide-react";

export function Header() {
  const { theme, resolved, toggle } = useTheme();

  const Icon = theme === "system" ? Monitor : resolved === "dark" ? Moon : Sun;
  const label =
    theme === "system" ? "System theme" : resolved === "dark" ? "Dark" : "Light";

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-5" />
          </div>
          <div className="leading-tight">
            <h1 className="text-base font-semibold">Image Optimizer</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Compress &amp; convert images privately in your browser
            </p>
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                aria-label={`Theme: ${label}. Click to change.`}
              >
                <Icon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Theme: {label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}
