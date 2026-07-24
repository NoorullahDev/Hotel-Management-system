function splitSqlValues(str) {
  let result = [];
  let cur = '';
  let insideStr = false;
  for (let idx = 0; idx < str.length; idx++) {
    const char = str[idx];
    if (char === "'") {
      if (insideStr && idx + 1 < str.length && str[idx + 1] === "'") {
        cur += "''";
        idx++;
      } else {
        insideStr = !insideStr;
        cur += char;
      }
    } else if (char === ',' && !insideStr) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  if (cur) result.push(cur.trim());
  return result;
}

const stmt = `INSERT INTO "User" ("id", "email") VALUES ('1', 'admin@example.com')`;

console.log("Starts with:", stmt.startsWith('INSERT INTO "User"'));

const match = stmt.match(/INSERT INTO "User" \((.*?)\) VALUES \((.*)\)$/is);
if (match) {
  const cols = match[1].split(',').map(c => c.trim().replace(/"/g, ''));
  const vals = splitSqlValues(match[2]);
  
  if (!cols.includes('username')) {
    const emailIndex = cols.indexOf('email');
    if (emailIndex !== -1) {
      const emailVal = vals[emailIndex].replace(/^'|'$/g, '');
      const username = emailVal.split('@')[0].toLowerCase();
      
      cols.push('username');
      vals.push(`'${username}'`);
      
      const newColsStr = cols.map(c => `"${c}"`).join(', ');
      const newValsStr = vals.join(', ');
      const result = `INSERT INTO "User" (${newColsStr}) VALUES (${newValsStr})`;
      console.log("Patched:", result);
    } else {
      console.log("No email found in cols");
    }
  } else {
    console.log("Username already exists");
  }
} else {
  console.log("Regex didn't match!");
}
