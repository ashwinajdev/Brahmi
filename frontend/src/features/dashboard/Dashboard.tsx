import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.ts';
import { formatDate } from '../../lib/utils.ts';
import {
  Briefcase,
  Users,
  AlertCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
  TrendingUp,
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
  statusCounts: {
    pending: number;
    in_progress: number;
    completed: number;
  };
  totalActiveWorkers: number;
  overdueCount: number;
  unassignedCount: number;
  overdueWorks: TaskSummary[];
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
    refetchInterval: 10000, // Refresh stats every 10 seconds for real-time feel
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl" />
            <div className="h-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl" />
          </div>
          <div className="h-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl" />
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
    totalWorks,
    statusCounts,
    totalActiveWorkers,
    overdueCount,
    unassignedCount,
    overdueWorks,
    unassignedWorks,
    workload
  } = stats!;

  // Calculate percentage of progress
  const completionPercentage = totalWorks > 0 ? Math.round((statusCounts.completed / totalWorks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />
        <div>
          <h2 className="text-xl md:text-2xl font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            Workspace Overview <TrendingUp className="w-5 h-5 text-purple-500" />
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time synchronization of active worker loads and pending tasks.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800/80 text-center">
            <span className="block text-xs text-slate-400 font-semibold uppercase tracking-wider">Completion</span>
            <span className="font-display font-extrabold text-lg text-green-500 dark:text-green-400">{completionPercentage}%</span>
          </div>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Works */}
        <div
          onClick={() => onNavigate('works')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md dark:hover:border-slate-700 hover:-translate-y-0.5 transition-all cursor-pointer select-none"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Work Items</span>
            <h3 className="text-2xl md:text-3xl font-display font-extrabold text-slate-900 dark:text-white">{totalWorks}</h3>
            <p className="text-[10px] text-slate-400 font-medium">Click to see task board</p>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

        {/* Active Workers */}
        <div
          onClick={() => onNavigate('workers')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md dark:hover:border-slate-700 hover:-translate-y-0.5 transition-all cursor-pointer select-none"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Workers</span>
            <h3 className="text-2xl md:text-3xl font-display font-extrabold text-slate-900 dark:text-white">{totalActiveWorkers}</h3>
            <p className="text-[10px] text-slate-400 font-medium">Click to view workers roster</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Overdue Count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all select-none">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue Tasks</span>
            <h3 className={`text-2xl md:text-3xl font-display font-extrabold ${overdueCount > 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{overdueCount}</h3>
            <p className="text-[10px] text-slate-400 font-medium">Requires immediate action</p>
          </div>
          <div className={`p-3 rounded-xl ${overdueCount > 0 ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Unassigned Count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all select-none">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unassigned Tasks</span>
            <h3 className={`text-2xl md:text-3xl font-display font-extrabold ${unassignedCount > 0 ? 'text-orange-500' : 'text-slate-900 dark:text-white'}`}>{unassignedCount}</h3>
            <p className="text-[10px] text-slate-400 font-medium">Tasks needing workers</p>
          </div>
          <div className={`p-3 rounded-xl ${unassignedCount > 0 ? 'bg-orange-500/10 text-orange-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid for Workload & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Alerts & Attention items (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overdue Tasks List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <h3 className="font-display font-bold text-md text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-500" /> Overdue Tasks
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
                  {overdueCount}
                </span>
              </h3>
              {overdueCount > 0 && (
                <button
                  onClick={() => onNavigate('works')}
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-0.5 hover:underline cursor-pointer"
                >
                  View Tasks Board <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/60">
              {overdueWorks.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-400">
                  🎉 Good job! No tasks are currently overdue.
                </div>
              ) : (
                overdueWorks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onNavigate('works', task.id)}
                    className="py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/20 px-2 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="space-y-0.5 pr-4 truncate">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                        {task.title}
                      </p>
                      <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
                        Due: {formatDate(task.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase badge-${task.priority}`}>
                        {task.priority}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase badge-${task.status}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Unassigned Tasks List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <h3 className="font-display font-bold text-md text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" /> Needs Assignment
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500">
                  {unassignedCount}
                </span>
              </h3>
              {unassignedCount > 0 && (
                <button
                  onClick={() => onNavigate('works')}
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-0.5 hover:underline cursor-pointer"
                >
                  View Tasks Board <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/60">
              {unassignedWorks.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-400">
                  👍 All active tasks have at least one worker assigned.
                </div>
              ) : (
                unassignedWorks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onNavigate('works', task.id)}
                    className="py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/20 px-2 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="space-y-0.5 pr-4 truncate">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                        {task.title}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        Due: {formatDate(task.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase badge-${task.priority}`}>
                        {task.priority}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 flex items-center gap-0.5">
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-fit">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <h3 className="font-display font-bold text-md text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-500" /> Worker Workload
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Active assignments count per staff member</p>
          </div>

          <div className="mt-4 space-y-4 flex-grow overflow-y-auto max-h-[420px] pr-1">
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
                    className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/10 p-2 rounded-xl transition-all cursor-pointer"
                  >
                    <img
                      src={worker.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(worker.name)}`}
                      alt={worker.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-800"
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
