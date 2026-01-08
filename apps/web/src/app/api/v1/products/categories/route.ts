// ===========================================
// Products API Routes - Categories
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { ProductsService } from '@/lib/services/products.service';

// GET /api/v1/products/categories
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const storeId = searchParams.get('storeId') || undefined;

        const categories = await ProductsService.getCategories(storeId);
        return NextResponse.json(categories);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch categories';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
