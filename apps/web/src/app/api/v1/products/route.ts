// ===========================================
// Products API Routes
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { ProductsService } from '@/lib/services/products.service';

// GET /api/v1/products - Get all products
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const storeId = searchParams.get('storeId') || undefined;
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        let data;

        if (search) {
            data = await ProductsService.search(search, storeId);
        } else if (category) {
            data = await ProductsService.findByCategory(category, storeId);
        } else {
            data = await ProductsService.findAll(storeId);
        }

        return NextResponse.json(data);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch products';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
