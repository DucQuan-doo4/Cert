const fs = require('fs');

function parseJsObj(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (e) {
    try {
      return (new Function('return (' + str + ')'))();
    } catch (e2) {
      return null;
    }
  }
}

function parseQuestionContent(rawText) {
  if (!rawText) return { cleanText: '', statements: null, dropdown: null, dragDrop: null };

  let text = String(rawText);

  // 1. Extract <Statements .../> BEFORE cleaning text
  let statements = null;
  const stmtMatch = text.match(/statements=\{([\s\S]*?\]\s*)\}/);
  if (stmtMatch) {
    statements = parseJsObj(stmtMatch[1]);
  }

  // 2. Extract <Dropdown .../>
  let dropdown = null;
  const dropMatch = text.match(/blanks=\{([\s\S]*?\]\s*)\}/);
  if (dropMatch) {
    dropdown = parseJsObj(dropMatch[1]);
  }

  // 3. Extract <DragDrop .../>
  let dragDrop = null;
  const itemsMatch = text.match(/items=\{([\s\S]*?\]\s*)\}/);
  const slotsMatch = text.match(/slots=\{([\s\S]*?\]\s*)\}/);
  if (itemsMatch && slotsMatch) {
    const items = parseJsObj(itemsMatch[1]);
    const slots = parseJsObj(slotsMatch[1]);
    if (items && slots) dragDrop = { items, slots };
  }

  // Now clean up text
  let clean = text;

  // Remove JSX component tags from body text
  clean = clean.replace(/<Statements[\s\S]*?\/>/g, '');
  clean = clean.replace(/<Dropdown[\s\S]*?\/>/g, '');
  clean = clean.replace(/<DragDrop[\s\S]*?\/>/g, '');

  // Strip RSC Stream payload
  clean = clean.replace(/",\s*"className"\s*:\s*"[^"]*\}[\s\S]*/gi, '');
  clean = clean.replace(/^[a-z0-9]+:(?:I\[|\[)[\s\S]*?(?=[A-Z][a-z])/gm, '');
  clean = clean.replace(/^[,\s"\$0-9a-zA-Z_:\[\]\{\}\-\.]+(?=[A-Z][a-z]\s)/gm, '');
  clean = clean.replace(/^[\s\S]*?\}\]\s*,?\s*/, (match) => {
    if (match.includes('lassName') || match.includes('button') || match.includes('icon-accent') || match.includes('static/chunks')) {
      return '';
    }
    return match;
  });

  // Keep only from first real paragraph
  const realStart = clean.search(/(?:For |Select |Match |Which |What |Your |You |A |An |In |To |How |The |This |Choose |If |When |Note)/i);
  if (realStart > 0 && realStart < 300) {
    clean = clean.slice(realStart);
  }

  return { cleanText: clean.trim(), statements, dropdown, dragDrop };
}

const d = JSON.parse(fs.readFileSync('./server/data/microsoft/az-900.json','utf8'));
const qs = d.questions;

const st = qs.find(q=>q.question.includes('<Statements'));
console.log('--- STATEMENTS PARSED ---');
console.log(JSON.stringify(parseQuestionContent(st.question), null, 2));
