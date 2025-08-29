import StitchButton from "../atoms/StitchButton";
import { useNavigate } from "react-router-dom";
const LoginForm = () => {
  const navigate = useNavigate();
  return ( 
    <>
      <h1 className="text-2xl my-2 text-center font-bold">あなたの役割は?</h1>
      <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
          <StitchButton onClick={() => navigate('/camera')}>カメラマン</StitchButton>
          <StitchButton onClick={() => navigate('/pc')}>画像処理</StitchButton>
          <StitchButton onClick={() => navigate('/experiment')}>体験コーナー</StitchButton>
      </div>
    </>    
  );
}

export default LoginForm;