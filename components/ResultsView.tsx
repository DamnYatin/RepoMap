"use client";

import React, { useState, useEffect } from "react";
import {
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Terminal,
  FileCode,
  ShieldCheck,
  FolderTree,
  BookOpen,
  HelpCircle,
  PlayCircle,
  GitPullRequest,
  Info,
  Tag,
  MessageSquare,
} from "lucide-react";
import { RepoGuide, Component } from "@/lib/types";
import { MermaidDiagram } from "./MermaidDiagram";

interface ResultsViewProps {
  guide: RepoGuide;
  theme: "light" | "dark";
  onReset: () => void;
  onRerun?: () => void;
  onExplainFile?: (path: string) => Promise<string | null>;
}

export function ResultsView({
  guide,
  theme,
  onReset,
  onRerun,
  onExplainFile,
}: ResultsViewProps) {
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [copiedMd, setCopiedMd] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCommandIndex, setCopiedCommandIndex] = useState<number | null>(null);
  const [showScope, setShowScope] = useState<boolean>(false);
  const [highlightedTarget, setHighlightedTarget] = useState<string | null>(null);
  
  // State for "Explain this file" inline expansions
  const [explainingPath, setExplainingPath] = useState<string | null>(null);
  const [fileExplanations, setFileExplanations] = useState<Record<string, string>>({});

  // State for Live Good First Issues
  const [issues, setIssues] = useState<any[]>([]);
  const [issuesLoaded, setIssuesLoaded] = useState<boolean>(false);
  const [issuesLoading, setIssuesLoading] = useState<boolean>(false);

  // State for Quiz feature
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizLoaded, setQuizLoaded] = useState<boolean>(false);
  const [quizLoading, setQuizLoading] = useState<boolean>(false);
  const [quizSelections, setQuizSelections] = useState<Record<number, number>>({});
  const [quizChecked, setQuizChecked] = useState<Record<number, boolean>>({});

  // State for Ask feature
  const [askQuestion, setAskQuestion] = useState<string>("");
  const [askLoading, setAskLoading] = useState<boolean>(false);
  const [askHistory, setAskHistory] = useState<Array<{ q: string; a: string }>>([]);

  const meta = guide.metadata;
  const githubBase = `https://github.com/${meta.owner}/${meta.repo}`;
  const githubFile = (path: string) => `${githubBase}/blob/${meta.branch}/${path}`;

  // Fetch Good First Issues on mount
  useEffect(() => {
    if (!meta.owner || !meta.repo) return;
    let isCancelled = false;
    setIssuesLoading(true);

    fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: meta.owner, repo: meta.repo }),
    })
      .then((res) => (res.ok ? res.json() : { issues: [] }))
      .then((data) => {
        if (!isCancelled) {
          setIssues(data.issues || []);
          setIssuesLoaded(true);
        }
      })
      .catch((err) => {
        console.warn("Failed to load good first issues:", err);
      })
      .finally(() => {
        if (!isCancelled) setIssuesLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [meta.owner, meta.repo]);

  const handleNodeClick = (comp: Component) => {
    // 1. Try matching Start Here item
    const matchedStart = guide.startHere.find(
      (s) => s.path === comp.path || comp.path.includes(s.path) || s.path.includes(comp.path)
    );
    if (matchedStart) {
      const targetId = `starthere-${matchedStart.path.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
      const el = document.getElementById(targetId);
      if (el) {
        setActiveSection("starthere");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedTarget(targetId);
        setTimeout(() => setHighlightedTarget((prev) => (prev === targetId ? null : prev)), 2500);
        return;
      }
    }

    // 2. Try matching Directory Guide folder
    const matchedDir = guide.directories.find(
      (d) => comp.path.startsWith(d.path) || d.path.startsWith(comp.path)
    );
    if (matchedDir) {
      const targetId = `dir-${matchedDir.path.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
      const el = document.getElementById(targetId);
      if (el) {
        setActiveSection("directories");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedTarget(targetId);
        setTimeout(() => setHighlightedTarget((prev) => (prev === targetId ? null : prev)), 2500);
        return;
      }
    }

    // 3. Fallback to Component Responsibility table row
    const targetId = `comp-row-${comp.id}`;
    const el = document.getElementById(targetId);
    if (el) {
      setActiveSection("architecture");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedTarget(targetId);
      setTimeout(() => setHighlightedTarget((prev) => (prev === targetId ? null : prev)), 2500);
    }
  };

  const loadQuiz = async () => {
    setQuizLoading(true);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: githubBase }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuizQuestions(data.questions || []);
        setQuizLoaded(true);
      }
    } catch (err) {
      console.warn("Quiz load error:", err);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuestion.trim() || askLoading) return;
    const q = askQuestion.trim();
    setAskLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: githubBase, question: q }),
      });
      if (res.ok) {
        const data = await res.json();
        setAskHistory((prev) => [...prev, { q, a: data.answer }]);
        setAskQuestion("");
      }
    } catch (err) {
      console.warn("Ask error:", err);
    } finally {
      setAskLoading(false);
    }
  };

  const sections = [
    { id: "overview", label: "Overview", icon: Info },
    { id: "architecture", label: "Architecture", icon: FolderTree },
    { id: "directories", label: "Directory guide", icon: FileCode },
    { id: "starthere", label: "Start here", icon: BookOpen },
    { id: "concepts", label: "Key concepts", icon: HelpCircle },
    { id: "runlocally", label: "Run locally", icon: PlayCircle },
    { id: "contribute", label: "First contribution", icon: GitPullRequest },
    { id: "quiz", label: "Understanding quiz", icon: HelpCircle },
    { id: "scope", label: "Analysis scope", icon: ShieldCheck },
  ];

  // Scroll spy listener
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120;
      for (const section of sections) {
        const el = document.getElementById(`section-${section.id}`);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`section-${id}`);
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 80,
        behavior: "smooth",
      });
    }
  };

  const copyToClipboard = (text: string, cb: () => void) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      cb();
    }
  };

  const handleCopyMarkdown = () => {
    const md = generateMarkdownExport(guide);
    copyToClipboard(md, () => {
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    });
  };

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/?repo=${encodeURIComponent(githubBase)}`;
    copyToClipboard(url, () => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleExplain = async (path: string) => {
    if (fileExplanations[path]) {
      // Toggle if already exists
      return;
    }
    if (onExplainFile) {
      setExplainingPath(path);
      const res = await onExplainFile(path);
      if (res) {
        setFileExplanations((prev) => ({ ...prev, [path]: res }));
      }
      setExplainingPath(null);
    }
  };

  // Language breakdown colors (neutral slate / gray scale, no rainbow)
  const languageColors: Record<string, string> = {
    JavaScript: "#8d8d8d",
    TypeScript: "#0f62fe",
    Python: "#525252",
    Go: "#6f6f6f",
    Rust: "#393939",
    HTML: "#a8a8a8",
    CSS: "#c6c6c6",
    Shell: "#8d8d8d",
  };

  return (
    <div className="w-full max-w-[1200px] pt-4 pb-20">
      {/* Summary Bar */}
      <div className="w-full bg-layer-01 border border-border-subtle p-4 sm:p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3 flex-wrap gap-y-1">
              <a
                href={githubBase}
                target="_blank"
                rel="noreferrer"
                className="text-base sm:text-lg font-semibold text-text-primary hover:text-accent flex items-center space-x-1.5"
              >
                <span>{meta.repoName}</span>
                <ExternalLink size={14} strokeWidth={1.5} />
              </a>
              {meta.cached && (
                <span className="px-2 py-0.5 text-[11px] font-mono border border-border-subtle bg-layer-02 text-text-secondary">
                  Cached
                </span>
              )}
            </div>

            {meta.description && (
              <p className="text-xs sm:text-sm text-text-secondary">{meta.description}</p>
            )}

            <div className="flex items-center space-x-3 text-xs text-text-helper font-mono pt-1 flex-wrap gap-y-1">
              <span>branch: {meta.branch}</span>
              <span>•</span>
              <span>★ {meta.stars.toLocaleString()}</span>
              <span>•</span>
              <span>{meta.primaryLanguage}</span>
              <span>•</span>
              <span>
                Analyzed {meta.filesAnalyzed} files in {meta.durationSeconds.toFixed(1)}s
              </span>
              <span>•</span>
              <span>sha: {meta.commitSha.substring(0, 7)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleCopyMarkdown}
              className="h-8 px-3 border border-border-subtle bg-layer-02 text-xs text-text-secondary hover:text-text-primary flex items-center space-x-1.5"
            >
              {copiedMd ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
              <span>{copiedMd ? "Copied" : "Copy as Markdown"}</span>
            </button>

            <button
              onClick={handleCopyShareLink}
              className="h-8 px-3 border border-border-subtle bg-layer-02 text-xs text-text-secondary hover:text-text-primary flex items-center space-x-1.5"
            >
              {copiedLink ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
              <span>{copiedLink ? "Copied" : "Copy share link"}</span>
            </button>

            <button
              onClick={onReset}
              className="text-xs text-link hover:underline px-2"
            >
              Analyze another
            </button>
          </div>
        </div>

        {meta.cached && onRerun && (
          <div className="mt-2 pt-2 border-t border-border-subtle flex justify-end">
            <button
              onClick={onRerun}
              className="text-xs text-link hover:underline"
            >
              Re-run analysis
            </button>
          </div>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Sticky Left Navigation */}
        <aside className="w-full lg:w-[220px] shrink-0 sticky top-16 z-30 bg-background lg:bg-transparent border lg:border-none border-border-subtle overflow-x-auto lg:overflow-x-visible">
          <nav className="flex lg:flex-col border-b lg:border-b-0 divide-x lg:divide-x-0 divide-border-subtle lg:space-y-1">
            {sections.map((sec) => {
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => scrollTo(sec.id)}
                  className={`text-left text-xs px-3 py-2 shrink-0 flex items-center space-x-2 transition-colors ${
                    isActive
                      ? "text-accent font-semibold lg:border-l-2 lg:border-accent bg-layer-01"
                      : "text-text-secondary hover:text-text-primary hover:bg-layer-01"
                  }`}
                >
                  <sec.icon size={14} strokeWidth={1.5} />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Column */}
        <main className="flex-1 w-full space-y-6">
          {/* Section 1: Overview */}
          <section id="section-overview" className="border border-border-subtle bg-layer-01">
            <div className="h-12 border-b border-border-subtle px-4 sm:px-6 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Overview</h2>
              <span className="px-2 py-0.5 text-xs font-mono border border-border-subtle bg-layer-02 text-text-secondary">
                {guide.summary.pattern}
              </span>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-text-helper uppercase tracking-wider mb-1">
                  Purpose
                </h3>
                <p className="text-sm text-text-primary leading-relaxed">{guide.summary.purpose}</p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-text-helper uppercase tracking-wider mb-1">
                  Architecture Overview
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">{guide.summary.overview}</p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-text-helper uppercase tracking-wider mb-2">
                  Evidenced Tech Stack
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {guide.summary.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-2 py-1 text-xs font-mono border border-border-subtle bg-layer-02 text-text-primary"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {meta.languages && Object.keys(meta.languages).length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-text-helper uppercase tracking-wider mb-2">
                    Language Breakdown
                  </h3>
                  <div className="w-full h-2.5 bg-layer-02 border border-border-subtle flex overflow-hidden">
                    {Object.entries(meta.languages).map(([lang, pct]) => (
                      <div
                        key={lang}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: languageColors[lang] || "#8d8d8d",
                        }}
                        title={`${lang}: ${pct.toFixed(1)}%`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-helper font-mono">
                    {Object.entries(meta.languages).map(([lang, pct]) => (
                      <div key={lang} className="flex items-center space-x-1.5">
                        <span
                          className="w-2 h-2 inline-block"
                          style={{ backgroundColor: languageColors[lang] || "#8d8d8d" }}
                        />
                        <span>
                          {lang} {pct.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 2: Architecture */}
          <section id="section-architecture" className="border border-border-subtle bg-layer-01">
            <div className="h-12 border-b border-border-subtle px-4 sm:px-6 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Architecture</h2>
              <span className="text-xs text-text-helper font-mono">
                {guide.components.length} components
              </span>
            </div>
            <div className="p-4 sm:p-6 space-y-6">
              {/* Mermaid Diagram */}
              <div>
                <div className="flex items-center justify-between text-xs text-text-helper mb-2">
                  <p>Server-synthesized component interaction diagram:</p>
                  <span className="text-[11px] font-mono text-text-helper hidden sm:inline">
                    💡 Click any node to jump to its source in the guide
                  </span>
                </div>
                <MermaidDiagram
                  chart={guide.mermaid}
                  theme={theme}
                  components={guide.components}
                  onNodeClick={handleNodeClick}
                />
              </div>

              {/* Component Responsibility Table */}
              <div>
                <h3 className="text-xs font-semibold text-text-helper uppercase tracking-wider mb-2">
                  Component Responsibilities
                </h3>
                <div className="border border-border-subtle bg-layer-02 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border-subtle bg-layer-01 text-text-helper font-mono">
                        <th className="p-2.5">Component</th>
                        <th className="p-2.5">Location</th>
                        <th className="p-2.5">Responsibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {guide.components.map((comp) => {
                        const rowId = `comp-row-${comp.id}`;
                        const isHighlighted = highlightedTarget === rowId;
                        return (
                          <tr
                            key={comp.id}
                            id={rowId}
                            className={`transition-colors ${
                              isHighlighted
                                ? "bg-accent/20 ring-1 ring-accent"
                                : "hover:bg-layer-01"
                            }`}
                          >
                            <td className="p-2.5 font-semibold text-text-primary whitespace-nowrap">
                              {comp.name}
                            </td>
                            <td className="p-2.5 font-mono text-link">
                              <a
                                href={githubFile(comp.path)}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline"
                              >
                                {comp.path}
                              </a>
                            </td>
                            <td className="p-2.5 text-text-secondary">{comp.responsibility}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Directory Guide */}
          <section id="section-directories" className="border border-border-subtle bg-layer-01">
            <div className="h-12 border-b border-border-subtle px-4 sm:px-6 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Directory Guide</h2>
              <span className="text-xs text-text-helper font-mono">
                {guide.directories.length} folders
              </span>
            </div>
            <div className="p-4 sm:p-6">
              <div className="border border-border-subtle bg-layer-02 divide-y divide-border-subtle">
                {guide.directories.map((dir) => {
                  const dirId = `dir-${dir.path.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
                  const isHighlighted = highlightedTarget === dirId;
                  return (
                    <div
                      key={dir.path}
                      id={dirId}
                      className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 transition-all ${
                        isHighlighted
                          ? "bg-accent/20 ring-1 ring-accent"
                          : "hover:bg-layer-01"
                      }`}
                    >
                      <span className="font-mono text-xs font-semibold text-text-primary">
                        {dir.path}/
                      </span>
                      <span className="text-xs text-text-secondary sm:text-right">
                        {dir.purpose}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Section 4: Start Here */}
          <section id="section-starthere" className="border border-border-subtle bg-layer-01">
            <div className="h-12 border-b border-border-subtle px-4 sm:px-6 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Start Here (Reading Order)</h2>
              <span className="text-xs text-text-helper">5 sequential modules</span>
            </div>
            <div className="p-4 sm:p-6 space-y-3">
              {guide.startHere.map((item, idx) => {
                const startId = `starthere-${item.path.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
                const isHighlighted = highlightedTarget === startId;
                return (
                  <div
                    key={item.path}
                    id={startId}
                    className={`p-4 border space-y-2 transition-all ${
                      isHighlighted
                        ? "border-accent ring-2 ring-accent bg-accent/10"
                        : "border-border-subtle bg-layer-02"
                    }`}
                  >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 bg-layer-01 border border-border-subtle text-xs font-mono flex items-center justify-center font-semibold text-text-primary">
                        {idx + 1}
                      </span>
                      <a
                        href={githubFile(item.path)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs font-semibold text-link hover:underline"
                      >
                        {item.path}
                      </a>
                    </div>
                    <div className="flex items-center space-x-3">
                      {onExplainFile && (
                        <button
                          onClick={() => handleExplain(item.path)}
                          disabled={explainingPath === item.path}
                          className="text-[11px] px-2 py-0.5 border border-border-subtle bg-layer-01 text-text-secondary hover:text-text-primary hover:bg-background"
                        >
                          {explainingPath === item.path
                            ? "Analyzing..."
                            : fileExplanations[item.path]
                            ? "Explained"
                            : "Explain this file"}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-text-primary leading-relaxed">{item.why}</p>

                  <div className="pt-1 flex items-start space-x-1.5 text-xs text-text-secondary">
                    <span className="font-semibold text-text-helper shrink-0">You will learn:</span>
                    <span>{item.learn}</span>
                  </div>

                  {/* Inline Explanation if triggered */}
                  {fileExplanations[item.path] && (
                    <div className="mt-3 p-3 bg-layer-01 border border-border-subtle text-xs text-text-secondary space-y-1">
                      <p className="font-semibold text-text-primary">Deep Explanation:</p>
                      <p className="whitespace-pre-line leading-relaxed">
                        {fileExplanations[item.path]}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </section>

          {/* Section 5: Key Concepts */}
          <section id="section-concepts" className="border border-border-subtle bg-layer-01">
            <div className="h-12 border-b border-border-subtle px-4 sm:px-6 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Key Concepts</h2>
              <span className="text-xs text-text-helper">{guide.concepts.length} patterns</span>
            </div>
            <div className="p-4 sm:p-6 space-y-3">
              {guide.concepts.map((concept) => (
                <div
                  key={concept.name}
                  className="p-3.5 border border-border-subtle bg-layer-02 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <h3 className="text-xs font-semibold text-text-primary">{concept.name}</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {concept.explanation}
                    </p>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <span className="text-[11px] text-text-helper mr-1.5">See in:</span>
                    <a
                      href={githubFile(concept.seeIn)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-link hover:underline"
                    >
                      {concept.seeIn}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 6: Run Locally */}
          <section id="section-runlocally" className="border border-border-subtle bg-layer-01">
            <div className="h-12 border-b border-border-subtle px-4 sm:px-6 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Run Locally</h2>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-text-helper">Confidence:</span>
                <span
                  className={`px-2 py-0.5 text-xs font-semibold border ${
                    guide.runLocally.confidence === "high"
                      ? "border-success text-success bg-layer-02"
                      : guide.runLocally.confidence === "medium"
                      ? "border-warning text-warning bg-layer-02"
                      : "border-error text-error bg-layer-02"
                  }`}
                >
                  {guide.runLocally.confidence.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-5">
              {guide.runLocally.confidence === "low" && (
                <div className="p-3 border border-warning bg-layer-02 text-xs text-warning">
                  Setup steps could not be verified with high certainty. Check the project README.
                </div>
              )}

              {/* Prerequisites */}
              <div>
                <h3 className="text-xs font-semibold text-text-helper uppercase tracking-wider mb-2">
                  Prerequisites
                </h3>
                <div className="flex flex-wrap gap-2">
                  {guide.runLocally.prerequisites.map((pre) => (
                    <span
                      key={pre}
                      className="px-2.5 py-1 text-xs font-mono border border-border-subtle bg-layer-02 text-text-primary"
                    >
                      {pre}
                    </span>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <h3 className="text-xs font-semibold text-text-helper uppercase tracking-wider mb-2">
                  Execution Steps
                </h3>
                <div className="space-y-2">
                  {guide.runLocally.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 border border-border-subtle bg-layer-02 flex items-center justify-between font-mono text-xs"
                    >
                      <div className="flex items-center space-x-3 overflow-x-auto">
                        <span className="text-text-helper select-none">{idx + 1}.</span>
                        <code className="text-text-primary">{step}</code>
                      </div>
                      <button
                        onClick={() => {
                          copyToClipboard(step, () => {
                            setCopiedCommandIndex(idx);
                            setTimeout(() => setCopiedCommandIndex(null), 1500);
                          });
                        }}
                        className="ml-3 p-1 text-text-secondary hover:text-text-primary shrink-0"
                        title="Copy command"
                      >
                        {copiedCommandIndex === idx ? (
                          <Check size={14} strokeWidth={1.5} className="text-success" />
                        ) : (
                          <Copy size={14} strokeWidth={1.5} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test command if present */}
              {guide.runLocally.testCommand && (
                <div>
                  <h3 className="text-xs font-semibold text-text-helper uppercase tracking-wider mb-1.5">
                    Test Command
                  </h3>
                  <div className="p-2.5 border border-border-subtle bg-layer-02 flex items-center justify-between font-mono text-xs">
                    <code className="text-text-primary">{guide.runLocally.testCommand}</code>
                    <button
                      onClick={() => {
                        copyToClipboard(guide.runLocally.testCommand || "", () => {
                          setCopiedCommandIndex(999);
                          setTimeout(() => setCopiedCommandIndex(null), 1500);
                        });
                      }}
                      className="ml-3 p-1 text-text-secondary hover:text-text-primary shrink-0"
                    >
                      {copiedCommandIndex === 999 ? (
                        <Check size={14} strokeWidth={1.5} className="text-success" />
                      ) : (
                        <Copy size={14} strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Env vars */}
              {guide.runLocally.envVars && guide.runLocally.envVars.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-text-helper uppercase tracking-wider mb-1.5">
                    Environment Variables
                  </h3>
                  <div className="border border-border-subtle bg-layer-02 divide-y divide-border-subtle">
                    {guide.runLocally.envVars.map((envVar) => (
                      <div key={envVar} className="p-2 text-xs font-mono text-text-primary">
                        {envVar}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              {guide.runLocally.sources && guide.runLocally.sources.length > 0 && (
                <div className="pt-1">
                  <span className="text-xs text-text-helper mr-2">Derived from:</span>
                  <span className="text-xs font-mono text-text-secondary">
                    {guide.runLocally.sources.join(", ")}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Section 7: First Contribution */}
          <section id="section-contribute" className="border border-border-subtle bg-layer-01">
            <div className="h-12 border-b border-border-subtle px-4 sm:px-6 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">First Contribution</h2>
              {guide.contribute.contributingPath && (
                <a
                  href={githubFile(guide.contribute.contributingPath)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-link hover:underline flex items-center space-x-1"
                >
                  <span>{guide.contribute.contributingPath}</span>
                  <ExternalLink size={12} strokeWidth={1.5} />
                </a>
              )}
            </div>
            <div className="p-4 sm:p-6 space-y-5">
              {/* Conventions */}
              <div>
                <h3 className="text-xs font-semibold text-text-helper uppercase tracking-wider mb-2">
                  Contribution Conventions
                </h3>
                <ul className="space-y-1.5 text-xs text-text-secondary list-disc list-inside">
                  {guide.contribute.conventions.map((conv, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {conv}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Suggested starter areas */}
              <div>
                <h3 className="text-xs font-semibold text-text-helper uppercase tracking-wider mb-2">
                  Suggested Starter Areas
                </h3>
                <div className="space-y-2.5">
                  {guide.contribute.firstAreas.map((area) => (
                    <div
                      key={area.path}
                      className="p-3 border border-border-subtle bg-layer-02 flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <a
                          href={githubFile(area.path)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs font-semibold text-link hover:underline"
                        >
                          {area.path}
                        </a>
                        <p className="text-xs text-text-secondary">{area.why}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Good First Issues from GitHub */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-text-helper uppercase tracking-wider flex items-center space-x-1.5">
                    <Tag size={12} strokeWidth={1.5} />
                    <span>Live Starter Issues (GitHub)</span>
                  </h3>
                  <a
                    href={`https://github.com/${meta.owner}/${meta.repo}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22%2C%22help+wanted%22`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-link hover:underline flex items-center space-x-1"
                  >
                    <span>Browse GitHub issues</span>
                    <ExternalLink size={10} strokeWidth={1.5} />
                  </a>
                </div>

                {issuesLoading && (
                  <div className="p-3 border border-border-subtle bg-layer-02 text-xs text-text-helper font-mono animate-pulse">
                    Fetching live starter issues from GitHub...
                  </div>
                )}

                {!issuesLoading && issuesLoaded && issues.length === 0 && (
                  <div className="p-3 border border-border-subtle bg-layer-02 text-xs text-text-secondary flex items-start justify-between gap-2">
                    <p>
                      No open issues currently labeled <code className="text-text-primary font-mono text-[11px]">good first issue</code> or <code className="text-text-primary font-mono text-[11px]">help wanted</code>. Refer to the suggested starter areas above to identify self-contained modules for your first pull request.
                    </p>
                  </div>
                )}

                {!issuesLoading && issues.length > 0 && (
                  <div className="space-y-2">
                    {issues.map((issue) => (
                      <div
                        key={issue.id}
                        className="p-3 border border-border-subtle bg-layer-02 hover:bg-layer-01 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-semibold text-text-helper">
                              #{issue.number}
                            </span>
                            <a
                              href={issue.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-link hover:underline line-clamp-1"
                            >
                              {issue.title}
                            </a>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {issue.labels.map((lbl: any) => (
                              <span
                                key={lbl.name}
                                className="px-1.5 py-0.2 text-[10px] font-mono border border-border-subtle text-text-secondary bg-layer-01"
                              >
                                {lbl.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0 text-[11px] font-mono text-text-helper">
                          {issue.comments > 0 && (
                            <span className="flex items-center space-x-1">
                              <MessageSquare size={12} strokeWidth={1.5} />
                              <span>{issue.comments}</span>
                            </span>
                          )}
                          <a
                            href={issue.url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 border border-border-subtle bg-layer-01 text-text-primary hover:bg-background flex items-center space-x-1"
                          >
                            <span>Open</span>
                            <ExternalLink size={10} strokeWidth={1.5} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section 8: Check Your Understanding (Quiz) */}
          <section id="section-quiz" className="border border-border-subtle bg-layer-01">
            <div className="h-12 border-b border-border-subtle px-4 sm:px-6 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Check Your Understanding</h2>
              <span className="text-xs text-text-helper">3 concept questions</span>
            </div>
            <div className="p-4 sm:p-6 space-y-6">
              {!quizLoaded ? (
                <button
                  onClick={loadQuiz}
                  disabled={quizLoading}
                  className="h-9 px-4 border border-border-subtle bg-layer-02 text-xs text-text-primary hover:bg-background"
                >
                  {quizLoading ? "Generating questions..." : "Load understanding quiz"}
                </button>
              ) : (
                <div className="space-y-6">
                  {quizQuestions.map((q, qIndex) => {
                    const isChecked = quizChecked[qIndex];
                    const selected = quizSelections[qIndex];
                    const isCorrect = selected === q.correctIndex;

                    return (
                      <div
                        key={q.id}
                        className="p-4 border border-border-subtle bg-layer-02 space-y-3"
                      >
                        <p className="text-xs font-semibold text-text-primary">
                          {qIndex + 1}. {q.question}
                        </p>

                        <div className="space-y-2">
                          {q.options.map((opt: string, optIdx: number) => (
                            <label
                              key={optIdx}
                              className={`flex items-start space-x-2.5 p-2 text-xs cursor-pointer border ${
                                selected === optIdx
                                  ? "border-accent bg-layer-01"
                                  : "border-transparent hover:bg-layer-01"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`quiz-question-${qIndex}`}
                                checked={selected === optIdx}
                                onChange={() => {
                                  setQuizSelections((prev) => ({ ...prev, [qIndex]: optIdx }));
                                  setQuizChecked((prev) => ({ ...prev, [qIndex]: false }));
                                }}
                                className="mt-0.5 accent-accent"
                              />
                              <span className="text-text-primary">{opt}</span>
                            </label>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => {
                              if (selected !== undefined) {
                                setQuizChecked((prev) => ({ ...prev, [qIndex]: true }));
                              }
                            }}
                            disabled={selected === undefined}
                            className="h-8 px-3 border border-border-subtle bg-layer-01 text-xs text-text-secondary hover:text-text-primary disabled:opacity-40"
                          >
                            Check answer
                          </button>

                          {isChecked && (
                            <div className="text-xs">
                              {isCorrect ? (
                                <span className="text-success font-semibold">Correct</span>
                              ) : (
                                <span className="text-error font-semibold">Incorrect</span>
                              )}
                            </div>
                          )}
                        </div>

                        {isChecked && (
                          <div className="p-3 bg-layer-01 border border-border-subtle text-xs space-y-1">
                            <p className="text-text-secondary">{q.explanation}</p>
                            <p className="text-text-helper">
                              Reference:{" "}
                              <a
                                href={githubFile(q.fileLink)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-link hover:underline font-mono"
                              >
                                {q.fileLink}
                              </a>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Section 9: Analysis Scope (Collapsible) */}
          <section id="section-scope" className="border border-border-subtle bg-layer-01">
            <button
              type="button"
              onClick={() => setShowScope(!showScope)}
              className="w-full h-12 px-4 sm:px-6 flex items-center justify-between text-left hover:bg-layer-02"
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-text-primary">Analysis Scope</span>
                <span className="text-xs text-text-helper font-mono">
                  ({meta.filesAnalyzed} files read, {meta.filesSkipped} skipped)
                </span>
              </div>
              {showScope ? (
                <ChevronDown size={16} strokeWidth={1.5} />
              ) : (
                <ChevronRight size={16} strokeWidth={1.5} />
              )}
            </button>

            {showScope && (
              <div className="p-4 sm:p-6 border-t border-border-subtle space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-2 border border-border-subtle bg-layer-02">
                    <span className="text-text-helper block">Model:</span>
                    <span className="text-text-primary font-semibold">{meta.model}</span>
                  </div>
                  <div className="p-2 border border-border-subtle bg-layer-02">
                    <span className="text-text-helper block">Files Analyzed:</span>
                    <span className="text-text-primary font-semibold">{meta.filesAnalyzed}</span>
                  </div>
                  <div className="p-2 border border-border-subtle bg-layer-02">
                    <span className="text-text-helper block">Files Skipped:</span>
                    <span className="text-text-primary font-semibold">{meta.filesSkipped}</span>
                  </div>
                  <div className="p-2 border border-border-subtle bg-layer-02">
                    <span className="text-text-helper block">Duration:</span>
                    <span className="text-text-primary font-semibold">
                      {meta.durationSeconds.toFixed(1)}s
                    </span>
                  </div>
                </div>

                {meta.warnings && meta.warnings.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-warning mb-1">Warnings:</h4>
                    <ul className="text-xs text-text-helper list-disc list-inside space-y-1">
                      {meta.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {meta.analyzedFilesList && meta.analyzedFilesList.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-text-helper uppercase tracking-wider mb-2">
                      Analyzed File Manifest
                    </h4>
                    <div className="border border-border-subtle bg-layer-02 max-h-48 overflow-y-auto divide-y divide-border-subtle text-xs font-mono">
                      {meta.analyzedFilesList.map((f) => (
                        <div key={f.path} className="p-2 flex justify-between">
                          <span className="text-text-primary">{f.path}</span>
                          <span className="text-text-helper">{(f.bytes / 1024).toFixed(1)} KB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Ask About This Repo - Docked Input Card */}
          <section className="border border-border-strong bg-layer-01 p-4 sm:p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <Terminal size={16} strokeWidth={1.5} className="text-accent" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                Ask about this repository
              </h3>
            </div>

            {askHistory.length > 0 && (
              <div className="space-y-3 max-h-60 overflow-y-auto border border-border-subtle bg-layer-02 p-3 text-xs">
                {askHistory.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <p className="font-semibold text-text-primary">Q: {item.q}</p>
                    <p className="text-text-secondary whitespace-pre-line pl-2 border-l border-border-subtle">
                      A: {item.a}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAskSubmit} className="flex gap-2">
              <input
                type="text"
                value={askQuestion}
                onChange={(e) => setAskQuestion(e.target.value)}
                placeholder="Ask about architecture, entry points, or dependencies..."
                disabled={askLoading}
                className="flex-1 h-10 px-3 bg-layer-02 border border-border-subtle text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="submit"
                disabled={askLoading || !askQuestion.trim()}
                className="h-10 px-4 bg-accent text-white text-xs font-semibold hover:bg-accent-hover disabled:opacity-50"
              >
                {askLoading ? "Searching..." : "Ask"}
              </button>
            </form>
          </section>

          {/* Footer Transparency Notice */}
          <footer className="pt-6 border-t border-border-subtle text-xs text-text-helper">
            This guide is generated by an AI model from a sample of the repository&apos;s files. Verify
            details against the source.
          </footer>
        </main>
      </div>
    </div>
  );
}

// Markdown Export Helper
function generateMarkdownExport(guide: RepoGuide): string {
  const meta = guide.metadata;
  return `# ${meta.repoName} — Onboarding Guide

> Generated by RepoMap (${meta.model}) on ${new Date().toISOString().split("T")[0]}.
> Analyzed ${meta.filesAnalyzed} files in ${meta.durationSeconds.toFixed(1)}s.

## 1. Overview
- **Purpose**: ${guide.summary.purpose}
- **Architecture Pattern**: ${guide.summary.pattern}
- **Tech Stack**: ${guide.summary.techStack.join(", ")}

${guide.summary.overview}

## 2. Architecture Components
| Component | Location | Responsibility |
| --- | --- | --- |
${guide.components.map((c) => `| ${c.name} | \`${c.path}\` | ${c.responsibility} |`).join("\n")}

### Interaction Flow
\`\`\`mermaid
${guide.mermaid}
\`\`\`

## 3. Directory Guide
${guide.directories.map((d) => `- \`${d.path}/\`: ${d.purpose}`).join("\n")}

## 4. Start Here (Recommended Learning Order)
${guide.startHere
  .map(
    (s, i) =>
      `${i + 1}. **\`${s.path}\`**\n   - Why: ${s.why}\n   - You will learn: ${s.learn}`
  )
  .join("\n\n")}

## 5. Key Concepts
${guide.concepts.map((c) => `- **${c.name}**: ${c.explanation} (See \`${c.seeIn}\`)`).join("\n")}

## 6. Run Locally
- **Confidence**: ${guide.runLocally.confidence.toUpperCase()}
- **Prerequisites**: ${guide.runLocally.prerequisites.join(", ")}

### Setup Steps
${guide.runLocally.steps.map((st, i) => `${i + 1}. \`${st}\``).join("\n")}

${guide.runLocally.testCommand ? `**Test Command**: \`${guide.runLocally.testCommand}\`\n` : ""}
${guide.runLocally.envVars.length > 0 ? `**Environment Variables**: ${guide.runLocally.envVars.join(", ")}\n` : ""}

## 7. First Contribution
- **Conventions**:
${guide.contribute.conventions.map((c) => `  - ${c}`).join("\n")}
- **Starter Areas**:
${guide.contribute.firstAreas.map((a) => `  - \`${a.path}\`: ${a.why}`).join("\n")}

---
*Generated by RepoMap. Always verify details against repository source code.*
`;
}
