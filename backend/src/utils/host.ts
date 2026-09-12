export function validateHost(host?: string): { valid: boolean; message?: string } {
  if (!host || String(host).trim() === '') return { valid: true };
  const h = String(host).trim();

  // Caminho de socket unix
  if (h.startsWith('/')) return { valid: true };

  // Padrões de named pipe do Windows: \\\\.\\pipe\\docker_engine ou //./pipe/docker_engine
  if (h.startsWith('\\\\.\\pipe\\') || h.startsWith('//./pipe/')) return { valid: true };

  // tcp://host:port ou host:port
  const tcpRegex = /^(tcp:\/\/)?([^:\/\s]+):(\d{1,5})$/;
  const m = h.match(tcpRegex);
  if (m) {
    const port = Number(m[3]);
    if (port < 1 || port > 65535) return { valid: false, message: 'Número de porta inválido (deve ser entre 1 e 65535)' };
    return { valid: true };
  }

  return {
    valid: false,
    message:
      'Formato de host inválido. Use um socket (ex: /var/run/docker.sock), named pipe (ex: \\\\.\\pipe\\docker_engine) ou host:port / tcp://host:port'
  };
}

export function getHostExamples() {
  return [
    '/var/run/docker.sock',
    '\\\\.\\pipe\\docker_engine',
    'tcp://127.0.0.1:2375',
    '192.168.1.10:2375'
  ];
}
