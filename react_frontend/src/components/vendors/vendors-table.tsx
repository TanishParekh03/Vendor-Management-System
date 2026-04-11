"use client"

import { useCallback, useEffect, useState } from "react"
import { Eye, Wallet, Truck, Search, Filter } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  addVendor,
  ApiRequestError,
  type BackendBill,
  type BackendPaymentLog,
  getCurrentUserId,
  getVendorBills,
  getVendorCommodities,
  getVendorPaymentLogs,
  getVendors,
  updateVendor,
} from "@/lib/api"
import { VendorDrawer } from "./vendor-drawer"

type ToleranceLevel = "LOW" | "MEDIUM" | "HIGH"
type Flexibility = "STRICT" | "MODERATE" | "FLEXIBLE"

type UiVendor = {
  id: number
  name: string
  contact: string
  commodities: string[]
  outstandingBalance: number
  toleranceLevel: ToleranceLevel
  flexibility: Flexibility
  lastSupplyDate: string | null
  lastPaymentDate: string | null
  bills: BackendBill[]
  payments: BackendPaymentLog[]
}

function asNumber(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function getToleranceLevel(outstandingBalance: number): ToleranceLevel {
  if (outstandingBalance < 5000) return "HIGH"
  if (outstandingBalance <= 15000) return "MEDIUM"
  return "LOW"
}

function getFlexibility(outstandingBalance: number): Flexibility {
  if (outstandingBalance < 5000) return "FLEXIBLE"
  if (outstandingBalance <= 15000) return "MODERATE"
  return "STRICT"
}

function formatShortDate(input: string | null): string {
  if (!input) return "-"

  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })
}

function getBalanceColor(balance: number) {
  if (balance < 5000) return "text-emerald-400"
  if (balance <= 15000) return "text-amber-400"
  return "text-red-400"
}

