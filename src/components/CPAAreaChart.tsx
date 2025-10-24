import React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export interface CPAData {
  date: string
  dailyCPA: number
  rolling7DayAvg: number
  spend: number
  conversions: number
}

interface CPAAreaChartProps {
  data: CPAData[]
  title?: string
  description?: string
}

const chartConfig = {
  dailyCPA: {
    label: "Daily CPA",
    color: "hsl(var(--chart-1))",
  },
  rolling7DayAvg: {
    label: "7-Day Rolling Average",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function CPAAreaChart({ 
  data, 
  title = "Cost Per Acquisition Analysis",
  description = "Daily CPA vs 7-day rolling average" 
}: CPAAreaChartProps) {
  // Calculate percentage change from previous period
  const latestCPA = data[data.length - 1]?.dailyCPA || 0
  const previousCPA = data[data.length - 2]?.dailyCPA || 0
  const cpaChange = previousCPA ? ((latestCPA - previousCPA) / previousCPA * 100) : 0
  
  const latestAvg = data[data.length - 1]?.rolling7DayAvg || 0
  const previousAvg = data[data.length - 8]?.rolling7DayAvg || 0
  const avgChange = previousAvg ? ((latestAvg - previousAvg) / previousAvg * 100) : 0

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex">
          <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6">
            <span className="text-xs text-muted-foreground">
              Latest Daily CPA
            </span>
            <span className="text-lg font-bold leading-none sm:text-3xl">
              {formatCurrency(latestCPA)}
            </span>
            <span className={`text-xs ${cpaChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {cpaChange >= 0 ? '+' : ''}{cpaChange.toFixed(1)}% from yesterday
            </span>
          </div>
          <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6">
            <span className="text-xs text-muted-foreground">
              7-Day Average
            </span>
            <span className="text-lg font-bold leading-none sm:text-3xl">
              {formatCurrency(latestAvg)}
            </span>
            <span className={`text-xs ${avgChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(1)}% from last week
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[280px] w-full"
        >
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
              top: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={formatDate}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }}
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    chartConfig[name as keyof typeof chartConfig]?.label || name,
                  ]}
                />
              }
            />
            <defs>
              <linearGradient id="fillDailyCPA" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-dailyCPA)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-dailyCPA)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillRolling7DayAvg" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-rolling7DayAvg)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-rolling7DayAvg)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="rolling7DayAvg"
              type="natural"
              fill="url(#fillRolling7DayAvg)"
              fillOpacity={0.4}
              stroke="var(--color-rolling7DayAvg)"
              strokeWidth={2}
              stackId="a"
            />
            <Area
              dataKey="dailyCPA"
              type="natural"
              fill="url(#fillDailyCPA)"
              fillOpacity={0.4}
              stroke="var(--color-dailyCPA)"
              strokeWidth={2}
              stackId="b"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default CPAAreaChart