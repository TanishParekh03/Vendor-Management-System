"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ApiRequestError,
  getCommodities,
  linkCommodityToVendor,
  type BackendCommodity,
} from "@/lib/api"

type VendorCommodityManagerProps = {
  userId: string
  vendorId: number
  linkedCommodityNames: string[]
  onLinked: () => Promise<void>
}

export function VendorCommodityManager({
  userId,
  vendorId,
  linkedCommodityNames,
  onLinked,
}: VendorCommodityManagerProps) {
  const [allCommodities, setAllCommodities] = useState<BackendCommodity[]>([])
  const [selectedCommodityId, setSelectedCommodityId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    async function loadCommodities() {
      setLoading(true)
      setError(null)

      try {
        const items = await getCommodities(userId)
        if (!ignore) {
          setAllCommodities(items)
        }
      } catch (loadError) {
        if (ignore) return
        const message =
          loadError instanceof ApiRequestError
            ? loadError.message
            : "Failed to load commodities"
        setError(message)
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void loadCommodities()

    return () => {
      ignore = true
    }
  }, [userId])

  const availableCommodities = useMemo(() => {
    const linkedSet = new Set(linkedCommodityNames.map((name) => name.toLowerCase()))
    return allCommodities.filter((commodity) => !linkedSet.has(commodity.name.toLowerCase()))
  }, [allCommodities, linkedCommodityNames])

  const handleAddCommodity = async () => {
    if (!selectedCommodityId) {
      setError("Select a commodity first")
      return
    }

    try {
      setSaving(true)
      setError(null)
      await linkCommodityToVendor(userId, vendorId, Number(selectedCommodityId))
      setSelectedCommodityId("")
      await onLinked()
    } catch (saveError) {
      const message =
        saveError instanceof ApiRequestError
          ? saveError.message
          : "Failed to link commodity"
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border/50 bg-secondary/20 p-3">
      <p className="text-sm font-medium text-card-foreground">Add Provided Commodity</p>

      <div className="flex gap-2">
        <Select value={selectedCommodityId} onValueChange={setSelectedCommodityId}>
          <SelectTrigger className="bg-secondary">
            <SelectValue
              placeholder={loading ? "Loading commodities..." : "Select commodity"}
            />
          </SelectTrigger>
          <SelectContent>
            {availableCommodities.map((commodity) => (
              <SelectItem key={commodity.id} value={String(commodity.id)}>
                {commodity.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          onClick={handleAddCommodity}
          disabled={loading || saving || availableCommodities.length === 0}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {saving ? "Adding..." : "Add"}
        </Button>
      </div>

      {!loading && availableCommodities.length === 0 && (
        <p className="text-xs text-muted-foreground">All commodities are already linked.</p>
      )}

      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  )
}
