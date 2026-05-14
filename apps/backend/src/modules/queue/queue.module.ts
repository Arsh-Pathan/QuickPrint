import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { FilesModule } from '../files/files.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [RealtimeModule, FilesModule, SettingsModule],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
