// ===========================================
// Bills Controller
// ===========================================

import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { BillsService } from './bills.service';
import { CreateBillDto, AddItemDto, UpdateItemDto, ValidateQRDto } from './dto/bills.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface UserProfile {
    id: string;
    role: 'customer' | 'guard' | 'admin';
}

@Controller('bills')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillsController {
    constructor(private readonly billsService: BillsService) { }

    /**
     * Create a new bill (customers only)
     */
    @Post()
    @Roles('customer')
    async create(
        @CurrentUser() user: UserProfile,
        @Body() dto: CreateBillDto,
    ) {
        return this.billsService.create(user.id, dto);
    }

    /**
     * Get current user's bills (customers)
     */
    @Get('my')
    @Roles('customer')
    async getMyBills(
        @CurrentUser() user: UserProfile,
        @Query('status') status?: string,
    ) {
        return this.billsService.findByUser(user.id, status);
    }

    /**
     * Get bill by ID
     */
    @Get(':id')
    async findById(
        @Param('id') id: string,
        @CurrentUser() user: UserProfile,
    ) {
        return this.billsService.findById(id, user.id, user.role);
    }

    /**
     * Add item to bill
     */
    @Post(':id/items')
    @Roles('customer')
    async addItem(
        @Param('id') billId: string,
        @CurrentUser() user: UserProfile,
        @Body() dto: AddItemDto,
    ) {
        return this.billsService.addItem(billId, user.id, dto);
    }

    /**
     * Update item quantity
     */
    @Put(':id/items/:itemId')
    @Roles('customer')
    async updateItem(
        @Param('id') billId: string,
        @Param('itemId') itemId: string,
        @CurrentUser() user: UserProfile,
        @Body() dto: UpdateItemDto,
    ) {
        return this.billsService.updateItem(billId, itemId, user.id, dto);
    }

    /**
     * Remove item from bill
     */
    @Delete(':id/items/:itemId')
    @Roles('customer')
    async removeItem(
        @Param('id') billId: string,
        @Param('itemId') itemId: string,
        @CurrentUser() user: UserProfile,
    ) {
        return this.billsService.removeItem(billId, itemId, user.id);
    }

    /**
     * Generate QR code for bill
     */
    @Post(':id/qr')
    @Roles('customer')
    async generateQR(
        @Param('id') billId: string,
        @CurrentUser() user: UserProfile,
    ) {
        return this.billsService.generateQR(billId, user.id);
    }

    /**
     * Validate QR code (guards only)
     */
    @Post('validate-qr')
    @Roles('guard', 'admin')
    async validateQR(@Body() dto: ValidateQRDto) {
        return this.billsService.validateQR(dto.qrData);
    }

    /**
     * Mark bill as verified (guards only)
     */
    @Post(':id/verify')
    @Roles('guard')
    async verifyBill(
        @Param('id') billId: string,
        @CurrentUser() user: UserProfile,
    ) {
        return this.billsService.verifyBill(billId, user.id);
    }
}
