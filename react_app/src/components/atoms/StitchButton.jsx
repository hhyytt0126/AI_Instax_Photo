import styled from "styled-components";

const StitchButton = styled.button`
  display: block;
  width: 50vw;         
  margin: 0 auto;
  margin-bottom: 80px;
  padding: 0.5em 2.5em;
  text-decoration: none;
  background: #668ad8;
  color: #FFF;
  border-radius: 4px;
  box-shadow: 0px 0px 0px 5px #668ad8;
  border: dashed 1px #FFF;
  cursor: pointer;
  transition: border 0.2s;
  font-size: 1.2em;
  &:hover {
    border: dotted 1px #FFF;
  }
  font-family: 'Kaisei Opti', serif;
`;

export default StitchButton;