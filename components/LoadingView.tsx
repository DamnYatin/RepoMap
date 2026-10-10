"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Check, X, Circle } from "lucide-react";
import { StageId, StageStatus } from "@/lib/types";

export interface StageStep {
  id: StageId;
  label: string;
  status: StageStatus;
  elapsed?: number;
}

interface LoadingViewProps {
  steps: StageStep[];
  startTime: number;
  onCancel: () => void;
  repoUrl: string;
}

export function LoadingView({
  steps,
  startTime,
  onCancel,
  repoUrl,
}: LoadingViewProps) {
  const [totalSeconds, setTotalSeconds] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTotalSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    }, 500);
    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <div className="w-full max-w-[640px] border border-border-subtle bg-layer-01 p-6">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Analyzing repository</h2>
          <p className="text-xs text-text-helper font-mono mt-1 break-all">{repoUrl}</p>
        </div>
        <span className="text-xs font-mono text-text-secondary">{totalSeconds}s</span>
      </div>

      <div className="space-y-3 mb-6">
        {steps.map((step) => {
          return (
            <div
              key={step.id}
              className="flex items-center justify-between text-xs py-1.5 px-2 bg-layer-02 border border-border-subtle"
            >
              <div className="flex items-center space-x-3">
                {step.status === "running" && (
                  <Loader2 size={16} strokeWidth={1.5} className="animate-spin text-accent" />
                )}
                {step.status === "done" && (
                  <Check size={16} strokeWidth={1.5} className="text-success" />
                )}
                {step.status === "failed" && (
                  <X size={16} strokeWidth={1.5} className="text-error" />
                )}
                {step.status === "pending" && (
                  <Circle size={16} strokeWidth={1.5} className="text-border-strong opacity-40" />
                )}

                <span
                  className={
                    step.status === "running"
                      ? "text-text-primary font-semibold"
                      : step.status === "done"
                      ? "text-text-secondary"
                      : "text-text-helper"
                  }
                >
                  {step.label}
                </span>
              </div>

              <span className="text-[11px] font-mono text-text-helper">
                {step.status === "running" ? "in progress" : step.status === "done" ? "completed" : ""}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-[11px] text-text-helper">
          Extracting ASTs, reading manifests, and inferring architecture...
        </p>
        <button
          onClick={onCancel}
          className="h-8 px-4 border border-border-subtle text-xs text-text-secondary hover:text-text-primary hover:bg-layer-02 focus-visible:outline-accent"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
