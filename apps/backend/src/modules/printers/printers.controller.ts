import { Body, Controller, Get, NotFoundException, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PrintersService } from './printers.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

class UpdatePrinterDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsBoolean() supportsColor?: boolean;
  @IsOptional() @IsBoolean() supportsDuplex?: boolean;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsIn(['GENERAL', 'LONG', 'SHORT', 'COLOR']) category?: 'GENERAL' | 'LONG' | 'SHORT' | 'COLOR';
  @IsOptional() @IsInt() @Min(1) @Max(10000) longPagesThreshold?: number;
}

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

  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePrinterDto) {
    const updated = await this.printers.update(id, dto);
    if (!updated) throw new NotFoundException('printer_not_found');
    return updated;
  }
}
