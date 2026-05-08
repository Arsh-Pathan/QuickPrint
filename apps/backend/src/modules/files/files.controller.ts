import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import type { Request, Response } from 'express';
import { FilesService } from './files.service';
import { StorageService } from './storage.service';

class SignUploadDto {
  @IsString() @MaxLength(255) fileName!: string;
  @IsString() mimeType!: string;
  @IsInt() @Min(1) @Max(50 * 1024 * 1024) fileSize!: number; // 50 MB cap
}

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(
    private readonly files: FilesService,
    private readonly storage: StorageService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('sign-upload')
  sign(@Body() dto: SignUploadDto) {
    if (!this.files.isAllowed(dto.mimeType)) {
      throw new BadRequestException('unsupported_file_type');
    }
    return this.files.requestUpload(dto.fileName, dto.mimeType);
  }

  /**
   * Local-disk upload sink. Authentication is via the HMAC token in the URL,
   * so this is callable without a JWT (matches how S3 presigned PUTs work).
   */
  @Put('local-upload')
  async upload(
    @Query('key') fileKey: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Req() req: Request,
  ) {
    if (!fileKey || !exp || !sig) throw new BadRequestException('missing_params');
    if (!this.storage.verifyToken(fileKey, 'put', Number(exp), sig)) {
      throw new BadRequestException('invalid_or_expired_signature');
    }
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of req as AsyncIterable<Buffer>) {
      total += chunk.length;
      if (total > 50 * 1024 * 1024) throw new BadRequestException('file_too_large');
      chunks.push(chunk);
    }
    await this.storage.writeLocal(fileKey, Buffer.concat(chunks));
    return { ok: true, size: total };
  }

  /** Local-disk download — used by the print agent to fetch the file. */
  @Get('local-download')
  async download(
    @Query('key') fileKey: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    if (!fileKey || !exp || !sig) throw new BadRequestException('missing_params');
    if (!this.storage.verifyToken(fileKey, 'get', Number(exp), sig)) {
      throw new BadRequestException('invalid_or_expired_signature');
    }
    const stat = await this.storage.statLocal(fileKey);
    if (!stat) throw new NotFoundException('file_not_found');
    const buf = await this.storage.readLocal(fileKey);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.send(buf);
  }
}
