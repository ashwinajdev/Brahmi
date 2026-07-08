import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clean existing data
  await prisma.workAssignment.deleteMany();
  await prisma.work.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed default admin user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@brahmi.com',
      password: hashedPassword,
      name: 'Prakash Holla',
      avatarUrl: null,
    },
  });
  console.log(`Created admin user: ${adminUser.email}`);

  // 3. Seed Workers
  const workersData = [
    {
      name: 'Arjun Patel',
      phone: '+91 98765 43210',
      email: 'arjun.patel@brahmi.com',
      role: 'Lead Electrician',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      isActive: true,
    },
    {
      name: 'Priya Nair',
      phone: '+91 98765 43211',
      email: 'priya.nair@brahmi.com',
      role: 'Safety Inspector',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      isActive: true,
    },
    {
      name: 'Rahul Khanna',
      phone: '+91 98765 43212',
      email: 'rahul.khanna@brahmi.com',
      role: 'HVAC Specialist',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      isActive: true,
    },
    {
      name: 'Neha Sen',
      phone: '+91 98765 43213',
      email: 'neha.sen@brahmi.com',
      role: 'Plumber',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      isActive: true,
    },
    {
      name: 'Vikram Singh',
      phone: '+91 98765 43214',
      email: 'vikram.singh@brahmi.com',
      role: 'General Technician',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      isActive: true,
    },
    {
      name: 'Rohan Mehta',
      phone: '+91 98765 43215',
      email: 'rohan.mehta@brahmi.com',
      role: 'Apprentice Helper',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      isActive: false, // Inactive worker to test filter
    },
  ];

  const workers = [];
  for (const w of workersData) {
    const worker = await prisma.worker.create({ data: w });
    workers.push(worker);
  }
  console.log(`Seeded ${workers.length} workers.`);

  // 4. Seed Works (Tasks)
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  const overdue = new Date();
  overdue.setDate(today.getDate() - 3);

  const worksData = [
    {
      title: 'Lobby Light Fixture Installation',
      description: 'Replace current fluorescent lamps with modern, energy-efficient warm LED tube fixtures. Ensure main power breaker is switched off and lock-out tag-out protocols are observed.',
      category: 'Electrical',
      priority: 'high',
      status: 'pending',
      dueDate: nextWeek,
      location: 'Main Office - Building A Lobby',
    },
    {
      title: 'Server Room AC Maintenance',
      description: 'Perform biannual servicing of split AC units in the server room. Clean air filters, inspect coolant levels, and test automated temperature alerts.',
      category: 'HVAC',
      priority: 'high',
      status: 'in_progress',
      dueDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 * 2), // 2 days from now
      location: 'Server Room - Floor 3',
    },
    {
      title: 'Water Leak Inspection in Breakroom',
      description: 'Investigate reports of water pooling near the pantry sink area. Inspect undersink plumbing connection and repair any faulty pipes or gaskets.',
      category: 'Plumbing',
      priority: 'medium',
      status: 'completed',
      dueDate: new Date(today.getTime() - 24 * 60 * 60 * 1000 * 1), // Yesterday
      location: 'Breakroom - Floor 1',
    },
    {
      title: 'Quarterly Fire Alarm Drills & Safety Inspection',
      description: 'Conduct comprehensive diagnostic testing of fire alarms, smoke detectors, and manual pull stations across the campus. Check pressure indicators on all fire extinguishers.',
      category: 'Safety',
      priority: 'high',
      status: 'pending',
      dueDate: overdue, // Overdue task to test dashboard indicator
      location: 'Whole Campus',
    },
    {
      title: 'Office Desks Rearrangement',
      description: 'Reconfigure workstation seating arrangements in Room 204 to improve spacing, ergonomics, and cable routing accessibility.',
      category: 'Maintenance',
      priority: 'low',
      status: 'pending',
      dueDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 * 5),
      location: 'Conference Room 204',
    },
  ];

  const works = [];
  for (const w of worksData) {
    const work = await prisma.work.create({ data: w });
    works.push(work);
  }
  console.log(`Seeded ${works.length} works.`);

  // 5. Seed Work Assignments
  // Setup:
  // - Lobby Lights (Pending) -> assigned to Arjun Patel (Active)
  // - Server Room AC (In Progress) -> assigned to Arjun Patel and Rahul Khanna (Active)
  // - Water Leak (Completed) -> assigned to Neha Sen (Active)
  // - Water Leak (Completed) -> assigned to Rohan Mehta, then unassigned (Historical)
  // - Fire Alarm Drills (Pending - Overdue) -> unassigned (Needs attention)

  // Lobby Lights
  await prisma.workAssignment.create({
    data: {
      workId: works[0].id,
      workerId: workers[0].id, // Arjun
      assignedAt: new Date(today.getTime() - 24 * 60 * 60 * 1000 * 2),
    },
  });

  // Server Room AC
  await prisma.workAssignment.create({
    data: {
      workId: works[1].id,
      workerId: workers[0].id, // Arjun
      assignedAt: new Date(today.getTime() - 24 * 60 * 60 * 1000 * 1),
    },
  });
  await prisma.workAssignment.create({
    data: {
      workId: works[1].id,
      workerId: workers[2].id, // Rahul
      assignedAt: new Date(today.getTime() - 24 * 60 * 60 * 1000 * 1),
    },
  });

  // Water Leak (Completed)
  await prisma.workAssignment.create({
    data: {
      workId: works[2].id,
      workerId: workers[3].id, // Neha
      assignedAt: new Date(today.getTime() - 24 * 60 * 60 * 1000 * 3),
    },
  });

  // Water Leak historical assignment (Rohan Mehta was assigned but then unassigned)
  await prisma.workAssignment.create({
    data: {
      workId: works[2].id,
      workerId: workers[5].id, // Rohan (Inactive)
      assignedAt: new Date(today.getTime() - 24 * 60 * 60 * 1000 * 4),
      unassignedAt: new Date(today.getTime() - 24 * 60 * 60 * 1000 * 3),
    },
  });

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
