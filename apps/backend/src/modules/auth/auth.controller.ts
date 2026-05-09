import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { AuthService } from './auth.service';

class AnonymousLoginDto {
  @IsOptional() @IsString() @Length(0, 80) name?: string;
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
    return this.auth.anonymousLogin(dto?.name);
  }

  @Post('admin/login')
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.auth.adminLogin(dto.password);
  }
}
