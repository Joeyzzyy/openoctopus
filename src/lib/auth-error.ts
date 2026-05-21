const AUTH_ERROR_COPY: Array<{
  match: RegExp;
  title: string;
  message: string;
}> = [
  {
    match: /invalid login credentials/i,
    title: "This login method is not available",
    message: "OpenOctopus currently supports Gmail sign-in only. Continue with your Google account.",
  },
  {
    match: /provider.*not enabled|unsupported provider/i,
    title: "Google sign-in is not configured",
    message: "The Google OAuth provider is not enabled yet. Check the auth provider settings and try again.",
  },
  {
    match: /popup closed|access_denied|user denied/i,
    title: "Sign-in was cancelled",
    message: "The Google authorization flow was interrupted before it finished. Try again when you're ready.",
  },
  {
    match: /redirect_uri_mismatch|redirect url/i,
    title: "Redirect setup needs attention",
    message: "The Google callback URL does not match the configured allow list. Update the OAuth redirect settings and retry.",
  },
  {
    match: /email.*not confirmed/i,
    title: "Use Google instead",
    message: "This account is not available for password login here. Continue with your Gmail account.",
  },
];

export function getFriendlyAuthError(rawMessage?: string | null) {
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
  if (!message) {
    return {
      title: "Sign-in could not be completed",
      message: "Something interrupted the authentication flow. Try Google sign-in again.",
    };
  }

  const matched = AUTH_ERROR_COPY.find((entry) => entry.match.test(message));
  if (matched) {
    return {
      title: matched.title,
      message: matched.message,
    };
  }

  return {
    title: "Sign-in could not be completed",
    message,
  };
}
