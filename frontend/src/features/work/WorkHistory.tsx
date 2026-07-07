import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.ts';
import { useAppStore } from '../../lib/store.ts';
import { formatDate } from '../../lib/utils.ts';
import { 
  Search, 
  Briefcase, 
  AlertCircle, 
  Loader2,
  MapPin,
  Tag,
  ArrowLeft,
  Check,
  X,
  Edit2
} from 'lucide-react';

interface Worker {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
}

interface Work {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  location: string | null;
  assignedWorkers: Worker[];
  assignments?: any[];
}

export default function WorkHistory() {
  const queryClient = useQueryClient();
  const { addToast, showConfirm } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);

  // Detail View Date Filters State
  const [dateFilterType, setDateFilterType] = useState<'all' | 'specific' | 'this-month' | 'last-month' | 'custom'>('all');
  const [specificDate, setSpecificDate] = useState('');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');

  // Bulk Edit State
  const [isDetailEditing, setIsDetailEditing] = useState(false);
  const [editedDetails, setEditedDetails] = useState<Record<string, { amount: string; shift: string }>>({});

  // Fetch completed works
  const { data: completedWorks = [], isLoading, isError, error } = useQuery<Work[]>({
    queryKey: ['completedWorks', searchTerm],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('status', 'completed');
      if (searchTerm) params.append('search', searchTerm);
      return api.get<Work[]>(`/works?${params.toString()}`);
    },
  });

  // Group completed works by title
  const groupedCompletedWorks = useMemo(() => {
    const groups: Record<string, Work[]> = {};
    for (const work of completedWorks) {
      if (!groups[work.title]) {
        groups[work.title] = [];
      }
      groups[work.title].push(work);
    }
    
    return Object.entries(groups).map(([_, works]) => {
      // Find the representative work in the group based on dueDate or createdAt
      const sorted = [...works].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
      return {
        ...sorted[0], // Representative work
        occurrencesCount: works.length, // Track how many times this work was completed
        allOccurrences: works,
      };
    });
  }, [completedWorks]);

  // Derive details of the selected task title client-side from the completedWorks list
  const workDetails = useMemo(() => {
    if (!selectedWorkId || !completedWorks) return null;
    const selectedWork = completedWorks.find((w) => w.id === selectedWorkId);
    if (!selectedWork) return null;

    const matching = completedWorks.filter((w) => w.title === selectedWork.title);

    const assignmentHistory: any[] = [];
    for (const work of matching) {
      const activeAssignments = work.assignments || [];
      for (const a of activeAssignments) {
        assignmentHistory.push({
          id: a.id,
          workId: a.workId,
          workerId: a.workerId,
          workerName: a.worker ? a.worker.name : 'Unknown',
          workerAvatarUrl: a.worker ? a.worker.avatarUrl : null,
          assignedAt: a.assignedAt,
          unassignedAt: a.unassignedAt,
          amount: a.amount,
          shift: a.shift,
        });
      }
    }

    return {
      id: selectedWork.id,
      title: selectedWork.title,
      description: selectedWork.description,
      priority: selectedWork.priority,
      category: selectedWork.category,
      location: selectedWork.location,
      assignmentHistory,
    };
  }, [selectedWorkId, completedWorks]);

  const isLoadingDetails = false;

  // Filtered History for sub-view
  const filteredHistory = useMemo(() => {
    if (!workDetails || !workDetails.assignmentHistory) return [];
    const now = new Date();
    let startLimit: Date | null = null;
    let endLimit: Date | null = null;

    if (dateFilterType === 'specific' && specificDate) {
      startLimit = new Date(specificDate);
      startLimit.setHours(0, 0, 0, 0);
      endLimit = new Date(specificDate);
      endLimit.setHours(23, 59, 59, 999);
    } else if (dateFilterType === 'this-month') {
      startLimit = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endLimit = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (dateFilterType === 'last-month') {
      startLimit = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endLimit = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (dateFilterType === 'custom') {
      if (customFromDate) {
        startLimit = new Date(customFromDate);
        startLimit.setHours(0, 0, 0, 0);
      }
      if (customToDate) {
        endLimit = new Date(customToDate);
        endLimit.setHours(23, 59, 59, 999);
      }
    }

    return workDetails.assignmentHistory.filter((item: any) => {
      if (item.unassignedAt !== null) return false;
      const dateObj = new Date(item.assignedAt);
      if (startLimit && dateObj < startLimit) return false;
      if (endLimit && dateObj > endLimit) return false;
      return true;
    });
  }, [workDetails, dateFilterType, specificDate, customFromDate, customToDate]);

  const groupedByDate = useMemo(() => {
    const dateGroups: Record<string, any[]> = {};
    if (!filteredHistory) return [];
    for (const item of filteredHistory) {
      const dateKey = new Date(item.assignedAt).toDateString();
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = [];
      }
      dateGroups[dateKey].push(item);
    }

    const formattedGroups: Array<{
      dateKey: string;
      dateRaw: string;
      items: any[];
      totalAmount: number;
    }> = [];

    for (const [dateKey, items] of Object.entries(dateGroups)) {
      const workerGroups: any[] = [];
      let dateTotal = 0;

      for (const item of items) {
        const fallbackAmt = item.amount !== null && item.amount !== undefined ? item.amount : 500;
        dateTotal += fallbackAmt;

        const existing = workerGroups.find((w) => w.workerId === item.workerId);
        if (existing) {
          if (!existing.shifts.includes(item.shift || 'Tiffin')) {
            existing.shifts.push(item.shift || 'Tiffin');
          }
          existing.amount += fallbackAmt;
          existing.originalHistoryItems.push(item);
        } else {
          workerGroups.push({
            id: item.id,
            assignedAt: item.assignedAt,
            workerId: item.workerId,
            workerName: item.workerName,
            workerAvatarUrl: item.workerAvatarUrl,
            shifts: [item.shift || 'Tiffin'],
            amount: fallbackAmt,
            originalHistoryItems: [item]
          });
        }
      }

      formattedGroups.push({
        dateKey,
        dateRaw: items[0].assignedAt,
        items: workerGroups,
        totalAmount: dateTotal
      });
    }

    return formattedGroups.sort((a, b) => {
      const tA = new Date(a.dateRaw).getTime();
      const tB = new Date(b.dateRaw).getTime();
      return tB - tA;
    });
  }, [filteredHistory]);

  const allHistoryItems = useMemo(() => {
    return groupedByDate.flatMap(group => group.items);
  }, [groupedByDate]);

  // Bulk Updates Mutation
  const updateWorkHistoryAssignmentsMutation = useMutation({
    mutationFn: async (ops: Array<{ type: 'create' | 'update' | 'delete'; id?: string; payload?: any }>) => {
      const promises = ops.map((op) => {
        if (op.type === 'create') {
          return api.post('/assignments', op.payload);
        } else if (op.type === 'update') {
          return api.put(`/assignments/${op.id}`, op.payload);
        } else {
          return api.put(`/assignments/${op.id}`, op.payload);
        }
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workDetails', selectedWorkId] });
      queryClient.invalidateQueries({ queryKey: ['completedWorks'] });
      queryClient.invalidateQueries({ queryKey: ['worker-history'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      addToast('All work history logs saved successfully', 'success');
      setIsDetailEditing(false);
    },
    onError: (err: any) => {
      addToast(err.message || 'Failed to update work history logs', 'error');
    }
  });

  const handleStartDetailEdit = () => {
    const initialEdits: Record<string, any> = {};
    allHistoryItems.forEach((item: any) => {
      initialEdits[item.id] = {
        amount: item.amount.toString(),
        shift: item.shifts.length === 1 ? item.shifts[0] : item.shifts.join(' & '),
      };
    });
    setEditedDetails(initialEdits);
    setIsDetailEditing(true);
  };

  const updateRowDetailField = (id: string, field: string, value: string) => {
    setEditedDetails((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSaveAllDetails = () => {
    const ops: Array<{ type: 'create' | 'update' | 'delete'; id?: string; payload?: any }> = [];

    for (const item of allHistoryItems) {
      const edits = editedDetails[item.id];
      if (!edits) continue;

      const originalAmount = item.amount;
      const originalShifts = item.shifts;
      const originalAssignments = item.originalHistoryItems;

      const editedShifts = edits.shift ? edits.shift.split(' & ') : [];
      const editedTotalAmount = parseFloat(edits.amount) || 0;

      const originalShiftsSorted = [...originalShifts].sort().join(' & ');
      const editedShiftsSorted = [...editedShifts].sort().join(' & ');

      if (editedTotalAmount !== originalAmount || editedShiftsSorted !== originalShiftsSorted) {
        const amtPerShift = editedTotalAmount / (editedShifts.length || 1);
        const workId = originalAssignments[0]?.workId;
        const workerId = item.workerId;

        // Process additions and updates
        for (const shift of editedShifts) {
          const match = originalAssignments.find((a: any) => a.shift === shift);
          if (match) {
            ops.push({
              type: 'update',
              id: match.id,
              payload: { amount: amtPerShift, shift },
            });
          } else {
            ops.push({
              type: 'create',
              payload: { workId, workerId, shift, amount: amtPerShift },
            });
          }
        }

        // Process removals
        for (const orig of originalAssignments) {
          if (!editedShifts.includes(orig.shift)) {
            ops.push({
              type: 'delete',
              id: orig.id,
              payload: { unassignedAt: new Date().toISOString() },
            });
          }
        }
      }
    }

    if (ops.length === 0) {
      addToast('No changes detected', 'info');
      setIsDetailEditing(false);
      return;
    }

    showConfirm({
      title: 'Save Work Logs Changes?',
      message: `Are you sure you want to update worker shift and pay allocations for these records? This will sync with their worker details files as well.`,
      confirmText: 'Save All',
      onConfirm: () => {
        updateWorkHistoryAssignmentsMutation.mutate(ops);
      }
    });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-red-500/10 text-red-600 rounded-md border border-red-500/20">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-blue-500/10 text-blue-600 rounded-md border border-blue-500/20">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-slate-100 text-slate-500 rounded-md border border-slate-200">
            Low
          </span>
        );
    }
  };

  // Sub-view: Specific Work Details History
  if (selectedWorkId) {
    return (
      <div className="space-y-6">
        {/* Back control */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedWorkId(null);
              setIsDetailEditing(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to History
          </button>
        </div>

        {isLoadingDetails || !workDetails ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-2" />
            <span className="text-xs font-semibold">Loading task log files...</span>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Work Summary card */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-3 relative select-none">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 rounded-md border border-emerald-500/20">
                  Completed
                </span>
                {getPriorityBadge(workDetails.priority)}
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-snug tracking-tight">
                {workDetails.title}
              </h3>
              {workDetails.description && 
               workDetails.description !== 'General Task Details' && 
               workDetails.description !== 'No description provided.' && (
                <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                  {workDetails.description}
                </p>
              )}
              {(workDetails.location || (workDetails.category && workDetails.category !== 'General')) && (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[10px] text-slate-455 font-bold">
                  {workDetails.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {workDetails.location}
                    </span>
                  )}
                  {workDetails.category && workDetails.category !== 'General' && (
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      {workDetails.category}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Date Filters block */}
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 select-none">Filter Logs By Date</h3>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  <select
                    value={dateFilterType}
                    onChange={(e) => setDateFilterType(e.target.value as any)}
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-750 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer w-full sm:w-44 font-semibold"
                  >
                    <option value="all">All Time</option>
                    <option value="specific">Specific Date</option>
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
              </div>

              {dateFilterType === 'specific' && (
                <div className="flex flex-col gap-1 w-full max-w-[200px] animate-slide-up">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Select Date</span>
                  <input
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  />
                </div>
              )}

              {dateFilterType === 'custom' && (
                <div className="flex flex-wrap gap-4 animate-slide-up">
                  <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">From Date</span>
                    <input
                      type="date"
                      value={customFromDate}
                      onChange={(e) => setCustomFromDate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">To Date</span>
                    <input
                      type="date"
                      value={customToDate}
                      onChange={(e) => setCustomToDate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Assignments list table card */}
            <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden bg-white">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Work Logs History</h3>
                {groupedByDate.length > 0 && (
                  <div>
                    {isDetailEditing ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsDetailEditing(false)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-extrabold transition-colors flex items-center gap-1 cursor-pointer border border-slate-200"
                        >
                          <X className="w-3 h-3" /> Cancel
                        </button>
                        <button
                          onClick={handleSaveAllDetails}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-extrabold shadow transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" /> Save All
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleStartDetailEdit}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-extrabold shadow transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" /> Edit Logs
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 space-y-6">
                {groupedByDate.length === 0 ? (
                  <div className="text-xs italic text-slate-450 py-12 text-center border border-dashed border-slate-200 rounded-xl">
                    No assignment records found matching the selected dates.
                  </div>
                ) : (
                  <>
                    {groupedByDate.map((group) => (
                      <div key={group.dateKey} className="space-y-2 border border-slate-150 rounded-2xl p-4 bg-slate-50/20">
                        {/* Date Section Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                          <span className="text-xs font-extrabold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg">
                            Date: {formatDate(group.dateRaw)}
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                                <th className="py-2.5 px-4 w-12 text-center">SI No.</th>
                                <th className="py-2.5 px-4 w-36">Shift</th>
                                <th className="py-2.5 px-4 min-w-[200px]">Worker Name</th>
                                <th className="py-2.5 px-4 w-40 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                              {group.items.map((item: any, index: number) => {
                                const edits = editedDetails[item.id];
                                return (
                                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3 px-4 text-center text-slate-400 text-[11px] font-bold">{index + 1}</td>
                                    
                                    {/* Shift Column */}
                                    <td className="py-3 px-4">
                                      {isDetailEditing && edits ? (
                                        <div className="flex gap-1 flex-wrap">
                                          {['Tiffin', 'Lunch', 'Dinner'].map((s) => {
                                            const currentShifts = edits.shift ? edits.shift.split(' & ') : [];
                                            const isSelected = currentShifts.includes(s);
                                            return (
                                              <button
                                                key={s}
                                                type="button"
                                                onClick={() => {
                                                  let nextShifts;
                                                  if (isSelected) {
                                                    nextShifts = currentShifts.filter((item) => item !== s);
                                                  } else {
                                                    nextShifts = [...currentShifts, s];
                                                  }
                                                  if (nextShifts.length > 0) {
                                                    updateRowDetailField(item.id, 'shift', nextShifts.join(' & '));
                                                    
                                                    // Auto adjust pay: add 500 when adding shift, subtract 500 when removing shift
                                                    const currentAmt = parseFloat(edits?.amount || '0') || 0;
                                                    const newAmt = isSelected 
                                                      ? Math.max(0, currentAmt - 500) 
                                                      : currentAmt + 500;
                                                    updateRowDetailField(item.id, 'amount', newAmt.toString());
                                                  }
                                                }}
                                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer select-none ${
                                                  isSelected
                                                    ? 'bg-purple-600 text-white border-purple-600'
                                                    : 'bg-white text-slate-500 border-slate-200'
                                                }`}
                                              >
                                                {s}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-purple-50 border border-purple-100 text-purple-600 whitespace-nowrap">
                                          {item.shifts.join(' & ')}
                                        </span>
                                      )}
                                    </td>

                                    {/* Worker Name Column */}
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2">
                                        <img
                                          src={item.workerAvatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.workerName)}`}
                                          alt={item.workerName}
                                          className="w-6 h-6 rounded-full object-cover border"
                                        />
                                        <span className="text-slate-800 font-extrabold">{item.workerName}</span>
                                      </div>
                                    </td>

                                    {/* Amount Column */}
                                    <td className="py-3 px-4 text-right font-bold w-40">
                                      {isDetailEditing && edits ? (
                                        <div className="flex items-center gap-1 justify-end">
                                          <span className="text-xs text-slate-400 font-extrabold select-none mr-0.5">₹</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const currentVal = parseFloat(edits.amount) || 0;
                                              const newVal = Math.max(0, currentVal - 50);
                                              updateRowDetailField(item.id, 'amount', newVal === 0 ? '' : newVal.toString());
                                            }}
                                            className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200/65 transition-colors select-none text-xs font-black cursor-pointer shadow-sm"
                                          >
                                            -
                                          </button>
                                          <input
                                            type="number"
                                            value={edits.amount}
                                            onChange={(e) => updateRowDetailField(item.id, 'amount', e.target.value)}
                                            placeholder="-"
                                            className="w-12 text-center px-1 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-750 focus:outline-none focus:ring-1 focus:ring-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-semibold"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const currentVal = parseFloat(edits.amount) || 0;
                                              const newVal = currentVal + 50;
                                              updateRowDetailField(item.id, 'amount', newVal.toString());
                                            }}
                                            className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200/65 transition-colors select-none text-xs font-black cursor-pointer shadow-sm"
                                          >
                                            +
                                          </button>
                                        </div>
                                      ) : (
                                        `₹${item.amount}`
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Total allocation summary for this Date */}
                        <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50 mt-2 text-xs font-bold text-slate-700">
                          <span>Total Workers: {group.items.length}</span>
                          <span>Total Pay: <span className="text-purple-600 text-sm font-extrabold">₹{group.totalAmount}</span></span>
                        </div>
                      </div>
                    ))}

                    {/* Grand Total of All Work Allocation */}
                    <div className="flex justify-between items-center bg-purple-600/10 p-4 rounded-2xl border border-purple-500/25 mt-4 text-xs font-bold text-slate-800">
                      <div className="flex flex-col text-left">
                        <span className="text-purple-750 uppercase tracking-wider font-extrabold">Grand Total Pay</span>
                        <span className="text-[10px] text-purple-400 uppercase font-bold tracking-wider mt-0.5">(All Dates)</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-slate-450 text-[10px] uppercase font-extrabold tracking-wider">Total Pay</span>
                        <span className="text-purple-600 text-base font-black">₹{groupedByDate.reduce((sum, g) => sum + g.totalAmount, 0)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }


  // Filtered Cards for main view
  const filteredWorks = groupedCompletedWorks;

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
        {/* Search */}
        <div className="relative w-full sm:w-72 shrink-0">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
            placeholder="Search completed tasks..."
          />
        </div>
      </div>

      {/* Main Content (Cards Grid) */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-2" />
          <span className="text-xs font-semibold">Loading completed tasks...</span>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-12 text-center p-6 bg-white border border-slate-200 rounded-2xl">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">Failed to load history</h3>
          <p className="text-sm text-slate-500 mt-1">
            {error instanceof Error ? error.message : 'Please check your connection and try again.'}
          </p>
        </div>
      ) : filteredWorks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center p-6 bg-white border border-slate-200 rounded-3xl">
          <Briefcase className="w-10 h-10 text-slate-350 mb-3" />
          <h4 className="text-sm font-bold text-slate-900">No Completed Tasks Found</h4>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm 
              ? 'Try refining your search terms.' 
              : 'Tasks marked as "Done" on the board will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {filteredWorks.map((work) => (
            <div 
              key={work.id} 
              onClick={() => setSelectedWorkId(work.id)}
              className="bg-white border border-slate-200 hover:border-purple-300 dark:hover:border-purple-400 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 rounded-md border border-emerald-500/20">
                      Completed
                    </span>
                    {(work as any).occurrencesCount > 1 && (
                      <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-purple-500/10 text-purple-600 rounded-md border border-purple-500/20">
                        {(work as any).occurrencesCount} Instances
                      </span>
                    )}
                  </div>
                  {getPriorityBadge(work.priority)}
                </div>
                <h4 className="font-extrabold text-slate-900 group-hover:text-purple-600 transition-colors text-base tracking-tight leading-snug text-left">
                  {work.title}
                </h4>
                <p className="text-xs text-slate-450 line-clamp-2 text-left">
                  {work.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-450 font-bold">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-350" />
                  <span>{work.category || 'General'}</span>
                </div>
                {work.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-350" />
                    <span>{work.location}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
