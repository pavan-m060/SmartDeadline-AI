import fs from 'fs';
import path from 'path';

const componentsDir = path.join(process.cwd(), 'src/components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

const replacements = [
  // Typography
  {
    regex: /font-display/g,
    replace: "font-sans"
  },
  {
    regex: /text-\[10px\]/g,
    replace: "text-xs"
  },
  {
    regex: /text-\[9px\]/g,
    replace: "text-[11px]"
  },
  {
    regex: /uppercase tracking-wider/g,
    replace: "font-medium"
  },
  
  // Gradients and Borders
  {
    regex: /bg-gradient-to-[a-z]+ from-brand-indigo via-brand-purple to-brand-magenta/g,
    replace: "bg-slate-900 border border-slate-800"
  },
  {
    regex: /bg-gradient-to-[a-z]+ from-slate-800\/40 to-slate-900\/60/g,
    replace: "bg-slate-900 border border-slate-800"
  },
  {
    regex: /bg-gradient-[^\s"]+/g,
    replace: "bg-slate-900 border border-slate-800"
  },

  // Glows and heavy shadows
  {
    regex: /shadow-purple-500\/20/g,
    replace: "shadow-sm"
  },
  {
    regex: /shadow-indigo-500\/20/g,
    replace: "shadow-sm"
  },
  {
    regex: /shadow-xl/g,
    replace: "shadow-sm"
  },
  {
    regex: /shadow-2xl/g,
    replace: "shadow-sm border border-slate-800"
  },
  {
    regex: /shadow-lg/g,
    replace: "shadow-sm"
  },

  // Specific buttons
  {
    regex: /bg-indigo-600 hover:bg-indigo-500/g,
    replace: "bg-brand-purple hover:bg-brand-purple-dark shadow-sm"
  },
  {
    regex: /bg-indigo-500/g,
    replace: "bg-brand-purple"
  },
  {
    regex: /text-indigo-400/g,
    replace: "text-slate-300"
  },
  {
    regex: /text-indigo-500/g,
    replace: "text-slate-400"
  },
  
  // Blurred circles
  {
    regex: /<div className="absolute top-0 right-0 w-\d+ h-\d+ bg-[^"]+ rounded-full blur-[^"]+.*?>\s*<\/div>/g,
    replace: ""
  },
  {
    regex: /<div className="absolute top-0 right-0 w-\d+ h-\d+ bg-[^"]+ rounded-full blur-[^"]+ pointer-events-none" \/>/g,
    replace: ""
  },

  // Cards style
  {
    regex: /bg-slate-900\/60/g,
    replace: "bg-slate-900"
  },
  {
    regex: /border-slate-800\/80/g,
    replace: "border-slate-800"
  },
  {
    regex: /rounded-2xl/g,
    replace: "rounded-xl"
  },
  {
    regex: /backdrop-blur-sm/g,
    replace: ""
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
