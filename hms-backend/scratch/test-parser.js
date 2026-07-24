const fs = require('fs');

function splitSqlValues(str) {
  let result = [];
  let current = '';
  let inString = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "'") {
      // Handle escaped quotes ''
      if (inString && i + 1 < str.length && str[i + 1] === "'") {
        current += "''";
        i++;
      } else {
        inString = !inString;
        current += ch;
      }
    } else if (ch === ',' && !inString) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) result.push(current.trim());
  return result;
}

const testSql = "INSERT INTO \"User\" (\"id\", \"email\", \"name\") VALUES ('123', 'admin@test.com', 'Test User');";
const match = testSql.match(/INSERT INTO "User" \((.*?)\) VALUES \((.*)\);?$/is);
if (match) {
  const cols = match[1].split(',').map(c => c.trim());
  const vals = splitSqlValues(match[2]);
  console.log('Cols:', cols);
  console.log('Vals:', vals);
}
