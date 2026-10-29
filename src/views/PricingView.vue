<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from '@/components/StatusBadge.vue'
import {
  FEATURE_LABELS,
  LICENSE_TERMS,
  PLAN_COMMON_FEATURES,
  PLAN_ORDER,
  PLANS,
  type Plan,
  type PlanConfig,
} from '@/config/plans'
import { formatRupiah } from '@/lib/calc/currency-format'
import { simulationLimitLabel } from '@/lib/plans/access'
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  normalizeWhatsAppNumber,
} from '@/lib/plans/whatsapp'
import { useAnalyticsStore } from '@/stores/analytics'
import { useAuthStore } from '@/stores/auth'
import { useEntitlementStore } from '@/stores/entitlements'

const authStore = useAuthStore()
const entitlementStore = useEntitlementStore()
const analyticsStore = useAnalyticsStore()

const plans = PLAN_ORDER.map((plan) => PLANS[plan])
const waNumber = normalizeWhatsAppNumber(import.meta.env.VITE_WA_NUMBER)
const waConfigured = waNumber !== null

const currentPlanLabel = computed(() =>
  entitlementStore.loading ? 'Memuat paket...' : entitlementStore.planLabel,
)

const planTone = computed(() =>
  entitlementStore.isPremium ? ('success' as const) : ('neutral' as const),
)

function planPrice(plan: PlanConfig): string {
  return plan.price === 0 ? 'Rp0' : formatRupiah(plan.price)
}

function planFeatures(plan: PlanConfig): string[] {
  const premium = plan.features
    .filter((feature) => feature !== 'unlimited-simulations')
    .map((feature) => FEATURE_LABELS[feature])

  return [
    ...PLAN_COMMON_FEATURES,
    simulationLimitLabel(plan.id),
    ...premium,
  ]
}

function whatsAppUrl(plan: Plan): string | null {
  return buildWhatsAppUrl(
    waNumber,
    buildWhatsAppMessage(plan, authStore.username ?? ''),
  )
}

function trackUpgrade(): void {
  // Analytics intentionally carries no financial or account data beyond the
  // authenticated user id and the event name.
  void analyticsStore.track('upgrade_click', null)
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <div class="flex flex-wrap items-center gap-2">
        <p class="text-sm font-medium text-primary-700">Paket &amp; Upgrade</p>
        <span data-testid="paket-efektif">
          <StatusBadge
            :label="`Paket efektif: ${currentPlanLabel}`"
            :tone="planTone"
          />
        </span>
      </div>
      <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        Rencana paket HematPintar
      </h1>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
        Free membuka seluruh modul dengan batas simulasi. Plus dan Bisnis
        menambah batas serta fitur lanjutan. Harga di bawah adalah hipotesis
        dan pembelian dilakukan manual, bukan lewat payment gateway.
      </p>
      <p
        v-if="!waConfigured"
        class="mt-3 rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm leading-relaxed text-warning-700"
        role="status"
      >
        Nomor WhatsApp belum dikonfigurasi. Isi <code>VITE_WA_NUMBER</code> pada
        environment build agar tombol pembelian manual dapat dipakai.
      </p>
    </header>

    <div class="grid gap-4 md:grid-cols-3">
      <section
        v-for="plan in plans"
        :key="plan.id"
        class="card flex h-full flex-col p-5"
        :aria-labelledby="`paket-${plan.id}`"
        :data-testid="`paket-${plan.id}`"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <h2 :id="`paket-${plan.id}`" class="text-base font-semibold text-slate-900">
              {{ plan.name }}
            </h2>
            <p class="mt-1 text-xs text-slate-500">{{ plan.tagline }}</p>
          </div>
          <StatusBadge
            v-if="!entitlementStore.loading && entitlementStore.plan === plan.id"
            label="Aktif"
            tone="success"
          />
        </div>

        <p class="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
          {{ planPrice(plan) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">
          {{ plan.price === 0 ? 'Tanpa biaya' : 'Sekali bayar, sesuai batas lisensi' }}
        </p>

        <ul class="mt-4 flex-1 space-y-2">
          <li
            v-for="feature in planFeatures(plan)"
            :key="feature"
            class="flex gap-2 text-sm text-slate-600"
          >
            <svg
              class="mt-0.5 h-4 w-4 shrink-0 text-success-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7" />
            </svg>
            <span>{{ feature }}</span>
          </li>
        </ul>

        <div v-if="plan.price === 0" class="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          Paket dasar. Tidak perlu akun untuk memakai kalkulator.
        </div>
        <div v-else class="mt-5">
          <button
            v-if="!waConfigured"
            type="button"
            class="btn btn-secondary w-full"
            disabled
          >
            WhatsApp belum diatur
          </button>
          <RouterLink
            v-else-if="!authStore.isAuthenticated"
            to="/login"
            class="btn btn-primary w-full"
          >
            Masuk untuk memesan {{ plan.name }}
          </RouterLink>
          <a
            v-else
            :href="whatsAppUrl(plan.id) ?? undefined"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-primary w-full"
            @click="trackUpgrade"
          >
            Pesan {{ plan.name }} via WhatsApp
          </a>
          <p class="mt-2 text-xs leading-relaxed text-slate-500">
            Pesan otomatis berisi username akun dan paket yang dipilih.
            Aktivasi dilakukan manual setelah pembayaran diverifikasi.
          </p>
        </div>
      </section>
    </div>

    <section class="card p-5" aria-labelledby="judul-pembelian">
      <h2 id="judul-pembelian" class="text-base font-semibold text-slate-900">
        Cara membeli dan aktivasi
      </h2>
      <ol class="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
        <li>Masuk dengan username agar pesan berisi username akun yang benar.</li>
        <li>
          Pilih paket lalu tekan tombol WhatsApp. Pesan berisi username akun dan
          paket yang dipilih; Anda masih dapat mengubahnya sebelum mengirim.
        </li>
        <li>
          Penjual memverifikasi pembayaran manual dan memperbarui tabel
          <code>entitlements</code> untuk akun Anda.
        </li>
        <li>
          Buka halaman ini lagi atau masuk ulang untuk membaca paket efektif
          terbaru dari akun.
        </li>
      </ol>
      <p class="mt-3 text-sm leading-relaxed text-slate-600">
        Aplikasi tidak memproses pembayaran dan tidak pernah menampilkan status
        “pembayaran berhasil” secara otomatis. Satu-satunya sumber status paket
        adalah tabel <code>entitlements</code> di akun.
      </p>
    </section>

    <section class="card p-5" aria-labelledby="judul-lisensi">
      <h2 id="judul-lisensi" class="text-base font-semibold text-slate-900">
        Batas lisensi
      </h2>
      <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
        <li v-for="term in LICENSE_TERMS" :key="term">{{ term }}</li>
      </ul>
    </section>

    <section
      class="rounded-card border border-warning-200 bg-warning-50 p-5"
      aria-labelledby="judul-harga-catatan"
    >
      <h2 id="judul-harga-catatan" class="text-base font-semibold text-warning-700">
        Catatan harga
      </h2>
      <p class="mt-2 text-sm leading-relaxed text-warning-700">
        Harga dapat berubah sebelum pembelian. Tidak ada data pembayaran yang
        disimpan di aplikasi. Data simulasi tetap tersimpan di perangkat dan
        tidak otomatis diunggah ke akun.
      </p>
    </section>
  </div>
</template>
