fetch('http://127.0.0.1:4000/api/license/status')
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
