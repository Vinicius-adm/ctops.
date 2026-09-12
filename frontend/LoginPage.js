import { useEffect, useState } from 'react';

const TestConnection = () => {
  const [response, setResponse] = useState(null);

  useEffect(() => {
    // Tenta fazer uma requisição GET para o backend
    fetch('http://localhost:5433/api/test')
      .then((res) => res.json())
      .then((data) => setResponse(data.message))
      .catch((error) => {
        console.error('Erro de conexão com o backend:', error);
        setResponse('Erro ao conectar com o backend');
      });
  }, []);

  return (
    <div>
      <h2>Status da Conexão</h2>
      <p>{response || 'Carregando...'}</p>
    </div>
  );
};

export default TestConnection;
