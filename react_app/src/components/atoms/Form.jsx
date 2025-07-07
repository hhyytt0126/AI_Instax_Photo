import React from "react";
import styled from "styled-components";


const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  mergin-bottom: 32px;
`;

const AnimatedInput = styled.input`
  width: 400px;
  height: 40px;
  border-radius: 5px;
  border: none;
  font-size: 24px;
  padding: 0 16px;
  font-family: 'Lobster', 'Lato', sans-serif;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  margin-bottom: 24px;
`;

const Label = styled.label`
  font-family: 'Lobster', cursive;
  font-size: 28px;
  color: #000;
  margin-bottom: 12px;
`;

const Form = ({ label, placeholder }) => (
  <InputWrapper>
    <Label htmlFor="animated-input">{label}</Label>
    <AnimatedInput
      id="animated-input"
      placeholder={placeholder}
      autoComplete="off"
    />
  </InputWrapper>
);

export default Form;