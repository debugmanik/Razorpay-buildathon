"use client";

import { useState, useMemo } from "react";
import { QueueCaseItem } from "@/services/data/queue";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatActionName, formatCaseType } from "@/lib/format";
import { useRouter } from "next/navigation";
import { Search, ArrowUpDown } from "lucide-react";

type SortField = 'expectedRecovery' | 'amountAtRisk' | 'probability' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export function RecoveryQueueTable({ initialCases }: { initialCases: QueueCaseItem[] }) {
  const router = useRouter();
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [caseTypeFilter, setCaseTypeFilter] = useState("All");
  
  const [sortField, setSortField] = useState<SortField>('expectedRecovery');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...initialCases];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c => 
        c.customerName.toLowerCase().includes(q) || 
        c.id.toLowerCase().includes(q)
      );
    }

    // Filter: Status
    if (statusFilter !== 'All') {
      result = result.filter(c => c.status === statusFilter.toLowerCase());
    }
    
    // Filter: Case Type
    if (caseTypeFilter !== 'All') {
      result = result.filter(c => c.caseType === caseTypeFilter);
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      // Handle Date sorting natively by timestamp
      if (sortField === 'createdAt') {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [initialCases, search, statusFilter, caseTypeFilter, sortField, sortOrder]);



  return (
    <div className="space-y-4">
      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search customer or ID..." 
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select className="text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1" value={caseTypeFilter} onChange={e => setCaseTypeFilter(e.target.value)}>
            <option value="All">Type: All</option>
            <option value="payment_failure">Payment Failures</option>
            <option value="checkout_dropoff">Checkout</option>
            <option value="subscription_failure">Subscriptions</option>
            <option value="mandate_failure">Mandates</option>
            <option value="receivable">Receivables</option>
          </select>
          <select className="text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">Status: All</option>
            <option value="Ready">Ready</option>
            <option value="Recovering">Recovering</option>
            <option value="Recovered">Recovered</option>
            <option value="Escalated">Escalated</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        {filteredAndSorted.length === 0 ? (
          <div className="p-8 text-center">
            <h3 className="text-sm font-medium text-slate-900">No recovery opportunities right now.</h3>
            <p className="text-sm text-slate-500 mt-1">Try changing your filters or search.</p>
            <button 
              onClick={() => { setSearch(''); setStatusFilter('All'); }}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="cursor-pointer hover:bg-slate-50 transition-colors select-none" onClick={() => handleSort('amountAtRisk')}>
                  <div className="flex items-center space-x-1"><span>Amount at Risk</span><ArrowUpDown className="h-3 w-3 text-slate-400" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-slate-50 transition-colors select-none" onClick={() => handleSort('probability')}>
                  <div className="flex items-center space-x-1"><span>Recovery Probability</span><ArrowUpDown className="h-3 w-3 text-slate-400" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-slate-50 transition-colors select-none" onClick={() => handleSort('expectedRecovery')}>
                  <div className="flex items-center space-x-1"><span className="text-slate-900 font-bold">Expected Recovery</span><ArrowUpDown className="h-3 w-3 text-slate-400" /></div>
                </TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Policy Status</TableHead>
                <TableHead>Recommended Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.map(c => (
                <TableRow 
                  key={c.id} 
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => router.push(`/recovery/${c.id}`)}
                >
                  <TableCell>
                    <div className="font-medium text-slate-900">{c.customerName}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{c.id}</div>
                    <div className="mt-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        {c.provider === 'SIMULATION' ? 'SIMULATION' : 'RAZORPAY'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900">{formatCaseType(c.caseType)}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[150px]" title={c.problem}>{c.problem}</div>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-900">
                    {formatINR(c.amountAtRisk)}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {Math.round(c.probability * 100)}%
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-emerald-700">
                      {formatINR(c.expectedRecovery)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium uppercase tracking-wider ${c.priority === 'High' ? 'text-amber-600' : c.priority === 'Medium' ? 'text-slate-600' : 'text-slate-400'}`}>
                      {c.priority}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.status === 'recovered' ? 'bg-emerald-500' : c.status === 'stopped' || c.status === 'escalated' ? 'bg-rose-500' : c.status === 'recovering' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                      <span className="text-xs text-slate-700 capitalize">
                        {c.status}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 max-w-[150px] truncate" title={c.recommendedAction}>
                    {c.recommendedAction ? formatActionName(c.recommendedAction) : 'None'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
