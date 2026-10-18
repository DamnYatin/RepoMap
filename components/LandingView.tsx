"use client";

import React, { useState } from "react";
import { ArrowRight, History, GitFork, GitBranch } from "lucide-react";

export interface RecentItem {
  repoName: string;
  url: string;
  timestamp: number;
}

interface LandingViewProps {
  onAnalyze: (url: string, branch?: string) => void;
  recentItems: RecentItem[];
  onSelectRecent: (url: string) => void;
  isSubmitting?: boolean;
}

export function LandingView({
  onAnalyze,
  recentItems,
  onSelectRecent,
  isSubmitting = false,
}: LandingViewProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validateUrl = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Enter a URL in the form github.com/owner/repository.");
      return false;
    }
    // Strict GitHub regex matching owner and repo
    const match = trimmed.match(
      /(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i
    );
    if (!match) {
      setError("Enter a URL in the form github.com/owner/repository.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateUrl(inputUrl)) {
      onAnalyze(inputUrl.trim(), branch.trim() || undefined);
    }
  };

  const handleBlur = () => {
    if (inputUrl.trim()) {
      validateUrl(inputUrl);
    }
  };

  const examples = [
    {
      name: "expressjs/morgan",
      desc: "HTTP request logger middleware for Node.js (Small, 14 files)",
      url: "https://github.com/expressjs/morgan",
    },
    {
      name: "fastify/fastify",
      desc: "Fast and low overhead web framework for Node.js (Medium, modular runtime)",
      url: "https://github.com/fastify/fastify",
    },
    {
      name: "pallets/flask",
      desc: "The Python micro framework for building web applications (Large, WSGI ecosystem)",
      url: "https://github.com/pallets/flask",
    },
  ];

  return (
    <div className="w-full max-w-[960px] pt-12 pb-20">
      {/* Title & Subtitle */}
      <div className="mb-8">
        <h1 className="text-[28px] leading-[36px] font-normal text-text-primary tracking-tight">
          RepoMap
        </h1>
        <p className="text-sm leading-[20px] text-text-secondary mt-2 max-w-[720px]">
          Codebase onboarding in about 60 seconds. Paste a public GitHub repository URL to get an
          architecture overview, a reading order, and a local setup guide.
        </p>
      </div>

      {/* Input Section */}
      <form onSubmit={handleSubmit} className="mb-10">
        <label
          htmlFor="repo-url-input"
          className="block text-xs font-semibold text-text-primary mb-1.5"
        >
          GitHub repository URL & Branch / Tag
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="repo-url-input"
            type="text"
            value={inputUrl}
            onChange={(e) => {
              setInputUrl(e.target.value);
              if (error) setError(null);
            }}
            onBlur={handleBlur}
            placeholder="https://github.com/owner/repository"
            disabled={isSubmitting}
            className={`flex-1 h-12 px-3 bg-layer-01 border text-sm text-text-primary placeholder:text-text-helper rounded-none focus:outline-none focus:ring-2 focus:ring-accent ${
              error ? "border-error" : "border-border-strong"
            }`}
          />
          <div className="sm:w-48 relative shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-helper">
              <GitBranch size={14} strokeWidth={1.5} />
            </div>
            <input
              id="branch-tag-input"
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="Branch/Tag (opt)"
              disabled={isSubmitting}
              title="Specify a branch (e.g. develop, main) or release tag (e.g. v2.0)"
              className="w-full h-12 pl-8 pr-3 bg-layer-01 border border-border-strong text-sm text-text-primary placeholder:text-text-helper rounded-none focus:outline-none focus:ring-2 focus:ring-accent font-mono text-xs"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 sm:h-12 px-6 bg-accent text-white text-sm font-semibold hover:bg-accent-hover rounded-none flex items-center justify-center space-x-2 shrink-0 disabled:opacity-50"
          >
            <span>Analyze repository</span>
            <ArrowRight size={16} strokeWidth={1.5} />
          </button>
        </div>

        {error ? (
          <p className="mt-1.5 text-xs text-error font-medium" role="alert">
            {error}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-text-helper">
            Example: https://github.com/owner/repository (supports custom branches like <span className="font-mono text-text-secondary">develop</span> or tags like <span className="font-mono text-text-secondary">v2.0</span>)
          </p>
        )}
      </form>

      {/* Recent Analyses (if any) */}
      {recentItems && recentItems.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center space-x-2 mb-2">
            <History size={14} strokeWidth={1.5} className="text-text-helper" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-helper">
              Recent repositories
            </h2>
          </div>
          <div className="border border-border-subtle bg-layer-01 divide-y divide-border-subtle">
            {recentItems.slice(0, 5).map((item) => (
              <div
                key={item.url}
                className="p-3 flex items-center justify-between hover:bg-layer-02"
              >
                <div>
                  <span className="font-mono text-xs font-semibold text-text-primary">
                    {item.repoName}
                  </span>
                  <span className="ml-3 text-[11px] text-text-helper">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectRecent(item.url)}
                  className="text-xs text-link hover:underline"
                >
                  Load
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Example Repositories */}
      <section className="mb-12">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-helper mb-2">
          Example repositories
        </h2>
        <div className="border border-border-subtle bg-layer-01 divide-y divide-border-subtle">
          {examples.map((eg) => (
            <div
              key={eg.name}
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-layer-02"
            >
              <div>
                <p className="font-mono text-xs font-semibold text-text-primary">{eg.name}</p>
                <p className="text-xs text-text-secondary mt-0.5">{eg.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => onAnalyze(eg.url)}
                className="text-xs text-link hover:underline text-left sm:text-right shrink-0"
              >
                Load
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* How it works section */}
      <section id="how-it-works-section" className="pt-4 border-t border-border-subtle">
        <h2 className="text-sm font-semibold text-text-primary mb-4">How it works</h2>
        <div className="border border-border-subtle bg-layer-01 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border-subtle">
          <div className="p-4">
            <span className="text-xs font-mono text-text-helper block mb-1">01. Fetch</span>
            <h3 className="text-sm font-semibold text-text-primary mb-1">Targeted Extraction</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Fetches repository metadata, recursive git trees, and manifests without cloning full
              commit history or binary assets.
            </p>
          </div>

          <div className="p-4">
            <span className="text-xs font-mono text-text-helper block mb-1">02. Analyze</span>
            <h3 className="text-sm font-semibold text-text-primary mb-1">Architectural Inference</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Discovers entrypoints, ranks critical modules, extracts local run scripts, and isolates
              core component relationships.
            </p>
          </div>

          <div className="p-4">
            <span className="text-xs font-mono text-text-helper block mb-1">03. Learn</span>
            <h3 className="text-sm font-semibold text-text-primary mb-1">Actionable Onboarding</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Generates a verified Mermaid flowchart, a 5-step file reading curriculum, verified
              local setup steps, and safe first contribution areas.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
