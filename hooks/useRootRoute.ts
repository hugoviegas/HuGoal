import { useAuthStore } from '@/stores/auth.store';

export type RootRoute =
  | 'loading'
  | 'welcome'
  | 'onboarding'
  | 'tabs'
  | 'error';

export interface RootRouteResult {
  route: RootRoute;
  errorMessage?: string;
}

/**
 * Determines which top-level route should be displayed based on auth state.
 * Used exclusively by the root layout to avoid duplicating routing logic.
 */
export function useRootRoute(): RootRouteResult {
  const { isInitializing, isLoading, user, profile, profileError } = useAuthStore();

  if (isInitializing || isLoading) {
    return { route: 'loading' };
  }

  if (!user) {
    return { route: 'welcome' };
  }

  if (profileError) {
    return { route: 'error', errorMessage: profileError };
  }

  if (!profile) {
    return { route: 'loading' };
  }

  if (!profile.onboarding_complete) {
    return { route: 'onboarding' };
  }

  return { route: 'tabs' };
}
