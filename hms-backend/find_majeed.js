const { execSync } = require('child_process');

try {
  const commits = execSync('git log --format="%H" -- prisma/dev.db').toString().trim().split('\n');
  
  let found = false;
  for (const commit of commits) {
    if (!commit) continue;
    try {
      const buffer = execSync(`git show ${commit}:hms-backend/prisma/dev.db`, { cwd: '..', encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 });
      const str = buffer.toString('utf8');
      if (str.includes('Majeed') || str.includes('Saqib')) {
        console.log(`Commit ${commit} contains Majeed or Saqib`);
        found = true;
      }
    } catch (err) {
      console.log(`Failed on commit ${commit}`);
    }
  }
  if (!found) {
    console.log('Majeed and Saqib were NEVER in dev.db in the git history.');
  }
} catch(err) {
  console.error(err);
}
