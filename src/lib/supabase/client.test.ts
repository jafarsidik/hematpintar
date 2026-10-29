import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

async function loadClient(url: string, key: string) {
  vi.stubEnv('VITE_SUPABASE_URL', url)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', key)
  vi.resetModules()
  return import('./client')
}

describe('supabase client', () => {
  it('tetap null bila env kosong', async () => {
    const client = await loadClient('', '')

    expect(client.supabase).toBeNull()
    expect(client.isSupabaseConfigured).toBe(false)
  })

  it('tetap null bila env hanya berisi spasi', async () => {
    const client = await loadClient('   ', '   ')

    expect(client.supabase).toBeNull()
    expect(client.isSupabaseConfigured).toBe(false)
  })

  it('tetap null bila URL tidak valid', async () => {
    const client = await loadClient('bukan-url', 'anon-key')

    expect(client.supabase).toBeNull()
    expect(client.isSupabaseConfigured).toBe(false)
  })

  it('membuat client hanya dengan URL dan anon key yang valid', async () => {
    const client = await loadClient(
      'https://example.supabase.co',
      'anon-key',
    )

    expect(client.supabase).not.toBeNull()
    expect(client.isSupabaseConfigured).toBe(true)
  })
})
