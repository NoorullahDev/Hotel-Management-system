async function run() {
  const bookingsRes = await fetch('http://localhost:4000/api/bookings?limit=10');
  const text = await bookingsRes.text();
  console.log('Bookings API:', text);
}
run().catch(console.error);
