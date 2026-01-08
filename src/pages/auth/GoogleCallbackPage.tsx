import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Get the ID token and state from URL hash (implicit flow)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get("id_token");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      // Send error to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "GOOGLE_OAUTH_ERROR",
            error: error,
          },
          window.location.origin
        );
      }
      window.close();
      return;
    }

    if (idToken && state) {
      // Send success message to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "GOOGLE_OAUTH_SUCCESS",
            id_token: idToken,
            state: state,
          },
          window.location.origin
        );
      }
      window.close();
    } else {
      // If no token, try to get from query params (authorization code flow)
      const code = searchParams.get("code");
      const stateParam = searchParams.get("state");

      if (code && stateParam) {
        // For authorization code flow, we'd need to exchange the code for a token
        // But for simplicity, we'll just send the code and let the parent handle it
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "GOOGLE_OAUTH_CODE",
              code: code,
              state: stateParam,
            },
            window.location.origin
          );
        }
        window.close();
      } else {
        // No token or code found
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "GOOGLE_OAUTH_ERROR",
              error: "No token received",
            },
            window.location.origin
          );
        }
        window.close();
      }
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}

