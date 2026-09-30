import React from "react";

interface ContainerTileProps {
  children: React.ReactNode;
  span?: 1 | 2 | 3 | 4;
  className?: string;
  id?: string;
}

export function ContainerTile({
  children,
  span = 1,
  className = "",
  id,
}: ContainerTileProps) {
  // Grid column span classes on desktop (4-column grid)
  const spanClasses: Record<number, string> = {
    1: "col-span-1",
    2: "col-span-1 lg:col-span-2",
    3: "col-span-1 lg:col-span-3",
    4: "col-span-1 md:col-span-2 lg:col-span-4",
  };

  return (
    <div
      id={id}
      className={`@container ${spanClasses[span] || "col-span-1"} ${className}`}
    >
      <div className="h-full bg-surface border border-line hover:border-line-strong rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 shadow-theme">
        {children}
      </div>
    </div>
  );
}
