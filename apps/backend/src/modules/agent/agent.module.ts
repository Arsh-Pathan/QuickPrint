import { Module } from '@nestjs/common';
import { AgentGateway } from './agent.gateway';
import { RealtimeModule } from '../realtime/realtime.module';
import { PrintersModule } from '../printers/printers.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [RealtimeModule, PrintersModule, QueueModule],
  providers: [AgentGateway],
})
export class AgentModule {}
