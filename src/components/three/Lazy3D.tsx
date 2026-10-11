import { lazy, Suspense, type ReactNode } from "react";
import { ClientOnly } from "@tanstack/react-router";

const HeroLazy = lazy(() => import("./Hero3D"));
const BossLazy = lazy(() => import("./BossIntro3D"));
const CelebrationLazy = lazy(() => import("./Celebration3D"));

function Shell({ children }: { children: ReactNode }) {
  const fallback = <div className="size-full animate-pulse rounded-3xl bg-muted/30" />;
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </ClientOnly>
  );
}

export const HeroScene = () => (
  <Shell>
    <HeroLazy />
  </Shell>
);
export const BossScene = ({ hue }: { hue: number }) => (
  <Shell>
    <BossLazy hue={hue} />
  </Shell>
);
export const CelebrationScene = () => (
  <Shell>
    <CelebrationLazy />
  </Shell>
);
