import React from 'react';
import { FolderOpen, LogOut, Bell } from 'lucide-react';

export default function LogoutViewer({ token, onLogout, notificationCount, onOpenNotificationLog }) {
  return (
    <div className="header-card">
      <div className="header-content">
        <div className="header-info">
          <div className="header-icon">
            <FolderOpen className="icon-large" />
          </div>
          <div>
            <h1 className="header-title">Google Drive ディレクトリ構造ビューア</h1>
            <p className="header-subtitle">指定したフォルダ内のファイルを閲覧できます</p>
          </div>
        </div>
        {token && (
          <div className="flex gap-2">
            <button onClick={onOpenNotificationLog} className="btn btn-primary">
              <Bell className="icon-small" />
              <span>通知ログ ({notificationCount})</span>
            </button>
            <button onClick={onLogout} className="btn btn-logout">
              <LogOut className="icon-small" />
              <span>ログアウト</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}