import { AlertTriangle } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { StockCards } from "@/components/stock/stock-cards"

export default function StockPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Stock & Commodities
          </h1>
          <div className="text-muted-foreground">
            Monitor inventory levels and reorder when needed.
          </div>
        </div>

        <StockCards />
      </div>
    </DashboardLayout>
  )
}
