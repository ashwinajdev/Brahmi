import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.ts';
import { useAppStore } from '../../lib/store.ts';
import { X, Loader2 } from 'lucide-react';
import CustomSelect from '../../components/ui/CustomSelect.tsx';

export interface Worker {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
}

export interface Work {
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

interface WorkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingWork?: Work | null;
  defaultStatus?: 'pending' | 'in_progress' | 'completed';
  defaultToToday?: boolean;
}

export default function WorkFormModal({ 
  isOpen, 
  onClose, 
  editingWork = null,
  defaultStatus = 'pending',
  defaultToToday = false
}: WorkFormModalProps) {
  const queryClient = useQueryClient();
  const { addToast } = useAppStore();

  const [title, setTitle] = useState('');
  const [customTitleText, setCustomTitleText] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed'>(defaultStatus);
  const [dueDate, setDueDate] = useState('');
  const [location, setLocation] = useState('');

  // Fetch all works to populate the autocomplete dropdown
  const { data: allWorks = [] } = useQuery<Work[]>({
    queryKey: ['works-all-titles'],
    queryFn: () => api.get<Work[]>('/works'),
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      if (editingWork) {
        const standardPlaces: string[] = []; // Predefined places removed as requested
        if (!standardPlaces.includes(editingWork.title)) {
          setTitle('custom');
          setCustomTitleText(editingWork.title);
        } else {
          setTitle(editingWork.title);
          setCustomTitleText('');
        }
        setDescription(editingWork.description);
        setCategory(editingWork.category);
        setPriority(editingWork.priority);
        setStatus(editingWork.status);
        // Format date for date input (YYYY-MM-DD)
        const date = new Date(editingWork.dueDate);
        const formattedDate = date.toISOString().split('T')[0];
        setDueDate(formattedDate);
        setLocation(editingWork.location || '');
      } else {
        setTitle('');
        setCustomTitleText('');
        setDescription('');
        setCategory('');
        setPriority('medium');
        setStatus(defaultStatus);
        
        if (defaultToToday) {
          const todayLocal = new Date();
          const yyyy = todayLocal.getFullYear();
          const mm = String(todayLocal.getMonth() + 1).padStart(2, '0');
          const dd = String(todayLocal.getDate()).padStart(2, '0');
          setDueDate(`${yyyy}-${mm}-${dd}`);
        } else {
          setDueDate('');
        }
        
        setLocation('');
      }
    }
  }, [isOpen, editingWork, defaultStatus, defaultToToday]);

  const createWorkMutation = useMutation({
    mutationFn: (newWork: any) => api.post('/works', newWork),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works'] });
      queryClient.invalidateQueries({ queryKey: ['completedWorks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['works-all-titles'] });
      addToast('Work task created successfully', 'success');
      onClose();
    },
    onError: (err: any) => addToast(err.message || 'Failed to create work', 'error'),
  });

  const updateWorkMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/works/${id}`, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['works'] });
      queryClient.invalidateQueries({ queryKey: ['completedWorks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['work-details', data.id] });
      queryClient.invalidateQueries({ queryKey: ['works-all-titles'] });
      addToast('Work task updated successfully', 'success');
      onClose();
    },
    onError: (err: any) => addToast(err.message || 'Failed to update work', 'error'),
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title === 'custom' ? customTitleText.trim() : title;
    if (!finalTitle) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    const finalDueDate = dueDate || new Date().toISOString().split('T')[0];

    const payload = {
      title: finalTitle,
      description: description || "General Task Details",
      category: category || "General",
      priority: priority || "medium",
      status: status || "pending",
      dueDate: finalDueDate,
      location: location || "",
    };

    if (editingWork) {
      updateWorkMutation.mutate({ id: editingWork.id, data: payload });
    } else {
      createWorkMutation.mutate(payload);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 60 }}>
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-md font-display font-extrabold text-slate-900 dark:text-white mb-6">
          {editingWork ? 'Edit Work Place Details' : 'Add Work Place'}
        </h3>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Work Place *
            </label>
            {(() => {
              const standardPlaces: string[] = [];
              const dbPlaces = allWorks.map((w) => w.title);
              const allPlaces = Array.from(new Set([...standardPlaces, ...dbPlaces]));
              if (title && title !== 'custom' && !allPlaces.includes(title)) {
                allPlaces.push(title);
              }
              allPlaces.sort((a, b) => a.localeCompare(b));
              const selectOptions = [
                ...allPlaces.map((p) => ({ value: p, label: p })),
                { value: 'custom', label: '+ Add Custom Work Place...' },
              ];
              return (
                <CustomSelect
                  value={title}
                  onChange={setTitle}
                  options={selectOptions}
                  placeholder="Select a Work Place..."
                />
              );
            })()}
          </div>

          {/* Custom Title Input */}
          {title === 'custom' && (
            <div className="animate-scale-in">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                New Work Place Name *
              </label>
              <input
                type="text"
                required
                placeholder="Enter custom work place name..."
                value={customTitleText}
                onChange={(e) => setCustomTitleText(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm"
              />
            </div>
          )}

          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createWorkMutation.isPending || updateWorkMutation.isPending}
              className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md hover:bg-sky-700 transition-colors flex items-center gap-1.5"
            >
              {(createWorkMutation.isPending || updateWorkMutation.isPending) && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              {editingWork ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
