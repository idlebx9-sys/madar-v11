export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Navigate to the login UI. With independent auth we open the local login modal
 * via a custom event; pages that need a hard redirect can still use /login.
 */
export const startLogin = () => {
  if (typeof window === "undefined") return;
  // Prefer modal if listeners exist; otherwise redirect to home with login flag
  const handled = window.dispatchEvent(
    new CustomEvent("madar:open-login", { cancelable: true }),
  );
  if (!handled) {
    window.location.href = "/?login=1";
  }
};

export const startGoogleLogin = () => {
  window.location.href = "/api/auth/google";
};
