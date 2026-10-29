import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import {
  chooseProduct,
  createNeed,
  createProduct,
  getBudget,
  listNeeds,
  listProducts,
  removeNeed,
  removeProduct,
  setBudget,
  updateNeed,
  updateProduct,
  type CreateNeedInput,
  type CreateProductInput,
  type HouseholdBudget,
  type SavedProduct,
  type ShoppingNeed,
  type UpdateNeedInput,
  type UpdateProductInput,
} from '@/lib/storage/household-needs'

export const useHouseholdStore = defineStore('household', () => {
  const needs = ref<ShoppingNeed[]>([])
  const productsByNeed = ref<Record<string, SavedProduct[]>>({})
  const budget = ref<HouseholdBudget | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const authStore = useAuthStore()
  const userId = computed(() => {
    if (
      import.meta.env.VITE_E2E_BYPASS_AUTH === 'true'
    ) {
      return '11111111-1111-1111-1111-111111111111'
    }
    return authStore.user?.id ?? null
  })
  const isAuthenticated = computed(() => authStore.isAuthenticated)

  function setError(message: string | null): void {
    error.value = message
  }

  async function fetchNeeds(): Promise<void> {
    if (!userId.value) {
      needs.value = []
      return
    }

    loading.value = true
    error.value = null

    try {
      const result = await listNeeds(userId.value)
      if (result.ok) {
        needs.value = result.value
      } else {
        setError(result.errors.map((e) => e.message).join(' ') || 'Gagal memuat kebutuhan.')
      }
    } catch {
      setError('Gagal memuat kebutuhan.')
    } finally {
      loading.value = false
    }
  }

  async function fetchProducts(needId: string): Promise<void> {
    if (!userId.value) {
      productsByNeed.value = {}
      return
    }

    try {
      const result = await listProducts(needId, userId.value)
      if (result.ok) {
        productsByNeed.value = { ...productsByNeed.value, [needId]: result.value }
      } else {
        setError(result.errors.map((e) => e.message).join(' ') || 'Gagal memuat produk.')
      }
    } catch {
      setError('Gagal memuat produk.')
    }
  }

  function productsFor(needId: string): SavedProduct[] {
    return productsByNeed.value[needId] ?? []
  }

  async function createNeedItem(input: CreateNeedInput): Promise<ShoppingNeed | null> {
    if (!userId.value) {
      setError('Login diperlukan untuk menyimpan ke akun.')
      return null
    }

    loading.value = true
    error.value = null

    try {
      const result = await createNeed(userId.value, input)
      if (result.ok) {
        needs.value.unshift(result.value)
        return result.value
      }
      setError(result.errors.map((e) => e.message).join(' ') || 'Gagal menyimpan kebutuhan.')
      return null
    } catch {
      setError('Gagal menyimpan kebutuhan.')
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateNeedItem(
    id: string,
    patch: UpdateNeedInput,
  ): Promise<ShoppingNeed | null> {
    if (!userId.value) {
      setError('Login diperlukan untuk menyimpan ke akun.')
      return null
    }

    loading.value = true
    error.value = null

    try {
      const result = await updateNeed(id, userId.value, patch)
      if (result.ok) {
        needs.value = needs.value.map((need) =>
          need.id === id ? result.value : need,
        )
        return result.value
      }
      setError(result.errors.map((e) => e.message).join(' ') || 'Gagal memperbarui kebutuhan.')
      return null
    } catch {
      setError('Gagal memperbarui kebutuhan.')
      return null
    } finally {
      loading.value = false
    }
  }

  async function chooseNeedProduct(
    needId: string,
    productId: string | null,
  ): Promise<boolean> {
    if (!userId.value) {
      setError('Login diperlukan untuk menyimpan ke akun.')
      return false
    }

    try {
      const result = await chooseProduct(needId, productId, userId.value)
      if (result.ok) {
        needs.value = needs.value.map((need) =>
          need.id === needId ? { ...need, chosen_product_id: productId } : need,
        )
        return true
      }
      setError(result.errors.map((e) => e.message).join(' ') || 'Gagal memilih produk.')
      return false
    } catch {
      setError('Gagal memilih produk.')
      return false
    }
  }

  async function createNeedProduct(
    needId: string,
    input: CreateProductInput,
  ): Promise<SavedProduct | null> {
    if (!userId.value) {
      setError('Login diperlukan untuk menyimpan ke akun.')
      return null
    }

    loading.value = true
    error.value = null

    try {
      const result = await createProduct(needId, userId.value, input)
      if (result.ok) {
        productsByNeed.value = {
          ...productsByNeed.value,
          [needId]: [...(productsByNeed.value[needId] ?? []), result.value],
        }
        return result.value
      }
      setError(result.errors.map((e) => e.message).join(' ') || 'Gagal menyimpan produk.')
      return null
    } catch {
      setError('Gagal menyimpan produk.')
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateNeedProduct(
    id: string,
    needId: string,
    patch: UpdateProductInput,
  ): Promise<SavedProduct | null> {
    if (!userId.value) {
      setError('Login diperlukan untuk menyimpan ke akun.')
      return null
    }

    loading.value = true
    error.value = null

    try {
      const result = await updateProduct(id, userId.value, patch)
      if (result.ok) {
        productsByNeed.value = {
          ...productsByNeed.value,
          [needId]: (productsByNeed.value[needId] ?? []).map((product) =>
            product.id === id ? result.value : product,
          ),
        }
        return result.value
      }
      setError(result.errors.map((e) => e.message).join(' ') || 'Gagal memperbarui produk.')
      return null
    } catch {
      setError('Gagal memperbarui produk.')
      return null
    } finally {
      loading.value = false
    }
  }

  async function removeNeedItem(id: string): Promise<boolean> {
    if (!userId.value) {
      setError('Login diperlukan untuk menyimpan ke akun.')
      return false
    }

    try {
      const result = await removeNeed(id, userId.value)
      if (result.ok) {
        needs.value = needs.value.filter((need) => need.id !== id)
        delete productsByNeed.value[id]
        return true
      }
      setError(result.errors.map((e) => e.message).join(' ') || 'Gagal menghapus kebutuhan.')
      return false
    } catch {
      setError('Gagal menghapus kebutuhan.')
      return false
    }
  }

  async function removeNeedProduct(id: string, needId: string): Promise<boolean> {
    if (!userId.value) {
      setError('Login diperlukan untuk menyimpan ke akun.')
      return false
    }

    try {
      const result = await removeProduct(id, userId.value)
      if (result.ok) {
        productsByNeed.value = {
          ...productsByNeed.value,
          [needId]: (productsByNeed.value[needId] ?? []).filter(
            (product) => product.id !== id,
          ),
        }
        return true
      }
      setError(result.errors.map((e) => e.message).join(' ') || 'Gagal menghapus produk.')
      return false
    } catch {
      setError('Gagal menghapus produk.')
      return false
    }
  }

  async function fetchBudget(): Promise<void> {
    if (!userId.value) {
      budget.value = null
      return
    }

    try {
      const result = await getBudget(userId.value)
      if (result.ok) {
        budget.value = result.value
      } else {
        budget.value = null
      }
    } catch {
      budget.value = null
    }
  }

  async function setMonthlyBudget(monthlyBudget: number): Promise<boolean> {
    if (!userId.value) {
      setError('Login diperlukan untuk menyimpan ke akun.')
      return false
    }

    try {
      const result = await setBudget(userId.value, monthlyBudget)
      if (result.ok) {
        budget.value = result.value
        return true
      }
      setError(result.errors.map((e) => e.message).join(' ') || 'Gagal menyimpan anggaran.')
      return false
    } catch {
      setError('Gagal menyimpan anggaran.')
      return false
    }
  }

  function clearError(): void {
    error.value = null
  }

  return {
    needs,
    productsByNeed,
    budget,
    loading,
    error,
    userId,
    isAuthenticated,
    fetchNeeds,
    fetchProducts,
    productsFor,
    createNeedItem,
    updateNeedItem,
    chooseNeedProduct,
    createNeedProduct,
    updateNeedProduct,
    removeNeedItem,
    removeNeedProduct,
    fetchBudget,
    setMonthlyBudget,
    clearError,
    setError,
  }
})
