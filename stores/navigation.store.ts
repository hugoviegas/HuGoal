import { create } from 'zustand';

export type AuthFlow = 'welcome' | 'login' | 'signup';
export type TabName = 'dashboard' | 'workouts' | 'nutrition' | 'community' | 'profile';

interface NavigationState {
  currentTab: TabName;
  authFlow: AuthFlow;
  onboardingStep: number;
  setCurrentTab: (tab: TabName) => void;
  setAuthFlow: (flow: AuthFlow) => void;
  setOnboardingStep: (step: number) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentTab: 'dashboard',
  authFlow: 'welcome',
  onboardingStep: 1,

  setCurrentTab: (tab) => set({ currentTab: tab }),
  setAuthFlow: (flow) => set({ authFlow: flow }),
  setOnboardingStep: (step) => set({ onboardingStep: step }),
}));
