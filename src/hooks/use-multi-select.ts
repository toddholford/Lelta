import * as React from 'react'

/**
 * Press-and-hold multi-select state over a list of string ids. Callers should
 * pass a memoized `allIds` so `selectedIds` and `toggleAll` stay stable. The
 * selection is intersected with `allIds`, so rows dropped by a background
 * refetch quietly fall out of the count.
 */
export function useMultiSelect(allIds: string[]) {
  const [active, setActive] = React.useState(false)
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set())

  const selectedIds = React.useMemo(
    () => allIds.filter((id) => selected.has(id)),
    [allIds, selected],
  )
  const allSelected = allIds.length > 0 && selectedIds.length === allIds.length

  const enter = React.useCallback((id: string) => {
    setActive(true)
    setSelected(new Set([id]))
  }, [])

  const toggle = React.useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const exit = React.useCallback(() => {
    setActive(false)
    setSelected(new Set())
  }, [])

  const toggleAll = React.useCallback(() => {
    setSelected((prev) => {
      const isAll = allIds.length > 0 && allIds.every((id) => prev.has(id))
      return isAll ? new Set() : new Set(allIds)
    })
  }, [allIds])

  const isSelected = React.useCallback((id: string) => selected.has(id), [selected])

  return { active, selectedIds, allSelected, isSelected, enter, toggle, exit, toggleAll }
}
