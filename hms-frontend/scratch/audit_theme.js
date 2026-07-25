const fs = require('fs');
const path = require('path');

const dirsToScan = ['app', 'components', 'lib'];
const allFiles = [];

function getAllFiles(dirPath, arrayOfFiles) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
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

dirsToScan.forEach(dir => getAllFiles(dir, allFiles));

let issuesFound = 0;

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let hasIssue = false;
  let fileIssues = [];
  
  // Find all className strings
  const classNameRegex = /className=(?:\{`|["'])(.*?)(?:`\}|["'])/gs;
  let match;
  while ((match = classNameRegex.exec(content)) !== null) {
    const classNameStr = match[1];
    
    // Check for text-white
    if (classNameStr.includes('text-white')) {
      const hasSolidBg = /bg-(primary|blue-|green-|red-|amber-|rose-|emerald-|slate-[5-9]00|gray-[5-9]00|\[#)/.test(classNameStr);
      if (!hasSolidBg) {
        fileIssues.push(`Unaccompanied text-white: "${classNameStr.trim().replace(/\n/g, ' ')}"`);
      }
    }

    // Check for other dark theme colors
    const otherDarkColors = [
      /bg-gray-[789]00/,
      /bg-slate-[789]00/,
      /text-gray-[345]00/,
      /text-slate-[345]00/,
      /border-gray-[789]00/,
      /border-slate-[789]00/,
    ];

    otherDarkColors.forEach(regex => {
      if (regex.test(classNameStr)) {
        fileIssues.push(`Hardcoded dark color ${regex.toString()}: "${classNameStr.trim().replace(/\n/g, ' ')}"`);
      }
    });
  }

  if (fileIssues.length > 0) {
    console.log(`\n--- Issues in ${file.replace(__dirname, '')} ---`);
    fileIssues.forEach(issue => console.log(issue));
    issuesFound += fileIssues.length;
  }
});

console.log(`\nTotal suspicious usages found: ${issuesFound}`);
