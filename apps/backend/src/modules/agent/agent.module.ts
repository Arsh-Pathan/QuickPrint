import { Module } from '@nestjs/common';
import { AgentGateway } from './agent.gateway';
import { RealtimeModule } from '../realtime/realtime.module';
import { PrintersModule } from '../printers/printers.module';

@Module({
  imports: [RealtimeModule, PrintersModule],
  providers: [AgentGateway],
})
export class AgentModule {}
