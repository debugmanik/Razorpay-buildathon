"use client";

import { useState, useMemo } from "react";
import { QueueCaseItem } from "@/services/data/queue";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatActionName, formatCaseType } from "@/lib/format";
import { useRouter } from "next/navigation";
import { Search, ArrowUpDown, TrendingUp } from "lucide-react";

type SortField = 'expectedNetRecovery' | 'expectedRecovery' | 'amountAtRisk' | 'probability' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export function RecoveryQueueTable({ initialCases }: { initialCases: QueueCaseItem[] }) {
  const router = useRouter();
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [caseTypeFilter, setCaseTypeFilter] = useState("All");
  const [decisionFilter, setDecisionFilter] = useState("All");
  
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
      result = result.filter(c => c.status.toLowerCase() === statusFilter.toLowerCase());
    }
    
    // Filter: Case Type
    if (caseTypeFilter !== 'All') {
      result = result.filter(c => c.caseType === caseTypeFilter);
    }

    // Filter: Decision (ACT / ABSTAIN / ESCALATE)
    if (decisionFilter !== 'All') {
      result = result.filter(c => c.decision === decisionFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortField === 'createdAt') {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }

      const valA = a[sortField];
      const valB = b[sortField];

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [initialCases, search, statusFilter, caseTypeFilter, decisionFilter, sortField, sortOrder]);

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
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Quick Sort by Best Opportunity */}
          <button
            onClick={() => {
              setSortField('expectedNetRecovery');
              setSortOrder('desc');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border transition-colors ${
              sortField === 'expectedNetRecovery'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Best Opportunity (Net Value)
          </button>

          <select 
            className="text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 bg-white text-slate-700" 
            value={decisionFilter} 
            onChange={e => setDecisionFilter(e.target.value)}
          >
            <option value="All">Decision: All</option>
            <option value="ACT">Decision: ACT</option>
            <option value="ABSTAIN">Decision: ABSTAIN</option>
            <option value="ESCALATE">Decision: ESCALATE</option>
          </select>

          <select 
            className="text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 bg-white text-slate-700" 
            value={caseTypeFilter} 
            onChange={e => setCaseTypeFilter(e.target.value)}
          >
            <option value="All">Type: All</option>
            <option value="payment_failure">Payment Failures</option>
            <option value="checkout_dropoff">Checkout</option>
            <option value="subscription_failure">Subscriptions</option>
            <option value="mandate_failure">Mandates</option>
            <option value="receivable">Receivables</option>
          </select>

          <select 
            className="text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 bg-white text-slate-700" 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All">Status: All</option>
            <option value="ready">Ready</option>
            <option value="recovering">Recovering</option>
            <option value="recovered">Recovered</option>
            <option value="escalated">Escalated</option>
            <option value="stopped">Stopped</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        {filteredAndSorted.length === 0 ? (
          <div className="p-8 text-center">
            <h3 className="text-sm font-medium text-slate-900">No recovery opportunities match your criteria.</h3>
            <p className="text-sm text-slate-500 mt-1">Try resetting filters or changing your search terms.</p>
            <button 
              onClick={() => { setSearch(''); setStatusFilter('All'); setCaseTypeFilter('All'); setDecisionFilter('All'); setSortField('expectedNetRecovery'); }}
              className="mt-4 text-sm text-indigo-600 hover:underline font-medium"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort('amountAtRisk')}>
                  <div className="flex items-center space-x-1"><span>Amount at Risk</span><ArrowUpDown className="h-3 w-3 text-slate-400" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort('probability')}>
                  <div className="flex items-center space-x-1"><span>Recovery Probability</span><ArrowUpDown className="h-3 w-3 text-slate-400" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort('expectedRecovery')}>
                  <div className="flex items-center space-x-1"><span className="text-indigo-950 font-bold">Expected Recovery</span><ArrowUpDown className="h-3 w-3 text-indigo-600" /></div>
                </TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recommended Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.map(c => {
                return (
                  <TableRow 
                    key={c.id} 
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                    onClick={() => router.push(`/recovery/${c.id}`)}
                  >
                    <TableCell>
                      <div className="font-semibold text-slate-900">{c.customerName}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{c.id}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{formatCaseType(c.caseType)}</div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[140px]" title={c.problem}>{c.problem}</div>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-900">
                      {formatINR(c.amountAtRisk)}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-800">
                      {Math.round(c.probability * 100)}%
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-bold text-indigo-600">
                        {formatINR(c.expectedRecovery)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        c.decision === 'ACT' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                        c.decision === 'ABSTAIN' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                        'bg-amber-50 text-amber-800 border-amber-300'
                      }`}>
                        {c.decision === 'ACT' ? 'Recovery Action Ready' :
                         c.decision === 'ABSTAIN' ? 'No Intervention' :
                         'Manual Review'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          c.status === 'recovered' ? 'bg-emerald-500' : 
                          c.status === 'stopped' || c.status === 'escalated' ? 'bg-rose-500' : 
                          c.status === 'recovering' ? 'bg-amber-400' : 
                          'bg-indigo-500'
                        }`} />
                        <span className="text-xs text-slate-700 capitalize font-medium">
                          {c.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 max-w-[150px] truncate font-medium" title={c.recommendedAction}>
                      {c.recommendedAction ? formatActionName(c.recommendedAction) : 'None'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
