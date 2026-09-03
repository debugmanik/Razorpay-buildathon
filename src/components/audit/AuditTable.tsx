"use client";

import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatAuditDescription, formatAuditEventType } from "@/lib/format";
import Link from "next/link";
import { Search } from "lucide-react";

export type AuditLogItem = {
  id: string;
  caseId: string;
  eventType: string;
  description: string;
  createdAt: Date;
  customerName: string;
  amountAtRisk: number;
  provider: 'RAZORPAY TEST MODE' | 'SIMULATION';
};

export function AuditTable({ initialAudits }: { initialAudits: AuditLogItem[] }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const filteredAudits = useMemo(() => {
    let result = [...initialAudits];

    // Search by Case ID or Customer
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a => 
        a.caseId.toLowerCase().includes(q) || 
        a.customerName.toLowerCase().includes(q)
      );
    }

    // Category Filter
    if (categoryFilter !== 'All') {
      const filterKey = categoryFilter.toLowerCase();
      result = result.filter(a => {
        const type = a.eventType.toLowerCase();
        if (filterKey === 'detection') return type.includes('detect');
        if (filterKey === 'diagnosis') return type.includes('diagnos');
        if (filterKey === 'scoring') return type.includes('score');
        if (filterKey === 'policy') return type.includes('policy') || type.includes('approve');
        if (filterKey === 'recovery') return type.includes('recover') && !type.includes('payment') && !type.includes('complet');
        if (filterKey === 'payment') return type.includes('payment');
        if (filterKey === 'completion') return type.includes('complet') || type.includes('stop');
        return true;
      });
    }

    return result;
  }, [initialAudits, search, categoryFilter]);

  return (
    <div className="space-y-4">
      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Filter by Case ID or Customer..." 
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select 
            className="text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1" 
            value={categoryFilter} 
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="All">Event: All</option>
            <option value="Detection">Detection</option>
            <option value="Diagnosis">Diagnosis</option>
            <option value="Scoring">Scoring</option>
            <option value="Policy">Policy</option>
            <option value="Recovery">Recovery</option>
            <option value="Payment">Payment</option>
            <option value="Completion">Completion</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[220px]">Event Type</TableHead>
              <TableHead className="w-[200px]">Case / Customer</TableHead>
              <TableHead>Decision Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAudits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-32">
                  <div className="text-sm font-medium text-slate-900">No audit events yet.</div>
                  <div className="text-sm text-slate-500 mt-1">Try clearing your filters or search.</div>
                  <button 
                    onClick={() => { setSearch(''); setCategoryFilter('All'); }}
                    className="mt-4 text-sm text-indigo-600 hover:underline"
                  >
                    Clear filters
                  </button>
                </TableCell>
              </TableRow>
            ) : (
              filteredAudits.map((audit) => (
                <TableRow key={audit.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    <div>{new Date(audit.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <div className="mt-0.5">{new Date(audit.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-[10px] bg-slate-100 text-slate-700 hover:bg-slate-100 uppercase">
                      {formatAuditEventType(audit.eventType)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900">{audit.customerName}</div>
                    <Link href={`/recovery/${audit.caseId}`} className="font-mono text-[10px] text-indigo-600 hover:underline flex items-center gap-1 mt-0.5">
                      {audit.caseId.split('_').pop()}
                    </Link>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700">{formatINR(audit.amountAtRisk)}</span>
                      <Badge variant="outline" className={`text-[8px] uppercase font-semibold ${audit.provider === 'SIMULATION' ? 'text-slate-400 border-slate-200' : 'text-amber-600 border-amber-200 bg-amber-50'} px-1 py-0 h-4`}>
                        {audit.provider}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-700">
                    {formatAuditDescription(audit.description)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
