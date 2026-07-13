"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

export function ShareButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button onClick={copy} className="btn-ghost" title="Copy a public read-only link">
      {copied ? (
        <>
          <Check className="size-4 text-emerald-500" /> Copied
        </>
      ) : (
        <>
          <Link2 className="size-4" /> Share
        </>
      )}
    </button>
  );
}
