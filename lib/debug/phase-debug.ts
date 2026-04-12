const isPhaseDebugEnabled =
  __DEV__ && process.env.EXPO_PUBLIC_PHASE_DEBUG === "1";

export function phaseDebug(
  scope: string,
  message: string,
  payload?: unknown,
): void {
  if (!isPhaseDebugEnabled) return;

  if (payload === undefined) {
    // eslint-disable-next-line no-console
    console.log(`[phase:${scope}] ${message}`);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[phase:${scope}] ${message}`, payload);
}
