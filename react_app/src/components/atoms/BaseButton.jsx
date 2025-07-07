import React from "react";
import styled from "styled-components";

const BaseButton = styled.button`
  text-align: center;
  color: #ff0000;
  width: 50%;
  min-width: 100px;
  height: 50px;
  mergin-top: 10px;
  background: #bac4bb; /* デフォルトの背景色 */
`;

// 緑色のボタン(BaseButtonを基に拡張)
const ButtonPrimary = styled(BaseButton)`
  background: green;
`;

// 赤色のボタン(BaseButtonを基に拡張)
const ButtonDanger = styled(BaseButton)`
  background: red;
`;

// 全ボタンコンポーネント
const buttonStyleLists = {
  default: BaseButton,
  primary: ButtonPrimary,
  danger: ButtonDanger,
};

// propsのstyleTypeでボタンのスタイルを分岐
const Button = ({ styleType, onClick, children }) => {
  const Component = buttonStyleLists[styleType] || buttonStyleLists.default;
  // Component変数に格納したコンポーネントでReact要素を作成
  return <Component onClick={onClick}>{children}</Component>;
};

export default Button;