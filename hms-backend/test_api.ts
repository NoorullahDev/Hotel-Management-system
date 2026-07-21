async function testApi() {
  try {
    const loginRes = await fetch('http://127.0.0.1:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'Noorullah', password: 'Noor123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    
    console.log('Fetching foreign bookings...');
    const t0 = Date.now();
    const bookingsRes = await fetch('http://127.0.0.1:4000/api/bookings?bookingType=FOREIGN&limit=50&page=1', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Foreign bookings status:', bookingsRes.status, 'Time:', Date.now() - t0, 'ms');
    const bData = await bookingsRes.json();
    console.log('Foreign bookings count:', bData.data ? bData.data.length : 'NO DATA');
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

testApi();
