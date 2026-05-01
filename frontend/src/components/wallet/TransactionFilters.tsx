'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TransactionFiltersProps {
  onPeriodChange?: (period: string) => void;
  onDateRangeChange?: (range: string) => void;
  onSearch?: (query: string) => void;
}

export default function TransactionFilters({
  onPeriodChange,
  onDateRangeChange,
  onSearch,
}: TransactionFiltersProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Select
          defaultValue="last-7-days"
          onValueChange={onPeriodChange || (() => {})}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last-7-days">Last 7days</SelectItem>
            <SelectItem value="last-30-days">Last 30days</SelectItem>
            <SelectItem value="last-90-days">Last 90days</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span>17 mar - 24 Mar</span>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Search"
          className="pl-9 w-64"
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>
    </div>
  );
}
