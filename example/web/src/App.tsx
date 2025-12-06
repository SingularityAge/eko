import React, { useState } from "react";
import Login, { Password, Username, Submit } from "@react-login-page/base";

const App = () => {
  const [status, setStatus] = useState("");

  const handle = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const username = (form.elements.namedItem("username") as HTMLInputElement)?.value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)?.value;

    if (!username) {
      setStatus("Username cannot be empty");
      return;
    }
    if (username !== "admin") {
      setStatus("Invalid username");
      return;
    }
    if (!password) {
      setStatus("Password cannot be empty");
      return;
    }
    if (password !== "666666") {
      setStatus("Invalid password");
      return;
    }
    setStatus("Login success");
  };

  return (
    <div>
    <p style={{textAlign: 'center'}}>Auto testing started, press Command + Option + I to view the process.</p>
    <form method="post" onSubmit={handle}>
      <Login style={{ height: "100vh" }}>
        <Username name="username" />
        <Password name="password" />
        <Submit>submit</Submit>
        {status && <div>{status}</div>}
      </Login>
    </form>
    </div>
  );
};

export default App;
