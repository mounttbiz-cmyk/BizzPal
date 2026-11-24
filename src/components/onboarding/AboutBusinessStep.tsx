"use client";

import React from "react";
import { BusinessBriefEditor } from "@/components/brief/BusinessBriefEditor";
import { StepHeader } from "./ui";

/** Sign-up step: what the business does, so the AI advisors know it from the first conversation. */
export function AboutBusinessStep({ website, onBack, onNext }: { website: string; onBack: () => void; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <StepHeader eyebrow="Step 8 · About your business" title="Tell your advisors what you do">
        Your AI advisors read this before every answer. Describe the business in a few lines, share a link or upload your menu or price list, and
        we&apos;ll suggest the answers for you to check. You can change it any time in Settings.
      </StepHeader>
      <BusinessBriefEditor variant="onboarding" defaultLink={website} onBack={onBack} onDone={onNext} />
    </div>
  );
}
