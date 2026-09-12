const express = require('express');
const app = express();
const port = 5433;

// Middleware para habilitar CORS (se necessário)
const cors = require('cors');
app.use(cors());

// Endpoint de teste para garantir que o backend está funcionando
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend está funcionando corretamente!' });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
