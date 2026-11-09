"use client";

import React from "react";

interface DataPalHeaderProps {
  className?: string;
}

export function DataPalHeader({ className = "" }: DataPalHeaderProps) {
  return (
    <header className={`pb-4 border-b border-line ${className}`}>
      <h1 className="text-xl font-bold text-text">DataPal</h1>
      <p className="text-sm text-text-muted mt-1">
        Find businesses, professionals or audiences and get verified contact details.
      </p>
    </header>
  );
}
