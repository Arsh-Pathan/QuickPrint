import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WS_NAMESPACE, type PrintJobStatus, type PrinterStatus } from '@quickprint/shared';

@WebSocketGateway({
  namespace: WS_NAMESPACE,
  cors: { origin: '*', credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`socket connected ${client.id}`);
  }
  handleDisconnect(client: Socket) {
    this.logger.log(`socket disconnected ${client.id}`);
  }

  @SubscribeMessage('subscribe:job')
  subscribeJob(@MessageBody() jobId: string, @ConnectedSocket() client: Socket) {
    client.join(`job:${jobId}`);
    return { ok: true };
  }

  @SubscribeMessage('subscribe:shop')
  subscribeShop(@MessageBody() shopId: string, @ConnectedSocket() client: Socket) {
    client.join(`shop:${shopId}`);
    return { ok: true };
  }

  // ── Server emits ──────────────────────────────────────────────────────────
  emitJobStatus(jobId: string, status: PrintJobStatus, eta?: number) {
    this.server.to(`job:${jobId}`).emit('job:status', { jobId, status, eta });
  }

  emitPrinterStatus(shopId: string, payload: { printerId: string; status: PrinterStatus }) {
    this.server.to(`shop:${shopId}`).emit('printer:status', payload);
  }

  emitQueuePaused(shopId: string, reason: string) {
    this.server.to(`shop:${shopId}`).emit('queue:paused', { shopId, reason });
  }
}
