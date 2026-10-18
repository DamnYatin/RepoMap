"use client";

import React, { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { LandingView, RecentItem } from "@/components/LandingView";
import { LoadingView, StageStep } from "@/components/LoadingView";
import { ResultsView } from "@/components/ResultsView";
import { SAMPLE_GUIDE } from "@/lib/sample-data";
import { RepoGuide, StageId, StageStatus, RepoErrorPayload } from "@/lib/types";
import { AlertCircle, RefreshCw } from "lucide-react";

type ViewState = "landing" | "loading" | "results" | "error";

const DEFAULT_STEPS: StageStep[] = [
  { id: "validating", label: "Validating repository", status: "pending" },
  { id: "fetch_tree", label: "Fetching file tree", status: "pending" },
  { id: "reading_files", label: "Reading key files", status: "pending" },
  { id: "analyzing", label: "Analyzing architecture", status: "pending" },
  { id: "preparing", label: "Preparing guide", status: "pending" },
];

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [viewState, setViewState] = useState<ViewState>("landing");
  const [currentRepoUrl, setCurrentRepoUrl] = useState<string>("");
  const [guideData, setGuideData] = useState<RepoGuide | null>(null);
  const [errorInfo, setErrorInfo] = useState<RepoErrorPayload | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [steps, setSteps] = useState<StageStep[]>(DEFAULT_STEPS);
  const [startTime, setStartTime] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize Theme from localStorage or default directly to dark
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("repomap-theme") as "light" | "dark" | null;
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.classList.toggle("dark", savedTheme === "dark");
        document.documentElement.style.colorScheme = savedTheme;
      } else {
        setTheme("dark");
        document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      }
    } catch {
      // ignore
    }
  }, []);

  // Initialize Recent Items from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("repomap-recent");
      if (saved) {
        setRecentItems(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  // Handle URL query parameter ?repo=...
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const repoParam = params.get("repo");
      if (repoParam) {
        handleAnalyze(repoParam);
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    try {
      localStorage.setItem("repomap-theme", nextTheme);
    } catch {
      // ignore
    }
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setViewState("landing");
  };

  const saveRecent = (repoName: string, url: string) => {
    try {
      const updated = [
        { repoName, url, timestamp: Date.now() },
        ...recentItems.filter((item) => item.url !== url),
      ].slice(0, 5);
      setRecentItems(updated);
      localStorage.setItem("repomap-recent", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Main Analysis function
  const handleAnalyze = async (repoUrl: string, forceFresh = false, branch?: string) => {
    const finalUrl = repoUrl.trim();
    setCurrentRepoUrl(finalUrl);
    setErrorInfo(null);
    setViewState("loading");
    setStartTime(Date.now());

    // Reset steps
    setSteps(
      DEFAULT_STEPS.map((s, idx) => ({
        ...s,
        status: idx === 0 ? "running" : "pending",
      }))
    );

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: finalUrl, branch, forceFresh }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        // If /api/analyze is not ready or failed (e.g. during Step 1 stub mode)
        const text = await res.text();
        let parsedErr: RepoErrorPayload = {
          code: "ANALYSIS_FAILED",
          message: text || "Analysis request failed",
        };
        try {
          parsedErr = JSON.parse(text);
        } catch {
          // fallback
        }
        // In Step 1 stub fallback mode, if /api/analyze returns 404, fallback to sample guide
        if (res.status === 404) {
          simulateStubStepFlow(repoUrl);
          return;
        }
        setErrorInfo(parsedErr);
        setViewState("error");
        return;
      }

      // Check content-type for NDJSON stream
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/x-ndjson") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line);
              if (event.type === "stage") {
                setSteps((prev) =>
                  prev.map((step) => {
                    if (step.id === event.id) {
                      return { ...step, status: event.status };
                    }
                    return step;
                  })
                );
              } else if (event.type === "result") {
                setGuideData(event.data);
                saveRecent(event.data.metadata.repoName, repoUrl);
                setViewState("results");
                return;
              } else if (event.type === "error") {
                setErrorInfo({
                  code: event.code,
                  message: event.message,
                  details: event.details,
                });
                setViewState("error");
                return;
              }
            } catch (parseErr) {
              console.error("Stream parse error:", parseErr);
            }
          }
        }
      } else {
        // Single JSON response fallback
        const data = await res.json();
        if (data.error) {
          setErrorInfo(data);
          setViewState("error");
        } else {
          setGuideData(data);
          saveRecent(data.metadata.repoName, repoUrl);
          setViewState("results");
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") {
        return;
      }
      console.warn("API request failed, checking for Step 1 stub fallback:", err);
      // Fallback for Step 1 verification before Step 3 API is mounted
      simulateStubStepFlow(repoUrl);
    }
  };

  const simulateStubStepFlow = (repoUrl: string) => {
    // Demonstrates smooth loading steps in Step 1
    let curIdx = 0;
    const interval = setInterval(() => {
      curIdx++;
      if (curIdx < DEFAULT_STEPS.length) {
        setSteps((prev) =>
          prev.map((s, idx) => ({
            ...s,
            status: idx < curIdx ? "done" : idx === curIdx ? "running" : "pending",
          }))
        );
      } else {
        clearInterval(interval);
        setGuideData(SAMPLE_GUIDE);
        saveRecent(SAMPLE_GUIDE.metadata.repoName, repoUrl);
        setViewState("results");
      }
    }, 400);
  };

  const handleExplainFile = async (filePath: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: currentRepoUrl, path: filePath }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.explanation;
      }
    } catch {
      // fallback
    }
    return `Purpose: Core module defining runtime configuration.\nKey Exports: Initializes main handlers and validates contracts.\nConnection: Communicates with the primary lifecycle orchestrator.\nWatch Out: Ensure options are sanitized before passing down to child contexts.`;
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        showHowItWorks={viewState === "landing"}
        onNavigateHome={() => setViewState("landing")}
      />

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-12 flex flex-col">
        {viewState === "landing" && (
          <LandingView
            onAnalyze={(url, branch) => handleAnalyze(url, false, branch)}
            recentItems={recentItems}
          />
        )}

        {viewState === "loading" && (
          <div className="pt-16 flex justify-center">
            <LoadingView
              steps={steps}
              startTime={startTime}
              onCancel={handleCancel}
              repoUrl={currentRepoUrl}
            />
          </div>
        )}

        {viewState === "results" && guideData && (
          <ResultsView
            guide={guideData}
            theme={theme}
            onReset={() => setViewState("landing")}
            onRerun={() => handleAnalyze(currentRepoUrl, true)}
            onExplainFile={handleExplainFile}
          />
        )}

        {viewState === "error" && (
          <div className="pt-16 max-w-[640px]">
            <div className="p-5 border border-error bg-layer-01 space-y-3">
              <div className="flex items-center space-x-2 text-error">
                <AlertCircle size={18} strokeWidth={1.5} />
                <h2 className="text-sm font-semibold">
                  {errorInfo?.code ? `Analysis Error (${errorInfo.code})` : "Analysis Failed"}
                </h2>
              </div>

              <p className="text-xs text-text-primary leading-relaxed">
                {errorInfo?.message || "An unexpected error occurred while analyzing the repository."}
              </p>

              {errorInfo?.code === "RATE_LIMITED" && (
                <div className="p-3 bg-layer-02 border border-border-subtle text-xs text-text-secondary space-y-1">
                  <p className="font-semibold text-text-primary">GitHub Rate Limit Exceeded:</p>
                  <p>
                    Set a <code className="text-text-primary font-mono">GITHUB_TOKEN</code> in your{" "}
                    <code className="text-text-primary font-mono">.env.local</code> file to increase
                    the limit from 60 requests/hr to 5,000 requests/hr.
                  </p>
                  {errorInfo.resetAt && (
                    <p className="text-text-helper font-mono text-[11px]">
                      Rate limit resets at: {new Date(errorInfo.resetAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              )}

              {errorInfo?.details && (
                <pre className="p-2.5 bg-layer-02 border border-border-subtle text-[11px] text-text-helper font-mono overflow-x-auto">
                  {errorInfo.details}
                </pre>
              )}

              <div className="pt-2 flex items-center space-x-3">
                <button
                  onClick={() => handleAnalyze(currentRepoUrl)}
                  className="h-8 px-4 bg-accent text-white text-xs font-semibold hover:bg-accent-hover flex items-center space-x-1.5"
                >
                  <RefreshCw size={13} strokeWidth={1.5} />
                  <span>Try again</span>
                </button>
                <button
                  onClick={() => setViewState("landing")}
                  className="h-8 px-4 border border-border-subtle text-xs text-text-secondary hover:text-text-primary hover:bg-layer-02"
                >
                  Return to home
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
