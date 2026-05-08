import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FilesModule } from './modules/files/files.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { PrintJobsModule } from './modules/print-jobs/print-jobs.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PrintersModule } from './modules/printers/printers.module';
import { QueueModule } from './modules/queue/queue.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    FilesModule,
    PricingModule,
    PrintJobsModule,
    PaymentsModule,
    PrintersModule,
    QueueModule,
    RealtimeModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
