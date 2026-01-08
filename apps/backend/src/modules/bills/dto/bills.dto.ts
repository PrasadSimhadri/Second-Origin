// ===========================================
// Bills DTOs
// ===========================================

import { IsNotEmpty, IsString, IsNumber, IsArray, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BillItemDto {
    @IsString()
    @IsNotEmpty()
    productId: string;

    @IsNumber()
    @Min(1)
    quantity: number;
}

export class CreateBillDto {
    @IsString()
    @IsNotEmpty()
    storeId: string;
}

export class AddItemDto {
    @IsString()
    @IsNotEmpty()
    productId: string;

    @IsNumber()
    @Min(1)
    quantity: number;
}

export class UpdateItemDto {
    @IsNumber()
    @Min(0)
    quantity: number;
}

export class ValidateQRDto {
    @IsString()
    @IsNotEmpty()
    qrData: string;
}
