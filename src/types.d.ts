declare module "bun" {
  export interface Server {
    upgrade(req: Request, options?: { headers?: Record<string, string> }): boolean;
  }

  export interface ServerWebSocket<T> {
    send(message: string | Buffer): void;
    close: () => void;
    readyState: number;
  }
}

declare const Bun: {
  serve(options: {
    port: number;
    fetch(req: Request, server: import("bun").Server): Response | Promise<Response> | undefined | null;
    websocket: {
      open?(ws: import("bun").ServerWebSocket<any>): void;
      message?(ws: import("bun").ServerWebSocket<any>, message: string | Buffer): void;
      close?(ws: import("bun").ServerWebSocket<any>): void;
    };
  }): { port: number };
}; 