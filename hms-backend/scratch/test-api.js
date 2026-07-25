const http = require('http');

http.get('http://localhost:4000/api/rooms', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Rooms:', data.substring(0, 500)));
}).on('error', err => console.log('Error:', err.message));

http.get('http://localhost:4000/api/housekeeping/staff', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Staff:', data.substring(0, 500)));
}).on('error', err => console.log('Error:', err.message));
