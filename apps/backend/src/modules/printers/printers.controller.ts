import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrintersService } from './printers.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('printers')
@ApiBearerAuth()
@Controller('printers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PrintersController {
  constructor(private readonly printers: PrintersService) {}

  @Roles('ADMIN', 'AGENT')
  @Get()
  list(@Query('shopId') shopId?: string) {
    return this.printers.list(shopId);
  }
}
