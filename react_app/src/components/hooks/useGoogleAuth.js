import { useEffect, useRef, useState } from 'react';
export let access_token = null;
export function getAccessToken(){
  return access_token;
} 
export function useGoogleAuth(CLIENT_ID, SCOPES) {
  const tokenClientRef = useRef(null);
  const [token, setToken] = useState(null);
  useEffect(() => {
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        setToken(tokenResponse.access_token);
        access_token = tokenResponse.access_token;
      },
    });
  }, [CLIENT_ID, SCOPES]);

  const requestAccessToken = () => {
    tokenClientRef.current?.requestAccessToken();
  };

  const logout = () => {
    access_token = null;
    setToken(null);
  };

  return { token, requestAccessToken, logout };
}