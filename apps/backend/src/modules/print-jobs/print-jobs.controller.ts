import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrintJobsService } from './print-jobs.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { CreatePrintJobDto } from '@quickprint/shared';

@ApiTags('print-jobs')
@ApiBearerAuth()
@Controller('print-jobs')
@UseGuards(AuthGuard('jwt'))
export class PrintJobsController {
  constructor(private readonly jobs: PrintJobsService) {}

  @Post()
  create(@Req() req: { user: { userId: string } }, @Body() dto: CreatePrintJobDto) {
    return this.jobs.create(req.user.userId, dto);
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

  @Get(':id')
  get(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.jobs.findOwned(req.user.userId, id);
  }
}
