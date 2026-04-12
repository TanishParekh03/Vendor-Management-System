"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  ApiRequestError,
  getCurrentUserId,
  getDailyLogAnalytics,
  type DailyLogAnalyticsView,
} from "@/lib/api"
import { cn } from "@/lib/utils"

function getLocalDateValue(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getLocalMonthValue(date = new Date()): string {
  return getLocalDateValue(date).slice(0, 7)
}

function getInsightStyle(type: "good" | "warning" | "neutral"): string {
  if (type === "good") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
  }
  if (type === "warning") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-200"
  }
  return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
}

function formatDateTime(value?: string): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function shortBillId(id?: string | null): string {
  if (!id) return "-"
  return String(id).slice(-6).toUpperCase()
}

export function FinancialAnalysis() {
  const userId = getCurrentUserId()
  const [view, setView] = useState<DailyLogAnalyticsView>("monthly")
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateValue())
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getLocalMonthValue())
  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()))

  const parsedSelectedYear = Number(selectedYear)
  const isYearValid = Number.isInteger(parsedSelectedYear) && parsedSelectedYear >= 2000 && parsedSelectedYear <= 2200

  const analyticsQuery = useQuery({
    queryKey: ["dashboard-financial-analysis", userId, view, selectedDate, selectedMonth, selectedYear],
    enabled: view !== "yearly" || isYearValid,
    queryFn: () =>
      getDailyLogAnalytics(userId, {
        view,
        date: view === "daily" ? selectedDate : undefined,
        month: view === "monthly" ? selectedMonth : undefined,
        year: view === "yearly" && isYearValid ? parsedSelectedYear : undefined,
        limit: view === "yearly" ? 5000 : 2500,
      }),
    staleTime: 30 * 1000,
    gcTime: 6 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const summary = analyticsQuery.data?.summary
  const series = analyticsQuery.data?.series ?? []

  const errorMessage =
    analyticsQuery.error instanceof ApiRequestError
      ? analyticsQuery.error.message
      : analyticsQuery.error instanceof Error
        ? analyticsQuery.error.message
        : "Unable to load dashboard analysis"

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
          <TrendingUp className="h-5 w-5 text-indigo-300" />
          Financial Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[180px_1fr]">
          <Select value={view} onValueChange={(value) => setView(value as DailyLogAnalyticsView)}>
            <SelectTrigger className="bg-secondary">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          {view === "daily" && (
            <Input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="bg-secondary"
            />
          )}
          {view === "monthly" && (
            <Input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="bg-secondary"
            />
          )}
          {view === "yearly" && (
            <div className="space-y-1">
              <Input
                type="number"
                min={2000}
                max={2200}
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="bg-secondary"
              />
              {!isYearValid && (
                <p className="text-xs text-rose-300">Enter a year between 2000 and 2200.</p>
              )}
            </div>
          )}
        </div>

        {analyticsQuery.isLoading && (
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 text-sm text-muted-foreground">
            Loading analysis...
          </div>
        )}

        {analyticsQuery.isError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        {!analyticsQuery.isLoading && !analyticsQuery.isError && summary && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3">
                <p className="text-xs text-cyan-200/90">Received</p>
                <p className="font-mono text-lg font-semibold text-cyan-200">
                  Rs {summary.total_received.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
                <p className="text-xs text-rose-200/90">Paid</p>
                <p className="font-mono text-lg font-semibold text-rose-200">
                  Rs {summary.total_paid.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3">
                <p className="text-xs text-indigo-200/90">Net Balance</p>
                <p
                  className={cn(
                    "font-mono text-lg font-semibold",
                    summary.net_balance >= 0 ? "text-emerald-300" : "text-rose-300"
                  )}
                >
                  Rs {summary.net_balance.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-xs text-amber-200/90">Transactions</p>
                <p className="font-mono text-lg font-semibold text-amber-200">
                  {summary.transaction_count.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="h-72 w-full rounded-lg border border-border/50 bg-secondary/20 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 10, right: 14, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                  <XAxis
                    dataKey="bucket_label"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    axisLine={{ stroke: "rgba(148,163,184,0.35)" }}
                    tickLine={{ stroke: "rgba(148,163,184,0.35)" }}
                  />
                  <YAxis
                    yAxisId="amount"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    axisLine={{ stroke: "rgba(148,163,184,0.35)" }}
                    tickLine={{ stroke: "rgba(148,163,184,0.35)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid rgba(148,163,184,0.35)",
                      borderRadius: "10px",
                    }}
                    formatter={(value, name) => {
                      if (name === "transactions") {
                        return [Number(value).toLocaleString("en-IN"), "Transactions"]
                      }
                      return [`Rs ${Number(value).toLocaleString("en-IN")}`, name]
                    }}
                  />
                  <Bar yAxisId="amount" dataKey="paid" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="amount" dataKey="received" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  <Line yAxisId="amount" dataKey="net" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-2">
              {analyticsQuery.data?.insights.map((insight, index) => (
                <div
                  key={`${insight.title}-${index}`}
                  className={cn("rounded-lg border px-3 py-2 text-sm", getInsightStyle(insight.type))}
                >
                  <p className="font-semibold">{insight.title}</p>
                  <p className="text-xs opacity-90">{insight.detail}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
              <p className="mb-2 text-sm font-semibold text-card-foreground">Daily Log Transactions</p>
              <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {(analyticsQuery.data?.logs ?? []).slice(0, 40).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/40 bg-secondary/30 px-2 py-1.5 text-xs"
                  >
                    <span className="text-muted-foreground">
                      {formatDateTime(entry.log_date)}
                      {entry.vendor_name ? ` • ${entry.vendor_name}` : ""}
                      {entry.bill_id ? ` • Bill #${shortBillId(entry.bill_id)}` : ""}
                      {entry.payment_mode ? ` • ${String(entry.payment_mode).toUpperCase()}` : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={cn(
                          "border",
                          entry.log_type === "received"
                            ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                            : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                        )}
                      >
                        {entry.log_type}
                      </Badge>
                      <span
                        className={cn(
                          "font-mono",
                          entry.log_type === "received" ? "text-cyan-300" : "text-rose-300"
                        )}
                      >
                        Rs {Number(entry.amount).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                ))}

                {(analyticsQuery.data?.logs?.length ?? 0) === 0 && (
                  <p className="text-xs text-muted-foreground">No transactions found for selected period.</p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
