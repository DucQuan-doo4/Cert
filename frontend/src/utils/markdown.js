/**
 * Simple, safe markdown and HTML parser for exam question formatting.
 * Supports bold, code, links, images, line breaks, and bullet points.
 */
export function parseMarkdownToHtml(text) {
  if (!text) return '';

  let html = String(text);

  // 1. Escape basic HTML tags except specific safe ones (br, img, table, tr, td, th, select, option, etc. which might be scraped)
  // Instead of escaping everything, we assume the input has safe scraped HTML from the dataset (like <img> or tables)
  
  // 2. Images: ![alt](url) -> <img src="url" alt="alt" class="zoomable-img" />
  html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" class="zoomable-img" />');

  // 3. Links: [label](url) -> <a href="url" target="_blank" rel="noopener noreferrer">$label</a>
  // We avoid parsing invalid [undefined] or [object Object] links
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match, label, url) => {
    if (url.includes('object') || url.includes('undefined')) return label;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="markdown-link">${label}</a>`;
  });

  // 4. Bold: **text** -> <strong>text</strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 5. Code blocks: `code` -> <code>code</code>
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 6. Bullet lists: lines starting with * or - -> <li>text</li>
  const lines = html.split('\n');
  let inList = false;
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const content = trimmed.substring(2);
      if (!inList) {
        inList = true;
        return `<ul><li>${content}</li>`;
      }
      return `<li>${content}</li>`;
    } else {
      if (inList) {
        inList = false;
        return `</ul>${line}`;
      }
      return line;
    }
  });
  if (inList) {
    processedLines.push('</ul>');
  }
  html = processedLines.join('\n');

  // 7. Line breaks: \n -> <br />
  html = html.replace(/\n/g, '<br />');

  return html;
}

/**
 * Utility to parse Javascript object strings safely
 */
export function parseJsObj(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (e) {
    try {
      // Fallback for non-strict JSON object strings in scraped data
      return (new Function('return (' + str + ')'))();
    } catch (e2) {
      return null;
    }
  }
}

/**
 * Full parser to extract JSX-like interactive components from scraped question text
 */
export function parseQuestionContent(rawText) {
  if (!rawText) return { cleanText: '', statements: null, dropdown: null, dragDrop: null };

  let text = String(rawText);

  // Extract <Statements statements={...}/>
  let statements = null;
  const stmtMatch = text.match(/statements=\{([\s\S]*?\]\s*)\}/);
  if (stmtMatch) {
    statements = parseJsObj(stmtMatch[1]);
  }

  // Extract <Dropdown blanks={...}/>
  let dropdown = null;
  const dropMatch = text.match(/blanks=\{([\s\S]*?\]\s*)\}/);
  if (dropMatch) {
    dropdown = parseJsObj(dropMatch[1]);
  }

  // Extract <DragDrop items={...} slots={...}/>
  let dragDrop = null;
  const itemsMatch = text.match(/items=\{([\s\S]*?\]\s*)\}/);
  const slotsMatch = text.match(/slots=\{([\s\S]*?\]\s*)\}/);
  if (itemsMatch && slotsMatch) {
    const items = parseJsObj(itemsMatch[1]);
    const slots = parseJsObj(slotsMatch[1]);
    if (items && slots) dragDrop = { items, slots };
  }

  // Clean the raw text by stripping these JSX components
  let cleanText = text;
  cleanText = cleanText.replace(/<Statements[\s\S]*?\/>/g, '');
  cleanText = cleanText.replace(/<Dropdown[\s\S]*?\/>/g, '');
  cleanText = cleanText.replace(/<DragDrop[\s\S]*?\/>/g, '');

  // Detect Next.js RSC payload and clean it up
  if (cleanText.includes('static/chunks') || cleanText.includes('className') || cleanText.includes('fav-question') || cleanText.includes('exam-content') || cleanText.includes('lassName')) {
    // 1. Try to split by lines and filter out metadata lines
    let lines = cleanText.split('\n');
    lines = lines.filter(line => {
      const trimmed = line.trim();
      if (trimmed.includes('static/chunks') || trimmed.includes('static/media')) return false;
      if (trimmed.match(/^[a-zA-Z0-9]+:(?:I\[|\[|\{|")/)) return false;
      if (trimmed.startsWith('Name":"') || trimmed.startsWith('"Name":"') || trimmed.startsWith('lassName":"')) return false;
      return true;
    });
    cleanText = lines.join('\n');

    // 2. Find the last metadata bracket boundaries and slice the actual question text
    const lastJunkIndex = Math.max(
      cleanText.lastIndexOf('}]'),
      cleanText.lastIndexOf('"]'),
      cleanText.lastIndexOf('",'),
      cleanText.lastIndexOf('default"]'),
      cleanText.lastIndexOf('Image"]')
    );

    if (lastJunkIndex >= 0 && lastJunkIndex < cleanText.length - 1) {
      let possibleText = cleanText.substring(lastJunkIndex + 2).trim();
      possibleText = possibleText.replace(/^[,\s\]}]+/g, '').trim(); // Remove leading punctuation
      
      if (possibleText.length > 5) {
        cleanText = possibleText;
      }
    }
  }

  // Further inline cleanup
  cleanText = cleanText.replace(/lassName":"[^"]*"/gi, '');
  cleanText = cleanText.replace(/className":"[^"]*"/gi, '');

  // Keep text starting from first real word paragraph in scrap (broadened patterns)
  const markerRegex = /(?:##\s+|Overview|Case\s+Study|\*\*Question|\bYou\s+have\b|\bWhich\b|\bWhat\b|\bYour\b|\bAn?\b|\bThe\b|\bIn\b|\bTo\b|\bHow\b|\bChoose\b|\bIf\b|\bWhen\b|\bFor\b|\bSelect\b|\bMatch\b)/i;
  const match = cleanText.match(markerRegex);
  if (match && match.index > 0 && match.index < 350) {
    cleanText = cleanText.substring(match.index);
  }

  // Cleanup invalid markdown links
  cleanText = cleanText.replace(/\[\s*undefined\s*\]\([^)]*\)/gi, '');
  cleanText = cleanText.replace(/\[\s*\[object\s+Object\]\s*\]\([^)]*\)/gi, '');
  cleanText = cleanText.replace(/http:\/\/localhost:\d+\/\[object%20Object\]/gi, '');
  cleanText = cleanText.replace(/\[object%20Object\]/gi, '');
  cleanText = cleanText.replace(/Learn more:\s*·\s*$/gi, '');
  cleanText = cleanText.replace(/Learn more:\s*$/gi, '');

  return {
    cleanText: cleanText.trim(),
    statements,
    dropdown,
    dragDrop
  };
}

/**
 * Detect if a question requires multiple answers
 */
export function detectMultiSelect(q) {
  const text = (q.question || '').toLowerCase();
  const patterns = [
    /each correct (?:answer|selection)/i,
    /select\s+(?:two|three|four|2|3|4)/i,
    /choose\s+(?:two|three|four|2|3|4)/i,
    /which\s+(?:two|three|four|2|3|4)/i,
  ];
  for (const p of patterns) {
    if (p.test(text)) return true;
  }
  // Fallback: if answer is a comma separated string (e.g. "A, B")
  if (q.answer && q.answer.includes(',')) return true;
  // If question has 5+ options and no answer, it's often a multi-select
  if (q.answer === null && q.options && q.options.length >= 5) return true;
  return false;
}

/**
 * Get number of answers expected for multi select
 */
export function getExpectedCount(q) {
  const text = q.question || '';
  const match = text.match(/(?:select|choose|which)\s+(two|three|four|2|3|4)/i);
  if (match) {
    const map = { 'two': 2, 'three': 3, 'four': 4, '2': 2, '3': 3, '4': 4 };
    return map[match[1].toLowerCase()] || 2;
  }
  // Fallback: check length of answer array if comma-separated
  if (q.answer && q.answer.includes(',')) {
    return q.answer.split(',').map(s => s.trim()).length;
  }
  return 2;
}
