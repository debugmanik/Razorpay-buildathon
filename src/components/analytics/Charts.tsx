"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell } from 'recharts';
import { formatINR } from '@/lib/format';

export function RecoveryTrendChart({ data }: { data: Record<string, unknown>[] }) {
  if (data.length === 0) return <div className="text-sm text-slate-500 py-10 text-center">Not enough recovery activity yet</div>;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#64748b' }} 
            tickFormatter={(str) => new Date(str).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickFormatter={(val) => `₹${val/1000}K`}
          />
          <Tooltip 
            formatter={(value: unknown) => formatINR(Number(value))}
            labelFormatter={(label: unknown) => new Date(label as string).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
          <Line type="monotone" dataKey="atRisk" name="Revenue at Risk" stroke="#94a3b8" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="expected" name="Expected Recovery" stroke="#0ea5e9" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="recovered" name="Recovered Revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OutcomeDistributionChart({ data }: { data: Record<string, unknown>[] }) {
  if (data.length === 0) return <div className="text-sm text-slate-500 py-10 text-center">Not enough recovery activity yet</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Recovered': return '#10b981'; // emerald
      case 'Stopped': return '#f43f5e'; // rose
      case 'Escalated': return '#f59e0b'; // amber
      case 'Failed': return '#64748b'; // slate
      case 'Pending': return '#3b82f6'; // blue
      default: return '#cbd5e1';
    }
  };

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="status" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
          <YAxis yAxisId="left" orientation="left" stroke="#64748b" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
          <Tooltip 
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar yAxisId="left" dataKey="count" name="Cases" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getStatusColor(entry.status as string)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
