import Work from '../models/Work.js';

export async function autoUpdatePastWorks(): Promise<void> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  await Work.updateMany(
    {
      status: 'pending',
      dueDate: { $lt: startOfToday },
    },
    {
      status: 'completed',
    }
  );
}
