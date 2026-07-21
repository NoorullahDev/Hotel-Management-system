async function run() {
  const checkIn = new Date().toISOString().split('T')[0];
  const checkOut = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const url = `http://127.0.0.1:4000/api/rooms/availability?checkIn=${checkIn}&checkOut=${checkOut}`;
  console.log('Fetching', url);
  
  // First login
  const loginRes = await fetch('http://127.0.0.1:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'Noorullah', password: 'Noor123' }) // assuming valid credentials
  });
  if (!loginRes.ok) {
     console.log('Login failed', loginRes.status);
     // try without auth just in case
  }
  let token = '';
  try {
     const data = await loginRes.json();
     token = data.accessToken;
  } catch(e) {}

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Available rooms count:', data.length);
  // print all statuses
  console.log('Rooms:', data.map(r => r.number + '-' + r.status));
}

run();
