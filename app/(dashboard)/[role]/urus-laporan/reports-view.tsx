"use client"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { BarChart, PieChart } from "@mui/x-charts"
import { Bento, BentoItem, MetricTile } from "@/components/kiz/patterns/bento"
import { Surface } from "@/components/kiz/primitives/list-group"
import { color } from "@/lib/theme"
import type { ReportsData } from "@/lib/reports"

function titleCase(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Surface padded>
      <Typography sx={{ fontWeight: 650 }}>{title}</Typography>
      {subtitle ? (
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
          {subtitle}
        </Typography>
      ) : null}
      <Box sx={{ mt: 1 }}>{children}</Box>
    </Surface>
  )
}

export function ReportsView({ data }: { data: ReportsData }) {
  const { totals } = data

  const statusColors = [color.brand[600], color.info.main, color.warning.main, color.accent[600], color.success.main, color.neutral.main]

  return (
    <Box>
      <Bento sx={{ mb: 2.5 }}>
        <BentoItem span={3}>
          <MetricTile label="Active residents" value={totals.activeResidents} icon="groups" />
        </BentoItem>
        <BentoItem span={3}>
          <MetricTile
            label="Occupancy"
            value={`${totals.occupancyPct}%`}
            icon="bedroom_parent"
          />
        </BentoItem>
        <BentoItem span={3}>
          <MetricTile
            label="Open tickets"
            value={totals.openTickets}
            icon="support_agent"
            emphasis={totals.openTickets > 0}
          />
        </BentoItem>
        <BentoItem span={3}>
          <MetricTile
            label="Pending bookings"
            value={totals.pendingBookings}
            icon="task_alt"
            emphasis={totals.pendingBookings > 0}
          />
        </BentoItem>
        <BentoItem span={6}>
          <MetricTile
            label="Beds occupied / total"
            value={`${totals.occupiedBeds} / ${totals.totalBeds}`}
            icon="meeting_room"
          />
        </BentoItem>
        <BentoItem span={6}>
          <MetricTile label="Check-ins this week" value={totals.checkInsThisWeek} icon="how_to_reg" />
        </BentoItem>
      </Bento>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5, mb: 2.5 }}>
        <ChartCard title="Bookings per week" subtitle="Facility + guest house, last 8 weeks">
          <BarChart
            height={280}
            xAxis={[{ scaleType: "band", data: data.bookingsByWeek.map((b) => b.label) }]}
            series={[
              { data: data.bookingsByWeek.map((b) => b.facility), label: "Facility", color: color.brand[600] },
              { data: data.bookingsByWeek.map((b) => b.guestHouse), label: "Guest house", color: color.accent[600] },
            ]}
            margin={{ left: 40, right: 10, top: 20, bottom: 30 }}
            sx={{ "& .MuiChartsLegend-root": { fontSize: 12 } }}
          />
        </ChartCard>

        <ChartCard title="Helpdesk tickets by status" subtitle="All non-deleted tickets">
          {data.ticketsByStatus.length ? (
            <PieChart
              height={280}
              series={[
                {
                  data: data.ticketsByStatus.map((t, i) => ({
                    id: i,
                    value: t.count,
                    label: titleCase(t.status),
                    color: statusColors[i % statusColors.length],
                  })),
                  innerRadius: 48,
                  paddingAngle: 1,
                  cornerRadius: 3,
                },
              ]}
            />
          ) : (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              No tickets yet.
            </Typography>
          )}
        </ChartCard>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
        <ChartCard title="Occupancy by block" subtitle="Occupied vs free beds">
          <BarChart
            height={300}
            xAxis={[{ scaleType: "band", data: data.occupancyByBlock.map((b) => b.block) }]}
            series={[
              { data: data.occupancyByBlock.map((b) => b.occupied), label: "Occupied", stack: "beds", color: color.brand[600] },
              { data: data.occupancyByBlock.map((b) => b.free), label: "Free", stack: "beds", color: color.brand[100] },
            ]}
            margin={{ left: 40, right: 10, top: 20, bottom: 30 }}
          />
        </ChartCard>

        <ChartCard title="Tickets by category" subtitle="Where residents need help most">
          {data.ticketsByCategory.length ? (
            <BarChart
              height={300}
              layout="horizontal"
              yAxis={[
                {
                  scaleType: "band",
                  data: data.ticketsByCategory.map((t) => titleCase(t.category)),
                },
              ]}
              series={[
                {
                  data: data.ticketsByCategory.map((t) => t.count),
                  label: "Tickets",
                  color: color.brand[600],
                },
              ]}
              margin={{ left: 140, right: 20, top: 20, bottom: 30 }}
            />
          ) : (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              No tickets yet.
            </Typography>
          )}
        </ChartCard>
      </Box>

      <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 2 }}>
        Snapshot generated {new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" }).format(new Date(data.generatedAt))}.
      </Typography>
    </Box>
  )
}
