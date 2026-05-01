'use client';

interface UpcomingPayment {
  id: string;
  title: string;
  amount: string | undefined;
  dueDate: string;
  items?: string;
}

const upcomingPayments: UpcomingPayment[] = [
  {
    id: '1',
    title: 'Monthly Dues',
    amount: '₦2,000',
    dueDate: 'Due in 3 days',
    items: undefined,
  },
  {
    id: '2',
    title: 'Community Fund',
    amount: undefined,
    dueDate: 'Due in 5 days',
    items: '3 Items',
  },
  {
    id: '3',
    title: 'Community Fund',
    amount: undefined,
    dueDate: 'Due in 5 days',
    items: '3 Items',
  },
  {
    id: '4',
    title: 'Community Fund',
    amount: undefined,
    dueDate: 'Due in 5 days',
    items: '3 Items',
  },
  {
    id: '5',
    title: 'Community Fund',
    amount: undefined,
    dueDate: 'Due in 5 days',
    items: '3 Items',
  },
  {
    id: '6',
    title: 'Community Fund',
    amount: undefined,
    dueDate: 'Due in 5 days',
    items: '3 Items',
  },
  {
    id: '7',
    title: 'Community Fund',
    amount: undefined,
    dueDate: 'Due in 5 days',
    items: '3 Items',
  },
];

export default function UpcomingPayments() {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 border border-white/20 shadow-soft animate-fade-in flex flex-col h-full max-h-[420px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-gray-900 tracking-tight">Upcoming payments</h3>
        <span className="bg-teal-50 text-[#0E9DA5] text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter">
          {upcomingPayments.length} Pending
        </span>
      </div>

      <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
        {upcomingPayments.map((payment) => (
          <div key={payment.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-sm transition-all group">
            <div className="flex-1 space-y-1">
              <div className="text-sm font-extrabold text-gray-900 group-hover:text-[#0E9DA5] transition-colors">
                {payment.title}
              </div>
              <div className="flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                 <div className="text-[10px] font-bold text-red-500 uppercase tracking-wide">{payment.dueDate}</div>
              </div>
            </div>

            <div className="text-right">
              {payment.amount ? (
                <div className="text-sm font-black text-gray-900">
                  {payment.amount}
                </div>
              ) : (
                <div className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                  {payment.items}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
