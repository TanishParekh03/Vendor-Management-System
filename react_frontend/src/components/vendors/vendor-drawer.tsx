"use client"

import { useEffect, useState } from "react"
import { Phone, Truck, Wallet } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { ApiRequestError, type BackendBill, type BackendPaymentLog } from "@/lib/api"
import { VendorCommodityManager } from "./vendor-commodity-manager"

type UiVendor = {
  id: number
  name: string
  contact: string
  commodities: string[]
  outstandingBalance: number
  toleranceLevel: "LOW" | "MEDIUM" | "HIGH"
  bills: BackendBill[]
  payments: BackendPaymentLog[]
}

interface VendorDrawerProps {
  vendor: UiVendor | null
  userId: string
  open: boolean
  onClose: () => void
  onUpdateVendor: (vendorId: number, payload: { name: string; phone_number: string }) => Promise<void>
  onCommodityLinked: () => Promise<void>
}

function asNumber(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDate(input?: string): string {
  if (!input) return "-"

  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function VendorDrawer({
  vendor,
  userId,
  open,
  onClose,
  onUpdateVendor,
  onCommodityLinked,
}: VendorDrawerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!vendor) return
    setName(vendor.name)
    setPhone(vendor.contact)
    setSaveError(null)
    setIsEditing(false)
  }, [vendor])

  if (!vendor) return null

  const handleSave = async () => {
    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()
    if (!trimmedName || !trimmedPhone) {
      setSaveError("Name and phone number are required")
      return
    }

    try {
      setSaving(true)
      setSaveError(null)
      await onUpdateVendor(vendor.id, {
        name: trimmedName,
        phone_number: trimmedPhone,
      })
      setIsEditing(false)
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : "Failed to update vendor"
      setSaveError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full border-border/50 bg-card sm:max-w-lg">
        <SheetHeader className="space-y-4">
          <SheetTitle className="text-left text-xl font-bold text-card-foreground">
            {vendor.name}
          </SheetTitle>
          <div className="space-y-2">
            {isEditing ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-vendor-name">Vendor Name</Label>
                  <Input
                    id="edit-vendor-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="bg-secondary"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-vendor-phone">Phone Number</Label>
                  <Input
                    id="edit-vendor-phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="bg-secondary"
                  />
                </div>
                {saveError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
                    {saveError}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setName(vendor.name)
                      setPhone(vendor.contact)
                      setSaveError(null)
                      setIsEditing(false)
                    }}
                    className="border-border/50 bg-secondary"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{vendor.contact}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setName(vendor.name)
                    setPhone(vendor.contact)
                    setSaveError(null)
                    setIsEditing(true)
                  }}
                  className="border-border/50 bg-secondary"
                >
                  Edit Vendor
                </Button>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {vendor.commodities.map((commodity) => (
              <Badge key={commodity} variant="secondary" className="bg-secondary text-secondary-foreground">
                {commodity}
              </Badge>
            ))}
            <Badge
              variant="outline"
              className={cn(
                vendor.toleranceLevel === "LOW" &&
                  "border-red-500/30 bg-red-500/10 text-red-400",
                vendor.toleranceLevel === "MEDIUM" &&
                  "border-amber-500/30 bg-amber-500/10 text-amber-400",
                vendor.toleranceLevel === "HIGH" &&
                  "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              )}
            >
              Tolerance: {vendor.toleranceLevel}
            </Badge>
          </div>
          <VendorCommodityManager
            userId={userId}
            vendorId={vendor.id}
            linkedCommodityNames={vendor.commodities}
            onLinked={onCommodityLinked}
          />
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-4">
            <p className="text-sm text-muted-foreground">Outstanding Balance</p>
            <p className="font-mono text-2xl font-bold text-card-foreground">
              ₹{vendor.outstandingBalance.toLocaleString("en-IN")}
            </p>
          </div>
        </SheetHeader>

        <Tabs defaultValue="ledger" className="mt-6">
          <TabsList className="grid w-full grid-cols-2 bg-secondary">
            <TabsTrigger value="ledger" className="data-[state=active]:bg-background">Bills</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-background">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="ledger" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {vendor.bills.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="relative flex items-start gap-3 pb-3"
                  >
                    {/* Timeline line */}
                    {index < vendor.bills.length - 1 && (
                      <div className="absolute left-4 top-9 h-full w-0.5 bg-border/50" />
                    )}

                    {/* Icon */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                      <Truck className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-card-foreground">
                          Bill #{entry.id}
                        </p>
                        <p className="font-mono text-sm font-semibold text-emerald-400">
                          ₹{asNumber(entry.total_amount).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(entry.date)}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          Pending: ₹
                          {Math.max(
                            asNumber(entry.total_amount) - asNumber(entry.paid_amount),
                            0
                          ).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {vendor.bills.length === 0 && (
                  <p className="text-sm text-muted-foreground">No bills found for this vendor.</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {vendor.payments.map((payment, index) => (
                  <div key={payment.id} className="relative flex items-start gap-3 pb-3">
                    {index < vendor.payments.length - 1 && (
                      <div className="absolute left-4 top-9 h-full w-0.5 bg-border/50" />
                    )}

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                      <Wallet className="h-4 w-4" />
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-card-foreground">
                          {payment.payment_mode.toUpperCase()} payment
                        </p>
                        <p className="font-mono text-sm font-semibold text-red-400">
                          -₹{asNumber(payment.amount_paid).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.payment_date)}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          Bill #{payment.bill_id}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {vendor.payments.length === 0 && (
                  <p className="text-sm text-muted-foreground">No payments found for this vendor.</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
