import { Logger } from '../models/logger';
import ReconnectingWebSocket from 'partysocket/ws';

export interface WebSocketEvent<T = unknown> {
  type: string;
  payload: T;
}

export type EventHandler<T = unknown> = (payload: T) => void;

export class WebSocketClient {
  private socket: ReconnectingWebSocket | null = null;
  private handlers: Map<string, EventHandler[]> = new Map();
  private token: string | null = null;
  public socketId: string | null = null;

  public get isConnected(): boolean {
    return this.socket?.readyState === 1;
  }

  constructor(
    private readonly url: string,
    private readonly logger: Logger,
    private readonly webSocketImpl?: unknown
  ) {}

  public connect(token: string): void {
    if (this.socket && this.token === token && this.socket.readyState === this.socket.OPEN) {
      return;
    }

    if (this.socket) {
      this.disconnect();
    }
    this.token = token;

    if (!this.socketId) {
      this.socketId = crypto.randomUUID();
    }

    const url = `${this.url}?token=${this.token}&socket_id=${this.socketId}`;

    try {
      this.socket = new ReconnectingWebSocket(url, [], {
        WebSocket: this.webSocketImpl,
      });
      
      this.socket.addEventListener('open', this.onOpen.bind(this));
      this.socket.addEventListener('message', this.onMessage.bind(this));
      this.socket.addEventListener('close', this.onClose.bind(this));
      this.socket.addEventListener('error', this.onError.bind(this));
    } catch (e) {
      this.logger.error('WebSocket connection failed', e);
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public on<T>(type: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)?.push(handler as EventHandler);
  }

  public off<T>(type: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(type);
    if (!handlers) {
      return;
    }
    const index = handlers.indexOf(handler as EventHandler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  private onOpen(): void {
    this.logger.info('WebSocket connected');
  }

  private onMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as WebSocketEvent;
      const handlers = this.handlers.get(data.type);
      if (handlers) {
        handlers.forEach((h) => h(data.payload));
      }
    } catch (e) {
      this.logger.error('Failed to parse WebSocket message', e);
    }
  }

  private onClose(): void {
    this.logger.info('WebSocket disconnected');
  }

  private onError(event: ErrorEvent): void {
    this.logger.error('WebSocket error', event);
  }
}
