// Firebase SDK からリアルタイムデータベース機能をインポート
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase プロジェクトの設定情報
// 環境変数から読み込む（後で .env ファイルに設定）
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Firebase を初期化
const app = initializeApp(firebaseConfig);

// Realtime Database への参照を取得
const database = getDatabase(app);

// 他のファイルから使えるようにエクスポート
export { database };
