import React from "react";

export default function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="farmer-print-protected">{children}</div>;
}
