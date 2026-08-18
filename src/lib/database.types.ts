// Hand-authored to match supabase/migrations/0001_init_schema.sql.
// If you ever run `supabase gen types typescript`, that generated file
// can replace this one — the shape is the same.

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          role: 'admin' | 'seller'
          status: 'active' | 'disabled'
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string; name: string; email: string; role: 'admin' | 'seller' }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      categories: {
        Row: { id: string; name: string; created_at: string }
        Insert: { id?: string; name: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['categories']['Row']>
      }
      products: {
        Row: {
          id: string
          name: string
          brand: string
          category_id: string
          sku: string
          size: string | null
          color: string | null
          purchase_cost: number
          selling_price: number
          quantity: number
          initial_quantity: number
          description: string | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['products']['Row']> & {
          name: string; category_id: string; sku: string; purchase_cost: number; selling_price: number
        }
        Update: Partial<Database['public']['Tables']['products']['Row']>
      }
      payment_methods: {
        Row: { id: string; name: string; active: boolean; created_at: string }
        Insert: { id?: string; name: string; active?: boolean; created_at?: string }
        Update: Partial<Database['public']['Tables']['payment_methods']['Row']>
      }
      sales: {
        Row: {
          id: string
          seller_id: string
          payment_method_id: string
          total_amount: number
          total_profit: number
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['sales']['Row']> & { seller_id: string; payment_method_id: string; total_amount: number; total_profit: number }
        Update: Partial<Database['public']['Tables']['sales']['Row']>
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string
          quantity: number
          original_price: number
          actual_price: number
          purchase_cost: number
          profit: number
        }
        Insert: Partial<Database['public']['Tables']['sale_items']['Row']> & { sale_id: string; product_id: string; quantity: number }
        Update: Partial<Database['public']['Tables']['sale_items']['Row']>
      }
      inventory_movements: {
        Row: {
          id: string
          product_id: string
          type: 'INITIAL_STOCK' | 'SALE' | 'RESTOCK' | 'ADJUSTMENT'
          quantity_change: number
          resulting_stock: number
          user_id: string | null
          note: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['inventory_movements']['Row']> & { product_id: string; type: string; quantity_change: number; resulting_stock: number }
        Update: Partial<Database['public']['Tables']['inventory_movements']['Row']>
      }
      shop_settings: {
        Row: {
          id: boolean
          shop_name: string
          logo_initial: string
          phone: string
          address: string
          currency: string
          low_stock_threshold: number
        }
        Insert: Partial<Database['public']['Tables']['shop_settings']['Row']>
        Update: Partial<Database['public']['Tables']['shop_settings']['Row']>
      }
    }
    Functions: {
      record_sale: {
        Args: { p_product_id: string; p_quantity: number; p_actual_price: number; p_payment_method_id: string }
        Returns: Database['public']['Tables']['sales']['Row']
      }
      restock_product: {
        Args: { p_product_id: string; p_amount: number; p_note?: string | null }
        Returns: Database['public']['Tables']['products']['Row']
      }
      adjust_product_stock: {
        Args: { p_product_id: string; p_new_quantity: number; p_note?: string | null }
        Returns: Database['public']['Tables']['products']['Row']
      }
      create_product_with_stock: {
        Args: {
          p_name: string; p_brand: string; p_category_id: string; p_sku: string
          p_size: string | null; p_color: string | null; p_purchase_cost: number
          p_selling_price: number; p_quantity: number; p_description: string | null; p_image_url: string | null
        }
        Returns: Database['public']['Tables']['products']['Row']
      }
    }
  }
}
