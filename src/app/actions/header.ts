'use server';

import { demoRepo } from '@/services/data/demoRepository';
import { CaseStatus } from '@/types/domain';

export type SearchResult = {
  id: string;
  customerName: string;
  amountAtRisk: number;
  status: CaseStatus;
  paymentId?: string;
};

export async function searchCasesAction(query: string): Promise<SearchResult[]> {
  const normalizedQuery = query.toLowerCase().trim();
  
  if (normalizedQuery.length < 2) return [];

  const results: SearchResult[] = [];
  
  for (const caseData of Object.values(demoRepo.cases)) {
    const customerName = (caseData.metadata?.customerName as string) || '';
    const paymentId = (caseData.metadata?.paymentId as string) || '';
    const caseId = caseData.id;

    if (
      customerName.toLowerCase().includes(normalizedQuery) ||
      caseId.toLowerCase().includes(normalizedQuery) ||
      paymentId.toLowerCase().includes(normalizedQuery)
    ) {
      results.push({
        id: caseId,
        customerName,
        amountAtRisk: caseData.amountAtRisk,
        status: caseData.status,
        paymentId
      });
    }

    if (results.length >= 10) break; // Limit search results to top 10
  }

  return results;
}

export type ActivityEvent = {
  id: string;
  caseId: string;
  eventType: string;
  description: string;
  createdAt: Date;
};

export async function getRecentActivityAction(limit: number = 10): Promise<ActivityEvent[]> {
  const allAudits = demoRepo.audits;
  // Sort descending by date
  const sortedAudits = [...allAudits].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  return sortedAudits.slice(0, limit).map(audit => ({
    id: audit.id,
    caseId: audit.caseId,
    eventType: audit.eventType,
    description: audit.description,
    createdAt: audit.createdAt
  }));
}
