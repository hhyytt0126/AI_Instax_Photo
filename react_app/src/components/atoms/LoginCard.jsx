import React from 'react';
import { Shield } from 'lucide-react';

export default function LoginCard({ onLogin }) {
  return (
    <div className="login-card">
      <div className="login-content">
        <div className="login-icon">
          <Shield className="icon-extra-large" />
        </div>
        <h2 className="login-title">Googleアカウントでログイン</h2>
        <p className="login-subtitle">
          Google Driveのファイルにアクセスするためにログインが必要です
        </p>
      </div>
      <button onClick={onLogin} className="btn btn-primary">
        Googleでログイン
      </button>
    </div>
  );
}