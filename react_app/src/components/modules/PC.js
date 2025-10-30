import React, { useEffect, useState, useRef } from 'react';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useDriveFiles } from '../hooks/useDriveFiles';
import { generateImageFromAPI, uploadImage } from '../utils/imageApi';
import LogoutViewer from '../blocks/LogoutViewer';
import LoginCard from '../atoms/LoginCard';
import FileList from '../blocks/FileList';
import PreviewModal from '../atoms/PreviewModal';
import GeneratedImageSection from '../atoms/GeneratedImageSection';
import NotificationToast from '../atoms/NotificationToast';
import NotificationLog from '../blocks/NotificationLog';
import '../css/PC.css';
import { database } from '../../firebase';
import { ref, onValue, onChildAdded, update, remove } from 'firebase/database';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const FOLDER_ID = process.env.REACT_APP_FOLDER_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive';

export default function PC() {
  const { token, requestAccessToken, logout } = useGoogleAuth(CLIENT_ID, SCOPES);
  const {
    files,
    subfolderContents,
    loading,
    nextPageToken,
    fetchFiles,
    setFiles,
    fetchFileById,
    fetchSubfolderContents,
    deleteFile,
    setSubfolderContents,
  } = useDriveFiles(window.gapi.client);

  const [expandedFolders, setExpandedFolders] = useState({});
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotificationLog, setShowNotificationLog] = useState(false);
  const [newNotification, setNewNotification] = useState(null);
  const newNotificationTimeoutRef = useRef(null);
  const notificationSoundRef = useRef(null);
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);

  useEffect(() => {
    const initClient = async () => {
      await new Promise((resolve) => window.gapi.load('client', resolve));
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      });
    };
    initClient();
    // 通知音をプリロード
    notificationSoundRef.current = new Audio('/チェキチェキ.wav');
    notificationSoundRef.current.load();
  }, []);

  useEffect(() => {
    if (token) {
      window.gapi.client.setToken({ access_token: token });
      fetchFiles(FOLDER_ID, true);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return; // ログインしていない場合は何もしない

    const notificationsRef = ref(database, 'notifications');
    const startTime = Date.now(); // 監視開始時刻

    // 全通知を取得（通知ログ用）
    const unsubscribeValue = onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const notificationList = Object.entries(data).map(([id, value]) => ({
          id,
          ...value
        })).sort((a, b) => b.timestamp - a.timestamp);

        setNotifications(notificationList);
        console.log('📋 通知履歴を取得:', notificationList.length, '件');
      } else {
        setNotifications([]);
      }
    });

    // 新着通知を監視（トースト表示用）
    const unsubscribeChild = onChildAdded(notificationsRef, (snapshot) => {
      const notification = snapshot.val();
      const notificationId = snapshot.key;

      console.log('onChildAdded fired. snapshot.key:', notificationId, 'notification.timestamp:', notification?.timestamp, 'startTime:', startTime);

      // 監視開始後の通知のみ処理（初回ロード時の古い通知を除外）
      if (notification.timestamp > startTime - 5000) {
        // play sound if available
        if (notificationSoundRef.current && !isSoundPlaying) {
          notificationSoundRef.current.currentTime = 0;
          notificationSoundRef.current.play().catch(e => console.error("通知音の再生に失敗:", e));
          setIsSoundPlaying(true);
          setTimeout(() => {
            setIsSoundPlaying(false);
          }, 1000); // 1秒間のクールダウン
        }

        console.log('🔔 新着通知を受信 (will setNewNotification):', notificationId, notification);

        // clear any existing timeout that would clear the toast
        if (newNotificationTimeoutRef.current) {
          console.log('🔁 既存のトーストクリアタイムアウトをクリアします');
          clearTimeout(newNotificationTimeoutRef.current);
          newNotificationTimeoutRef.current = null;
        }

        setNewNotification({
          id: notificationId,
          ...notification
        });

        // ファイルリストを再取得
        fetchFiles(FOLDER_ID, true);

        // 5秒後にトーストを非表示（既存のタイマーは先にクリアされる）
        newNotificationTimeoutRef.current = setTimeout(() => {
          console.log('⌛ トーストタイムアウト: トーストを非表示にします', notificationId);
          setNewNotification(null);
          newNotificationTimeoutRef.current = null;
        }, 5000);
      } else {
        console.log('⛔ 通知タイムスタンプが古いためスキップ:', notificationId, notification?.timestamp, 'startTimeThreshold:', startTime - 5000);
      }
    });

    // クリーンアップ
    return () => {
      unsubscribeValue();
      unsubscribeChild();
      if (newNotificationTimeoutRef.current) {
        clearTimeout(newNotificationTimeoutRef.current);
        newNotificationTimeoutRef.current = null;
      }
    };
  }, [token]);

  const toggleFolder = async (folderId) => {
    setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
    if (!expandedFolders[folderId]) {
      await fetchSubfolderContents(folderId);
    }
  };
  const handleGenerateFromUrl = async (imageUrl, parentFolderId, payload) => {
    setGenerating(true);

    try {
      const result = await generateImageFromAPI({
        imageUrl,
        payload,
        driveFolderId: parentFolderId,
        accessToken: token
      });
      console.log('Generating image from URL:', imageUrl, 'in folder:', parentFolderId, 'with payload:', payload);
      console.log('Image generation result:', result);
      if (result.success) {
        const newFileId = result.fileId;
        // ① 新ファイルを取得
        const newFile = await fetchFileById(newFileId);
        console.log(files, parentFolderId, newFile);
        // ② files ステートの先頭に追加
        // setFiles(prevFiles => [newFile, ...prevFiles]);
        if (parentFolderId === FOLDER_ID) {
          setFiles(prevFiles => [newFile, ...prevFiles]);
        }

        // ④ サブフォルダの場合は subfolderContents に追加
        else {
          // subfolderContents を更新する関数が useDriveFiles にあると仮定
          setExpandedFolders(prev => ({ ...prev, [parentFolderId]: true }));
          setSubfolderContents(prev => ({
            ...prev,
            [parentFolderId]: [newFile, ...(prev[parentFolderId] || [])]
          }));
        }
        // プレビュー用 URL 設定などはお好みで
        setGeneratedImageUrl(`https://drive.google.com/uc?id=${newFileId}`);
      }
    } finally {
      setGenerating(false);
    }
  };
  const handlePreviewImage = (fileId) => {
    const viewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    setPreviewImageUrl(viewUrl); // モーダルに表示
    console.log('Preview URL:', viewUrl);
    // タブで開くなら次の行を残す
    // window.open(viewUrl, '_blank');
  };
  const handleUploadGeneratedImage = async (imageUrl) => {
    setUploading(true);
    try {
      await uploadImage({ imageUrl: imageUrl, driveFolderId: FOLDER_ID, accessToken: token });
      alert('アップロード完了');
      fetchFiles(FOLDER_ID, true);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId, parentFolderId) => {
    if (window.confirm('削除しますか？')) {
      await deleteFile(fileId, parentFolderId, FOLDER_ID);
    }
  };

  return (
    <div>
      <LogoutViewer
        token={token}
        onLogout={logout}
        onOpenNotificationLog={() => setShowNotificationLog(true)}
        notifications={notifications} // notifications配列を渡す
      />
      {!token ? (
        <LoginCard onLogin={requestAccessToken} />
      ) : (
        <>
          <FileList
            files={files}
            subfolderContents={subfolderContents}
            expandedFolders={expandedFolders}
            setExpandedFolders={setExpandedFolders}
            setSubfolderContents={setSubfolderContents}
            toggleFolder={toggleFolder}
            handleGenerateFromUrl={handleGenerateFromUrl}
            handleDeleteFile={handleDeleteFile}
            handlePreviewImage={handlePreviewImage}
            handleUploadGeneratedImage={handleUploadGeneratedImage}
            generating={generating}
            rootFolderId={FOLDER_ID}
          />
          <GeneratedImageSection
            generatedImageUrl={generatedImageUrl}
            onUpload={handleUploadGeneratedImage}
            uploading={uploading}
          />
          <PreviewModal previewImageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
        </>
      )}
      <NotificationToast
        notification={newNotification}
        onClose={() => setNewNotification(null)}
      />
      <NotificationLog
        notifications={notifications}
        isOpen={showNotificationLog}
        onClose={() => setShowNotificationLog(false)}
      />
    </div>
  );
}