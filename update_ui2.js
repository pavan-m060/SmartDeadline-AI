import fs from 'fs';
import path from 'path';

const componentsDir = path.join(process.cwd(), 'src/components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

const replacements = [
  {
    regex: /shadow-\[[^\]]+\]/g,
    replace: "shadow-sm border border-slate-800"
  },
  {
    regex: /blur-[a-z0-9]+/g,
    replace: ""
  },
  {
    regex: /animate-pulse/g,
    replace: ""
  },
  {
    regex: /animate-bounce/g,
    replace: ""
  },
  {
    regex: /border-slate-[0-9]+\/[0-9]+/g,
    replace: "border-slate-800"
  },
  {
    regex: /bg-slate-900\/[0-9]+/g,
    replace: "bg-slate-900"
  },
  {
    regex: /bg-slate-950\/[0-9]+/g,
    replace: "bg-slate-950"
  },
  // Button styles
  {
    regex: /bg-brand-purple/g,
    replace: "bg-brand-purple"
  },
  {
    regex: /shadow-sm border border-slate-800/g,
    replace: "shadow-sm border-slate-800"
  }
];

files.forEach(file => {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  replacements.forEach(rep => {
    content = content.replace(rep.regex, rep.replace);
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
