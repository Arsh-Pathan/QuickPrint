import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { AuthService } from './auth.service';

class AnonymousLoginDto {
  @IsOptional() @IsString() @Length(0, 80) name?: string;
  // E.164-ish: optional leading +, 8–15 digits. Stored verbatim, used for WhatsApp links.
  @IsOptional() @IsString() @Matches(/^\+?[0-9]{8,15}$/, { message: 'invalid_phone' })
  phone?: string;
}
class AdminLoginDto {
  @IsString() @Length(1, 200) password!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('anonymous')
  anonymous(@Body() dto: AnonymousLoginDto) {
    return this.auth.anonymousLogin(dto?.name, dto?.phone);
  }

  @Post('admin/login')
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.auth.adminLogin(dto.password);
  }
}
