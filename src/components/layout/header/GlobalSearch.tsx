'use client';

import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { searchCasesAction, SearchResult } from '@/app/actions/header';
import { useDebounce } from '@/hooks/useDebounce';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { formatINR } from '@/lib/format';
import { Badge } from '@/components/ui/badge';

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useOnClickOutside(wrapperRef, () => setIsOpen(false));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    async function performSearch() {
      if (debouncedQuery.length >= 2) {
        setIsSearching(true);
        try {
          const res = await searchCasesAction(debouncedQuery);
          setResults(res);
        } catch (e) {
          console.error(e);
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
      }
    }
    performSearch();
  }, [debouncedQuery]);

  const handleSelect = (caseId: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(`/recovery/${caseId}`);
  };

  const showDropdown = isOpen && (query.length >= 2 || isSearching);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-[500px]">
      <div 
        className={`flex items-center gap-2 text-sm px-3 py-1.5 border rounded-md transition-colors ${isOpen ? 'border-indigo-500 ring-1 ring-indigo-500 bg-white' : 'border-transparent bg-slate-100 hover:bg-slate-200 text-muted-foreground'}`}
      >
        <Search className="h-4 w-4 shrink-0 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search cases, customers, or transactions... (⌘K)"
          className="bg-transparent border-none outline-none w-full text-slate-900 placeholder:text-slate-500"
        />
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden z-50">
          {isSearching ? (
            <div className="p-4 text-sm text-slate-500 text-center">Searching...</div>
          ) : results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result.id)}
                  className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-start justify-between gap-4 transition-colors"
                >
                  <div className="flex flex-col truncate">
                    <span className="font-medium text-slate-900 truncate">{result.customerName}</span>
                    <span className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                      {result.id} {result.paymentId ? `· ${result.paymentId}` : ''}
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <span className="font-medium text-slate-900">{formatINR(result.amountAtRisk)}</span>
                    <Badge variant="secondary" className="text-[10px] capitalize px-1.5 py-0">
                      {result.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-sm text-slate-500 text-center">
              No matching cases or transactions.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
