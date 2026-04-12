import { create } from "zustand";

export type AuthFlow = "welcome" | "login" | "signup";
export type TabName = "dashboard" | "workouts" | "nutrition" | "community";

interface NavigationState {
  currentTab: TabName;
  authFlow: AuthFlow;
  onboardingStep: number;
  navbarVisible: boolean;
  setCurrentTab: (tab: TabName) => void;
  setAuthFlow: (flow: AuthFlow) => void;
  setOnboardingStep: (step: number) => void;
  setNavbarVisible: (visible: boolean) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentTab: "dashboard",
  authFlow: "login",
  onboardingStep: 1,
  navbarVisible: true,

  setCurrentTab: (tab) => set({ currentTab: tab }),
  setAuthFlow: (flow) => set({ authFlow: flow }),
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  setNavbarVisible: (visible) => set({ navbarVisible: visible }),
}));
