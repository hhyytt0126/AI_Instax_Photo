import React from 'react';
import logo from './logo.svg';
import StitchButton from './components/atoms/StitchButton';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();
  return (
    <div>
      <img
        src={logo}
        className="App-logo"
        alt="logo"
        style={{
          display: 'block',          // 中央揃えに必要
          margin: '40px auto 32px', // 上:40px, 下:32px, 左右:autoで中央揃え
        }}
      />
      <StitchButton onClick={() => navigate('/login')}>ログイン</StitchButton>
    </div>
  );
}

export default Home;