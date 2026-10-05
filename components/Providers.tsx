"use client";

import React from "react";
import { SWRConfig } from "swr";
import { swrGlobalConfig } from "@/lib/swr-config";
import { Toaster } from "sonner";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SWRConfig value={swrGlobalConfig}>
      {children}
      <Toaster
        theme="dark"
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: "#161c23",
            border: "1px solid #2a3340",
            color: "#dde3ed",
          },
        }}
      />
    </SWRConfig>
  );
}
