import React, { useState, useEffect } from 'react';
import { onValue, ref } from 'firebase/database';
import { database } from '../../firebase';
import NotificationLog from '../blocks/NotificationLog';
import NotificationToast from '../atoms/NotificationToast';
import LogoutViewer from '../blocks/LogoutViewer';
import LoginCard from '../atoms/LoginCard';
import { useGoogleAuth } from '../hooks/useGoogleAuth';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

/**
 * 通知を管理するメインコンポーネント
 * Firebase Realtime Databaseから通知をリッスンし、
 * トースト通知と通知ログモーダルを表示します。
 */
function NotificationManager() {
  const { token, requestAccessToken, logout } = useGoogleAuth(CLIENT_ID, SCOPES);

  const [notifications, setNotifications] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);

  useEffect(() => {
    if (!token) return;

    const notificationsRef = ref(database, 'notifications');

    // 監視開始時刻を記録（初回ロード時の古い通知を無視するため）
    const startTime = Date.now();

    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const notificationList = Object.keys(data)
          .map(key => ({
            id: key,
            ...data[key]
          }))
          .sort((a, b) => b.timestamp - a.timestamp); // 新しい順にソート

        setNotifications(notificationList);

        // 監視開始後の新しい未完了通知をトーストで表示
        const newIncompleteNotification = notificationList.find(
          n => n.timestamp > startTime && !n.completed && !n.read
        );

        if (newIncompleteNotification) {
          setToastNotification(newIncompleteNotification);
          // トースト表示後、5秒で自動的に閉じる
          setTimeout(() => {
            setToastNotification(null);
          }, 5000);
        }
      } else {
        setNotifications([]);
      }
    });

    // クリーンアップ
    return () => unsubscribe();
  }, [token]);

  const handleOpenLog = () => {
    setShowLog(true);
    setToastNotification(null); // ログを開いたらトーストは消す
  };

  const handleCloseLog = () => {
    setShowLog(false);
  };

  const handleCloseToast = () => {
    setToastNotification(null);
  };

  const incompleteCount = notifications.filter(n => !n.completed).length;

  return (
    <div>
      <LogoutViewer
        token={token}
        onLogout={logout}
        notificationCount={incompleteCount}
        onOpenNotificationLog={handleOpenLog}
        notifications={notifications}
      />
      {!token ? (
        <LoginCard onLogin={requestAccessToken} />
      ) : (
        <>
          <NotificationLog notifications={notifications} isOpen={showLog} onClose={handleCloseLog} />
          <NotificationToast notification={toastNotification} onClose={handleCloseToast} />
        </>
      )}
    </div>
  );
}

export default NotificationManager;
