'use client';

import { useState, useEffect } from 'react';
import { ApiService } from '@/services/api';
import { MoreVertical } from 'lucide-react';
import TransactionFilters from './TransactionFilters';
import { Separator } from '../ui/separator';
import { toastAxiosError } from '@/hooks/useAxiosError';

interface Transaction {
  id: string;
  type: string;
  date: string;
  amount: string;
  status: 'Successful' | 'Pending' | 'Failed';
}

// Initial Dummy Data (Optional: Clear this if you want purely API data)
const initialTransactions: Transaction[] = [];

const getStatusBadgeColor = (status: Transaction['status']) => {
  switch (status) {
    case 'Successful':
      return 'text-[#33dab1] bg-[#e8fbf6] p-1 rounded-lg';
    case 'Pending':
      return 'text-[#e1c030] bg-[#fefcf2] p-1 rounded-lg';
    case 'Failed':
      return 'text-[#de4436] bg-[#fef0f0] p-1 rounded-lg';
    default:
      return 'text-[#888795] bg-[#f5f5f5] p-1 rounded-lg';
  }
};

const getStatusDotColor = (status: Transaction['status']) => {
  switch (status) {
    case 'Successful':
      return 'bg-[#33dab1]';
    case 'Pending':
      return 'bg-[#e1c030]';
    case 'Failed':
      return 'bg-[#de4436]';
    default:
      return 'bg-[#888795]';
  }
};

export default function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]); // Start empty or with dummy
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);

  const handlePeriodChange = (period: string) => {
    // Handle period filter logic here
    console.log('Period changed:', period);
  };

  const handleDateRangeChange = (range: string) => {
    // Handle date range filter logic here
    console.log('Date range changed:', range);
  };

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredTransactions(transactions);
      return;
    }

    const filtered = transactions.filter((transaction) =>
      transaction.type.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredTransactions(filtered);
  };
  
  // API Integration attempt
  useEffect(() => {
     const fetchTransactions = async () => {
         try {
             const response = await ApiService.wallet.getTransactions({ limit: 10 });
             // response.data is TransactionResponse, response.data.data is TransactionList
             const mapped = (response.data.data.transactions || []).map((t: any) => ({
                 id: String(t.id),
                 type: t.description || t.type,
                 date: t.created_at ? new Date(t.created_at).toLocaleDateString() : 'N/A',
                 amount: `₦${Number(t.amount).toLocaleString()}`,
                 status: (t.status === 'success' || t.status === 'completed' ? 'Successful' : t.status === 'pending' ? 'Pending' : 'Failed') as Transaction['status']
             }));
             // If API returns empty, keep using dummy or set empty
             if (mapped.length > 0) {
                setTransactions(mapped);
                setFilteredTransactions(mapped);
             }
         } catch (error) {
             console.error('Failed to fetch transactions', error);
             toastAxiosError(error, "Failed to load transactions.");
         }
     };
     fetchTransactions();
  }, []);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-8 border border-white/20 shadow-soft animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            Recent transactions
          </h2>
          <p className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-widest">History & Activity</p>
        </div>
      </div>

      <TransactionFilters
        onPeriodChange={handlePeriodChange}
        onDateRangeChange={handleDateRangeChange}
        onSearch={handleSearch}
      />

      <div className="grid grid-cols-5 gap-4 py-4 px-6 mb-4 bg-gray-50/50 rounded-2xl border border-gray-100">
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Type
        </div>
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
          Date
        </div>
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
          Amount
        </div>
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
          Status
        </div>
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right pr-2">
          Actions
        </div>
      </div>

      <div className="space-y-1">
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center">
             <p className="text-sm font-bold text-gray-300">No transactions found</p>
          </div>
        ) : (
          filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="grid grid-cols-5 gap-4 items-center py-4 px-6 rounded-2xl transition-all hover:bg-gray-50/50 group"
            >
              <div className="text-sm font-extrabold text-gray-900 truncate">
                {transaction.type}
              </div>
              <div className="text-sm font-bold text-gray-500 text-center">
                {transaction.date}
              </div>
              <div className="text-sm font-black text-gray-900 text-center">
                {transaction.amount}
              </div>
              <div className="flex items-center justify-center">
                <div
                  className={`text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded-full ${getStatusBadgeColor(
                    transaction.status
                  )} flex items-center gap-2`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(
                      transaction.status
                    )} shadow-sm`}
                  ></div>
                  {transaction.status}
                </div>
              </div>
              <div className="flex justify-end text-center">
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-gray-300 hover:text-gray-600 transition-all">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
