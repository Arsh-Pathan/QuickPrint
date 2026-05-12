import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [RealtimeModule, FilesModule],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
