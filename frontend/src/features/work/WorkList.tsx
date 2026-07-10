import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.ts';
import { useAppStore } from '../../lib/store.ts';
import { formatDate } from '../../lib/utils.ts';
import WorkFormModal from './WorkFormModal.tsx';
import {
  Briefcase,
  Search,
  Plus,
  Calendar,
  UserPlus,
  Loader2,
  X,
  Edit2,
  Trash2,
  List,
  Kanban,
  AlertCircle
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
}

interface AssignmentLog {
  id: string;
  workerId: string;
  workerName: string;
  workerAvatarUrl: string | null;
  assignedAt: string;
  unassignedAt: string | null;
}

interface WorkDetails extends Work {
  activeWorkers: Worker[];
  assignmentHistory: AssignmentLog[];
}

interface WorkListProps {
  initialSelectedWorkId?: string | null;
  onClearSelection?: () => void;
}

export default function WorkList({ initialSelectedWorkId = null, onClearSelection }: WorkListProps) {
  const queryClient = useQueryClient();
  const { addToast, showConfirm } = useAppStore();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [activeMobileTab, setActiveMobileTab] = useState<'today' | 'tomorrow' | 'upcoming'>('today');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(initialSelectedWorkId);



  // Worker selector command-palette state
  const [isEditingAssignments, setIsEditingAssignments] = useState(false);
  const [isEditingAssignmentDetails, setIsEditingAssignmentDetails] = useState(false);
  const [isEditingSelectedAssignment, setIsEditingSelectedAssignment] = useState(false);
  const [localAssignments, setLocalAssignments] = useState<Array<{
    workerId: string;
    shift: string;
    amount: number;
  }>>([]);
  const [isAssignPopupOpen, setIsAssignPopupOpen] = useState(false);
  const [selectedWorkerIdForAssign, setSelectedWorkerIdForAssign] = useState('');
  const [selectedShifts, setSelectedShifts] = useState<string[]>(['Tiffin']);
  const [customAmount, setCustomAmount] = useState('500');

  // Query: Get Work items
  const { data: works = [], isLoading, isError, error } = useQuery<Work[]>({
    queryKey: ['works', searchTerm],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      return api.get<Work[]>(`/works?${params.toString()}`);
    },
  });

  // Query: Get Workers roster for assignment
  const { data: roster = [] } = useQuery<Worker[]>({
    queryKey: ['workers', 'active'],
    queryFn: () => api.get<Worker[]>('/workers?status=active'),
  });

  // Query: Get single work details when modal is open
  const { data: workDetails, isLoading: isLoadingDetails } = useQuery<WorkDetails>({
    queryKey: ['work-details', selectedWorkId],
    queryFn: () => api.get<WorkDetails>(`/works/${selectedWorkId}`),
    enabled: !!selectedWorkId,
  });

  // Synchronize local selected workers state with fetched details
  useEffect(() => {
    setIsEditingAssignments(false);
    setIsEditingAssignmentDetails(false);
    if (workDetails) {
      setLocalAssignments(
        workDetails.activeWorkers.map((w: any) => ({
          workerId: w.id,
          shift: w.shift || 'Tiffin',
          amount: w.amount !== null && w.amount !== undefined ? w.amount : 500,
        }))
      );
    } else {
      setLocalAssignments([]);
    }
  }, [workDetails]);





  // Mutation: Delete Work
  const deleteWorkMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/works/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['worker-history'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      addToast('Work task deleted successfully', 'info');
      setSelectedWorkId(null);
      if (onClearSelection) onClearSelection();
    },
    onError: (err: any) => addToast(err.message || 'Failed to delete work', 'error'),
  });



  // Mutation: Synchronize Worker Assignments (Batch save)
  const syncAssignmentsMutation = useMutation({
    mutationFn: ({ workId, assignments }: { workId: string; assignments: any[] }) =>
      api.post('/assignments/sync', { workId, assignments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works'] });
      queryClient.invalidateQueries({ queryKey: ['work-details', selectedWorkId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['worker-history'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      addToast('Worker assignments saved successfully', 'success');
      setIsEditingAssignments(false);
      setIsEditingAssignmentDetails(false);
    },
    onError: (err: any) => addToast(err.message || 'Failed to save assignments', 'error'),
  });

  const openAddModal = () => {
    setEditingWork(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (work: Work) => {
    setEditingWork(work);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setEditingWork(null);
  };

  const handleDeleteWork = (id: string) => {
    showConfirm({
      title: 'Delete Task?',
      message: 'Are you sure you want to permanently delete this task? All history logs will be lost.',
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: () => deleteWorkMutation.mutate(id),
    });
  };



  const handleSaveAssignments = () => {
    if (!selectedWorkId) return;
    syncAssignmentsMutation.mutate({ workId: selectedWorkId, assignments: localAssignments });
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Search + Create Button + Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-grow min-w-0">
          {/* Search Box + Add Work Button Group (always inline) */}
          <div className="flex items-center gap-2 flex-grow max-w-sm w-full flex-nowrap">
            {/* Search Box */}
            <div className="relative flex-grow min-w-0">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Search by title, location..."
              />
            </div>

            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-md hover:bg-sky-700 transition-colors select-none whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Work
            </button>
          </div>


        </div>

        {/* Right Side: View toggle Action */}
        <div className="flex items-center gap-3 shrink-0 self-end lg:self-auto select-none">
          {/* View Toggles */}
          <div className="hidden lg:flex bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'kanban' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-400'
              }`}
              title="Board view"
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-400'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Areas */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-12 text-center p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Failed to load Work Tasks</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {error instanceof Error ? error.message : 'Please check your connection and try again.'}
          </p>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Board View */
        <div className="flex flex-col gap-4">
          {/* Mobile Tab Selector */}
          <div className="flex md:hidden bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-850 gap-1 mb-2 select-none">
            {(['today', 'tomorrow', 'upcoming'] as const).map((tab) => {
              const count = works.filter((w) => {
                if (!w.dueDate) return tab === 'upcoming';
                const taskDate = new Date(w.dueDate);
                if (isNaN(taskDate.getTime())) return tab === 'upcoming';

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const taskYear = taskDate.getUTCFullYear();
                const taskMonth = taskDate.getUTCMonth();
                const taskDay = taskDate.getUTCDate();
                const taskLocalMidnight = new Date(taskYear, taskMonth, taskDay, 0, 0, 0, 0);

                const diffTime = taskLocalMidnight.getTime() - today.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                if (tab === 'today') return diffDays === 0;
                if (tab === 'tomorrow') return diffDays === 1;
                return diffDays >= 2;
              }).length;

              let tabLabel = 'Today';
              let activeTextClass = 'text-sky-600 dark:text-sky-400';
              let activeBgClass = 'bg-white dark:bg-slate-900 shadow-sm';
              let dotColor = 'bg-sky-500';

              if (tab === 'tomorrow') {
                tabLabel = 'Tomorrow';
                activeTextClass = 'text-blue-600 dark:text-blue-400';
                dotColor = 'bg-blue-500';
              } else if (tab === 'upcoming') {
                tabLabel = 'Upcoming';
                activeTextClass = 'text-green-600 dark:text-green-400';
                dotColor = 'bg-emerald-500';
              }

              const isActive = activeMobileTab === tab;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveMobileTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    isActive
                      ? `${activeBgClass} ${activeTextClass}`
                      : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                  <span>{tabLabel}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    isActive 
                      ? 'bg-slate-100 dark:bg-slate-800' 
                      : 'bg-slate-200/50 dark:bg-slate-900'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['today', 'tomorrow', 'upcoming'] as const).map((columnGroup) => {
              const columnTasks = works.filter((w) => {
                if (!w.dueDate) return columnGroup === 'upcoming';
                const taskDate = new Date(w.dueDate);
                if (isNaN(taskDate.getTime())) return columnGroup === 'upcoming';

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const taskYear = taskDate.getUTCFullYear();
                const taskMonth = taskDate.getUTCMonth();
                const taskDay = taskDate.getUTCDate();
                const taskLocalMidnight = new Date(taskYear, taskMonth, taskDay, 0, 0, 0, 0);

                const diffTime = taskLocalMidnight.getTime() - today.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                if (columnGroup === 'today') {
                  return diffDays === 0;
                } else if (columnGroup === 'tomorrow') {
                  return diffDays === 1;
                } else {
                  return diffDays >= 2;
                }
              });

              const sortedTasks = [...columnTasks].sort((a, b) => {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
              });
              
              let statusTitle = 'Today';
              let columnDotColor = 'bg-sky-500';
              if (columnGroup === 'tomorrow') {
                statusTitle = 'Tomorrow';
                columnDotColor = 'bg-blue-500';
              } else if (columnGroup === 'upcoming') {
                statusTitle = 'Upcoming';
                columnDotColor = 'bg-emerald-500';
              }

              return (
                <div
                  key={columnGroup}
                  className={`bg-slate-50/60 dark:bg-slate-900/20 border border-slate-150 dark:border-slate-800/50 rounded-3xl p-5 flex-col h-[680px] ${
                    activeMobileTab === columnGroup ? 'flex' : 'hidden md:flex'
                  }`}
                >
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/50 shrink-0">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-650 dark:text-slate-400 flex items-center gap-2 select-none">
                      <span className={`w-2.5 h-2.5 rounded-full ${columnDotColor} shadow-sm`} />
                      <span>{statusTitle}</span>
                      <span className="text-[10px] bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-full font-extrabold text-slate-600 dark:text-slate-450">
                        {sortedTasks.length}
                      </span>
                    </h3>
                  </div>

                  <div className="flex-grow overflow-y-auto space-y-4 pr-1">
                    {sortedTasks.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-white/20 dark:bg-slate-950/20">
                        No tasks in this section
                      </div>
                    ) : (
                      sortedTasks.map((work) => (
                        <WorkCard
                          key={work.id}
                          work={work}
                          onClick={() => setSelectedWorkId(work.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold bg-slate-50 dark:bg-slate-900/40 select-none">
                  <th className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-tl-2xl">Work Place</th>
                  <th className="p-4 bg-slate-50 dark:bg-slate-900/40">Date</th>
                  <th className="p-4 bg-slate-50 dark:bg-slate-900/40">Assigned Workers</th>
                  <th className="p-4 text-right bg-slate-50 dark:bg-slate-900/40 rounded-tr-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {works.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      No work tasks registered or matching search filters.
                    </td>
                  </tr>
                ) : (
                  works.map((work) => (
                    <tr
                      key={work.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/10 cursor-pointer transition-colors"
                      onClick={() => setSelectedWorkId(work.id)}
                    >
                      <td className="p-4 max-w-xs">
                        <p className="font-bold text-slate-800 dark:text-slate-200 hover:text-sky-500 transition-colors truncate">
                          {work.title}
                        </p>
                      </td>
                      <td className="p-4 text-xs font-semibold">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(work.dueDate)}
                        </span>
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <AvatarStack workers={work.assignedWorkers} />
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(work)}
                            className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit task details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteWork(work.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Creation/Editing Modal */}
      <WorkFormModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        editingWork={editingWork}
      />

      {/* Task Details & Assignment Drawer/Modal */}
      {selectedWorkId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 50 }}>
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-sky-500" /> Work details
              </span>
              <button
                onClick={() => {
                  setSelectedWorkId(null);
                  if (onClearSelection) onClearSelection();
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Container */}
            {isLoadingDetails || !workDetails ? (
              <div className="flex-grow flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex-grow overflow-y-auto p-5 space-y-4">
                  {/* General Info & Details */}
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase badge-${workDetails.status}`}>
                        {workDetails.status.replace('_', ' ')}
                      </span>
                      {/* Date indicator */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-slate-900/40 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800/60 shrink-0">
                        <Calendar className="w-4 h-4 text-sky-500" />
                        <span>{formatDate(workDetails.dueDate)}</span>
                      </div>
                    </div>

                    <h2 className="text-base font-display font-extrabold text-slate-900 dark:text-white leading-snug">
                      {workDetails.title}
                    </h2>

                    {/* Actions Section */}
                    <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        onClick={() => openEditModal(workDetails)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer select-none text-slate-600 dark:text-slate-300"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit details
                      </button>
                      <button
                        onClick={() => handleDeleteWork(workDetails.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Task
                      </button>
                    </div>
                  </div>

                  {/* Section Separator */}
                  <div className="border-t border-slate-100 dark:border-slate-800 my-2" />

                  {/* Assign Panel */}
                  <div className="bg-slate-50/50 dark:bg-slate-900/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-sky-500" /> Assign Workers
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Select and assign multiple workers as needed</p>
                    </div>

                    {/* Dropdown Selector */}
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Select Staff Member
                      </span>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWorkerIdForAssign('');
                            setSelectedShifts(['Tiffin']);
                            setCustomAmount('500');
                            setIsEditingSelectedAssignment(false);
                            setIsAssignPopupOpen(true);
                          }}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-left text-xs font-semibold flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer select-none"
                        >
                          <span>Select worker...</span>
                          <Plus className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>

                    {/* Selected Workers Chips Grid */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Currently Assigned ({Array.from(new Set(localAssignments.map(a => a.workerId))).length})
                        </span>
                        <div className="flex items-center gap-2">
                          {/* Edit Assigned Workers Details */}
                          {!isEditingAssignments && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditingAssignmentDetails) {
                                  // Cancel: reset localAssignments
                                  setLocalAssignments(
                                    workDetails.activeWorkers.map((w: any) => ({
                                      workerId: w.id,
                                      shift: w.shift || 'Tiffin',
                                      amount: w.amount !== null && w.amount !== undefined ? w.amount : 500,
                                    }))
                                  );
                                  setIsEditingAssignmentDetails(false);
                                } else {
                                  setIsEditingAssignmentDetails(true);
                                }
                              }}
                              className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer select-none"
                            >
                              {isEditingAssignmentDetails ? 'Cancel' : 'Edit'}
                            </button>
                          )}

                          {!isEditingAssignments && !isEditingAssignmentDetails && (
                            <span className="text-slate-300 dark:text-slate-700 text-[10px] select-none">•</span>
                          )}

                          {/* Remove Assigned Workers */}
                          {!isEditingAssignmentDetails && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditingAssignments) {
                                  // Cancel: reset localAssignments
                                  setLocalAssignments(
                                    workDetails.activeWorkers.map((w: any) => ({
                                      workerId: w.id,
                                      shift: w.shift || 'Tiffin',
                                      amount: w.amount !== null && w.amount !== undefined ? w.amount : 500,
                                    }))
                                  );
                                  setIsEditingAssignments(false);
                                } else {
                                  setIsEditingAssignments(true);
                                }
                              }}
                              className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer select-none"
                            >
                              {isEditingAssignments ? 'Cancel' : 'Remove'}
                            </button>
                          )}
                        </div>
                      </div>
                      {localAssignments.length === 0 ? (
                        <p className="text-xs italic text-slate-400 py-3 bg-white dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center select-none">
                          No staff assigned yet.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {(() => {
                            interface GroupedAssign {
                              workerId: string;
                              shifts: string[];
                              totalAmount: number;
                            }
                            const grouped: GroupedAssign[] = [];
                            for (const a of localAssignments) {
                              const existing = grouped.find((g) => g.workerId === a.workerId);
                              if (existing) {
                                existing.shifts.push(a.shift || 'Tiffin');
                                existing.totalAmount += a.amount;
                              } else {
                                grouped.push({
                                  workerId: a.workerId,
                                  shifts: [a.shift || 'Tiffin'],
                                  totalAmount: a.amount,
                                });
                              }
                            }

                            return grouped.map((assign) => {
                              const worker = roster.find((w) => w.id === assign.workerId);
                              if (!worker) return null;
                              return (
                                <div
                                  key={assign.workerId}
                                  className="flex items-center justify-between p-2.5 bg-sky-500/5 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/20 rounded-xl text-xs font-semibold animate-scale-in"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <img
                                      src={worker.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(worker.name)}`}
                                      alt={worker.name}
                                      className="w-7 h-7 rounded-full object-cover border border-sky-500/20"
                                    />
                                    <div className="text-left">
                                      <p className="font-bold text-slate-800 dark:text-slate-200">{worker.name}</p>
                                      <p className="text-[10px] text-slate-455 mt-0.5 flex items-center gap-3">
                                        <span>
                                          Shift: <span className="font-extrabold text-sky-600 dark:text-sky-400">{assign.shifts.join(' & ')}</span>
                                        </span>
                                        <span className="text-slate-300">•</span>
                                        <span>
                                          Amount: <span className="font-extrabold text-slate-700 dark:text-slate-350">₹{assign.totalAmount}</span>
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                  {isEditingAssignments && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setLocalAssignments((prev) =>
                                          prev.filter((a) => a.workerId !== assign.workerId)
                                        );
                                      }}
                                      className="p-1 hover:bg-sky-500/15 dark:hover:bg-sky-500/25 rounded-lg text-sky-600 dark:text-sky-300 cursor-pointer"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                  {isEditingAssignmentDetails && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedWorkerIdForAssign(assign.workerId);
                                        setSelectedShifts(assign.shifts);
                                        setCustomAmount(assign.totalAmount.toString());
                                        setIsEditingSelectedAssignment(true);
                                        setIsAssignPopupOpen(true);
                                      }}
                                      className="p-1 hover:bg-sky-500/15 dark:hover:bg-sky-500/25 rounded-lg text-sky-600 dark:text-sky-300 cursor-pointer"
                                      title="Edit details"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Save Work Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-950 flex items-center justify-end gap-2.5">
                  <button
                    onClick={handleSaveAssignments}
                    disabled={syncAssignmentsMutation.isPending}
                    className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md transition-colors flex items-center justify-center gap-1.5"
                  >
                    {syncAssignmentsMutation.isPending && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    Save Work
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Popup Modal for Assign Worker with Shift and Amount Selection */}
      {isAssignPopupOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 60 }}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scale-in animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setIsAssignPopupOpen(false);
                setIsEditingSelectedAssignment(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-md font-display font-extrabold text-slate-900 dark:text-white mb-6">
              {isEditingSelectedAssignment ? 'Edit Staff Assignment' : 'Assign Staff Member'}
            </h3>

            <div className="space-y-4">
              {/* Select Worker */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Staff
                </label>
                {isEditingSelectedAssignment ? (
                  <div className="w-full px-3 py-2.5 rounded-xl border border-slate-250 dark:border-slate-800 bg-slate-100 dark:bg-slate-850 text-slate-855 dark:text-white text-sm font-bold select-none">
                    {roster.find((w) => w.id === selectedWorkerIdForAssign)?.name || 'Unknown Staff'}
                  </div>
                ) : (
                  <select
                    value={selectedWorkerIdForAssign}
                    onChange={(e) => setSelectedWorkerIdForAssign(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm cursor-pointer"
                  >
                    <option value="">-- Choose Worker --</option>
                    {roster.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {worker.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Select Shift */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Shift (Multi-select)
                </label>
                <div className="flex gap-3">
                  {['Tiffin', 'Lunch', 'Dinner'].map((s) => {
                    const isSelected = selectedShifts.includes(s);
                    return (
                      <label
                        key={s}
                        className={`flex-1 flex items-center justify-center py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all select-none ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 font-extrabold shadow-sm'
                            : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-500 dark:text-slate-400 font-semibold'
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={s}
                          checked={isSelected}
                          onChange={() => {
                            setSelectedShifts((prev) => {
                              const next = prev.includes(s)
                                ? prev.filter((item) => item !== s)
                                : [...prev, s];
                              setCustomAmount((next.length * 500).toString());
                              return next;
                            });
                          }}
                          className="sr-only"
                        />
                        {s}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Predefined Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Amount allocation (₹)
                </label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm font-semibold"
                  placeholder="500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAssignPopupOpen(false);
                    setIsEditingSelectedAssignment(false);
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedWorkerIdForAssign) {
                      addToast('Please select a worker', 'error');
                      return;
                    }
                    if (selectedShifts.length === 0) {
                      addToast('Please select at least one shift', 'error');
                      return;
                    }
                    const totalAmt = parseFloat(customAmount) || (selectedShifts.length * 500);
                    const amtPerShift = totalAmt / selectedShifts.length;
                    
                    let newAssignments = [...localAssignments];
                    if (isEditingSelectedAssignment) {
                      // Remove previous assignments for this worker first
                      newAssignments = newAssignments.filter(
                        (a) => a.workerId !== selectedWorkerIdForAssign
                      );
                    }

                    let addedCount = 0;
                    let skippedCount = 0;

                    for (const s of selectedShifts) {
                      const exists = !isEditingSelectedAssignment && localAssignments.some(
                        (a) => a.workerId === selectedWorkerIdForAssign && a.shift === s
                      );
                      if (exists) {
                        skippedCount++;
                      } else {
                        newAssignments.push({
                          workerId: selectedWorkerIdForAssign,
                          shift: s,
                          amount: amtPerShift,
                        });
                        addedCount++;
                      }
                    }

                    setLocalAssignments(newAssignments);

                    if (isEditingSelectedAssignment) {
                      addToast('Assignment details updated', 'success');
                    } else {
                      if (skippedCount > 0 && addedCount === 0) {
                        addToast('Worker is already assigned to all selected shifts', 'error');
                        return;
                      } else if (skippedCount > 0) {
                        addToast(`Added ${addedCount} shift(s), skipped ${skippedCount} already assigned shift(s)`, 'info');
                      }
                    }

                    setIsAssignPopupOpen(false);
                    setIsEditingSelectedAssignment(false);
                  }}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow"
                >
                  {isEditingSelectedAssignment ? 'Confirm Edit' : 'Confirm Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Internal Card Component for Kanban Columns */
interface WorkCardProps {
  work: Work;
  onClick: () => void;
}

function WorkCard({ work, onClick }: WorkCardProps) {
  // Prevent click propagation when clicking stack
  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-3 rounded-2xl shadow-sm hover:shadow-md dark:hover:border-slate-800/80 hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between min-h-[85px]"
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors leading-normal line-clamp-2">
          {work.title}
        </h4>
      </div>

      {/* Footer Block: Date, Avatars */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-bold border-t border-slate-50 dark:border-slate-800/40 pt-2">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-sky-400/80" />
          {formatDate(work.dueDate)}
        </span>
        
        <div className="flex items-center gap-2.5" onClick={stopProp}>
          <AvatarStack workers={work.assignedWorkers} />
        </div>
      </div>
    </div>
  );
}

/* Avatar Stack Display Helper */
interface AvatarStackProps {
  workers: Worker[];
}

function AvatarStack({ workers }: AvatarStackProps) {
  if (!workers || workers.length === 0) {
    return <span className="text-[10px] italic text-slate-400">Unassigned</span>;
  }

  const limit = 3;
  const displayWorkers = workers.slice(0, limit);
  const overflow = workers.length - limit;

  return (
    <div className="flex items-center -space-x-1.5 overflow-hidden">
      {displayWorkers.map((worker) => (
        <img
          key={worker.id}
          className="inline-block h-5.5 w-5.5 rounded-full ring-2 ring-white dark:ring-slate-950 object-cover"
          src={worker.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(worker.name)}`}
          alt={worker.name}
          title={`${worker.name} (${worker.role})`}
        />
      ))}
      {overflow > 0 && (
        <span className="flex items-center justify-center h-5.5 w-5.5 rounded-full ring-2 ring-white dark:ring-slate-950 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[9px]">
          +{overflow}
        </span>
      )}
    </div>
  );
}
