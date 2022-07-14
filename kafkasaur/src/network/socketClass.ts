import { EventEmitter } from "https://deno.land/std@0.148.0/node/events.ts";
import { Buffer } from "https://deno.land/std@0.148.0/node/buffer.ts";
import { iterateReader as iter } from "https://deno.land/std@0.148.0/streams/conversion.ts";

interface SslOptions {
  certFile: string;
}

export class CustomSocket extends EventEmitter {
  conn?: Deno.Conn;
  isOpen = false;
  options: Deno.ConnectOptions & { ssl?: SslOptions };

  constructor(options?: any) {
    super();
    this.options = {
      hostname: options?.hostname || "localhost",
      port: options?.port || 9899,
      transport: options?.transport || "tcp",
      ssl: options?.ssl,
    };
  }

  async connect() {
    if (this.options.ssl) {
      const newOptions = {
        hostname: this.options.hostname,
        port: this.options.port,
        certFile: this.options.ssl.certFile,
      };
      const conn = await Deno.connectTls(newOptions);
      this.open(conn);
    } else {
      const conn = await Deno.connect(this.options);
      this.open(conn);
    }
  }

  close() {
    this.emit("close", this);
    this.conn?.close();
  }

  async open(conn: Deno.Conn) {
    try {
      this.isOpen = true;
      this.conn = conn;
      this.emit("connect", this);

      for await (const buffer of iter(conn)) {
        this.emit("data", buffer);
      }
      this.close();
    } catch (e) {
      this.emit("error", this, e);
      this.close();
    }
  }

  async write(data: Buffer): Promise<number> {
    const write = await this.conn?.write(data);

    return Promise.resolve(<number> write);
  }
}
