import { useState, useMemo } from 'react';
import CustomSelect from '../../components/ui/CustomSelect.tsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.ts';
import { useAppStore } from '../../lib/store.ts';
import { formatDate } from '../../lib/utils.ts';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  X,
  AlertCircle,
  Check
} from 'lucide-react';

interface Worker {
  id: string;
  name: string;
  phone: string;
  alternatePhone?: string | null;
  email: string;
  role: string;
  avatarUrl: string | null;
  isActive: boolean;
  activeAssignmentsCount: number;
  activeWorks: Array<{ id: string; title: string; status: string }>;
}

const formatWhatsAppLink = (phoneStr: string) => {
  const digitsOnly = phoneStr.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return `https://wa.me/91${digitsOnly}`;
  }
  return `https://wa.me/${digitsOnly}`;
};

const WhatsAppIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <img src="/whatsapp.png" alt="WhatsApp" className={`${className} object-contain`} />
);

export default function WorkerList() {
  const queryClient = useQueryClient();
  const { addToast, showConfirm } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [historyWorkerId, setHistoryWorkerId] = useState<string | null>(null);
  const sortOrder = 'desc';
  const [dateFilterType, setDateFilterType] = useState<string>('all'); // all, this-month, last-month, custom
  const [customFromDate, setCustomFromDate] = useState<string>('');
  const [customToDate, setCustomToDate] = useState<string>('');
  
  // Edit Assignment State
  const [isTableEditing, setIsTableEditing] = useState(false);
  const [editedAssignments, setEditedAssignments] = useState<Record<string, {
    assignedAt: string;
    workTitle: string;
    amount: string;
    shift: string;
  }>>({});

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Query: Get Workers
  const { data: workers = [], isLoading, isError, error } = useQuery<Worker[]>({
    queryKey: ['workers', searchTerm, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      return api.get<Worker[]>(`/workers?${params.toString()}`);
    },
  });

  // Query: Get Single Worker details with history
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['worker-history', historyWorkerId],
    queryFn: () => api.get<any>(`/workers/${historyWorkerId}`),
    enabled: !!historyWorkerId,
  });

  // Query: Get all works for select list
  const { data: works = [] } = useQuery<any[]>({
    queryKey: ['works-list-for-select'],
    queryFn: () => api.get<any[]>('/works'),
  });

  const uniqueWorkTitles = useMemo(() => {
    const titles = new Set<string>();
    works.forEach((w: any) => {
      if (w.title) titles.add(w.title);
    });
    // Add existing edited work titles to the options just in case
    Object.values(editedAssignments).forEach((edit: any) => {
      if (edit.workTitle) titles.add(edit.workTitle);
    });
    // Add initial work titles from historyData as well
    if (historyData && historyData.assignments) {
      historyData.assignments.forEach((a: any) => {
        if (a.workTitle) titles.add(a.workTitle);
      });
    }
    return Array.from(titles).sort((a, b) => a.localeCompare(b));
  }, [works, editedAssignments, historyData]);

  const filteredAssignments = useMemo(() => {
    if (!historyData || !historyData.assignments) return [];
    const now = new Date();
    let startLimit: Date | null = null;
    let endLimit: Date | null = null;

    if (dateFilterType === 'this-month') {
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

    // Filter assignments
    const filtered = historyData.assignments.filter((assignment: any) => {
      if (assignment.unassignedAt !== null) return false;
      const assignedDate = new Date(assignment.assignedAt);
      if (startLimit && assignedDate < startLimit) return false;
      if (endLimit && assignedDate > endLimit) return false;
      return true;
    });

    // Sort assignments
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.assignedAt).getTime();
      const dateB = new Date(b.assignedAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [historyData, dateFilterType, customFromDate, customToDate]);

  const groupedAssignments = useMemo(() => {
    interface GroupedAssignment {
      id: string;
      assignedAt: string;
      workId: string;
      workTitle: string;
      shifts: string[];
      amount: number;
      originalAssignments: any[];
    }
    const grouped: GroupedAssignment[] = [];
    if (!filteredAssignments) return grouped;
    for (const assignment of filteredAssignments) {
      const wId = assignment.work.id;
      const dateKey = new Date(assignment.assignedAt).toDateString();
      const existing = grouped.find(g => g.workId === wId && new Date(g.assignedAt).toDateString() === dateKey);
      const fallbackAmt = assignment.amount !== null && assignment.amount !== undefined ? assignment.amount : 500;
      if (existing) {
        if (!existing.shifts.includes(assignment.shift || 'Tiffin')) {
          existing.shifts.push(assignment.shift || 'Tiffin');
        }
        existing.amount += fallbackAmt;
        existing.originalAssignments.push(assignment);
      } else {
        grouped.push({
          id: assignment.id,
          assignedAt: assignment.assignedAt,
          workId: wId,
          workTitle: assignment.work.title,
          shifts: [assignment.shift || 'Tiffin'],
          amount: fallbackAmt,
          originalAssignments: [assignment]
        });
      }
    }
    return grouped;
  }, [filteredAssignments]);

  // Mutation: Create Worker
  const createWorkerMutation = useMutation({
    mutationFn: (newWorker: any) => api.post('/workers', newWorker),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      addToast('Worker added successfully', 'success');
      closeModal();
    },
    onError: (err: any) => {
      addToast(err.message || 'Failed to add worker', 'error');
    },
  });

  // Mutation: Update Worker
  const updateWorkerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/workers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      addToast('Worker updated successfully', 'success');
      closeModal();
    },
    onError: (err: any) => {
      addToast(err.message || 'Failed to update worker', 'error');
    },
  });

  // Mutation: Delete Worker
  const deleteWorkerMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/workers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      addToast('Worker deleted successfully', 'success');
      setHistoryWorkerId(null);
    },
    onError: (err: any) => {
      addToast(err.message || 'Failed to delete worker', 'error');
    },
  });



  // Mutation: Toggle Active Switch
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/workers/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      addToast(err.message || 'Failed to toggle status', 'error');
    },
  });

  const openAddModal = () => {
    setEditingWorker(null);
    setName('');
    setPhone('');
    setAlternatePhone('');
    setEmail('');
    setRole('');
    setAvatarUrl('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (worker: Worker) => {
    setEditingWorker(worker);
    setName(worker.name);
    setPhone(worker.phone);
    setAlternatePhone(worker.alternatePhone || '');
    setEmail(worker.email);
    setRole(worker.role);
    setAvatarUrl(worker.avatarUrl || '');
    setIsActive(worker.isActive);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingWorker(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        addToast('Image size should be less than 10MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      addToast('Please fill in name and phone number', 'error');
      return;
    }

    if (phone.length !== 10) {
      addToast('Phone number must be exactly 10 digits', 'error');
      return;
    }

    if (alternatePhone && alternatePhone.length !== 10) {
      addToast('Alternate phone number must be exactly 10 digits', 'error');
      return;
    }

    // Default values for new workers to satisfy non-nullable backend database schema
    const finalRole = role || 'Staff';
    const finalEmail = email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'worker'}@example.com`;

    const payload = {
      name,
      phone,
      alternatePhone: alternatePhone || null,
      email: finalEmail,
      role: finalRole,
      avatarUrl: avatarUrl || undefined,
      isActive,
    };

    if (editingWorker) {
      updateWorkerMutation.mutate({ id: editingWorker.id, data: payload });
    } else {
      createWorkerMutation.mutate(payload);
    }
  };



  const handleDeleteWorker = (worker: any) => {
    const activeTasks = worker.activeAssignments?.filter((a: any) => a.work?.status !== 'completed') || [];
    if (activeTasks.length > 0) {
      const taskNames = activeTasks.map((t: any) => t.work?.title).join(', ');
      addToast(
        `Cannot delete worker: Currently assigned to active tasks (${taskNames}). Please complete or unassign these tasks first.`,
        'error'
      );
      return;
    }

    showConfirm({
      title: 'Delete Worker Profile?',
      message: `Are you sure you want to permanently delete ${worker.name}? All of their work history logs and assignments will be deleted permanently. This action cannot be undone.`,
      confirmText: 'Delete Worker',
      isDestructive: true,
      onConfirm: () => deleteWorkerMutation.mutate(worker.id),
    });
  };

  const handleToggleActive = (worker: Worker) => {
    toggleActiveMutation.mutate({ id: worker.id, isActive: !worker.isActive });
  };

  // Mutation: Bulk Update Assignments Details
  const updateBulkAssignmentsMutation = useMutation({
    mutationFn: async (payloads: { id: string; payload: any }[]) => {
      const promises = payloads.map(({ id, payload }) =>
        api.put(`/assignments/${id}`, payload)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-history', historyWorkerId] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      addToast('All work history logs saved successfully', 'success');
      setIsTableEditing(false);
    },
    onError: (err: any) => {
      addToast(err.message || 'Failed to update work history logs', 'error');
    }
  });

  // Mutation: Delete Assignment(s)
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const promises = ids.map((id) => api.delete(`/assignments/${id}`));
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-history', historyWorkerId] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      addToast('Assignment record deleted successfully', 'success');
    },
    onError: (err: any) => {
      addToast(err.message || 'Failed to delete assignment', 'error');
    }
  });

  const handleDeleteAssignment = (assignment: any) => {
    const allIds = assignment.originalAssignments.map((a: any) => a.id);
    showConfirm({
      title: 'Delete Assignment Record?',
      message: `Are you sure you want to permanently delete this work log entry (${assignment.workTitle} - ${assignment.shifts.join(' & ')})? This action cannot be undone.`,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: () => {
        deleteAssignmentMutation.mutate(allIds);
      }
    });
  };

  const updateRowField = (id: string, field: string, value: string) => {
    setEditedAssignments((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleStartBulkEdit = () => {
    const initialEdits: Record<string, any> = {};
    groupedAssignments.forEach((assignment: any) => {
      const dateObj = new Date(assignment.assignedAt);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      initialEdits[assignment.id] = {
        assignedAt: `${yyyy}-${mm}-${dd}`,
        workTitle: assignment.workTitle,
        amount: assignment.amount.toString(),
        shift: assignment.shifts.length === 1 ? assignment.shifts[0] : assignment.shifts.join(' & '),
      };
    });
    setEditedAssignments(initialEdits);
    setIsTableEditing(true);
  };

  const handleSaveBulkEdits = (visibleAssignments: any[]) => {
    const payloadsToSave: { id: string; payload: any }[] = [];

    for (const assignment of visibleAssignments) {
      const edits = editedAssignments[assignment.id];
      if (!edits) continue;

      if (!edits.workTitle.trim()) {
        addToast(`Work title for row cannot be empty`, 'error');
        return;
      }
      if (!edits.assignedAt) {
        addToast(`Date is required for all rows`, 'error');
        return;
      }

      // Format original date to match YYYY-MM-DD
      const origDateObj = new Date(assignment.assignedAt);
      const origYYYY = origDateObj.getFullYear();
      const origMM = String(origDateObj.getMonth() + 1).padStart(2, '0');
      const origDD = String(origDateObj.getDate()).padStart(2, '0');
      const originalDateStr = `${origYYYY}-${origMM}-${origDD}`;

      const originalAmountStr = assignment.amount.toString();
      const originalShiftStr = assignment.shifts.length === 1 ? assignment.shifts[0] : assignment.shifts.join(' & ');

      const hasChanged =
        edits.workTitle !== assignment.workTitle ||
        edits.assignedAt !== originalDateStr ||
        edits.amount !== originalAmountStr ||
        edits.shift !== originalShiftStr;

      if (hasChanged) {
        const totalEditedAmt = parseFloat(edits.amount) || 0;
        const count = assignment.originalAssignments.length;
        const amtPerShift = totalEditedAmt / count;

        for (const orig of assignment.originalAssignments) {
          const finalShift = assignment.shifts.length === 1 ? edits.shift : orig.shift;
          payloadsToSave.push({
            id: orig.id,
            payload: {
              assignedAt: new Date(edits.assignedAt).toISOString(),
              workTitle: edits.workTitle,
              amount: amtPerShift,
              shift: finalShift,
            }
          });
        }
      }
    }

    if (payloadsToSave.length === 0) {
      addToast('No changes detected', 'info');
      setIsTableEditing(false);
      return;
    }

    showConfirm({
      title: 'Save Work History Changes?',
      message: `Are you sure you want to save modifications to ${payloadsToSave.length} record(s)?`,
      confirmText: 'Save Changes',
      onConfirm: () => {
        updateBulkAssignmentsMutation.mutate(payloadsToSave);
      }
    });
  };

  const handleSaveAllEdits = () => {
    handleSaveBulkEdits(groupedAssignments);
  };

  if (historyWorkerId) {
    return (
      <div className="space-y-6 max-w-3xl">
        {/* Back navigation header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setHistoryWorkerId(null);
              setDateFilterType('all');
              setCustomFromDate('');
              setCustomToDate('');
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer select-none whitespace-nowrap shrink-0"
          >
            ← Back
          </button>
        </div>

        {isLoadingHistory || !historyData ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 animate-scale-in">
            {/* Header profile card */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 relative bg-white dark:bg-slate-950">
              <div className="flex items-start gap-4 min-w-0 flex-grow">
                <img
                  src={historyData.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(historyData.name)}`}
                  alt={`${historyData.name} profile photo`}
                  loading="eager"
                  decoding="async"
                  className="w-14 h-14 rounded-xl object-cover border border-slate-100 dark:border-slate-800 shrink-0"
                />
                <div className="min-w-0 flex-grow">
                  <h2 className="text-lg font-display font-extrabold text-slate-900 dark:text-white truncate">
                    {historyData.name}
                  </h2>
                  
                  {/* Phone list with individual Call & WhatsApp buttons */}
                  <div className="flex flex-col gap-2 mt-2 max-w-sm w-full">
                    {/* Primary phone */}
                    <div className="flex items-center justify-between gap-4 py-1 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-350">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{historyData.phone}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={`tel:${historyData.phone}`}
                          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40"
                          title="Call Primary Number"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={formatWhatsAppLink(historyData.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-105 active:scale-95 overflow-hidden"
                          title="WhatsApp Primary Number"
                        >
                          <WhatsAppIcon className="w-full h-full" />
                        </a>
                      </div>
                    </div>

                    {/* Alternate phone (if registered) */}
                    {historyData.alternatePhone && (
                      <div className="flex items-center justify-between gap-4 py-1 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-450">
                          <Phone className="w-3 h-3 text-slate-300 dark:text-slate-700 shrink-0" />
                          <span>{historyData.alternatePhone}</span>
                          <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded ml-1">ALT</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={`tel:${historyData.alternatePhone}`}
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 shadow-sm"
                            title="Call Alternate Number"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={formatWhatsAppLink(historyData.alternatePhone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-105 active:scale-95 shadow-sm overflow-hidden"
                            title="WhatsApp Alternate Number"
                          >
                            <WhatsAppIcon className="w-full h-full" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Delete button absolute-positioned in the top-right corner */}
              <button
                onClick={() => handleDeleteWorker(historyData)}
                aria-label={`Delete worker profile for ${historyData.name}`}
                className="absolute top-5 right-5 p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-500/10 border border-slate-200 dark:border-slate-800 rounded-lg transition-all cursor-pointer shadow-sm hover:shadow shrink-0"
                title="Delete Worker"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Date Filters block */}
            <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 select-none">Filter Logs By Date</h3>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  <CustomSelect
                    value={dateFilterType}
                    onChange={setDateFilterType}
                    options={[
                      { value: 'all', label: 'All Time' },
                      { value: 'this-month', label: 'This Month' },
                      { value: 'last-month', label: 'Last Month' },
                      { value: 'custom', label: 'Custom Date Range' },
                    ]}
                    size="sm"
                    className="flex-grow sm:flex-grow-0 sm:w-auto"
                  />
                </div>
              </div>

              {/* Custom Date inputs shown only when custom is selected */}
              {dateFilterType === 'custom' && (
                <div className="flex items-center gap-2 animate-scale-in text-xs bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md self-start sm:self-end w-full sm:w-auto">
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">From Date</span>
                    <input
                      type="date"
                      value={customFromDate}
                      onChange={(e) => setCustomFromDate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">To Date</span>
                    <input
                      type="date"
                      value={customToDate}
                      onChange={(e) => setCustomToDate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className={`glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 ${isTableEditing ? 'overflow-x-auto' : 'overflow-hidden'}`}>
              <div className={isTableEditing ? 'min-w-max' : 'w-full'}>
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Work History</h3>
                {filteredAssignments.length > 0 && (
                  <div>
                    {isTableEditing ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsTableEditing(false)}
                          className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-extrabold transition-colors flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          <X className="w-3 h-3" /> Cancel
                        </button>
                        <button
                          onClick={handleSaveAllEdits}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-extrabold shadow transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" /> Save All
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleStartBulkEdit}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-extrabold shadow transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" /> Edit Logs
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="overflow-visible">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-900/5 select-none">
                      {isTableEditing && <th className="py-3 px-1 w-8 text-center"></th>}
                      <th className="py-3 px-1 w-8 text-center">SI No.</th>
                      <th className={`py-3 px-1.5 ${isTableEditing ? 'w-44 min-w-[165px]' : 'w-24 min-w-[90px]'}`}>Date & Shift</th>
                      <th className={`py-3 px-1.5 ${isTableEditing ? 'min-w-[150px]' : 'min-w-[100px]'}`}>Work</th>
                      <th className={`py-3 pl-1.5 pr-5 text-right ${isTableEditing ? 'w-24' : 'w-16'}`}>Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {(() => {
                      if (filteredAssignments.length === 0) {
                        return (
                          <tr>
                            <td colSpan={isTableEditing ? 5 : 4} className="text-xs italic text-slate-455 py-12 text-center">
                              No assignments found matching the selected date filters.
                            </td>
                          </tr>
                        );
                      }

                      const totalAmount = groupedAssignments.reduce((sum: number, item: any) => sum + item.amount, 0);

                      return (
                        <>
                          {groupedAssignments.map((assignment: any, index: number) => {
                            const edits = editedAssignments[assignment.id];
                            return (
                              <tr
                                key={assignment.id}
                                className={`transition-colors ${
                                  isTableEditing
                                    ? 'bg-slate-50/60 dark:bg-slate-900/30 hover:bg-slate-100/50 dark:hover:bg-slate-800/30'
                                    : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/10'
                                }`}
                              >
                                {isTableEditing && (
                                  <td className="py-2 px-1 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAssignment(assignment)}
                                      aria-label={`Delete log entry for ${assignment.workTitle}`}
                                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all cursor-pointer"
                                      title="Delete this record"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                  </td>
                                )}
                                <td className="py-2 px-1 text-center text-slate-400 text-[10px] font-bold">{index + 1}</td>
                                
                                {/* Date & Shift Column */}
                                <td className="py-2 px-1.5 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                                  {isTableEditing && edits ? (
                                    <div className="flex flex-col gap-1.5 w-full min-w-[160px] max-w-[170px]">
                                      <input
                                        type="date"
                                        value={edits.assignedAt}
                                        onChange={(e) => updateRowField(assignment.id, 'assignedAt', e.target.value)}
                                        className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-250 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                                      />
                                      <div className="flex gap-1">
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
                                                  updateRowField(assignment.id, 'shift', nextShifts.join(' & '));
                                                }
                                              }}
                                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer select-none ${
                                                isSelected
                                                  ? 'bg-sky-600 text-white border-sky-600'
                                                  : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                                              }`}
                                            >
                                              {s}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-1 items-start">
                                      <span>
                                        {(() => {
                                          const fullDate = formatDate(assignment.assignedAt);
                                          const pts = fullDate.split('/');
                                          return pts.length === 3 ? `${pts[0]}/${pts[1]}/${pts[2].slice(-2)}` : fullDate;
                                        })()}
                                      </span>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 text-purple-650 dark:text-sky-400 whitespace-nowrap">
                                        {assignment.shifts.join(' & ')}
                                      </span>
                                    </div>
                                  )}
                                </td>

                                {/* Work Column */}
                                <td className={`py-2 px-1.5 text-xs font-extrabold text-slate-900 dark:text-white break-words ${isTableEditing ? 'min-w-[150px]' : 'min-w-[100px]'}`}>
                                  {isTableEditing && edits ? (
                                    <CustomSelect
                                      value={edits.workTitle}
                                      onChange={(val) => updateRowField(assignment.id, 'workTitle', val)}
                                      options={uniqueWorkTitles.map((title) => ({ value: title, label: title }))}
                                      placeholder="Select Work"
                                      size="sm"
                                    />
                                  ) : (
                                    assignment.workTitle
                                  )}
                                </td>

                                {/* Amount Column */}
                                <td className={`py-2 pl-1.5 pr-5 text-right text-slate-750 dark:text-slate-350 font-bold ${isTableEditing ? 'w-24' : 'w-16'}`}>
                                  {isTableEditing && edits ? (
                                    <div className="flex items-center gap-0.5 justify-end">
                                      <span className="text-[10px] text-slate-400 dark:text-slate-555 font-extrabold select-none">₹</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentVal = parseFloat(edits.amount) || 0;
                                          const newVal = Math.max(0, currentVal - 50);
                                          updateRowField(assignment.id, 'amount', newVal === 0 ? '' : newVal.toString());
                                        }}
                                        className="w-5 h-5 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded border border-slate-200/65 dark:border-slate-700/80 transition-colors select-none text-[10px] font-black cursor-pointer shadow-sm"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        value={edits.amount}
                                        onChange={(e) => updateRowField(assignment.id, 'amount', e.target.value)}
                                        placeholder="500"
                                        className="w-10 text-center px-0.5 py-0.5 text-xs rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-750 dark:text-slate-250 focus:outline-none focus:ring-1 focus:ring-sky-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentVal = parseFloat(edits.amount) || 0;
                                          const newVal = currentVal + 50;
                                          updateRowField(assignment.id, 'amount', newVal.toString());
                                        }}
                                        className="w-5 h-5 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded border border-slate-200/65 dark:border-slate-700/80 transition-colors select-none text-[10px] font-black cursor-pointer shadow-sm"
                                      >
                                        +
                                      </button>
                                    </div>
                                  ) : (
                                    `₹${assignment.amount}`
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Total Row */}
                          <tr className="bg-slate-50/20 dark:bg-slate-900/10 border-t-2 border-slate-200 dark:border-slate-800 font-extrabold select-none">
                            <td colSpan={isTableEditing ? 4 : 3} className="py-3 px-1.5 text-left text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                              Total Earnings
                            </td>
                            <td className="py-3 pl-1.5 pr-5 text-right text-sm font-black text-sky-600 dark:text-sky-400 whitespace-nowrap">
                              ₹{totalAmount}
                            </td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search and Action Bar */}
      <div className="glass-panel p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-grow max-w-3xl">
          {/* Search Box */}
          <div className="relative flex-grow max-w-sm w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Search by name or number..."
            />
          </div>

          {/* Status Filter */}
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active Only' },
              { value: 'inactive', label: 'Inactive Only' },
            ]}
            size="sm"
            className="w-auto"
          />
        </div>

        {/* Add Action */}
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md hover:bg-sky-700 transition-colors select-none"
        >
          <UserPlus className="w-4 h-4" /> Add Worker
        </button>
      </div>

      {/* Grid of Worker Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-12 text-center p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Failed to load Workers</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {error instanceof Error ? error.message : 'Please check your connection and try again.'}
          </p>
        </div>
      ) : workers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Users className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No workers found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            Try adjusting your search criteria or register a new worker using the button above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...workers]
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }))
            .map((worker) => (
            <div
              key={worker.id}
              onClick={() => setHistoryWorkerId(worker.id)}
              className={`cursor-pointer bg-white dark:bg-slate-900 border rounded-xl shadow-sm hover:shadow-md hover:border-sky-500/25 dark:hover:border-sky-500/15 p-3.5 relative overflow-hidden transition-all flex flex-col justify-between ${
                worker.isActive
                  ? 'border-slate-200 dark:border-slate-800'
                  : 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50/50 dark:bg-slate-900/40'
              }`}
            >
              <div>
                {/* Header: Photo, Name, Contact Numbers, and Quick Actions */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-grow">
                    <img
                      src={worker.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(worker.name)}`}
                      alt={`${worker.name} profile photo`}
                      loading="lazy"
                      decoding="async"
                      className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-100 dark:border-slate-800"
                    />
                    <div className="min-w-0 space-y-1 flex-grow">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">{worker.name}</h3>
                      <div className="flex flex-col gap-1 text-[13px] text-slate-500 dark:text-slate-400">
                        {/* Primary Number */}
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{worker.phone}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Dial and Message Icons */}
                  <div className="flex items-center gap-2 shrink-0 self-center" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={`tel:${worker.phone}`}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 shadow-sm"
                      title="Call Worker"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={formatWhatsAppLink(worker.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95 shadow-sm overflow-hidden"
                      title="WhatsApp Message"
                    >
                      <WhatsAppIcon className="w-full h-full" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div className="mt-2.5 border-t border-slate-100 dark:border-slate-800/80 pt-2 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                {/* Active Toggle Switch */}
                <button
                  onClick={() => handleToggleActive(worker)}
                  aria-label={`${worker.isActive ? 'Deactivate' : 'Activate'} ${worker.name}`}
                  aria-pressed={worker.isActive}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 cursor-pointer"
                >
                  {worker.isActive ? (
                    <>
                      <ToggleRight className="w-5 h-5 text-green-500" aria-hidden="true" /> Active
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5 text-slate-400 dark:text-slate-600" aria-hidden="true" /> Inactive
                    </>
                  )}
                </button>

                {/* Edit */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(worker)}
                    aria-label={`Edit details for ${worker.name}`}
                    className="p-1.5 text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Edit Worker Info"
                  >
                    <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CRUD Modal/Drawer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              aria-label="Close worker form"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <h3 className="text-md font-display font-extrabold text-slate-900 dark:text-white mb-6">
              {editingWorker ? 'Edit Worker Details' : 'Register New Worker'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm"
                  placeholder="Arjun Patel"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) {
                      setPhone(val);
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm"
                  placeholder="Enter 10-digit number"
                />
              </div>

              {/* Alternate Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Alternate Number
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={alternatePhone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) {
                      setAlternatePhone(val);
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm"
                  placeholder="Enter 10-digit alternate number"
                />
              </div>

              {/* Profile Image */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Profile Image
                </label>
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <img
                    src={avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'Worker')}`}
                    alt={`Preview of ${name || 'worker'} photo`}
                    loading="lazy"
                    decoding="async"
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                  />
                  <div className="flex flex-col gap-1.5 min-w-0 flex-grow">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border file:border-slate-200 dark:file:border-slate-850 file:text-[10px] file:font-bold file:uppercase file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 file:cursor-pointer hover:file:bg-slate-200 dark:hover:file:bg-slate-700 transition-all"
                    />
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="text-[10px] text-red-500 hover:text-red-650 hover:underline text-left self-start cursor-pointer font-bold uppercase tracking-wider"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Active Toggle Option in form */}
              <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800/80 mt-4 pt-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Is Active Profile</span>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className="cursor-pointer"
                >
                  {isActive ? (
                    <ToggleRight className="w-7 h-7 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-400 dark:text-slate-600" />
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWorkerMutation.isPending || updateWorkerMutation.isPending}
                  className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md hover:bg-sky-700 transition-colors flex items-center gap-1.5"
                >
                  {(createWorkerMutation.isPending || updateWorkerMutation.isPending) && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {editingWorker ? 'Save Changes' : 'Register Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
