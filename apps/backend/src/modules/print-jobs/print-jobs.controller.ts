import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrintJobsService } from './print-jobs.service';
import { QueueService } from '../queue/queue.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { CreatePrintJobDto } from '@quickprint/shared';

@ApiTags('print-jobs')
@ApiBearerAuth()
@Controller('print-jobs')
@UseGuards(AuthGuard('jwt'))
export class PrintJobsController {
  constructor(
    private readonly jobs: PrintJobsService,
    private readonly queue: QueueService,
  ) {}

  @Post()
  create(@Req() req: { user: { userId: string } }, @Body() dto: CreatePrintJobDto) {
    return this.jobs.create(req.user.userId, dto);
  }

  @Post(':id/reprint')
  reprint(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() body: { settings?: CreatePrintJobDto['settings'] } = {},
  ) {
    return this.jobs.reprint(req.user.userId, id, body.settings);
  }

  @Patch(':id/settings')
  updateSettings(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() settings: CreatePrintJobDto['settings'],
  ) {
    return this.jobs.updateOwnedSettings(req.user.userId, id, settings);
  }

  @Get()
  list(@Req() req: { user: { userId: string } }) {
    return this.jobs.listForUser(req.user.userId);
  }

  @Get('admin/list')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  adminList(
    @Query('shopId') shopId?: string,
    @Query('limit') limit?: string,
    @Query('sinceHours') sinceHours?: string,
  ) {
    return this.jobs.listForAdmin({
      shopId,
      limit: limit ? Number(limit) : undefined,
      sinceHours: sinceHours ? Number(sinceHours) : undefined,
    });
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  adminStats(@Query('shopId') shopId?: string) {
    return this.jobs.statsForAdmin(shopId);
  }

  @Post('admin/:id/mark-printed')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  adminMarkPrinted(@Param('id') id: string) {
    return this.jobs.adminMarkPrinted(id);
  }

  @Post('admin/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  adminCancel(
    @Param('id') id: string,
    @Body() body: { reason?: string } = {},
  ) {
    return this.jobs.adminCancel(id, body.reason);
  }

  @Post('admin/:id/requeue')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  adminRequeue(@Param('id') id: string) {
    return this.jobs.adminRequeue(id);
  }

  @Get(':id')
  get(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.jobs.findOwned(req.user.userId, id);
  }

  /** Student-scoped queue snapshot for their own job. */
  @Get(':id/queue-position')
  async queuePosition(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    await this.jobs.findOwned(req.user.userId, id); // ownership check
    return this.queue.positionFor(id);
  }
}
