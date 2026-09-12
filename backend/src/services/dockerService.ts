import Docker from "dockerode";
import stream from "stream";

function normalizeSocketPath(socketPath: string): string {
  if (socketPath.startsWith("\\\\.\\pipe\\")) {
    return socketPath.replace("\\\\.\\pipe\\", "//./pipe/");
  }
  return socketPath;
}

function streamToString(s: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    s.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    s.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    s.on("error", reject);
  });
}

function isOnlyDigits(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

export function getDockerClient(host?: string): Docker {
  if (!host) return new Docker();

  const h = String(host || "").trim();
  if (!h) return new Docker();

  if (isOnlyDigits(h)) {
    throw new Error(`Docker host inválido: "${h}" parece ser uma porta. Use "127.0.0.1:${h}" ou um socketPath.`);
  }

  if (h.startsWith("/") || h.startsWith("\\\\.\\pipe\\") || h.startsWith("//./pipe/")) {
    return new Docker({ socketPath: normalizeSocketPath(h) });
  }

  const m = h.match(/^(?:tcp:\/\/)?([^:]+):(\d+)$/);
  if (m) {
    return new Docker({ host: m[1], port: parseInt(m[2], 10) });
  }

  return new Docker({ host: h });
}

export async function inspectContainer(client: Docker, idOrName: string) {
  const container = client.getContainer(idOrName);
  return container.inspect();
}

export async function restartContainer(client: Docker, idOrName: string) {
  const container = client.getContainer(idOrName);
  await container.restart();
}

/**
 * LOGS ROBUSTO:
 * - suporta tail
 * - suporta sinceSec (últimos N segundos)
 * - timeout real na operação inteira
 */
export async function getContainerLogs(
  client: Docker,
  idOrName: string,
  tail: number = 200,
  timeoutMs: number = 60_000,
  sinceSec: number = 0
): Promise<string> {
  const container = client.getContainer(idOrName);

  const since = sinceSec > 0 ? Math.floor(Date.now() / 1000) - sinceSec : undefined;

  const raw = await Promise.race([
    container.logs({
      stdout: true,
      stderr: true,
      tail,
      follow: false,
      timestamps: true,
      ...(since ? { since } : {}),
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Docker logs timeout (${timeoutMs}ms)`)), timeoutMs)
    ),
  ]);

  const logStream: NodeJS.ReadableStream = Buffer.isBuffer(raw)
    ? (() => {
        const s = new stream.PassThrough();
        s.end(raw);
        return s;
      })()
    : typeof raw === "string"
    ? (() => {
        const s = new stream.PassThrough();
        s.end(Buffer.from(raw, "utf8"));
        return s;
      })()
    : (raw as unknown as NodeJS.ReadableStream);

  const stdout = new stream.PassThrough();
  const stderr = new stream.PassThrough();

  // @ts-expect-error dockerode types variam
  client.modem.demuxStream(logStream, stdout, stderr);

  const [out, err] = await Promise.all([streamToString(stdout), streamToString(stderr)]);
  return [out, err].filter(Boolean).join("\n").trim();
}

export const inspectDockerContainer = inspectContainer;
export const restartDockerContainer = restartContainer;
export const getDockerContainerLogs = getContainerLogs;
