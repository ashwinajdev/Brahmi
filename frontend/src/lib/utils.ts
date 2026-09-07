export const formatDate = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const pickLocalized = <T extends string | null | undefined>(
  language: 'en' | 'kn',
  primary: T,
  fallback: T | null | undefined
): string => {
  if (language === 'kn' && typeof primary === 'string' && primary.trim().length > 0) {
    return primary;
  }
  return (typeof fallback === 'string' ? fallback : '') || (typeof primary === 'string' ? primary : '') || '';
};

export const pickWorkerName = (
  language: 'en' | 'kn',
  worker: { name: string; nameKn?: string | null }
): string => pickLocalized(language, worker.nameKn ?? '', worker.name);

export const pickWorkTitle = (
  language: 'en' | 'kn',
  work: { title: string; titleKn?: string | null }
): string => pickLocalized(language, work.titleKn ?? '', work.title);

export const pickWorkDescription = (
  language: 'en' | 'kn',
  work: { description: string; descriptionKn?: string | null }
): string => pickLocalized(language, work.descriptionKn ?? '', work.description);

export const pickAssignmentWorkerName = (
  language: 'en' | 'kn',
  item: { workerName: string; workerNameKn?: string | null }
): string => pickLocalized(language, item.workerNameKn ?? '', item.workerName);
