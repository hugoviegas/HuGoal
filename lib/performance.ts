export const Perf = {
  mark(label: string): void {
    if (__DEV__) {
      console.time(label);
    }
  },

  measure(label: string): void {
    if (__DEV__) {
      console.timeEnd(label);
    }
  },
};
