import { useEffect, useRef, useState } from 'react';

export function useGoogleAuth(CLIENT_ID, SCOPES) {
  const [token, setToken] = useState(null);
  const tokenClientRef = useRef(null);

  useEffect(() => {
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        setToken(tokenResponse.access_token);
      },
    });
  }, [CLIENT_ID, SCOPES]);

  const requestAccessToken = () => {
    tokenClientRef.current?.requestAccessToken();
  };

  const logout = () => {
    setToken(null);
  };

  return { token, requestAccessToken, logout };
}