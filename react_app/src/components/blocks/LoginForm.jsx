import Form  from "../atoms/Form";
import GlobalWrapper from "../../GlobalWrapper";
const LoginForm = () => {
  return (      
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
        <Form label="ユーザー名" placeholder="ユーザー名を入力してください" />
        <Form label="パスワード" placeholder="パスワードを入力してください" />
    </div>


  );
}

export default LoginForm;