import React from 'react';

/**
 * 右下に表示されるトースト通知コンポーネント
 * @param {Object} notification - 通知オブジェクト（folderName, photoCount を含む）
 * @param {Function} onClose - 閉じるボタンが押されたときのコールバック
 */
function NotificationToast({ notification, onClose }) {
  if (!notification) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-lg">新しい注文が届きました！</p>
          <p className="text-sm mt-1">
            番号: <span className="font-bold">{notification.folderName}</span>
          </p>
          <p className="text-sm">
            人数: <span className="font-bold">{notification.photoCount}人</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-white hover:text-gray-200 text-2xl font-bold"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default NotificationToast;
