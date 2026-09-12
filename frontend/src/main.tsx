// ===== PONTO DE ENTRADA DA APLICAÇÃO =====
// Monta a aplicação React no elemento #root do HTML

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

console.log("✅ Frontend carregando... root element:", document.getElementById("root"));

// Renderiza o componente App em modo StrictMode (detecta problemas de desenvolvimento)
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log("✅ React App montado com sucesso!");
