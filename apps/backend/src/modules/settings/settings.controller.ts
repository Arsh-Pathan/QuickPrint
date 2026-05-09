import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SettingsService } from './settings.service';

class UpdateSettingsDto {
  @IsOptional() @IsString() @Length(1, 120) shopName?: string;
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000) bwPaise?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000) colorPaise?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) duplexDiscountPct?: number;
  @IsOptional() @IsIn(['A4', 'A3', 'LETTER', 'LEGAL']) defaultPaperSize?: 'A4' | 'A3' | 'LETTER' | 'LEGAL';
  @IsOptional() @IsBoolean() acceptingJobs?: boolean;
}

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('public')
  publicSettings() {
    return this.settings.get().then((s) => ({
      shopName: s.shopName,
      acceptingJobs: s.acceptingJobs,
      defaultPaperSize: s.defaultPaperSize,
      bwPaise: s.bwPaise,
      colorPaise: s.colorPaise,
      duplexDiscountPct: s.duplexDiscountPct,
    }));
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  read() {
    return this.settings.get();
  }

  @Put()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }
}
