import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { FilesService } from './files.service';

class SignUploadDto {
  @IsString() @MaxLength(255) fileName!: string;
  @IsString() mimeType!: string;
  @IsInt() @Min(1) @Max(50 * 1024 * 1024) fileSize!: number; // 50 MB cap
}

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
@UseGuards(AuthGuard('jwt'))
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('sign-upload')
  sign(@Body() dto: SignUploadDto) {
    if (!this.files.isAllowed(dto.mimeType)) {
      throw new BadRequestException('unsupported_file_type');
    }
    return this.files.requestUpload(dto.fileName, dto.mimeType);
  }
}
