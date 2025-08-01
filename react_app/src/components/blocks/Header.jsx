import { useNavigate } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();

  return (
    <header
      onClick={() => navigate('/')}
      style={{
        width: "100vw",
        background: "#fa8072",
        color: "#fff",
        textAlign: "center",
        fontSize: "1.5rem",
        letterSpacing: "0.1em",
        padding: "32px 0",
        cursor: "pointer",
      }}
    >
      AIチェキ
    </header>
  );
};

export default Header;