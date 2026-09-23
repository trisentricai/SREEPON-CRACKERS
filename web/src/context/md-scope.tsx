import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

/**
 * Identifies the MD scope (Material Design v3) used for styling seed colors.
 * Utility context — kept minimal on purpose. Real theming arrives with the
 * design phase.
 */
const MDScopeContext = createContext<'customer' | 'admin'>('customer');

export function MDScopeProvider({ value = 'customer', children }: { value?: 'customer' | 'admin'; children: ReactNode }) {
  return <MDScopeContext.Provider value={value}>{children}</MDScopeContext.Provider>;
}

export function useMDScope(): 'customer' | 'admin' {
  return useContext(MDScopeContext);
}