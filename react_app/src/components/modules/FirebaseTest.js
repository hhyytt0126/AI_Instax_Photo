import React, { useEffect, useState } from 'react';
import { database } from '../../firebase';
import { ref, set, get, push, onValue, onChildAdded } from 'firebase/database';
import StitchButton from '../atoms/StitchButton';

/**
 * Firebase Realtime Database のテストページ
 *
 * このコンポーネントでは以下の機能をテストします：
 * 1. データの書き込み (set)
 * 2. データの読み込み (get)
 * 3. リアルタイム監視 (onValue)
 * 4. 通知の追加 (push)
 * 5. 通知の監視 (onChildAdded)
 */
function FirebaseTest() {
  // ========== 状態管理 ==========

  // 読み込みテストで取得したデータを保存
  const [testData, setTestData] = useState(null);

  // リアルタイム監視で取得したデータを保存
  const [realtimeData, setRealtimeData] = useState(null);

  // 受信した通知のリストを保存
  const [notifications, setNotifications] = useState([]);

  // 操作結果のメッセージ（成功/失敗）
  const [message, setMessage] = useState('');

  // ========== 書き込みテスト ==========

  /**
   * 'test' パスにデータを書き込むテスト
   *
   * 処理の流れ:
   * 1. ref(database, 'test') で 'test' というパスへの参照を作成
   * 2. set() でデータを書き込む（既存データは上書きされる）
   * 3. 成功/失敗のメッセージを表示
   */
  const handleWriteTest = async () => {
    try {
      // 'test' パスへの参照を作成
      const testRef = ref(database, 'test');

      // 書き込むデータを作成（ランダムな値を含む）
      const data = {
        message: "Hello Firebase!",
        timestamp: Date.now(),
        randomNumber: Math.floor(Math.random() * 100)
      };

      // データを書き込む（既存データがあれば上書き）
      await set(testRef, data);

      // 成功メッセージを表示
      setMessage('✅ 書き込み成功！データベースに保存されました。');
      console.log('書き込んだデータ:', data);
    } catch (error) {
      // エラーメッセージを表示
      setMessage('❌ 書き込み失敗: ' + error.message);
      console.error('書き込みエラー:', error);
    }
  };

  // ========== 読み込みテスト ==========

  /**
   * 'test' パスからデータを1回だけ取得するテスト
   *
   * 処理の流れ:
   * 1. ref(database, 'test') で 'test' パスへの参照を作成
   * 2. get() でデータを取得（1回だけ、リアルタイム更新はされない）
   * 3. snapshot.exists() でデータの存在確認
   * 4. snapshot.val() でデータを取得して画面に表示
   */
  const handleReadTest = async () => {
    try {
      // 'test' パスへの参照を作成
      const testRef = ref(database, 'test');

      // データを取得（1回だけ）
      const snapshot = await get(testRef);

      // データが存在するか確認
      if (snapshot.exists()) {
        // データを取得
        const data = snapshot.val();
        setTestData(data);
        setMessage('✅ 読み込み成功！データを取得しました。');
        console.log('取得したデータ:', data);
      } else {
        // データが存在しない場合
        setTestData(null);
        setMessage('ℹ️ データが存在しません。先に「書き込みテスト」を実行してください。');
      }
    } catch (error) {
      // エラーメッセージを表示
      setMessage('❌ 読み込み失敗: ' + error.message);
      console.error('読み込みエラー:', error);
    }
  };

  // ========== 通知追加テスト（Camera側のシミュレーション） ==========

  /**
   * 'notifications' パスに新しい通知を追加するテスト
   * これはCamera側で写真をアップロードしたときの動作をシミュレートします
   *
   * 処理の流れ:
   * 1. ref(database, 'notifications') で 'notifications' パスへの参照を作成
   * 2. push() で自動的にユニークなID（例: -AbCd1234）を生成
   * 3. set() でそのIDの位置にデータを書き込む
   * 4. 既存の通知は残り、新しい通知が追加される
   */
  const handleAddNotification = async () => {
    try {
      // 'notifications' パスへの参照を作成
      const notificationsRef = ref(database, 'notifications');

      // 自動的にユニークなIDを生成して、その位置への参照を取得
      // 例: notifications/-AbCd1234 への参照が返される
      const newNotificationRef = push(notificationsRef);

      // ランダムなフォルダ名を生成（Camera.js と同じ形式）
      const folderName = `${new Date().toTimeString().slice(0, 8).replace(/:/g, '')}${Math.floor(Math.random() * 90 + 10)}`;

      // 通知データを作成
      const notificationData = {
        type: 'new_folder',
        folderId: 'test-folder-' + Date.now(),
        folderName: folderName,
        timestamp: Date.now(),
        read: false
      };

      // 生成されたIDの位置にデータを書き込む
      await set(newNotificationRef, notificationData);

      // 成功メッセージを表示
      setMessage(`✅ 通知追加成功！フォルダ名: ${folderName}`);
      console.log('追加した通知:', notificationData);
    } catch (error) {
      // エラーメッセージを表示
      setMessage('❌ 通知追加失敗: ' + error.message);
      console.error('通知追加エラー:', error);
    }
  };

  // ========== リアルタイム監視（useEffect） ==========

  /**
   * 'test' パスをリアルタイムで監視
   *
   * 処理の流れ:
   * 1. onValue() で 'test' パスを監視開始
   * 2. データが変更されるたびに、自動的にコールバック関数が呼ばれる
   * 3. 最初の1回も呼ばれる（現在のデータを取得）
   * 4. クリーンアップ関数でリスナーを解除（メモリリーク防止）
   */
  useEffect(() => {
    // 'test' パスへの参照を作成
    const testRef = ref(database, 'test');

    console.log('📡 リアルタイム監視を開始しました（test パス）');

    // リアルタイムリスナーを設定
    // onValue() は監視を開始して、リスナー解除用の関数を返す
    const unsubscribe = onValue(testRef, (snapshot) => {
      // データが変更されるたびに、この関数が自動的に呼ばれる

      if (snapshot.exists()) {
        // データが存在する場合
        const data = snapshot.val();
        setRealtimeData(data);
        console.log('🔄 リアルタイムデータ更新:', data);
      } else {
        // データが存在しない場合
        setRealtimeData(null);
        console.log('🔄 リアルタイムデータ: なし');
      }
    }, (error) => {
      // エラーハンドリング
      console.error('リアルタイム監視エラー:', error);
      setMessage('❌ リアルタイム監視エラー: ' + error.message);
    });

    // クリーンアップ関数
    // コンポーネントがアンマウント（ページを離れる）ときに実行される
    return () => {
      console.log('🛑 リアルタイム監視を停止しました（test パス）');
      unsubscribe(); // リスナーを解除（これをしないとメモリリークする）
    };
  }, []); // 空配列 = コンポーネント読み込み時に1回だけ実行

  // ========== 通知監視（useEffect） ==========

  /**
   * 'notifications' パスの新しい通知を監視
   * これはPC側で使用する機能のテストです
   *
   * 処理の流れ:
   * 1. onChildAdded() で 'notifications' パスを監視開始
   * 2. 新しい子要素（通知）が追加されるたびに、コールバック関数が呼ばれる
   * 3. 初回実行時は既存の全ての通知に対してもコールバックが呼ばれる
   * 4. タイムスタンプでフィルタリングして、古い通知を無視
   * 5. クリーンアップ関数でリスナーを解除
   */
  useEffect(() => {
    // 'notifications' パスへの参照を作成
    const notificationsRef = ref(database, 'notifications');

    console.log('📡 通知監視を開始しました（notifications パス）');

    // 監視開始時刻を記録（初回ロード時の古い通知を無視するため）
    const startTime = Date.now();

    // onChildAdded() で新しい子要素の追加を監視
    const unsubscribe = onChildAdded(notificationsRef, (snapshot) => {
      // 新しい通知が追加されるたびに、この関数が自動的に呼ばれる
      // 注意: 初回実行時は既存の全ての通知に対しても呼ばれる

      const notification = snapshot.val();
      const notificationId = snapshot.key; // 自動生成されたID（例: -AbCd1234）

      console.log('🔔 通知受信:', notification);

      // タイムスタンプでフィルタリング
      // 監視開始後に追加された通知のみ処理（初回ロードの古い通知を無視）
      if (notification.timestamp > startTime - 5000) { // 5秒前までの通知を許容
        // 通知リストに追加（最新の通知を先頭に追加）
        setNotifications(prev => [{
          id: notificationId,
          ...notification
        }, ...prev]);

        console.log('✅ 通知をリストに追加:', notification.folderName);
      } else {
        console.log('⏭️ 古い通知をスキップ:', notification.folderName);
      }
    }, (error) => {
      // エラーハンドリング
      console.error('通知監視エラー:', error);
      setMessage('❌ 通知監視エラー: ' + error.message);
    });

    // クリーンアップ関数
    return () => {
      console.log('🛑 通知監視を停止しました（notifications パス）');
      unsubscribe(); // リスナーを解除
    };
  }, []); // 空配列 = コンポーネント読み込み時に1回だけ実行

  // ========== 画面表示 ==========

  return (
    <div className="w-full max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-center mb-8">
        🔥 Firebase Realtime Database テスト
      </h1>

      {/* 操作結果メッセージ */}
      {message && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-6">
          {message}
        </div>
      )}

      {/* ========== テストボタン ========== */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">📝 基本操作テスト</h2>
        <div className="flex flex-wrap gap-4">
          <StitchButton onClick={handleWriteTest}>
            書き込みテスト (set)
          </StitchButton>
          <StitchButton onClick={handleReadTest}>
            読み込みテスト (get)
          </StitchButton>
          <StitchButton onClick={handleAddNotification}>
            通知追加テスト (push)
          </StitchButton>
        </div>
      </div>

      {/* ========== リアルタイムデータ表示 ========== */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">🔄 リアルタイムデータ (onValue)</h2>
        <p className="text-sm text-gray-600 mb-4">
          'test' パスのデータをリアルタイムで監視しています。
          「書き込みテスト」を押すと、自動的にここが更新されます。
        </p>
        {realtimeData ? (
          <div className="bg-gray-100 p-4 rounded">
            <pre className="text-sm overflow-x-auto">
              {JSON.stringify(realtimeData, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-gray-500 italic">データがありません</p>
        )}
      </div>

      {/* ========== 読み込みテスト結果表示 ========== */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">📖 読み込みテスト結果 (get)</h2>
        <p className="text-sm text-gray-600 mb-4">
          「読み込みテスト」を押すと、その時点のデータを1回だけ取得します。
          リアルタイム更新はされません。
        </p>
        {testData ? (
          <div className="bg-gray-100 p-4 rounded">
            <pre className="text-sm overflow-x-auto">
              {JSON.stringify(testData, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-gray-500 italic">「読み込みテスト」をクリックしてデータを取得してください</p>
        )}
      </div>

      {/* ========== 通知リスト表示 ========== */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">🔔 受信した通知 (onChildAdded)</h2>
        <p className="text-sm text-gray-600 mb-4">
          新しい通知が追加されると、自動的にここに表示されます。
          「通知追加テスト」を押すか、Camera画面で写真をアップロードしてテストしてください。
        </p>
        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification, index) => (
              <div key={notification.id} className="bg-green-50 border border-green-200 p-4 rounded">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-green-800">
                    通知 #{notifications.length - index}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(notification.timestamp).toLocaleString('ja-JP')}
                  </span>
                </div>
                <p className="text-sm">
                  <span className="font-semibold">フォルダ名:</span> {notification.folderName}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">フォルダID:</span> {notification.folderId}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">タイプ:</span> {notification.type}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">通知がありません</p>
        )}
      </div>

      {/* ========== 使い方ガイド ========== */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
        <h2 className="text-xl font-bold mb-4">📚 テスト手順</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            <strong>書き込みテスト:</strong> 「書き込みテスト」ボタンを押すと、
            リアルタイムデータが自動的に更新されることを確認してください。
          </li>
          <li>
            <strong>読み込みテスト:</strong> 「読み込みテスト」ボタンを押して、
            データが取得されることを確認してください。
          </li>
          <li>
            <strong>通知テスト:</strong> 「通知追加テスト」ボタンを押すと、
            受信した通知リストに自動的に追加されることを確認してください。
          </li>
          <li>
            <strong>2つのタブでテスト:</strong> このページを2つのブラウザタブで開き、
            片方で「書き込みテスト」を押すと、もう片方が自動更新されることを確認してください。
          </li>
          <li>
            <strong>Firebase Consoleで確認:</strong>
            <a
              href="https://console.firebase.google.com/project/ai-instax-photo/database/ai-instax-photo-default-rtdb/data"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline ml-1"
            >
              Firebase Console
            </a>
            を開いて、データベースに実際にデータが保存されているか確認してください。
          </li>
        </ol>
      </div>
    </div>
  );
}

export default FirebaseTest;
