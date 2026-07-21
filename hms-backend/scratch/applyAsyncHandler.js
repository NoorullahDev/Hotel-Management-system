const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '../src/controllers');

const wrapController = (content) => {
  // Check if asyncHandler is already imported
  if (!content.includes('asyncHandler')) {
    content = `import { asyncHandler } from '../utils/asyncHandler';\n` + content;
  }

  // Replace export const methodName = async (req: Request, res: Response) => {
  // try { ... } catch (error) { ... } };
  // With export const methodName = asyncHandler(async (req: Request, res: Response) => { ... });

  // This regex matches:
  // export const name = async (req: Request, res: Response) => {
  //   try {
  const regex = /export const (\w+) = async \(([^)]+)\) => \{\s*try\s*\{/g;
  
  let modified = content.replace(regex, (match, p1, p2) => {
    return `export const ${p1} = asyncHandler(async (${p2}) => {`;
  });

  // Now we need to remove the catch blocks. 
  // Since simple regex for matching balancing braces is hard, we'll do a simple heuristic
  // that matches:
  // } catch (error: any) { ... } };
  // We can just replace the end of the function if it follows the exact format
  
  const catchRegex = /\}\s*catch\s*\([^)]+\)\s*\{\s*console\.error\([^;]+;\s*(?:if\s*\([^\{]+\)\s*\{\s*return\s*res\.status\([^)]+\)\.json\([^)]+\);\s*\}\s*)?res\.status\(\d+\)\.json\([^)]+\);\s*\}\s*\};/g;

  modified = modified.replace(catchRegex, '});');

  // Alternative catch regex for some other formats
  const catchRegex2 = /\}\s*catch\s*\([^)]+\)\s*\{\s*(?:console\.error\([^;]+;\s*)?res\.status\(\d+\)\.json\([^)]+\);\s*\}\s*\};/g;
  modified = modified.replace(catchRegex2, '});');

  return modified;
};

fs.readdirSync(controllersDir).forEach(file => {
  if (file.endsWith('.ts')) {
    const filePath = path.join(controllersDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const newContent = wrapController(content);
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`Updated ${file}`);
    }
  }
});
