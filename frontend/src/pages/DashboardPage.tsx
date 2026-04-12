import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { KPICards } from "@/components/dashboard/kpi-cards"
import { DebtDistributionChart } from "@/components/dashboard/debt-distribution-chart"
import { FinancialAnalysis } from "@/components/dashboard/financial-analysis"
import { SmartRecommendations } from "@/components/dashboard/smart-recommendations"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useDashboardData } from "@/components/dashboard/dashboard-data"

export default function DashboardPage() {
  const { data, loading, error, hasData } = useDashboardData()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <div className="text-muted-foreground">
            Welcome back! Here&apos;s your supply chain overview.
          </div>
        </div>

        <KPICards metrics={data.metrics} loading={loading} />

        <FinancialAnalysis />

        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            AI-Powered Recommendations
          </h2>
          <SmartRecommendations
            buyRecommendation={data.smartBuyRecommendation}
            payRecommendation={data.smartPayRecommendation}
            loading={loading}
          />
        </div>

        {error && (
          <Alert>
            <AlertTitle>Dashboard data issue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          <DebtDistributionChart data={data.debtDistribution} loading={loading} />
        </div>

        {!loading && !hasData && !error && (
          <Alert>
            <AlertTitle>No dashboard data yet</AlertTitle>
            <AlertDescription>
              Add vendors, bills, payments, and commodities to unlock analytics and recommendations.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  )
}
