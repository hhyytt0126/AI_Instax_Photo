import logo from './logo.svg';
import './App.css';
import StitchButton from './components/atoms/StitchButton';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Login from './components/modules/Login';
import GlobalWrapper from './GlobalWrapper';
import Header from './components/modules/Header';
function Home() {
  const navigate = useNavigate();
  return (
    <GlobalWrapper>
      <img src={logo} className="App-logo" alt="logo" style={{ marginBottom: "32px" }} />
      <StitchButton onClick={() => navigate('/login')}>ログイン</StitchButton>
    </GlobalWrapper>
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
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;