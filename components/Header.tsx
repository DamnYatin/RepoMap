"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";

interface HeaderProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  showHowItWorks: boolean;
  onNavigateHome?: () => void;
}

export function Header({
  theme,
  onToggleTheme,
  showHowItWorks,
  onNavigateHome,
}: HeaderProps) {
  const scrollToHowItWorks = () => {
    const el = document.getElementById("how-it-works-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="h-12 fixed top-0 left-0 right-0 z-50 bg-background border-b border-border-subtle flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center space-x-6">
        <button
          onClick={onNavigateHome}
          className="text-sm font-semibold text-text-primary hover:text-accent focus-visible:outline-accent text-left"
          aria-label="RepoMap Home"
        >
          RepoMap
        </button>

        {showHowItWorks && (
          <button
            onClick={scrollToHowItWorks}
            className="text-xs text-text-secondary hover:text-accent focus-visible:outline-accent"
          >
            How it works
          </button>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleTheme}
          className="h-8 px-2 flex items-center space-x-2 border border-border-subtle text-xs text-text-secondary hover:text-text-primary hover:bg-layer-01"
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? (
            <>
              <Moon size={14} strokeWidth={1.5} />
              <span>Dark</span>
            </>
          ) : (
            <>
              <Sun size={14} strokeWidth={1.5} />
              <span>Light</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