export function VendorsTable() {
  const userId = getCurrentUserId()
  const [search, setSearch] = useState("")
  const [commodityFilter, setCommodityFilter] = useState<string>("all")
  const [toleranceFilter, setToleranceFilter] = useState<string>("all")
  const [vendors, setVendors] = useState<UiVendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVendor, setSelectedVendor] = useState<UiVendor | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addName, setAddName] = useState("")
  const [addPhone, setAddPhone] = useState("")
  const [addError, setAddError] = useState<string | null>(null)
  const [submittingAdd, setSubmittingAdd] = useState(false)

  const loadVendors = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const rawVendors = await getVendors(userId)
      const hydrated = await Promise.all(
        rawVendors.map(async (vendor) => {
          const [linkedCommodities, bills, payments] = await Promise.all([
            getVendorCommodities(userId, vendor.id),
            getVendorBills(userId, vendor.id),
            getVendorPaymentLogs(userId, vendor.id),
          ])

          const outstandingBalance = bills.reduce((sum, bill) => {
            const pending = asNumber(bill.total_amount) - asNumber(bill.paid_amount)
            return sum + (pending > 0 ? pending : 0)
          }, 0)

          return {
            id: vendor.id,
            name: vendor.name,
            contact: vendor.phone_number,
            commodities: linkedCommodities.map((commodity) => commodity.name),
            outstandingBalance,
            toleranceLevel: getToleranceLevel(outstandingBalance),
            flexibility: getFlexibility(outstandingBalance),
            lastSupplyDate: bills[0]?.date ?? null,
            lastPaymentDate: payments[0]?.payment_date ?? null,
            bills,
            payments,
          } as UiVendor
        })
      )

      setVendors(hydrated)

      if (selectedVendor) {
        const updatedSelected = hydrated.find((item) => item.id === selectedVendor.id) ?? null
        setSelectedVendor(updatedSelected)
      }
    } catch (loadError) {
      const message =
        loadError instanceof ApiRequestError
          ? loadError.message
          : "Failed to load vendors"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [userId, selectedVendor])

  useEffect(() => {
    let ignore = false

    void loadVendors().catch(() => {
      if (!ignore) {
        setError("Failed to load vendors")
        setLoading(false)
      }
    })

    return () => {
      ignore = true
    }
  }, [loadVendors])

  const allCommodities = [...new Set(vendors.flatMap((v) => v.commodities))]

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(search.toLowerCase()) ||
      vendor.commodities.some((c) =>
        c.toLowerCase().includes(search.toLowerCase())
      )
    const matchesCommodity =
      commodityFilter === "all" ||
      vendor.commodities.includes(commodityFilter)
    const matchesTolerance =
      toleranceFilter === "all" || vendor.toleranceLevel === toleranceFilter

    return matchesSearch && matchesCommodity && matchesTolerance
  })

  const handleViewVendor = (vendor: UiVendor) => {
    setSelectedVendor(vendor)
    setDrawerOpen(true)
  }

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)

    const name = addName.trim()
    const phone = addPhone.trim()
    if (!name || !phone) {
      setAddError("Name and phone number are required")
      return
    }

    try {
      setSubmittingAdd(true)
      await addVendor(userId, { name, phone_number: phone })
      setAddDialogOpen(false)
      setAddName("")
      setAddPhone("")
      await loadVendors()
    } catch (submitError) {
      const message =
        submitError instanceof ApiRequestError
          ? submitError.message
          : "Failed to add vendor"
      setAddError(message)
    } finally {
      setSubmittingAdd(false)
    }
  }

  const handleUpdateVendor = async (vendorId: number, payload: { name: string; phone_number: string }) => {
    await updateVendor(userId, vendorId, payload)
    await loadVendors()
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-border/50 bg-card p-6 text-sm text-muted-foreground">
        Loading vendors...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
        {error}
      </div>
    )
  }

  return (
    <>
      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vendors or commodities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-secondary pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => {
              setAddError(null)
              setAddDialogOpen(true)
            }}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Add Vendor
          </Button>
          <Select value={commodityFilter} onValueChange={setCommodityFilter}>
            <SelectTrigger className="w-[150px] bg-secondary">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Commodity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Commodities</SelectItem>
              {allCommodities.map((commodity) => (
                <SelectItem key={commodity} value={commodity}>
                  {commodity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={toleranceFilter} onValueChange={setToleranceFilter}>
            <SelectTrigger className="w-[150px] bg-secondary">
              <SelectValue placeholder="Tolerance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/50 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-muted-foreground">Vendor Name</TableHead>
              <TableHead className="text-muted-foreground">Commodities</TableHead>
              <TableHead className="text-right text-muted-foreground">Outstanding</TableHead>
              <TableHead className="text-muted-foreground">Tolerance</TableHead>
              <TableHead className="text-muted-foreground">Flexibility</TableHead>
              <TableHead className="text-muted-foreground">Last Supply</TableHead>
              <TableHead className="text-muted-foreground">Last Payment</TableHead>
              <TableHead className="text-right text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.map((vendor) => (
              <TableRow
                key={vendor.id}
                className="cursor-pointer border-border/50 transition-colors hover:bg-secondary/50"
                onClick={() => handleViewVendor(vendor)}
              >
                <TableCell className="font-medium text-card-foreground">
                  {vendor.name}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {vendor.commodities.map((commodity) => (
                      <Badge
                        key={commodity}
                        variant="secondary"
                        className="bg-secondary/80 text-xs"
                      >
                        {commodity}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono font-semibold",
                    getBalanceColor(vendor.outstandingBalance)
                  )}
                >
                  ₹{vendor.outstandingBalance.toLocaleString("en-IN")}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      vendor.toleranceLevel === "LOW" &&
                        "border-red-500/30 bg-red-500/10 text-red-400",
                      vendor.toleranceLevel === "MEDIUM" &&
                        "border-amber-500/30 bg-amber-500/10 text-amber-400",
                      vendor.toleranceLevel === "HIGH" &&
                        "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    )}
                  >
                    {vendor.toleranceLevel}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      vendor.flexibility === "STRICT" &&
                        "border-red-500/30 bg-red-500/10 text-red-400",
                      vendor.flexibility === "MODERATE" &&
                        "border-amber-500/30 bg-amber-500/10 text-amber-400",
                      vendor.flexibility === "FLEXIBLE" &&
                        "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    )}
                  >
                    {vendor.flexibility}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatShortDate(vendor.lastSupplyDate)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatShortDate(vendor.lastPaymentDate)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewVendor(vendor)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Wallet className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-500 hover:bg-blue-500/10 hover:text-blue-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Truck className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Vendor Drawer */}
      <VendorDrawer
        vendor={selectedVendor}
        userId={userId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUpdateVendor={handleUpdateVendor}
        onCommodityLinked={loadVendors}
      />

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="border-border/50 bg-card sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-card-foreground">
              Add New Vendor
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddVendor} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vendor-name">Vendor Name</Label>
              <Input
                id="vendor-name"
                value={addName}
                onChange={(event) => setAddName(event.target.value)}
                placeholder="Enter vendor name"
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor-phone">Phone Number</Label>
              <Input
                id="vendor-phone"
                value={addPhone}
                onChange={(event) => setAddPhone(event.target.value)}
                placeholder="Enter phone number"
                className="bg-secondary"
              />
            </div>
            {addError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {addError}
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                className="border-border/50 bg-secondary"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingAdd}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {submittingAdd ? "Saving..." : "Save Vendor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
