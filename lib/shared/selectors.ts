import { useCallback } from "react";
import { useStore } from "zustand";

export function createSelectorHook<T, S>(
  store: { getState: () => T },
  selector: (state: T) => S,
  equalityFn?: (a: S, b: S) => boolean,
) {
  return () => useStore(store, selector, equalityFn);
}

export function createBoundedUseStore<T, S>(
  store: { getState: () => T },
  selector: (state: T) => S,
  equalityFn?: (a: S, b: S) => boolean,
) {
  return () => useStore(store, selector, equalityFn);
}

export function createMemoizedSelector<T, S>(
  selector: (state: T) => S,
) {
  let prevResult: S | undefined;
  let prevState: T | undefined;

  return (state: T): S => {
    if (prevState === state) {
      return prevResult as S;
    }

    const newResult = selector(state);
    prevState = state;
    prevResult = newResult;

    return newResult;
  };
}

export function shallowEqual<T>(objA: T, objB: T): boolean {
  if (objA === objB) return true;

  if (typeof objA !== "object" || objA === null || typeof objB !== "object" || objB === null) {
    return false;
  }

  const keysA = Object.keys(objA) as (keyof T)[];
  const keysB = Object.keys(objB) as (keyof T)[];

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key) || objA[key] !== objB[key]) {
      return false;
    }
  }

  return true;
}

export function createStructuredSelector<T, S extends Record<string, unknown>>(
  selectorMap: { [K in keyof S]: (state: T) => S[K] },
): (state: T) => S {
  return (state: T): S => {
    const result = {} as S;
    for (const key in selectorMap) {
      result[key] = selectorMap[key](state);
    }
    return result;
  };
}