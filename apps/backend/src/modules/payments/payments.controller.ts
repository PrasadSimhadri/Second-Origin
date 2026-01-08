// ===========================================
// Payments Controller
// ===========================================

import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { PaymentsService, InitiatePaymentDto } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface UserProfile {
    id: string;
}

class VerifyPaymentDto {
    razorpayPaymentId?: string;
}

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    /**
     * Initiate payment for a bill
     */
    @Post('initiate')
    @Roles('customer')
    async initiate(
        @CurrentUser() user: UserProfile,
        @Body() dto: InitiatePaymentDto,
    ) {
        return this.paymentsService.initiatePayment(user.id, dto);
    }

    /**
     * Verify/Complete payment
     */
    @Post(':id/verify')
    @Roles('customer')
    async verify(
        @Param('id') paymentId: string,
        @CurrentUser() user: UserProfile,
        @Body() dto: VerifyPaymentDto,
    ) {
        return this.paymentsService.verifyPayment(user.id, paymentId, dto.razorpayPaymentId);
    }

    /**
     * Get payments for a bill
     */
    @Get('bill/:billId')
    @Roles('customer', 'admin')
    async getByBill(
        @Param('billId') billId: string,
        @CurrentUser() user: UserProfile,
    ) {
        return this.paymentsService.getByBill(user.id, billId);
    }
}
