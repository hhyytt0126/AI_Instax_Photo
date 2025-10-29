import StitchButton from "../atoms/StitchButton";
import { useNavigate } from "react-router-dom";
const LoginForm = () => {
  const navigate = useNavigate();
  return (
    <>
      <h1 className="text-2xl my-2 text-center font-bold">あなたの役割は?</h1>
      <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
        <StitchButton onClick={() => navigate('/camera')}>カメラ</StitchButton>
        <StitchButton onClick={() => navigate('/pc')}>画像生成・印刷</StitchButton>
        {/* <StitchButton onClick={() => navigate('/experiment')}>体験コーナー</StitchButton> */}
        <StitchButton onClick={() => navigate('/notifications')}>レジ</StitchButton>
      </div>
    </>
  );
}

export default LoginForm;