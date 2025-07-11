import logo from './logo.svg';
import './App.css';
import StitchButton from './components/atoms/StitchButton';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Login from './components/modules/Login';
import Header from './components/modules/Header';
import Camera from './components/modules/Camera';

function Home() {
  const navigate = useNavigate();
  return (
    <>
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
    </>
  );
}

function App() {
  return (
     <>
      <Header/>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/camera" element={<Camera />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;