import { useEffect, useMemo, useState } from "react";
import {
  checkUsernameAvailable,
  isReservedUsername,
  validateUsernameFormat,
} from "@/lib/username";

interface UsernameCheckState {
  isAvailable: boolean;
  isLoading: boolean;
  isFormatValid: boolean;
  error?: string;
}

const INITIAL_STATE: UsernameCheckState = {
  isAvailable: false,
  isLoading: false,
  isFormatValid: false,
};

export function useUsernameCheck(username: string) {
  const normalized = useMemo(() => username.trim(), [username]);
  const [state, setState] = useState<UsernameCheckState>(INITIAL_STATE);

  useEffect(() => {
    if (!normalized) {
      setState(INITIAL_STATE);
      return;
    }

    const isFormatValid = validateUsernameFormat(normalized);
    if (!isFormatValid) {
      setState({
        isAvailable: false,
        isLoading: false,
        isFormatValid: false,
        error: "Username must be 3-20 chars, letters/numbers/underscore only.",
      });
      return;
    }

    if (isReservedUsername(normalized)) {
      setState({
        isAvailable: false,
        isLoading: false,
        isFormatValid: true,
        error: "This username is reserved.",
      });
      return;
    }

    let cancelled = false;
    setState((prev) => ({
      ...prev,
      isLoading: true,
      isFormatValid: true,
      error: undefined,
    }));

    const timer = setTimeout(async () => {
      try {
        const isAvailable = await checkUsernameAvailable(normalized);
        if (!cancelled) {
          setState({
            isAvailable,
            isLoading: false,
            isFormatValid: true,
            error: isAvailable ? undefined : "Username is already taken.",
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            isAvailable: false,
            isLoading: false,
            isFormatValid: true,
            error: "Could not verify username. Try again.",
          });
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalized]);

  return state;
}
