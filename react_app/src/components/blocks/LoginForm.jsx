import StitchButton from "../atoms/StitchButton";
import { useNavigate } from "react-router-dom";
const LoginForm = () => {
  const navigate = useNavigate();
  return ( 
    <>
      <h1 style={{ textAlign: "center", marginBottom: "20px" }}>あなたの役割は?</h1>
      <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
          <StitchButton onClick={() => navigate('/camera')}>カメラマン</StitchButton>
          <StitchButton onClick={() => navigate('/pc')}>パソコン</StitchButton>
          <StitchButton onClick={() => navigate('/selfcamera')}>セルフカメラ</StitchButton>
      </div>
    </>    
  );
}

export default LoginForm;