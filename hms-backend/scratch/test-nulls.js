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

const valsStr = `'f0ec0f1e', 'admin@example.com', '$2b$', 'Admin', NULL, NULL, 'f0ec0f1', NULL, 0, NULL, 0`;
console.log(splitSqlValues(valsStr));
