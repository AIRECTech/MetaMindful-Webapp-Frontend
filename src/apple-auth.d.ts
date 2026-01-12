declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          id_token: string;
          code?: string;
          user?: {
            email?: string;
            name?: {
              firstName?: string;
              lastName?: string;
            };
          };
          error?: string;
        }>;
      };
    };
  }
}

export {};
