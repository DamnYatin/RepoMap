"use client";

import React, { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
  theme?: "light" | "dark";
}

export function MermaidDiagram({ chart, theme = "light" }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState<string>("");
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let isCancelled = false;

    async function renderChart() {
      if (!chart) return;
      try {
        setHasError(false);
        const mermaid = (await import("mermaid")).default;
        
        // Neutral theme conforming strictly to IBM Carbon tokens
        const isDark = theme === "dark";
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: {
            darkMode: isDark,
            background: isDark ? "#262626" : "#f4f4f4",
            primaryColor: isDark ? "#393939" : "#ffffff",
            primaryTextColor: isDark ? "#f4f4f4" : "#161616",
            primaryBorderColor: isDark ? "#6f6f6f" : "#8d8d8d",
            lineColor: isDark ? "#a8a8a8" : "#525252",
            secondaryColor: isDark ? "#262626" : "#ffffff",
            tertiaryColor: isDark ? "#161616" : "#ffffff",
            fontFamily: "var(--font-ibm-plex-sans), sans-serif",
            fontSize: "13px",
            edgeLabelBackground: isDark ? "#262626" : "#ffffff",
          },
        });

        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        
        if (!isCancelled) {
          setSvgHtml(svg);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error("Mermaid rendering error:", err);
          setHasError(true);
          setErrorMessage(err instanceof Error ? err.message : "Syntax or render error");
        }
      }
    }

    renderChart();
    return () => {
      isCancelled = true;
    };
  }, [chart, theme]);

  if (hasError) {
    return (
      <div className="border border-border-subtle bg-layer-01 p-4 text-xs font-mono">
        <p className="text-error font-sans mb-2 font-semibold">Diagram could not be rendered</p>
        <details className="cursor-pointer">
          <summary className="text-text-helper mb-2">View raw diagram code</summary>
          <pre className="p-2 bg-layer-02 border border-border-subtle text-text-secondary overflow-x-auto">
            {chart}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto bg-layer-01 border border-border-subtle p-4 flex justify-center items-center min-h-[160px]"
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}
