import './App.css';
import { BrowserRouter, Routes, Route} from 'react-router-dom';
import Login from './components/modules/Login';
import PC from './components/modules/PC';
import Header from './components/modules/Header';
import Camera from './components/modules/Camera';
import Home from './Home';


function App() {
  return (
     <>
      <Header/>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/camera" element={<Camera />} />
          <Route path="/pc" element={<PC />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;