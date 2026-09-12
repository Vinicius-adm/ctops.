import net from "net";

export type TcpTestResult = {
  ok: boolean;
  latency_ms: number;
  error?: string;
};

export async function testTcpConnection(
  host: string,
  port: number,
  timeoutMs = 3000
): Promise<TcpTestResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();

    let done = false;

    const finish = (result: TcpTestResult) => {
      if (done) return;
      done = true;
      try {
        socket.destroy(); // FECHA O SOCKET SEMPRE
      } catch {}
      resolve(result);
    };

    socket.setTimeout(timeoutMs);

    socket.once("connect", () => {
      finish({ ok: true, latency_ms: Date.now() - start });
    });

    socket.once("timeout", () => {
      finish({
        ok: false,
        latency_ms: Date.now() - start,
        error: `Timeout (${timeoutMs}ms)`,
      });
    });

    socket.once("error", (err) => {
      finish({
        ok: false,
        latency_ms: Date.now() - start,
        error: err?.message || "Socket error",
      });
    });

    socket.connect(port, host);
  });
}
