import { DuckBugProvider, DuckSDK } from "@duckbug/js";
import { createContext, type ReactNode, useContext } from "react";

const DSN = import.meta.env.VITE_DUCKBUG_DSN || "";

if (!DSN) {
  console.warn("VITE_DUCKBUG_DSN is not set. DuckBug logging will not work.");
}

const providers = [
  new DuckBugProvider({
    dsn: DSN,
  }),
];

const duck = new DuckSDK(providers, {
  logReports: {
    log: true,
    warn: true,
    error: true,
  },
});

const DuckBugContext = createContext<DuckSDK>(duck);

export function DuckBugProviderComponent({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DuckBugContext.Provider value={duck}>{children}</DuckBugContext.Provider>
  );
}

export function useDuckBug(): DuckSDK {
  const context = useContext(DuckBugContext);
  if (!context) {
    throw new Error("useDuckBug must be used within DuckBugProviderComponent");
  }
  return context;
}
