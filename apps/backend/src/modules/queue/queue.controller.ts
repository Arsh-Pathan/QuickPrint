import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('queue')
@ApiBearerAuth()
@Controller('queue')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class QueueController {
  constructor(private readonly queue: QueueService) {}

  @Roles('ADMIN', 'AGENT')
  @Get()
  list(@Query('shopId') shopId = 'default') {
    return this.queue.list(shopId);
  }

  @Roles('ADMIN')
  @Delete(':jobId')
  cancel(@Param('jobId') jobId: string) {
    return this.queue.cancel(jobId);
  }
}
