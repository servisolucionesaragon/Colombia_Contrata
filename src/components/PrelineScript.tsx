"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PrelineScript() {
  const pathname = usePathname();

  useEffect(() => {
    const loadPreline = async () => {
      // Only the components actually used in the UI are imported, to keep
      // dev-compile times reasonable (importing the full library is heavy).
      await import("preline/dist/collapse.js");
      window.HSStaticMethods.autoInit();
    };
    loadPreline();
  }, [pathname]);

  return null;
}
