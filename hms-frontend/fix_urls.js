const fs = require('fs');
const path = require('path');

const dirsToScan = ['app', 'components'];

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        arrayOfFiles.push(path.join(__dirname, dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const allFiles = [];
dirsToScan.forEach(dir => getAllFiles(dir, allFiles));

let filesModified = 0;

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace 'http://127.0.0.1:4000/...' with `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'}/...`
  // Handle single quotes
  content = content.replace(/'http:\/\/127\.0\.0\.1:4000([^']*)'/g, '`${process.env.NEXT_PUBLIC_BACKEND_URL || \'http://127.0.0.1:4000\'}$1`');
  
  // Handle double quotes
  content = content.replace(/"http:\/\/127\.0\.0\.1:4000([^"]*)"/g, '`${process.env.NEXT_PUBLIC_BACKEND_URL || \'http://127.0.0.1:4000\'}$1`');
  
  // Handle template literals (already inside backticks, just replace the URL part)
  content = content.replace(/`http:\/\/127\.0\.0\.1:4000([^`]*)`/g, '`${process.env.NEXT_PUBLIC_BACKEND_URL || \'http://127.0.0.1:4000\'}$1`');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    filesModified++;
    console.log(`Modified URL in: ${file}`);
  }
});

console.log(`\nFixed URLs in ${filesModified} files successfully!`);
