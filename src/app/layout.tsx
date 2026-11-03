import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Refund Referee",
  description: "Checks a customer's refund request against what PayPal recorded, computes what the shop owes, and refunds exactly that after the owner approves.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
