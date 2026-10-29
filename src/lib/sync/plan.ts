export interface VersionedRecord {
  id: string
  updatedAt: string
}

export interface SyncPlan<T extends VersionedRecord> {
  /** Records whose version should be written to the destination. */
  toApply: T[]
  /**
   * Same-id records whose `updatedAt` differs. They are never applied until
   * the user confirms that the newest version may be used.
   */
  conflicts: T[]
  /** Records whose versions are already identical. */
  upToDate: number
}

type VersionComparison =
  | 'local-newer'
  | 'remote-newer'
  | 'same'
  | 'unknown'

function compareVersions(
  local: VersionedRecord,
  remote: VersionedRecord,
): VersionComparison {
  const localTime = Date.parse(local.updatedAt)
  const remoteTime = Date.parse(remote.updatedAt)

  if (!Number.isFinite(localTime) || !Number.isFinite(remoteTime)) {
    return 'unknown'
  }
  if (localTime > remoteTime) return 'local-newer'
  if (remoteTime > localTime) return 'remote-newer'
  return 'same'
}

/**
 * Plans an upload to the account. Remote-only records are ignored. A same-id
 * record with a different timestamp is a conflict that needs confirmation;
 * after confirmation the newest version is written (local only if newer).
 */
export function planUpload<T extends VersionedRecord>(
  local: readonly T[],
  remote: readonly T[],
): SyncPlan<T> {
  const remoteById = new Map(remote.map((item) => [item.id, item]))
  const plan: SyncPlan<T> = { toApply: [], conflicts: [], upToDate: 0 }

  local.forEach((localRecord) => {
    const remoteRecord = remoteById.get(localRecord.id)
    if (!remoteRecord) {
      plan.toApply.push(localRecord)
      return
    }

    const comparison = compareVersions(localRecord, remoteRecord)
    if (comparison === 'same') {
      plan.upToDate += 1
      return
    }

    plan.conflicts.push(localRecord)
    if (comparison === 'local-newer') {
      plan.toApply.push(localRecord)
    }
  })

  return plan
}

/**
 * Plans a restore from the account. Local-only records are preserved. A
 * same-id record with a different timestamp is a conflict that needs
 * confirmation; after confirmation the newest version is written (remote only
 * if newer).
 */
export function planRestore<T extends VersionedRecord>(
  local: readonly T[],
  remote: readonly T[],
): SyncPlan<T> {
  const localById = new Map(local.map((item) => [item.id, item]))
  const plan: SyncPlan<T> = { toApply: [], conflicts: [], upToDate: 0 }

  remote.forEach((remoteRecord) => {
    const localRecord = localById.get(remoteRecord.id)
    if (!localRecord) {
      plan.toApply.push(remoteRecord)
      return
    }

    const comparison = compareVersions(localRecord, remoteRecord)
    if (comparison === 'same') {
      plan.upToDate += 1
      return
    }

    plan.conflicts.push(remoteRecord)
    if (comparison === 'remote-newer') {
      plan.toApply.push(remoteRecord)
    }
  })

  return plan
}
