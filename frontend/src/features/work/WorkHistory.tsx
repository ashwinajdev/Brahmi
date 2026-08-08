import { useState, useMemo, useEffect } from 'react';
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
  Edit2,
  Plus,
  ChevronDown
} from 'lucide-react';
import WorkFormModal from './WorkFormModal.tsx';
import CustomSelect from '../../components/ui/CustomSelect.tsx';

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
}

interface AssignmentLog {
  id: string;
  workId: string;
  workerId: string;
  workerName: string;
  workerAvatarUrl: string | null;
  assignedAt: string;
  unassignedAt: string | null;
  amount: number;
  shift: string;
}

interface WorkDetails extends Work {
  activeWorkers: Worker[];
  assignmentHistory: AssignmentLog[];
}

interface WorkHistoryProps {
  initialSelectedWorkId?: string | null;
}

const getLocalDateInputValue = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatWorkerName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/(?:^|[\s-])\S/g, (letter) => letter.toUpperCase());

const AMOUNT_PER_WORKER = 500;

export default function WorkHistory({ initialSelectedWorkId = null }: WorkHistoryProps) {
  const queryClient = useQueryClient();
  const { addToast, showConfirm } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(initialSelectedWorkId);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    setSelectedWorkId(initialSelectedWorkId);
  }, [initialSelectedWorkId]);

  // Detail View Date Filters State
  const [dateFilterType, setDateFilterType] = useState<'all' | 'specific' | 'this-month' | 'last-month' | 'custom'>('all');
  const [specificDate, setSpecificDate] = useState('');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');

  // Bulk Edit State
  const [isDetailEditing, setIsDetailEditing] = useState(false);
  const [editedDetails, setEditedDetails] = useState<Record<string, { amount: string; shift: string; workerId: string }>>({});
  const [isAddLogModalOpen, setIsAddLogModalOpen] = useState(false);
  const [isWorkerPickerOpen, setIsWorkerPickerOpen] = useState(false);
  const [newLog, setNewLog] = useState({ date: '', workerIds: [] as string[], shift: 'Tiffin' });

  // Collapse state for date groupings in detail view
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});

  const toggleDateCollapse = (dateKey: string) => {
    setCollapsedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  // Fetch grouped completed works
  const { data: completedWorks = [], isLoading, isError, error } = useQuery<Work[]>({
    queryKey: ['completedWorks', searchTerm],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      return api.get<Work[]>(`/works/grouped?${params.toString()}`);
    },
  });

  const { data: workDetails, isLoading: isLoadingDetails } = useQuery<WorkDetails>({
    queryKey: ['work-details', selectedWorkId],
    queryFn: () => {
      // If the selected work has assignmentHistory already (from grouped endpoint), use it directly
      const selectedWork = completedWorks.find((w) => w.id === selectedWorkId);
      if (selectedWork && (selectedWork as any).assignmentHistory) {
        return Promise.resolve(selectedWork as WorkDetails);
      }
      // Otherwise fall back to individual work endpoint
      return api.get<WorkDetails>(`/works/${selectedWorkId}`);
    },
    enabled: !!selectedWorkId,
  });

  // Fetch all workers for custom select options in edit mode
  const { data: roster = [] } = useQuery<any[]>({
    queryKey: ['workers-list-for-select'],
    queryFn: () => api.get<any[]>('/workers'),
  });

  const sortedCompletedWorks = useMemo(() => {
    return [...completedWorks].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [completedWorks]);

  // Use the selected work's details from the API so assignment history is loaded correctly
  const selectedWorkDetails = useMemo(() => {
    if (!selectedWorkId || !workDetails) return null;
    return workDetails;
  }, [selectedWorkId, workDetails]);

  // Filtered History for sub-view
  const filteredHistory = useMemo(() => {
    if (!selectedWorkDetails || !selectedWorkDetails.assignmentHistory) return [];
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

    return selectedWorkDetails.assignmentHistory.filter((item: any) => {
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
      queryClient.invalidateQueries({ queryKey: ['work-details', selectedWorkId] });
      queryClient.invalidateQueries({ queryKey: ['works'] });
      queryClient.invalidateQueries({ queryKey: ['completedWorks'] });
      queryClient.invalidateQueries({ queryKey: ['worker-history'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      addToast('All work history logs saved successfully', 'success');
      setIsDetailEditing(false);
    },
    onError: (err: any) => {
      addToast(err.message || 'Failed to update work history logs', 'error');
    }
  });

  const createWorkHistoryLogMutation = useMutation({
    mutationFn: (payloads: Array<{ workId: string; workerId: string; assignedAt: string; unassignedAt: string; shift: string; amount: number }>) =>
      Promise.all(payloads.map((payload) => api.post('/assignments', payload))),
    onSuccess: async () => {
      // The detail view can be sourced from the grouped works cache, so refresh it first.
      await queryClient.invalidateQueries({ queryKey: ['completedWorks'] });
      await queryClient.invalidateQueries({ queryKey: ['work-details', selectedWorkId] });
      queryClient.invalidateQueries({ queryKey: ['worker-history'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      addToast('Work logs added successfully', 'success');
      setIsAddLogModalOpen(false);
      setIsWorkerPickerOpen(false);
    },
    onError: (err: any) => {
      addToast(err.message || 'Failed to add work log', 'error');
    },
  });

  const handleOpenAddLog = () => {
    setNewLog({ date: getLocalDateInputValue(), workerIds: [], shift: 'Tiffin' });
    setIsWorkerPickerOpen(false);
    setIsAddLogModalOpen(true);
  };

  const handleCreateWorkLog = () => {
    if (!selectedWorkId || !newLog.date || newLog.workerIds.length === 0) {
      addToast('Please enter a date and select at least one worker', 'error');
      return;
    }

    const selectedDate = new Date(`${newLog.date}T12:00:00`);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (selectedDate > today) {
      addToast('Work logs can only be added for today or an earlier date', 'error');
      return;
    }

    createWorkHistoryLogMutation.mutate(newLog.workerIds.map((workerId) => ({
      workId: selectedWorkId,
      workerId,
      // Noon local time avoids a timezone offset moving the selected calendar date.
      assignedAt: selectedDate.toISOString(),
      // Historical logs are completed records, not current work assignments.
      unassignedAt: selectedDate.toISOString(),
      shift: newLog.shift,
      amount: AMOUNT_PER_WORKER,
    })));
  };

  const handleStartDetailEdit = () => {
    const initialEdits: Record<string, any> = {};
    allHistoryItems.forEach((item: any) => {
      initialEdits[item.id] = {
        amount: item.amount.toString(),
        shift: item.shifts.length === 1 ? item.shifts[0] : item.shifts.join(' & '),
        workerId: item.workerId,
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
      const editedWorkerId = edits.workerId || item.workerId;

      const originalShiftsSorted = [...originalShifts].sort().join(' & ');
      const editedShiftsSorted = [...editedShifts].sort().join(' & ');

      if (editedTotalAmount !== originalAmount || editedShiftsSorted !== originalShiftsSorted || editedWorkerId !== item.workerId) {
        const amtPerShift = editedTotalAmount / (editedShifts.length || 1);
        
        // Group assignments by workId for grouped works
        const assignmentsByWorkId: Record<string, any[]> = {};
        for (const orig of originalAssignments) {
          const workId = orig.workId;
          if (!assignmentsByWorkId[workId]) {
            assignmentsByWorkId[workId] = [];
          }
          assignmentsByWorkId[workId].push(orig);
        }

        // Process each workId group
        for (const [workId, workAssignments] of Object.entries(assignmentsByWorkId)) {
          if (editedWorkerId !== item.workerId) {
            // Delete all original assignments for this worker in this work
            for (const orig of workAssignments) {
              ops.push({
                type: 'delete',
                id: orig.id,
                payload: { unassignedAt: new Date().toISOString() },
              });
            }
            // Create new assignments for the new worker
            for (const shift of editedShifts) {
              ops.push({
                type: 'create',
                payload: { workId, workerId: editedWorkerId, shift, amount: amtPerShift },
              });
            }
          } else {
            // Process additions and updates for same worker
            for (const shift of editedShifts) {
              const match = workAssignments.find((a: any) => a.shift === shift);
              if (match) {
                ops.push({
                  type: 'update',
                  id: match.id,
                  payload: { amount: amtPerShift, shift },
                });
              } else {
                ops.push({
                  type: 'create',
                  payload: { workId, workerId: editedWorkerId, shift, amount: amtPerShift },
                });
              }
            }

            // Process removals
            for (const orig of workAssignments) {
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
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.location.hash = '#history';
              }
              setIsDetailEditing(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to History
          </button>
        </div>

        {isLoadingDetails || !workDetails ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500 mb-2" />
            <span className="text-xs font-semibold">Loading task log files...</span>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Work Summary card */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 bg-white space-y-3 relative select-none">
              <div className="flex items-center gap-2">
                {getPriorityBadge(workDetails.priority)}
                {(workDetails as any).occurrencesCount > 1 && (
                  <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-sky-500/10 text-sky-600 rounded-md border border-sky-500/20">
                    {(workDetails as any).occurrencesCount} Instances Combined
                  </span>
                )}
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
                  <CustomSelect
                    value={dateFilterType}
                    onChange={(v) => setDateFilterType(v as any)}
                    options={[
                      { value: 'all', label: 'All Time' },
                      { value: 'specific', label: 'Specific Date' },
                      { value: 'this-month', label: 'This Month' },
                      { value: 'last-month', label: 'Last Month' },
                      { value: 'custom', label: 'Custom Range' },
                    ]}
                    size="sm"
                    className="w-full sm:w-44"
                  />
                </div>
              </div>

              {dateFilterType === 'specific' && (
                <div className="flex flex-col gap-1 w-full max-w-[200px] animate-slide-up">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Select Date</span>
                  <input
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
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
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">To Date</span>
                    <input
                      type="date"
                      value={customToDate}
                      onChange={(e) => setCustomToDate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Assignments list table card */}
            <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden bg-white">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Work Logs History</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenAddLog}
                    className="px-3 py-1.5 bg-white hover:bg-sky-50 text-sky-600 rounded-lg text-[10px] font-extrabold shadow-sm transition-colors flex items-center gap-1 cursor-pointer border border-sky-200"
                  >
                    <Plus className="w-3 h-3" /> Add Log
                  </button>
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
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-extrabold shadow transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" /> Edit Logs
                      </button>
                    )}
                  </div>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-6">
                {groupedByDate.length === 0 ? (
                  <div className="text-xs italic text-slate-450 py-12 text-center border border-dashed border-slate-200 rounded-xl">
                    No assignment records found matching the selected dates.
                  </div>
                ) : (
                  <>
                    {groupedByDate.map((group) => {
                      const isCollapsed = collapsedDates[group.dateKey];
                      return (
                        <div key={group.dateKey} className={`space-y-2 border border-slate-150 rounded-2xl p-4 bg-slate-50/20 ${isDetailEditing ? 'overflow-visible' : 'overflow-hidden'}`}>
                          {/* Date Section Header */}
                          <div
                            onClick={() => toggleDateCollapse(group.dateKey)}
                            className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 cursor-pointer select-none group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg">
                                Date: {formatDate(group.dateRaw)}
                              </span>
                              <button
                                type="button"
                                className="text-slate-400 group-hover:text-sky-600 transition-colors cursor-pointer"
                                aria-label={isCollapsed ? "Expand logs for this date" : "Collapse logs for this date"}
                              >
                                <ChevronDown
                                  className={`w-4 h-4 transition-transform duration-200 ${
                                    isCollapsed ? '-rotate-90' : ''
                                  }`}
                                />
                              </button>
                            </div>
                          </div>

                          {!isCollapsed && (
                            <>
                              {isDetailEditing ? (
                                <div className="space-y-3 py-2">
                                  {group.items.map((item: any, index: number) => {
                                    const edits = editedDetails[item.id];
                                    if (!edits) return null;
                                    return (
                                      <div
                                        key={item.id}
                                        className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 p-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-150 dark:border-slate-800 rounded-2xl"
                                      >
                                        {/* Left: SI No + Shift Selector */}
                                        <div className="flex flex-wrap items-center gap-3">
                                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                            #{index + 1}
                                          </span>
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
                                                      const currentAmt = parseFloat(edits?.amount || '0') || 0;
                                                      const newAmt = isSelected 
                                                        ? Math.max(0, currentAmt - 500) 
                                                        : currentAmt + 500;
                                                      updateRowDetailField(item.id, 'amount', newAmt.toString());
                                                    }
                                                  }}
                                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer select-none ${
                                                    isSelected
                                                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                                                      : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-850 hover:bg-slate-50'
                                                  }`}
                                                >
                                                  {s}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        {/* Center: Worker Selection */}
                                        <div className="flex-grow w-full md:max-w-xs">
                                          <CustomSelect
                                            value={edits.workerId}
                                            onChange={(val) => updateRowDetailField(item.id, 'workerId', val)}
                                            options={roster.map((w: any) => ({ value: w.id, label: w.name }))}
                                            placeholder="Select Staff"
                                            size="sm"
                                          />
                                        </div>

                                        {/* Right: Amount Selection */}
                                        <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800/80">
                                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold select-none md:hidden">Amount</span>
                                          <div className="flex items-center gap-1">
                                            <span className="text-[11px] text-slate-400 font-extrabold select-none">₹</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const currentVal = parseFloat(edits.amount) || 0;
                                                const newVal = Math.max(0, currentVal - 50);
                                                updateRowDetailField(item.id, 'amount', newVal === 0 ? '' : newVal.toString());
                                              }}
                                              className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg border border-slate-200/60 dark:border-slate-700 transition-colors select-none text-xs font-black cursor-pointer shadow-sm"
                                            >
                                              -
                                            </button>
                                            <input
                                              type="number"
                                              value={edits.amount}
                                              onChange={(e) => updateRowDetailField(item.id, 'amount', e.target.value)}
                                              placeholder="-"
                                              className="w-14 text-center px-1.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const currentVal = parseFloat(edits.amount) || 0;
                                                const newVal = currentVal + 50;
                                                updateRowDetailField(item.id, 'amount', newVal.toString());
                                              }}
                                              className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg border border-slate-200/60 dark:border-slate-700 transition-colors select-none text-xs font-black cursor-pointer shadow-sm"
                                            >
                                              +
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
                                        <th className="py-2.5 px-2 w-10 text-center">SI No.</th>
                                        <th className="py-2.5 px-2 w-20">Shift</th>
                                        <th className="py-2.5 px-2 min-w-[120px]">Worker Name</th>
                                        <th className="py-2.5 px-2 w-24 text-right">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                      {group.items.map((item: any, index: number) => (
                                        <tr
                                          key={item.id}
                                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors"
                                        >
                                          <td className="py-3 px-2 text-center text-slate-400 text-[11px] font-bold">{index + 1}</td>
                                          <td className="py-3 px-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-sky-50 border border-sky-100 text-sky-600 dark:bg-sky-950/40 dark:border-sky-900/50 dark:text-sky-400 whitespace-nowrap">
                                              {item.shifts.join(' & ')}
                                            </span>
                                          </td>
                                          <td className="py-3 px-2">
                                            <div className="flex items-center gap-2">
                                              <img
                                                src={item.workerAvatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.workerName)}`}
                                                alt={item.workerName}
                                                className="w-5 h-5 rounded-full object-cover border dark:border-slate-800"
                                              />
                                              <span className="text-slate-800 dark:text-slate-200 font-extrabold truncate max-w-[110px]">{item.workerName}</span>
                                            </div>
                                          </td>
                                          <td className="py-3 px-2 text-right font-bold w-24 text-slate-900 dark:text-white">
                                            ₹{item.amount}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Total allocation summary for this Date */}
                              <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50 mt-2 text-xs font-bold text-slate-700">
                                <span>Total Workers: {group.items.length}</span>
                                <span>Total Pay: <span className="text-sky-600 text-sm font-extrabold">₹{group.totalAmount}</span></span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Grand Total of All Work Allocation */}
                    <div className="flex justify-between items-center bg-sky-600/10 p-4 rounded-2xl border border-sky-500/25 mt-4 text-xs font-bold text-slate-800">
                      <div className="flex flex-col text-left">
                        <span className="text-purple-750 uppercase tracking-wider font-extrabold">Grand Total Pay</span>
                        <span className="text-[10px] text-sky-400 uppercase font-bold tracking-wider mt-0.5">(All Dates)</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-slate-450 text-[10px] uppercase font-extrabold tracking-wider">Total Pay</span>
                        <span className="text-sky-600 text-base font-black">₹{groupedByDate.reduce((sum, g) => sum + g.totalAmount, 0)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {isAddLogModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40" role="dialog" aria-modal="true" aria-labelledby="add-work-log-title">
                <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 id="add-work-log-title" className="text-base font-extrabold text-slate-800">Add Work Log</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Add a completed work record for today or any earlier date.</p>
                    </div>
                    <button type="button" onClick={() => setIsAddLogModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer" aria-label="Close add work log dialog">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Date
                      <input type="date" max={getLocalDateInputValue()} value={newLog.date} onChange={(e) => setNewLog((prev) => ({ ...prev, date: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500" />
                    </label>
                    <label className="flex flex-col gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Total amount
                      <input type="text" readOnly value={`₹${newLog.workerIds.length * AMOUNT_PER_WORKER}`} className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 cursor-default" />
                  </label>
                </div>

                  <div className="flex flex-col gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Worker
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsWorkerPickerOpen((isOpen) => !isOpen)}
                        aria-expanded={isWorkerPickerOpen}
                        aria-haspopup="listbox"
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold normal-case tracking-normal text-left text-slate-700 hover:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                      >
                        <span className={newLog.workerIds.length ? 'truncate' : 'text-slate-400'}>
                          {newLog.workerIds.length
                            ? roster.filter((worker: any) => newLog.workerIds.includes(worker.id)).map((worker: any) => formatWorkerName(worker.name)).join(', ')
                            : 'Select workers'}
                        </span>
                        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isWorkerPickerOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isWorkerPickerOpen && (
                        <div role="listbox" aria-multiselectable="true" className="absolute z-[60] top-[calc(100%+6px)] left-0 right-0 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl normal-case tracking-normal max-h-48 overflow-y-auto">
                          {roster.filter((worker: any) => worker.isActive !== false).map((worker: any) => {
                            const isSelected = newLog.workerIds.includes(worker.id);
                            return (
                              <button
                                key={worker.id}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => setNewLog((prev) => ({
                                  ...prev,
                                  workerIds: isSelected
                                    ? prev.workerIds.filter((id) => id !== worker.id)
                                    : [...prev.workerIds, worker.id],
                                }))}
                                className={`w-full min-h-10 px-3 py-2 rounded-lg flex items-center justify-between gap-3 text-left text-sm font-semibold transition-colors cursor-pointer ${isSelected ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'}`}
                              >
                                <span>{formatWorkerName(worker.name)}</span>
                                <span className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${isSelected ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300 bg-white'}`}>
                                  {isSelected && <Check className="w-3 h-3" />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <span className="normal-case tracking-normal text-[10px] font-medium text-slate-400">₹500 is added for each selected worker.</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Shift</span>
                    <div className="flex gap-2">
                      {['Tiffin', 'Lunch', 'Dinner'].map((shift) => (
                        <button key={shift} type="button" onClick={() => setNewLog((prev) => ({ ...prev, shift }))} className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${newLog.shift === shift ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-sky-300'}`}>
                          {shift}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setIsAddLogModalOpen(false)} className="px-3 py-2 rounded-lg text-xs font-extrabold text-slate-600 hover:bg-slate-100 cursor-pointer">Cancel</button>
                    <button type="button" onClick={handleCreateWorkLog} disabled={createWorkHistoryLogMutation.isPending} className="px-3 py-2 rounded-lg text-xs font-extrabold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-60 cursor-pointer flex items-center gap-1.5">
                      {createWorkHistoryLogMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add Log
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }


  // Filtered Cards for main view
const filteredWorks = sortedCompletedWorks;

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="glass-panel p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
        {/* Search & Add */}
        <div className="flex items-center gap-2 w-full flex-nowrap">
          <div className="relative flex-grow min-w-0 sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Search tasks..."
            />
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md hover:bg-sky-700 transition-colors select-none whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Add Work
          </button>
        </div>
      </div>

      {/* Main Content (Cards Grid) */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500 mb-2" />
          <span className="text-xs font-semibold">Loading tasks...</span>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-12 text-center p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Failed to load history</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {error instanceof Error ? error.message : 'Please check your connection and try again.'}
          </p>
        </div>
      ) : filteredWorks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Briefcase className="w-10 h-10 text-slate-350 dark:text-slate-500 mb-3" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Tasks Found</h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {searchTerm 
              ? 'Try refining your search terms.' 
              : 'Tasks will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {filteredWorks.map((work, index) => (
            <div 
              key={work.id} 
              onClick={() => {
                window.location.hash = `#history/${work.id}`;
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 hover:border-sky-500 dark:hover:border-sky-400 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3.5 group touch-active"
            >
              <div className="space-y-2.5">
                {(work as any).occurrencesCount > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400 rounded-md border border-sky-500/20">
                        {(work as any).occurrencesCount} Instances
                      </span>
                      <span className="text-[9px] text-slate-400 font-semibold">
                        Combined history from all occurrences
                      </span>
                    </div>
                  </div>
                )}
                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors text-sm md:text-base tracking-tight leading-snug text-left">
                  {index + 1}. {work.title}
                </h4>
                {work.description && 
                 work.description !== 'General Task Details' && 
                 work.description !== 'No description provided.' && (
                  <p className="text-xs text-slate-450 dark:text-slate-400 line-clamp-2 text-left">
                    {work.description}
                  </p>
                )}
              </div>

              {(work.location || (work.category && work.category !== 'General')) && (
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-455 dark:text-slate-400 font-bold">
                  {work.category && work.category !== 'General' ? (
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-350 dark:text-slate-500" />
                      <span>{work.category}</span>
                    </div>
                  ) : (
                    <div></div>
                  )}
                  {work.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-350 dark:text-slate-500" />
                      <span>{work.location}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <WorkFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultStatus="completed"
      />
    </div>
  );
}
