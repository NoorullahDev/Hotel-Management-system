const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '../src/controllers');

// Fixes unbalanced catch blocks left by the previous regex
const fixCatchBlock = (content) => {
  // We want to replace:
  //   } catch (error: any) {
  //     ...
  //   }
  // };
  // with:
  //   });
  
  // Since we replaced the `try {` but left the `} catch (...) { ... } };`
  // We just need to replace `} catch` to the final `};` with `});`
  
  // Regex to match `} catch (...` up to `};`
  // We assume the catch block ends with `};` which closes the export const fn = asyncHandler(...)
  
  const regex = /\}\s*catch\s*\([^)]+\)\s*\{[\s\S]*?\}\s*\};/g;
  return content.replace(regex, '});');
};

fs.readdirSync(controllersDir).forEach(file => {
  if (file.endsWith('.ts')) {
    const filePath = path.join(controllersDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const newContent = fixCatchBlock(content);
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`Fixed ${file}`);
    }
  }
});
