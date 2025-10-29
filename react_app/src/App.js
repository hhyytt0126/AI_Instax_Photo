import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/modules/Login';
import PC from './components/modules/PC';
import Header from './components/modules/Header';
import Camera from './components/modules/Camera';
import Experiment from './components/modules/Experiment';
import FirebaseTest from './components/modules/FirebaseTest';
import Home from './Home';
import { Check } from 'lucide-react';
import Checkout from './components/modules/Checkout';
import NotificationManager from './components/modules/NotificationManager';

function App() {
  return (
    <>

      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/camera" element={<Camera />} />
          <Route path="/pc" element={<PC />} />
          <Route path="/experiment" element={<Experiment />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/notifications" element={<NotificationManager />} />
          <Route path="/firebase-test" element={<FirebaseTest />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;