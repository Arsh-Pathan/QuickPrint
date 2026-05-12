import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { RazorpayService } from './razorpay.service';

class CreateOrderDto {
  @IsString() jobId!: string;
}
class BatchOrderDto {
  @IsString({ each: true }) jobIds!: string[];
}
class ConfirmDto {
  @IsString() orderId!: string;
  @IsString() paymentId!: string;
  @IsString() signature!: string;
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly rzp: RazorpayService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('orders')
  create(@Req() req: { user: { userId: string } }, @Body() dto: CreateOrderDto) {
    return this.payments.createOrder(req.user.userId, dto.jobId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('batch-order')
  createBatch(@Req() req: { user: { userId: string } }, @Body() dto: BatchOrderDto) {
    return this.payments.createBatchOrder(req.user.userId, dto.jobIds);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('confirm')
  confirm(@Body() dto: ConfirmDto) {
    return this.payments.confirmClientSuccess(dto.orderId, dto.paymentId, dto.signature);
  }

  @Post('webhook')
  async webhook(@Req() req: Request, @Headers('x-razorpay-signature') signature: string) {
    const raw = (req as unknown as { rawBody?: Buffer }).rawBody?.toString('utf8') ?? '';
    if (!(await this.rzp.verifyWebhookSignature(raw, signature ?? ''))) {
      throw new BadRequestException('invalid_webhook_signature');
    }
    return this.payments.handleWebhook(JSON.parse(raw || '{}'));
  }
}
