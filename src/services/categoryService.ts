import type { Category } from '../types'
import { supabase } from '../lib/supabase'

function mapRow(row: { id: string; name: string; created_at: string }): Category {
  return { id: row.id, name: row.name, createdAt: row.created_at }
}

export const categoryService = {
  async list(): Promise<Category[]> {
    const { data, error } = await supabase.from('categories').select('*').order('name')
    if (error) throw new Error('Unable to load categories. Please try again.')
    return (data ?? []).map(mapRow)
  },

  async productCount(categoryId: string): Promise<number> {
    const { count, error } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId)
    if (error) return 0
    return count ?? 0
  },

  async create(name: string): Promise<Category> {
    const { data, error } = await supabase.from('categories').insert({ name: name.trim() }).select().single()
    if (error) throw new Error(error.code === '23505' ? 'A category with this name already exists.' : 'Unable to create category.')
    return mapRow(data)
  },

  async update(id: string, name: string): Promise<Category> {
    const { data, error } = await supabase.from('categories').update({ name: name.trim() }).eq('id', id).select().single()
    if (error) throw new Error(error.code === '23505' ? 'A category with this name already exists.' : 'Unable to update category.')
    return mapRow(data)
  },

  async remove(id: string): Promise<{ ok: boolean; reason?: string }> {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) {
      // 23503 = foreign key violation (products still reference this category)
      if (error.code === '23503') {
        return { ok: false, reason: 'This category has products assigned to it. Move or delete those products first.' }
      }
      return { ok: false, reason: 'Unable to delete this category. Please try again.' }
    }
    return { ok: true }
  },
}
