async function runTest() {
  const email = 'admin@brahmi.com';
  const password = '2525';
  const baseUrl = 'https://brahmi-2i1p.onrender.com/api';

  console.log('Logging in to production...');
  try {
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!loginRes.ok) {
      console.error('Login failed:', loginRes.status, await loginRes.text());
      return;
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login successful!');

    console.log('Fetching workers list...');
    const workersRes = await fetch(`${baseUrl}/workers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const workers = await workersRes.json();
    if (workers.length === 0) {
      console.log('No workers found.');
      return;
    }

    const workerId = workers[0].id;
    console.log(`Fetching worker details for ID: ${workerId}...`);
    const workerDetailsRes = await fetch(`${baseUrl}/workers/${workerId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const workerDetails = await workerDetailsRes.json();
    console.log(`Fetched details. Assignments count: ${workerDetails.assignments?.length}`);

    const activeAssignments = workerDetails.assignments?.filter(a => a.unassignedAt === null) || [];
    console.log(`Active assignments count: ${activeAssignments.length}`);

    if (activeAssignments.length === 0) {
      console.log('No active assignments to test edit.');
      return;
    }

    const assignment = activeAssignments[0];
    console.log(`Attempting to update assignment ID: ${assignment.id} for work: "${assignment.work.title}"...`);

    const updatePayload = {
      assignedAt: assignment.assignedAt,
      amount: assignment.amount,
      shift: assignment.shift,
      workTitle: assignment.work.title
    };

    console.log('Sending PUT to /assignments/' + assignment.id, updatePayload);

    const updateRes = await fetch(`${baseUrl}/assignments/${assignment.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updatePayload)
    });

    if (updateRes.ok) {
      console.log('PUT assignment update successful! Status:', updateRes.status);
    } else {
      console.error('PUT assignment update failed! Status:', updateRes.status, await updateRes.text());
    }

  } catch (error) {
    console.error('Test encountered an error:', error);
  }
}

runTest();
