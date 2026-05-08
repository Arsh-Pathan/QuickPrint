import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, Matches, Length } from 'class-validator';
import { AuthService } from './auth.service';

class RequestOtpDto {
  @Matches(/^\+?\d{10,15}$/) phone!: string;
}
class VerifyOtpDto {
  @Matches(/^\+?\d{10,15}$/) phone!: string;
  @IsString() @Length(4, 8) code!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request')
  request(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @Post('otp/verify')
  verify(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.code);
  }
}
