import React from "react";

function Footer() {
  return (
    <div className="documentation">
      <em>double-click to edit tasks</em>
      <br />
      Created by{" "}
      <a href="https://github.com/aakashRajur" className="link author">
        aakashRajur
      </a>
      <br />
      Inspired by{" "}
      <a href="http://todomvc.com/examples/react/" className="link inspiration">
        React • TodoMVC
      </a>
      <br />
    </div>
  );
}

export default Footer;
