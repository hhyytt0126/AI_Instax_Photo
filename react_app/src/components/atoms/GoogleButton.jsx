import React, { useEffect, useRef } from "react";

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const GoogleButton = ({ onSuccess }) => {
  const divRef = useRef(null);

  useEffect(() => {
    if (window.google && divRef.current) {
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: onSuccess,
      });
      window.google.accounts.id.renderButton(divRef.current, {
        theme: "outline",
        size: "large",
      });
    }
  }, [onSuccess]);

  return <div ref={divRef}></div>;
};

export default GoogleButton;