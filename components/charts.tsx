"use client"

import {
  Bar,
  BarChart as RechartsBarChart,
  Line,
  LineChart as RechartsLineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface ChartProps {
  data: any[]
  xAxis: string
  yAxis: string
  title: string
}

export function BarChart({ data, xAxis, yAxis, title }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxis} />
        <YAxis />
        <Tooltip />
        <Bar dataKey={yAxis} fill="#3b82f6" name={title} />
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}

export function LineChart({ data, xAxis, yAxis, title }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxis} />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey={yAxis} stroke="#3b82f6" name={title} />
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
