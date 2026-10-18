"use client";

import React, { useEffect, useRef, useState } from "react";
import { Component } from "../lib/types";

interface MermaidDiagramProps {
  chart: string;
  theme?: "light" | "dark";
  components?: Component[];
  onNodeClick?: (component: Component) => void;
}

export function MermaidDiagram({
  chart,
  theme = "light",
  components,
  onNodeClick,
}: MermaidDiagramProps) {
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

  // Wire up interactive node clicks
  useEffect(() => {
    if (!containerRef.current || !components || !onNodeClick || !svgHtml) return;

    const nodeElements = containerRef.current.querySelectorAll<SVGGElement>("g.node");
    const cleanupFns: Array<() => void> = [];

    nodeElements.forEach((g) => {
      // Find matching component from node id (e.g. flowchart-n1-xxx or n1)
      const idMatch = g.id.match(/(?:flowchart-)?n(\d+)/i);
      let matchedComp: Component | undefined;

      if (idMatch) {
        const index = parseInt(idMatch[1], 10) - 1;
        if (index >= 0 && index < components.length) {
          matchedComp = components[index];
        }
      }

      if (!matchedComp) {
        const text = g.textContent?.trim().toLowerCase() || "";
        matchedComp = components.find(
          (c) => text.includes(c.name.toLowerCase()) || text.includes(c.id.toLowerCase())
        );
      }

      if (matchedComp) {
        g.style.cursor = "pointer";
        g.setAttribute("title", `Click to jump to ${matchedComp.name} (${matchedComp.path})`);

        const originalFilter = g.style.filter;

        const handleClick = (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          onNodeClick(matchedComp!);
        };

        const handleMouseEnter = () => {
          g.style.filter = "brightness(1.25) drop-shadow(0 0 4px rgba(15, 98, 254, 0.4))";
        };

        const handleMouseLeave = () => {
          g.style.filter = originalFilter;
        };

        g.addEventListener("click", handleClick);
        g.addEventListener("mouseenter", handleMouseEnter);
        g.addEventListener("mouseleave", handleMouseLeave);

        cleanupFns.push(() => {
          g.removeEventListener("click", handleClick);
          g.removeEventListener("mouseenter", handleMouseEnter);
          g.removeEventListener("mouseleave", handleMouseLeave);
        });
      }
    });

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, [svgHtml, components, onNodeClick]);

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
