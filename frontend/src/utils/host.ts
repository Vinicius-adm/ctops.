export function validateHost(host?: string): { valid: boolean; message?: string } {
  if (!host || String(host).trim() === '') return { valid: true };
  const h = String(host).trim();

  if (h.startsWith('/')) return { valid: true };
  if (h.startsWith('\\\\.\\pipe\\') || h.startsWith('//./pipe/')) return { valid: true };
  const tcpRegex = /^(tcp:\/\/)?([^:\/\s]+):(\d{1,5})$/;
  const m = h.match(tcpRegex);
  if (m) {
    const port = Number(m[3]);
    if (port < 1 || port > 65535) return { valid: false, message: 'Porta inválida (1-65535)' };
    return { valid: true };
  }
  return { valid: false, message: 'Formato inválido. Exemplos: /var/run/docker.sock, \\\\.\\pipe\\docker_engine, tcp://host:2375' };
}

export function getHostExamples() {
  return ['/var/run/docker.sock', '\\\\.\\pipe\\docker_engine', 'tcp://127.0.0.1:2375', '127.0.0.1:2375'];
}
