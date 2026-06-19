"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function InstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const onClick = (evt: any) => {
    evt.preventDefault();
    if (!promptInstall) {
      return;
    }
    promptInstall.prompt();
    promptInstall.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === "accepted") {
        setSupportsPWA(false);
        setIsInstalled(true);
      }
    });
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 shadow-sm">
        <Download className="w-3.5 h-3.5" />
        Installed
      </div>
    );
  }

  if (!supportsPWA) {
    return null;
  }

  return (
    <Button 
      onClick={onClick} 
      variant="outline" 
      size="sm" 
      className="bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border-brand-primary/20 gap-1.5 rounded-full px-4 font-semibold shadow-sm transition-all"
    >
      <Download className="w-4 h-4" />
      Install App
    </Button>
  );
}
