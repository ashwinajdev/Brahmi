import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../lib/store.ts';
import { t } from '../../lib/i18n.ts';
import { api } from '../../lib/api.ts';
import CustomSelect from '../../components/ui/CustomSelect.tsx';
import {
  User,
  Languages,
  History,
  ArrowLeft,
  Users,
  Briefcase,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface DeletionRecord {
  id: string;
  type: 'worker' | 'work';
  snapshot: Record<string, any>;
  deletedAt: string;
}

const formatDeletedDate = (value: string, language: 'en' | 'kn') =>
  new Intl.DateTimeFormat(language === 'kn' ? 'kn-IN' : 'en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export default function Settings() {
  const { user, language, setLanguage } = useAppStore();
  const [showDeletedHistory, setShowDeletedHistory] = useState(false);

  const { data: deletionRecords = [], isLoading: isLoadingDeletionHistory, isError: isDeletionHistoryError } = useQuery<DeletionRecord[]>({
    queryKey: ['deletion-history'],
    queryFn: () => api.get<DeletionRecord[]>('/deletion-history'),
    enabled: showDeletedHistory,
  });

  if (showDeletedHistory) {
    const deletedWorkers = deletionRecords.filter((record) => record.type === 'worker');
    const deletedWorks = deletionRecords.filter((record) => record.type === 'work');

    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <button
          type="button"
          onClick={() => setShowDeletedHistory(false)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t(language, 'deletedHistoryBack')}
        </button>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-display font-extrabold text-slate-900 dark:text-white">
                {t(language, 'deletedHistory')}
              </h1>
              <p className="mt-1 text-xs text-slate-400">{t(language, 'deletedHistoryDesc')}</p>
            </div>
          </div>
        </section>

        {isLoadingDeletionHistory ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
          </div>
        ) : isDeletionHistoryError ? (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-600">
            <AlertCircle className="h-4 w-4" />
            {t(language, 'deletedHistoryLoadError')}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DeletionColumn
              icon={<Users className="h-4 w-4" />}
              title={t(language, 'deletedWorkers')}
              emptyText={t(language, 'noDeletedWorkers')}
              records={deletedWorkers}
              language={language}
              getTitle={(record) => record.snapshot.name || record.snapshot.nameKn || 'Worker'}
              getSubtitle={(record) => [record.snapshot.phone, record.snapshot.role].filter(Boolean).join(' - ')}
            />
            <DeletionColumn
              icon={<Briefcase className="h-4 w-4" />}
              title={t(language, 'deletedWorks')}
              emptyText={t(language, 'noDeletedWorks')}
              records={deletedWorks}
              language={language}
              getTitle={(record) => language === 'kn' && record.snapshot.titleKn ? record.snapshot.titleKn : record.snapshot.title || 'Work'}
              getSubtitle={(record) => [record.snapshot.category, record.snapshot.location].filter(Boolean).join(' - ')}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {user && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-display font-extrabold text-slate-900 dark:text-white">
            {t(language, 'userProfile')}
          </h2>
          
          <div className="mt-4 flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-14 w-14 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                <User className="h-7 w-7" />
              </div>
            )}
            <div className="min-w-0">
              <span className="mb-1 inline-block rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[9px] font-extrabold text-green-500">
                {t(language, 'adminManager')}
              </span>
              <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{user.name}</h3>
              <p className="truncate text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-sky-500" />
          <h2 className="text-base font-display font-extrabold text-slate-900 dark:text-white">
          {t(language, 'language')}
          </h2>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">{t(language, 'languageDesc')}</p>
        <CustomSelect
          value={language}
          onChange={(value) => setLanguage(value as 'en' | 'kn')}
          options={[
            { value: 'en', label: t(language, 'english') },
            { value: 'kn', label: t(language, 'kannada') },
          ]}
          className="mt-4 w-full"
        />
      </section>

      <button
        type="button"
        onClick={() => setShowDeletedHistory(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-800 dark:hover:bg-slate-900/80 cursor-pointer"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
          <History className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-900 dark:text-white">{t(language, 'deletedHistory')}</span>
          <span className="mt-0.5 block text-xs text-slate-400">{t(language, 'deletedHistoryDesc')}</span>
        </span>
        <span className="text-slate-400">&rarr;</span>
      </button>
    </div>
  );
}

function DeletionColumn({
  icon,
  title,
  emptyText,
  records,
  language,
  getTitle,
  getSubtitle,
}: {
  icon: React.ReactNode;
  title: string;
  emptyText: string;
  records: DeletionRecord[];
  language: 'en' | 'kn';
  getTitle: (record: DeletionRecord) => string;
  getSubtitle: (record: DeletionRecord) => string;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <span className="text-slate-400">{icon}</span>
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">{title}</h2>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {records.length}
        </span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {records.length === 0 ? (
          <p className="p-6 text-center text-xs text-slate-400">{emptyText}</p>
        ) : records.map((record) => (
          <div key={record.id} className="p-4">
            <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{getTitle(record)}</p>
            {getSubtitle(record) && <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{getSubtitle(record)}</p>}
            <p className="mt-2 text-[10px] font-semibold text-slate-400">
              {t(language, 'deletedOn')}: {formatDeletedDate(record.deletedAt, language)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
