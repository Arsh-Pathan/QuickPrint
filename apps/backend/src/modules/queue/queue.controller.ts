import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('queue')
@Controller('queue')
export class QueueController {
  constructor(private readonly queue: QueueService) {}

  /** Anonymous snapshot — used by the home page to show "≈N min wait". */
  @Get('public')
  publicSnapshot(@Query('shopId') shopId?: string) {
    return this.queue.publicSnapshot(shopId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  @Get()
  list(@Query('shopId') shopId = 'default') {
    return this.queue.list(shopId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Delete(':jobId')
  cancel(@Param('jobId') jobId: string) {
    return this.queue.cancel(jobId);
  }
}
