import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.ts';
import { formatDate } from '../../lib/utils.ts';
import {
  Briefcase,
  Users,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  UserCheck
} from 'lucide-react';

interface TaskSummary {
  id: string;
  title: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
}

interface WorkerWorkload {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  activeAssignmentsCount: number;
}

interface DashboardStats {
  totalWorks: number;
  todaysWorksCount: number;
  statusCounts: {
    pending: number;
    in_progress: number;
    completed: number;
  };
  totalActiveWorkers: number;
  assignedWorkersCount: number;
  unassignedCount: number;
  unassignedWorks: TaskSummary[];
  workload: WorkerWorkload[];
}

interface DashboardProps {
  onNavigate: (tab: string, arg?: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { data: stats, isLoading, isError, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
    refetchInterval: 15000,       // Refresh every 15 seconds
    staleTime: 0,                 // Always treat data as stale → show freshest on refetch
    refetchOnWindowFocus: true,   // Re-fetch when tab becomes active again
  });

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 space-y-3">
            <div className="h-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl" />
            <div className="h-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl" />
          </div>
          <div className="h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Failed to load Dashboard data</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {error instanceof Error ? error.message : 'Please check your connection and try again.'}
        </p>
      </div>
    );
  }

  const {
    todaysWorksCount,
    assignedWorkersCount,
    unassignedCount,
    unassignedWorks,
    workload
  } = stats!;


  return (
    <div className="space-y-3">

      {/* Main Stats Row */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Today's Work */}
        <div
          onClick={() => onNavigate('works')}
          role="button"
          tabIndex={0}
          aria-label={`Today's work items: ${todaysWorksCount}. Click to view task board.`}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('works')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md dark:hover:border-slate-700 hover:-translate-y-0.5 transition-all cursor-pointer select-none"
        >
          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Today's Work</span>
            <p className="text-2xl font-display font-extrabold text-slate-900 dark:text-white">{todaysWorksCount}</p>
            <p className="text-[10px] text-slate-400 font-medium">Click to see task board</p>
          </div>
          <div className="p-2.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-lg">
            <Briefcase className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        {/* Assigned Workers */}
        <div
          onClick={() => onNavigate('workers')}
          role="button"
          tabIndex={0}
          aria-label={`Assigned workers: ${assignedWorkersCount}. Click to view workers.`}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('workers')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md dark:hover:border-slate-700 hover:-translate-y-0.5 transition-all cursor-pointer select-none"
        >
          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Assigned Workers</span>
            <p className="text-2xl font-display font-extrabold text-slate-900 dark:text-white">{assignedWorkersCount}</p>
            <p className="text-[10px] text-slate-400 font-medium">Click to view workers</p>
          </div>
          <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
            <Users className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

      </div>

      {/* Grid for Workload & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left Column: Alerts & Attention items (2/3 width) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-orange-500" aria-hidden="true" /> Needs Assignment
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-500">
                  {unassignedCount}
                </span>
              </h2>
              {unassignedCount > 0 && (
                <button
                  onClick={() => onNavigate('works')}
                  className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-0.5 hover:underline cursor-pointer"
                >
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/60">
              {unassignedWorks.length === 0 ? (
                <div className="py-4 text-center text-sm text-slate-400">
                  👍 All active tasks have at least one worker assigned.
                </div>
              ) : (
                unassignedWorks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onNavigate('works', task.id)}
                    className="py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/20 px-2 rounded-lg transition-all cursor-pointer group"
                  >
                    <div className="space-y-0.5 pr-3 truncate">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors truncate">
                        {task.title}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        Due: {formatDate(task.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase badge-${task.priority}`}>
                        {task.priority}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 flex items-center gap-0.5">
                        Unassigned
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Worker Workload / Staff Allocations (1/3 width) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col h-fit">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-sky-500" aria-hidden="true" /> Worker Workload
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Active assignments per staff member</p>
          </div>

          <div className="mt-3 space-y-2 flex-grow overflow-y-auto max-h-[380px] pr-1">
            {workload.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">
                No active workers registered.
              </div>
            ) : (
              workload.map((worker) => {
                // Determine load color indicator
                let barColor = 'bg-slate-400 dark:bg-slate-700';
                let textColor = 'text-slate-400';
                
                if (worker.activeAssignmentsCount === 0) {
                  barColor = 'bg-slate-200 dark:bg-slate-800';
                  textColor = 'text-slate-400';
                } else if (worker.activeAssignmentsCount === 1) {
                  barColor = 'bg-blue-500';
                  textColor = 'text-blue-500 dark:text-blue-400';
                } else if (worker.activeAssignmentsCount === 2) {
                  barColor = 'bg-green-500';
                  textColor = 'text-green-500 dark:text-green-400';
                } else {
                  barColor = 'bg-orange-500';
                  textColor = 'text-orange-500 dark:text-orange-400';
                }

                // Width percentage calculation (cap at 4 for bar representation)
                const percent = Math.min((worker.activeAssignmentsCount / 4) * 100, 100);

                return (
                  <div
                    key={worker.id}
                    onClick={() => onNavigate('workers')}
                    className="flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/10 p-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    <img
                      src={worker.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(worker.name)}`}
                      alt={`${worker.name} profile photo`}
                      loading="lazy"
                      decoding="async"
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-800"
                    />
                    <div className="flex-grow min-w-0 space-y-1">
                      <div className="flex justify-between items-center gap-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{worker.name}</p>
                        <span className={`text-xs font-extrabold shrink-0 ${textColor}`}>
                          {worker.activeAssignmentsCount} active
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-grow bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${percent}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[80px] text-right">
                          {worker.role.split(' ')[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
