import fs from 'fs';
import path from 'path';

const componentsDir = path.join(process.cwd(), 'src/components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

const replacements = [
  {
    regex: /bg-slate-900 border border-slate-800 from-indigo-500 to-indigo-400/g,
    replace: "bg-indigo-500"
  },
  {
    regex: /p-4\.5/g,
    replace: "p-4"
  },
  {
    regex: /font-extrabold font-mono text-white tracking-tight/g,
    replace: "font-semibold text-slate-100"
  },
  {
    regex: /font-extrabold font-mono text-emerald-400 tracking-tight/g,
    replace: "font-semibold text-emerald-400"
  },
  {
    regex: /font-extrabold font-mono text-purple-400 tracking-tight/g,
    replace: "font-semibold text-indigo-400"
  },
  // VoiceAssistant
  {
    regex: /rounded-full p-6 from-indigo-600 to-purple-600 shadow-\[0_0_20px_rgba\(99\,102\,241\,0\.4\)\] hover:shadow-\[0_0_30px_rgba\(99\,102\,241\,0\.6\)\] transition-all hover:scale-105 active:scale-95/g,
    replace: "rounded-full p-6 bg-slate-900 border border-slate-800 shadow-sm transition-all hover:bg-slate-800"
  },
  {
    regex: /text-white drop-shadow-md/g,
    replace: "text-slate-300"
  },
  {
    regex: /text-white/g,
    replace: "text-slate-100"
  },
  {
    regex: /text-[0-9]+xl font-extrabold text-transparent bg-clip-text from-indigo-400 to-purple-400/g,
    replace: "text-xl font-semibold text-slate-100"
  },
  {
    regex: /text-3xl font-extrabold/g,
    replace: "text-2xl font-semibold"
  },
  {
    regex: /text-2xl font-extrabold/g,
    replace: "text-xl font-semibold"
  },
  {
    regex: /text-4xl font-extrabold/g,
    replace: "text-3xl font-semibold"
  },
  {
    regex: /font-extrabold/g,
    replace: "font-semibold"
  },
  {
    regex: /border-r border-slate-800/g,
    replace: "border-r border-slate-800/50" // softer borders
  },
  {
    regex: /border-b border-slate-800/g,
    replace: "border-b border-slate-800/50"
  },
  {
    regex: /bg-slate-900 border border-slate-800/g,
    replace: "bg-slate-900 border border-slate-800/50"
  },
  {
    regex: /shadow-sm border border-slate-800/g,
    replace: "shadow-sm border border-slate-800/50"
  },
  {
    regex: /text-xs text-brand-purple font-mono font-semibold tracking-widest uppercase/g,
    replace: "text-[11px] text-slate-500 font-medium"
  },
  {
    regex: /font-mono font-bold uppercase tracking-widest/g,
    replace: "text-xs font-medium text-slate-500"
  },
  {
    regex: /shadow-md border-l-2 border-indigo-500/g,
    replace: "bg-slate-800 text-slate-100 rounded-md"
  },
  {
    regex: /bg-indigo-900\/30 text-slate-300 border-l-2 border-indigo-500 pl-2\.5 shadow-inner/g,
    replace: "bg-slate-800 text-slate-100"
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
