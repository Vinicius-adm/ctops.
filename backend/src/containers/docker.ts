import Docker from 'dockerode';

export function getDockerClient(host?: string): Docker {
  if (!host) {
    // PADRÃO: USAR SOCKET DOCKER LOCAL
    return new Docker();
  }

  // SE HOST FOR UM CAMINHO DE SOCKET
  if (host.startsWith('/')) {
    return new Docker({ socketPath: host });
  }

  // ACEITA tcp://HOST:PORT OU HOST:PORT
  const m = host.match(/^(tcp:\/\/)?([^:]+):(\d+)$/);
  if (m) {
    return new Docker({ host: m[2], port: parseInt(m[3], 10) });
  }

  // FALLBACK - DEIXAR DOCKERODE TENTAR
  return new Docker({ host });
}
