import React, { useEffect } from 'react';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useDriveFiles } from '../hooks/useDriveFiles';
import LogoutViewer from '../blocks/LogoutViewer';
import LoginCard from '../atoms/LoginCard';
import FileList from './FileList';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const FOLDER_ID = process.env.REACT_APP_FOLDER_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly';

function PC() {
  const { token, requestAccessToken, logout } = useGoogleAuth(CLIENT_ID, SCOPES);
  const { files, fetchFiles } = useDriveFiles(window.gapi.client);
  //元のコードです
  //const { files, loading, nextPageToken, fetchFiles } = useDriveFiles(window.gapi.client);
  useEffect(() => {
    if (token) {
      window.gapi.client.setToken({ access_token: token });
      fetchFiles(FOLDER_ID, true);
    }
  }, [token, fetchFiles]);

  return (
    <div>
      <Loginviewer onLogout={logout} token={token} />
      {!token ? (
        <LoginCard onLogin={requestAccessToken} />
      ) : (
        <FileList files={files} loading={loading} />
      )}
    </div>
  );
}

export default PC;