// ===========================================
// Products API Routes - Barcode lookup
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { ProductsService } from '@/lib/services/products.service';

// GET /api/v1/products/barcode/[barcode]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ barcode: string }> }
) {
    try {
        const { barcode } = await params;
        const { searchParams } = new URL(request.url);
        const storeId = searchParams.get('storeId') || undefined;

        const product = await ProductsService.findByBarcode(barcode, storeId);
        return NextResponse.json(product);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Product not found';
        return NextResponse.json({ error: message }, { status: 404 });
    }
}
