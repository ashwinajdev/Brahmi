import prisma from '../db/prisma.js';

export async function autoUpdatePastWorks(): Promise<void> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();
    // Construct today's date at UTC midnight (timezone-agnostic representation used in DB)
    const todayUTC = new Date(Date.UTC(year, month, date));

    // Update all works that are not completed and have a due date in the past
    const result = await prisma.work.updateMany({
      where: {
        dueDate: { lt: todayUTC },
        status: { not: 'completed' },
      },
      data: {
        dueDate: todayUTC,
      },
    });

    if (result.count > 0) {
      console.log(`[AutoUpdate] Updated ${result.count} past work task(s) to today's date (${todayUTC.toISOString()}).`);
    }
  } catch (error) {
    console.error('Error auto-updating past works:', error);
  }
}
