// ===========================================
// Products API Routes - By ID
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { ProductsService } from '@/lib/services/products.service';

// GET /api/v1/products/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const product = await ProductsService.findById(id);
        return NextResponse.json(product);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Product not found';
        return NextResponse.json({ error: message }, { status: 404 });
    }
}
