import { Controller, Post, UseGuards, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

const SENTINEL_FILENAME = '.intentional-restart';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  @Post('restart')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  restart() {
    const sentinelPath = path.join(
      process.env.QUICKPRINT_USER_DATA ?? os.tmpdir(),
      SENTINEL_FILENAME,
    );
    try {
      fs.writeFileSync(sentinelPath, String(Date.now()));
    } catch (e: any) {
      this.logger.warn(`Could not write restart sentinel at ${sentinelPath}: ${e.message}`);
    }
    this.logger.log(`Admin requested restart — exiting in 250ms (sentinel: ${sentinelPath})`);
    // Defer so the HTTP response can flush before we exit.
    setTimeout(() => process.exit(0), 250);
    return { ok: true, restarting: true };
  }
}
