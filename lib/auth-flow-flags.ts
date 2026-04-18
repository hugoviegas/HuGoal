function isTruthy(value: string | undefined) {
  return value === "1" || value === "true" || value === "TRUE";
}

export const AUTH_SAFE_BOOT =
  isTruthy(process.env.EXPO_PUBLIC_AUTH_SAFE_BOOT);

export const GOOGLE_SIGN_IN_DISABLED =
  isTruthy(process.env.EXPO_PUBLIC_DISABLE_GOOGLE_SIGN_IN);

export const AUTH_ROUTE_GUARDS_DISABLED =
  isTruthy(process.env.EXPO_PUBLIC_DISABLE_AUTH_ROUTE_GUARDS);
