import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { StorageService } from './storage.service';
import { PageAnalyzerService } from './page-analyzer.service';

@Module({
  controllers: [FilesController],
  providers: [FilesService, StorageService, PageAnalyzerService],
  exports: [FilesService, StorageService, PageAnalyzerService],
})
export class FilesModule {}
