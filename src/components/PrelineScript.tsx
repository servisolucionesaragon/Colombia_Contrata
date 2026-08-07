"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PrelineScript() {
  const pathname = usePathname();

  useEffect(() => {
    const loadPreline = async () => {
      await import("preline/dist/index.js");
      window.HSStaticMethods.autoInit();
    };
    loadPreline();
  }, [pathname]);

  return null;
}
