const bcrypt = require('bcrypt');

const hash = '$2b$10$NKZtVZhPWrUNXJ5LB3wYVe.kghpZW8VdM5OuqUw9apbUx7gLUGr9K';
const password = 'noor11';

bcrypt.compare(password, hash, (err, result) => {
  if (err) { console.error('Error:', err); }
  else { console.log('Password "noor11" matches hash:', result); }
});
