import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrintJobsService } from './print-jobs.service';
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

  @Get(':id')
  get(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.jobs.findOwned(req.user.userId, id);
  }
}
