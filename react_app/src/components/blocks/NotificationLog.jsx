import React from 'react';
import { ref, update, remove } from 'firebase/database';
import { database } from '../../firebase';

/**
 * 通知ログモーダルコンポーネント
 * @param {Array} notifications - 通知履歴の配列
 * @param {Boolean} isOpen - モーダルの表示/非表示
 * @param {Function} onClose - モーダルを閉じるコールバック
 */
function NotificationLog({ notifications, isOpen, onClose }) {
  if (!isOpen) return null;

  // 完了ボタンのハンドラー
  const handleComplete = async (notificationId, currentStatus) => {
    try {
      const notificationRef = ref(database, `notifications/${notificationId}`);
      await update(notificationRef, {
        completed: !currentStatus // トグル
      });
      console.log('通知を完了/未完了にしました:', notificationId);
    } catch (error) {
      console.error('完了ステータス変更エラー:', error);
      alert('完了ステータスの変更に失敗しました');
    }
  };

  // 削除ボタンのハンドラー
  const handleDelete = async (notificationId, folderName) => {
    if (!window.confirm(`番号「${folderName}」の通知を削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      const notificationRef = ref(database, `notifications/${notificationId}`);
      await remove(notificationRef);
      console.log('通知を削除しました:', notificationId);
    } catch (error) {
      console.error('通知削除エラー:', error);
      alert('通知の削除に失敗しました');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-blue-500 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">通知ログ</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* 通知リスト */}
        <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-4">
          {notifications.length === 0 ? (
            <p className="text-gray-500 text-center py-8">通知はありません</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-4 ${notification.completed ? 'bg-gray-100' : 'bg-white'
                    }`}
                >
                  <div className="flex justify-between items-start">
                    {/* 通知内容 */}
                    <div className={notification.completed ? 'opacity-50' : ''}>
                      <p
                        className={`text-lg font-bold ${notification.completed ? 'line-through' : ''
                          }`}
                      >
                        番号: {notification.folderName}
                      </p>
                      <p className="text-sm text-gray-600">
                        人数: {notification.photoCount}人
                      </p>
                      <p className="text-sm text-gray-600">
                        印刷枚数: {Math.ceil(notification.photoCount / 2)}枚
                      </p>
                      <p className="text-sm text-gray-600">
                        値段: {notification.photoCount * 100}円
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.timestamp).toLocaleString('ja-JP')}
                      </p>
                    </div>

                    {/* ボタン */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleComplete(notification.id, notification.completed)}
                        className={`px-3 py-1 rounded text-sm font-bold ${notification.completed
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                      >
                        {notification.completed ? '未完了' : '完了'}
                      </button>
                      <button
                        onClick={() => handleDelete(notification.id, notification.folderName)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-bold"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationLog;
