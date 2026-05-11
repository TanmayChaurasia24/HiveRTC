// ═══════════════════════════════════════════════════════════════
// @hivertc/react — HiveProvider
// React context provider for sharing HiveRTC config across
// an entire component tree.
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useMemo } from 'react';
import type { HiveRTCConfig } from '@hivertc/sdk';
import type { ReactNode } from 'react';

interface HiveContextValue {
  config: HiveRTCConfig;
}

const HiveContext = createContext<HiveContextValue | null>(null);

interface HiveProviderProps {
  config: HiveRTCConfig;
  children: ReactNode;
}

/**
 * Wraps your app to provide HiveRTC configuration to all
 * child components via React context.
 *
 * @example
 * ```tsx
 * <HiveProvider config={{ serverUrl: 'http://localhost:3002' }}>
 *   <MeetingPage />
 * </HiveProvider>
 * ```
 */
export function HiveProvider({ config, children }: HiveProviderProps) {
  const value = useMemo(() => ({ config }), [config]);

  return (
    <HiveContext.Provider value={value}>{children}</HiveContext.Provider>
  );
}

/**
 * Access the HiveRTC config from context.
 */
export function useHiveConfig(): HiveRTCConfig {
  const ctx = useContext(HiveContext);
  if (!ctx) {
    throw new Error('useHiveConfig must be used within a <HiveProvider>');
  }
  return ctx.config;
}
