import './polyfills/pdfjs-node';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * Fails fast at boot only if infrastructure-level env vars are missing.
 * App-level secrets (JWT_SECRET, ADMIN_PASSWORD, RAZORPAY_*, AGENT_TOKEN_SECRET)
 * may now live in the Setting table (managed via the admin UI), so they are
 * resolved lazily — never block boot on them.
 *
 * Single-shop deployment: SHOP_ID identifies the one shop this backend serves.
 */
function assertProdEnv() {
  if (process.env.NODE_ENV !== 'production') return;
  const required = ['SHOP_ID', 'DATABASE_URL'];
  const missing = required.filter((k) => !process.env[k] || process.env[k] === '');
  if (missing.length) {
    const banner =
      '\n' +
      '═══════════════════════════════════════════════════════════════════\n' +
      ' QuickPrint backend refusing to start (NODE_ENV=production)\n' +
      '═══════════════════════════════════════════════════════════════════\n' +
      `  • missing: ${missing.join(', ')}\n` +
      '\n  Fix: set SHOP_ID and DATABASE_URL in env, then restart.\n' +
      '═══════════════════════════════════════════════════════════════════\n';
    process.stderr.write(banner);
    process.exit(1);
  }
}

async function bootstrap() {
  assertProdEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.get<string>('CORS_ORIGINS')?.split(',') ?? '*',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');

  const swagger = new DocumentBuilder()
    .setTitle('QuickPrint API')
    .setDescription('Print job, payment, queue, and printer endpoints')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  const port = Number(config.get('BACKEND_PORT') ?? 4000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`QuickPrint backend listening on 0.0.0.0:${port}`, 'Bootstrap');
}

void bootstrap().catch((err) => {
  process.stderr.write(`\nQuickPrint backend bootstrap failed:\n${(err as Error)?.stack ?? err}\n`);
  process.exit(1);
});
