// ===========================================
// Products Service - Migrated from NestJS
// ===========================================

import { getAdminClient } from '@/lib/supabase';

export class ProductsService {
    static async findAll(storeId?: string) {
        const client = getAdminClient();

        let query = client
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('category')
            .order('name');

        if (storeId) {
            query = query.eq('store_id', storeId);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error('Failed to fetch products');
        }

        return data;
    }

    static async findById(id: string) {
        const client = getAdminClient();

        const { data, error } = await client
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            throw new Error('Product not found');
        }

        return data;
    }

    static async findByBarcode(barcode: string, storeId?: string) {
        const client = getAdminClient();

        let query = client
            .from('products')
            .select('*')
            .eq('barcode', barcode)
            .eq('is_active', true);

        if (storeId) {
            query = query.eq('store_id', storeId);
        }

        const { data, error } = await query.single();

        if (error || !data) {
            throw new Error('Product not found');
        }

        return data;
    }

    static async search(term: string, storeId?: string) {
        const client = getAdminClient();

        let query = client
            .from('products')
            .select('*')
            .eq('is_active', true)
            .or(`name.ilike.%${term}%,barcode.ilike.%${term}%,category.ilike.%${term}%`)
            .order('name')
            .limit(20);

        if (storeId) {
            query = query.eq('store_id', storeId);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error('Failed to search products');
        }

        return data;
    }

    static async findByCategory(category: string, storeId?: string) {
        const client = getAdminClient();

        let query = client
            .from('products')
            .select('*')
            .eq('is_active', true)
            .eq('category', category)
            .order('name');

        if (storeId) {
            query = query.eq('store_id', storeId);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error('Failed to fetch products');
        }

        return data;
    }

    static async getCategories(storeId?: string) {
        const client = getAdminClient();

        let query = client
            .from('products')
            .select('category')
            .eq('is_active', true);

        if (storeId) {
            query = query.eq('store_id', storeId);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error('Failed to fetch categories');
        }

        // Get unique categories
        const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
        return categories;
    }
}
