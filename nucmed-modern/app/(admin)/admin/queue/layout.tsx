import { Suspense } from "react";

export const dynamic = 'force-dynamic';

export default function QueueLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
