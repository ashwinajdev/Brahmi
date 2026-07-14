// autoUpdatePastWorks is intentionally a no-op.
// Overdue tasks are displayed in the "Today" column by the frontend
// based on diffDays <= 0, without ever mutating the original dueDate.
// Preserving the original date is important for history and audit accuracy.
export async function autoUpdatePastWorks(): Promise<void> {
  // No database mutation — frontend handles overdue grouping.
}
