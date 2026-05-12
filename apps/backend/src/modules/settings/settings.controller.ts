import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SettingsService, ShopSecrets } from './settings.service';

class SecretsDto implements Partial<ShopSecrets> {
  @IsOptional() @IsString() razorpayKeyId?: string;
  @IsOptional() @IsString() razorpayKeySecret?: string;
  @IsOptional() @IsString() razorpayWebhookSecret?: string;
  @IsOptional() @IsString() jwtSecret?: string;
  @IsOptional() @IsString() agentTokenSecret?: string;
  @IsOptional() @IsString() adminPassword?: string;
}

class UpdateSettingsDto {
  @IsOptional() @IsString() shopName?: string;
  @IsOptional() @IsInt() @Min(0) bwPaise?: number;
  @IsOptional() @IsInt() @Min(0) colorPaise?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) duplexDiscountPct?: number;
  @IsOptional() @IsString() defaultPaperSize?: string;
  @IsOptional() @IsBoolean() acceptingJobs?: boolean;
  @IsOptional() @IsString() publicUrl?: string;
  @IsOptional() @IsString() cloudflareToken?: string;
  @IsOptional() @ValidateNested() @Type(() => SecretsDto) secrets?: SecretsDto;
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
    return this.settings.getMasked();
  }

  @Put()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async update(@Body() dto: UpdateSettingsDto) {
    const result = await this.settings.update(dto as any);
    const restartRequired = !!dto.secrets && Object.values(dto.secrets).some((v) => typeof v === 'string' && v.length > 0);
    const masked = await this.settings.getMasked();
    return { ...masked, restartRequired };
  }

  @Put('secrets')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async updateSecrets(@Body() dto: SecretsDto) {
    await this.settings.update({ secrets: dto });
    const hasChange = Object.values(dto).some((v) => typeof v === 'string' && v.length > 0);
    return { ok: true, restartRequired: hasChange };
  }
}
