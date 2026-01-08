// ===========================================
// Products Controller
// ===========================================

import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    /**
     * Get all products
     */
    @Get()
    async findAll(@Query('storeId') storeId?: string) {
        return this.productsService.findAll(storeId);
    }

    /**
     * Get product by barcode
     */
    @Get('barcode/:barcode')
    async findByBarcode(
        @Param('barcode') barcode: string,
        @Query('storeId') storeId?: string,
    ) {
        return this.productsService.findByBarcode(barcode, storeId);
    }

    /**
     * Search products
     */
    @Get('search')
    async search(
        @Query('q') term: string,
        @Query('storeId') storeId?: string,
    ) {
        return this.productsService.search(term, storeId);
    }

    /**
     * Get all categories
     */
    @Get('categories')
    async getCategories(@Query('storeId') storeId?: string) {
        return this.productsService.getCategories(storeId);
    }

    /**
     * Get products by category
     */
    @Get('category/:category')
    async findByCategory(
        @Param('category') category: string,
        @Query('storeId') storeId?: string,
    ) {
        return this.productsService.findByCategory(category, storeId);
    }

    /**
     * Get product by ID
     */
    @Get(':id')
    async findById(@Param('id') id: string) {
        return this.productsService.findById(id);
    }
}
