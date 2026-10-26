"use client";

import { useEffect, useRef, useState } from "react";

type CopyLinkButtonProps = {
  value: string;
};

export default function CopyLinkButton({ value }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);

      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current);
      }

      resetTimerRef.current = setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      className={`copy-link-button ${copied ? "copy-link-button-copied" : ""}`}
      aria-label={copied ? "GitHub URL copied" : "Copy GitHub URL"}
      title={copied ? "Copied" : "Copy link"}
      onClick={handleCopy}
    >
      {copied ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 12 4 4L19 6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="8" y="8" width="11" height="11" rx="2" />
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </svg>
      )}

      <span className="visually-hidden" aria-live="polite">
        {copied ? "Link copied" : ""}
      </span>
    </button>
  );
}
