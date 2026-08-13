/**
 * ExamMaster AI - Core Application Logic
 * Containerized & Synced with 85-Exam GitHub Dataset
 */

// Application State
const state = {
  catalogData: null,
  currentFilter: 'all',
  searchQuery: '',
  currentExam: 'amazon/aws-certified-cloud-practitioner-clf-c02',
  currentPage: 1,
  totalPages: 29,
  totalQuestions: 712,
  questions: [],
  userAnswers: {}, // { questionNum: 'A' }
  revealedAnswers: {}, // { questionKey: boolean }
  translations: {}, // { questionNum: { question, options, explanation } }
  activeTranslation: {}, // { questionNum: boolean }
  mode: 'practice', // 'practice' or 'exam'
  theme: localStorage.getItem('theme') || 'dark',
  activeQuestionForTutor: null,
};

// DOM Elements
const elements = {
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIcon: document.getElementById('themeIcon'),
  examTitle: document.getElementById('examTitle'),
  examDesc: document.getElementById('examDesc'),
  statTotalQuestions: document.getElementById('statTotalQuestions'),
  statTotalPages: document.getElementById('statTotalPages'),
  statAnswered: document.getElementById('statAnswered'),
  statScore: document.getElementById('statScore'),
  // Sticky Top Bar Nav Stats
  navStatsWidget: document.getElementById('navStatsWidget'),
  navStatAnswered: document.getElementById('navStatAnswered'),
  navStatScore: document.getElementById('navStatScore'),
  pageInput: document.getElementById('pageInput'),
  totalPagesSpan: document.getElementById('totalPagesSpan'),
  prevPageBtn: document.getElementById('prevPageBtn'),
  nextPageBtn: document.getElementById('nextPageBtn'),
  prevPageBtn2: document.getElementById('prevPageBtn2'),
  nextPageBtn2: document.getElementById('nextPageBtn2'),
  pagePills: document.getElementById('pagePills'),
  questionsContainer: document.getElementById('questionsContainer'),
  modeToggleBtn: document.getElementById('modeToggleBtn'),
  modeLabel: document.getElementById('modeLabel'),
  // Catalog elements
  catalogGrid: document.getElementById('catalogGrid'),
  catalogSearchInput: document.getElementById('catalogSearchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  providerFilterTabs: document.getElementById('providerFilterTabs'),
  countAll: document.getElementById('countAll'),
  countMs: document.getElementById('countMs'),
  countGg: document.getElementById('countGg'),
  countAmz: document.getElementById('countAmz'),
  // AI Drawer
  aiDrawer: document.getElementById('aiDrawer'),
  aiDrawerOverlay: document.getElementById('aiDrawerOverlay'),
  closeDrawerBtn: document.getElementById('closeDrawerBtn'),
  drawerQuestionPreview: document.getElementById('drawerQuestionPreview'),
  chatMessages: document.getElementById('chatMessages'),
  chatInput: document.getElementById('chatInput'),
  sendChatBtn: document.getElementById('sendChatBtn'),
  toastContainer: document.getElementById('toastContainer'),
};

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

// Full parser for question content & interactive tags (<Statements/>, <Dropdown/>, <DragDrop/>)
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

  // Clean up body text
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

  clean = clean.replace(/\[\s*undefined\s*\]\([^)]*\)/gi, '');
  clean = clean.replace(/\[\s*\[object\s+Object\]\s*\]\([^)]*\)/gi, '');
  clean = clean.replace(/http:\/\/localhost:\d+\/\[object%20Object\]/gi, '');
  clean = clean.replace(/\[object%20Object\]/gi, '');
  clean = clean.replace(/Learn more:\s*·\s*$/gi, '');
  clean = clean.replace(/Learn more:\s*$/gi, '');

  return { cleanText: clean.trim(), statements, dropdown, dragDrop };
}

function cleanExplanationText(text) {
  return parseQuestionContent(text).cleanText;
}

// Detect if a question requires multiple answers
function detectMultiSelect(q) {
  const text = (q.question || '').toLowerCase();
  const patterns = [
    /each correct (?:answer|selection)/i,
    /select\s+(?:two|three|four|2|3|4)/i,
    /choose\s+(?:two|three|four|2|3|4)/i,
    /which\s+(?:two|three|four|2|3|4)/i,
  ];
  for (const p of patterns) {
    if (p.test(q.question || '')) return true;
  }
  // If question has 5+ options and null answer, likely multi-select
  if (q.answer === null && q.options && q.options.length >= 5) return true;
  return false;
}

// Extract how many answers are expected
function getExpectedCount(q) {
  const text = q.question || '';
  const match = text.match(/(?:select|choose|which)\s+(two|three|four|2|3|4)/i);
  if (match) {
    const map = { 'two': 2, 'three': 3, 'four': 4, '2': 2, '3': 3, '4': 4 };
    return map[match[1].toLowerCase()] || 2;
  }
  return 2; // default for multi-select
}

function formatAnswerBadge(ans) {
  if (!ans || ans === 'null' || ans === 'undefined') {
    return '<span style="color: var(--text-muted); font-size: 0.9rem;">Xem phân tích lời giải chi tiết bên dưới</span>';
  }
  return `<strong style="color: var(--success-text); font-size: 1.1rem; background: rgba(16, 185, 129, 0.2); padding: 0.15rem 0.6rem; border-radius: 6px; border: 1px solid var(--success-border);">${ans}</strong>`;
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initMarked();
  initTheme();
  setupEventListeners();
  loadUserProgress();
  fetchCatalog();
  
  // Show home view by default
  document.getElementById('homeView').style.display = 'block';
  document.getElementById('examView').style.display = 'none';
  document.getElementById('breadcrumb').style.display = 'none';
  if (elements.navStatsWidget) elements.navStatsWidget.style.display = 'none';
});

// Fetch full 85-exam catalog from API
async function fetchCatalog() {
  try {
    const res = await fetch('/api/exams');
    const data = await res.json();
    if (data.success && data.providers) {
      state.catalogData = data.providers;
      updateCatalogCounts();
      renderCatalogGrid();
    }
  } catch (err) {
    console.error('Failed to fetch exam catalog:', err);
    showToast('Khởi động danh mục đề thi thất bại', 'error');
  }
}

function updateCatalogCounts() {
  if (!state.catalogData) return;
  const msCount = state.catalogData.microsoft ? state.catalogData.microsoft.exams.length : 0;
  const ggCount = state.catalogData.google ? state.catalogData.google.exams.length : 0;
  const amzCount = state.catalogData.amazon ? state.catalogData.amazon.exams.length : 0;

  if (elements.countMs) elements.countMs.textContent = msCount;
  if (elements.countGg) elements.countGg.textContent = ggCount;
  if (elements.countAmz) elements.countAmz.textContent = amzCount;
  if (elements.countAll) elements.countAll.textContent = msCount + ggCount + amzCount;
}

// Render clean exam catalog grid (no raw technical path URL text)
function renderCatalogGrid() {
  if (!elements.catalogGrid || !state.catalogData) return;

  const query = state.searchQuery.trim().toLowerCase();
  const filter = state.currentFilter;
  let allExams = [];

  Object.keys(state.catalogData).forEach(providerKey => {
    if (filter === 'all' || filter === providerKey) {
      const pObj = state.catalogData[providerKey];
      pObj.exams.forEach(exam => {
        allExams.push({ ...exam, providerMeta: pObj });
      });
    }
  });

  if (query) {
    allExams = allExams.filter(exam => 
      exam.title.toLowerCase().includes(query) ||
      exam.slug.toLowerCase().includes(query) ||
      exam.fullSlug.toLowerCase().includes(query)
    );
  }

  if (allExams.length === 0) {
    elements.catalogGrid.innerHTML = `
      <div class="glass-panel text-center" style="grid-column: 1 / -1; padding: 3rem;">
        <i class="bi bi-search" style="font-size: 3rem; color: var(--text-muted); display: block; margin-bottom: 1rem;"></i>
        <h3 style="color: var(--text-secondary);">Không tìm thấy bộ đề phù hợp</h3>
        <p style="color: var(--text-muted); margin-top: 0.5rem;">Thử tìm kiếm với từ khóa khác như "AZ-900", "Cloud", "Security" hoặc đổi bộ lọc.</p>
      </div>
    `;
    return;
  }

  let html = '';
  allExams.forEach(exam => {
    const provMeta = exam.providerMeta;
    html += `
      <div class="glass-panel" style="padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; border-left: 4px solid ${provMeta.color};">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
            <span class="stat-badge" style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; background: rgba(255,255,255,0.05); color: ${provMeta.color}; border-color: ${provMeta.color}40;">
              <i class="${provMeta.icon}"></i> ${provMeta.name}
            </span>
            <span style="font-size: 0.8rem; color: var(--success-text);"><i class="bi bi-check-circle-fill"></i> Verified Dataset</span>
          </div>

          <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1.25rem; color: var(--text-primary); line-height: 1.4; font-family: var(--font-heading);">
            ${exam.title}
          </h3>
        </div>

        <div>
          <div style="display: flex; gap: 1rem; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem; border-top: 1px solid var(--border-color); padding-top: 0.85rem;">
            <span><i class="bi bi-question-circle" style="color: var(--accent-cyan);"></i> ${exam.totalQuestions} câu hỏi</span>
            <span><i class="bi bi-journals"></i> ${exam.totalPages} trang</span>
          </div>

          <button class="btn btn-primary" style="width: 100%; justify-content: center; font-weight: 600; padding: 0.75rem;" onclick="selectExam('${exam.fullSlug}')">
            <i class="bi bi-play-circle-fill"></i> Luyện Thi Ngay
          </button>
        </div>
      </div>
    `;
  });

  elements.catalogGrid.innerHTML = html;
}

// Navigation Functions
window.selectExam = function(slug) {
  state.currentExam = slug;
  state.currentPage = 1;
  elements.pageInput.value = 1;
  
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('examView').style.display = 'block';
  document.getElementById('breadcrumb').style.display = 'flex';
  if (elements.navStatsWidget) elements.navStatsWidget.style.display = 'flex';
  
  loadExamMeta(state.currentExam);
  loadQuestions(state.currentExam, 1);
};

window.goHome = function() {
  document.getElementById('examView').style.display = 'none';
  document.getElementById('breadcrumb').style.display = 'none';
  if (elements.navStatsWidget) elements.navStatsWidget.style.display = 'none';
  document.getElementById('homeView').style.display = 'block';
};

function initMarked() {
  marked.use({
    renderer: {
      link(arg1, title, text) {
        let href = '';
        let label = '';
        let titleAttr = '';

        if (typeof arg1 === 'object' && arg1 !== null) {
          href = String(arg1.href || '');
          label = arg1.text || arg1.tokens?.[0]?.raw || '';
          titleAttr = arg1.title || '';
        } else {
          href = String(arg1 || '');
          label = text || '';
          titleAttr = title || '';
        }

        if (!href || href.includes('[object%20Object]') || href.includes('undefined') || href.includes('[object Object]')) {
          return label || '';
        }

        let out = `<a target="_blank" rel="noopener noreferrer" href="${href}"`;
        if (titleAttr) out += ` title="${titleAttr}"`;
        out += `>${label}</a>`;
        return out;
      }
    }
  });
}

// Theme Management
function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon();
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', state.theme);
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon();
}

function updateThemeIcon() {
  elements.themeIcon.className = state.theme === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
}

// Event Listeners
function setupEventListeners() {
  elements.themeToggleBtn.addEventListener('click', toggleTheme);

  // Search input & Filter tabs
  if (elements.catalogSearchInput) {
    elements.catalogSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (elements.clearSearchBtn) {
        elements.clearSearchBtn.style.display = state.searchQuery ? 'inline-flex' : 'none';
      }
      renderCatalogGrid();
    });
  }

  if (elements.clearSearchBtn) {
    elements.clearSearchBtn.addEventListener('click', () => {
      state.searchQuery = '';
      if (elements.catalogSearchInput) elements.catalogSearchInput.value = '';
      elements.clearSearchBtn.style.display = 'none';
      renderCatalogGrid();
    });
  }

  if (elements.providerFilterTabs) {
    elements.providerFilterTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-filter]');
      if (btn) {
        elements.providerFilterTabs.querySelectorAll('button').forEach(b => b.classList.remove('active-tab'));
        btn.classList.add('active-tab');
        state.currentFilter = btn.dataset.filter;
        renderCatalogGrid();
      }
    });
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= state.totalPages) {
      state.currentPage = newPage;
      elements.pageInput.value = newPage;
      loadQuestions(state.currentExam, newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  elements.prevPageBtn.addEventListener('click', () => handlePageChange(state.currentPage - 1));
  elements.nextPageBtn.addEventListener('click', () => handlePageChange(state.currentPage + 1));
  elements.prevPageBtn2.addEventListener('click', () => handlePageChange(state.currentPage - 1));
  elements.nextPageBtn2.addEventListener('click', () => handlePageChange(state.currentPage + 1));

  elements.pageInput.addEventListener('change', (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) handlePageChange(val);
  });

  // Mode Toggle
  elements.modeToggleBtn.addEventListener('click', () => {
    state.mode = state.mode === 'practice' ? 'exam' : 'practice';
    elements.modeLabel.textContent = state.mode === 'practice' ? 'Luyện tập' : 'Thi thử';
    showToast(`Đã chuyển sang chế độ: ${state.mode === 'practice' ? 'Luyện tập' : 'Thi thử'}`);
    renderQuestions();
  });

  // AI Drawer
  elements.closeDrawerBtn.addEventListener('click', closeAiDrawer);
  elements.aiDrawerOverlay.addEventListener('click', closeAiDrawer);
  elements.sendChatBtn.addEventListener('click', sendTutorQuery);
  elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTutorQuery();
    }
  });

  // Quick prompt buttons
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.prompt;
      if (prompt) {
        elements.chatInput.value = prompt;
        sendTutorQuery();
      }
    });
  });
}

// Load Exam Metadata
async function loadExamMeta(examSlug) {
  try {
    const res = await fetch(`/api/questions/meta/${examSlug}`);
    const data = await res.json();
    if (data.success && data.data) {
      const meta = data.data;
      state.totalPages = meta.totalPages || 1;
      state.totalQuestions = meta.totalQuestions || 0;
      
      elements.examTitle.textContent = meta.title || examSlug;
      elements.statTotalQuestions.textContent = state.totalQuestions;
      elements.statTotalPages.textContent = state.totalPages;
      elements.totalPagesSpan.textContent = state.totalPages;
      elements.pageInput.max = state.totalPages;

      updatePaginationControls();
    }
  } catch (err) {
    console.error('Failed to load meta:', err);
  }
}

// Load Questions Page
async function loadQuestions(examSlug, page) {
  showLoading();
  try {
    const res = await fetch(`/api/questions/${examSlug}/${page}`);
    const data = await res.json();
    
    if (data.success && data.data) {
      state.questions = data.data;
      if (data.totalPages) state.totalPages = data.totalPages;
      if (data.totalQuestions) state.totalQuestions = data.totalQuestions;
      
      renderQuestions();
      updatePaginationControls();
      renderPagePills();
    } else {
      elements.questionsContainer.innerHTML = `
        <div class="glass-panel text-center" style="padding: 3rem;">
          <i class="bi bi-exclamation-triangle-fill" style="font-size: 3rem; color: var(--danger-text); display: block; margin-bottom: 1rem;"></i>
          <h3>Không thể tải danh sách câu hỏi</h3>
          <p style="color: var(--text-secondary);">${data.error || 'Vui lòng kiểm tra lại kết nối.'}</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('Failed to load questions:', err);
    elements.questionsContainer.innerHTML = `
      <div class="glass-panel text-center" style="padding: 3rem;">
        <i class="bi bi-wifi-off" style="font-size: 3rem; color: var(--danger-text); display: block; margin-bottom: 1rem;"></i>
        <h3>Lỗi kết nối máy chủ</h3>
        <p style="color: var(--text-secondary);">${err.message}</p>
      </div>
    `;
  }
}

// Show Loading State
function showLoading() {
  elements.questionsContainer.innerHTML = `
    <div class="skeleton-card glass-panel">
      <div class="skeleton-line short"></div>
      <div class="skeleton-line medium"></div>
      <div class="skeleton-line long"></div>
    </div>
    <div class="skeleton-card glass-panel" style="margin-top: 1.5rem;">
      <div class="skeleton-line short"></div>
      <div class="skeleton-line medium"></div>
      <div class="skeleton-line long"></div>
    </div>
  `;
}

// Interactive Component Renderers
function renderStatementsWidget(qNum, statements, isRevealed, selectedState = {}) {
  if (!statements || !statements.length) return '';
  return `
    <div class="interactive-statements-widget glass-panel">
      <div class="widget-title"><i class="bi bi-ui-checks-grid"></i> Đánh giá các câu phát biểu dưới đây:</div>
      <div class="statements-table">
        <div class="stmt-header-row">
          <div class="stmt-col-text">Câu phát biểu</div>
          <div class="stmt-col-opt">Đúng (Yes)</div>
          <div class="stmt-col-opt">Sai (No)</div>
        </div>
        ${statements.map((st, idx) => {
          const userChoice = selectedState[idx];
          const isYesCorrect = st.answer && st.answer.toLowerCase() === 'yes';
          const isNoCorrect = st.answer && st.answer.toLowerCase() === 'no';

          let yesClass = 'stmt-btn';
          let noClass = 'stmt-btn';

          if (userChoice === 'Yes') yesClass += ' picked';
          if (userChoice === 'No') noClass += ' picked';

          if (isRevealed) {
            if (isYesCorrect) yesClass += ' correct';
            else if (userChoice === 'Yes') yesClass += ' incorrect';

            if (isNoCorrect) noClass += ' correct';
            else if (userChoice === 'No') noClass += ' incorrect';
          }

          return `
            <div class="stmt-row">
              <div class="stmt-text">${marked.parse(st.text || '')}</div>
              <div class="stmt-opt">
                <button class="${yesClass}" onclick="selectStmtChoice(${qNum}, ${idx}, 'Yes')">
                  <i class="bi bi-check-lg"></i> Yes
                </button>
              </div>
              <div class="stmt-opt">
                <button class="${noClass}" onclick="selectStmtChoice(${qNum}, ${idx}, 'No')">
                  <i class="bi bi-x-lg"></i> No
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderDragDropWidget(qNum, dragDrop, isRevealed, userMatches = {}) {
  if (!dragDrop || !dragDrop.slots) return '';
  return `
    <div class="interactive-dragdrop-widget glass-panel">
      <div class="widget-title"><i class="bi bi-arrow-left-right"></i> Kéo thả / Ghép nối các khái niệm tương ứng:</div>
      <div class="dd-slots-list">
        ${dragDrop.slots.map((slot, idx) => {
          const matchedVal = userMatches[idx] || '';
          const isCorrect = isRevealed && matchedVal === slot.answer;
          const isIncorrect = isRevealed && matchedVal && matchedVal !== slot.answer;
          let slotClass = 'dd-slot-item';
          if (isCorrect) slotClass += ' correct';
          if (isIncorrect) slotClass += ' incorrect';

          return `
            <div class="${slotClass}">
              <div class="dd-slot-label">${marked.parse(slot.label || '')}</div>
              <div class="dd-slot-select">
                <select class="dd-select" onchange="selectDragDropMatch(${qNum}, ${idx}, this.value)">
                  <option value="">-- Chọn đáp án tương ứng --</option>
                  ${dragDrop.items.map(item => `
                    <option value="${item}" ${matchedVal === item ? 'selected' : ''}>${item}</option>
                  `).join('')}
                </select>
                ${isRevealed && slot.answer ? `<div class="dd-correct-badge"><i class="bi bi-check2"></i> Đúng: <strong>${slot.answer}</strong></div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderDropdownWidget(qNum, dropdown, isRevealed, userSelections = {}) {
  if (!dropdown || !dropdown.length) return '';
  return `
    <div class="interactive-dropdown-widget glass-panel">
      <div class="widget-title"><i class="bi bi-menu-button-wide-fill"></i> Chọn đáp án hoàn thành câu:</div>
      <div class="dd-blanks-list">
        ${dropdown.map((blank, idx) => {
          const userVal = userSelections[idx] || '';
          const isCorrect = isRevealed && userVal === blank.answer;
          const isIncorrect = isRevealed && userVal && userVal !== blank.answer;
          let blankClass = 'dropdown-blank-item';
          if (isCorrect) blankClass += ' correct';
          if (isIncorrect) blankClass += ' incorrect';

          return `
            <div class="${blankClass}">
              <div class="blank-label">${blank.label ? marked.parse(blank.label) : `Mục ${idx + 1}`}</div>
              <select class="blank-select" onchange="selectDropdownBlank(${qNum}, ${idx}, this.value)">
                <option value="">-- Chọn đáp án --</option>
                ${blank.options.map(opt => `
                  <option value="${opt}" ${userVal === opt ? 'selected' : ''}>${opt}</option>
                `).join('')}
              </select>
              ${isRevealed && blank.answer ? `<div class="dd-correct-badge"><i class="bi bi-check2"></i> Đúng: <strong>${blank.answer}</strong></div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// Global Event Handlers for Interactive Question Widgets
window.selectStmtChoice = function(qNum, idx, choice) {
  const qKey = `${state.currentExam}:${qNum}:stmt`;
  if (!state.userAnswers[qKey]) state.userAnswers[qKey] = {};
  state.userAnswers[qKey][idx] = choice;
  saveUserProgress();
  renderQuestions();
};

window.selectDragDropMatch = function(qNum, idx, val) {
  const qKey = `${state.currentExam}:${qNum}:dd`;
  if (!state.userAnswers[qKey]) state.userAnswers[qKey] = {};
  state.userAnswers[qKey][idx] = val;
  saveUserProgress();
  renderQuestions();
};

window.selectDropdownBlank = function(qNum, idx, val) {
  const qKey = `${state.currentExam}:${qNum}:drop`;
  if (!state.userAnswers[qKey]) state.userAnswers[qKey] = {};
  state.userAnswers[qKey][idx] = val;
  saveUserProgress();
  renderQuestions();
};

// Render Questions List
function renderQuestions() {
  if (!state.questions || state.questions.length === 0) return;

  let html = '';
  state.questions.forEach((q) => {
    const qKey = `${state.currentExam}:${q.number}`;
    const parsed = parseQuestionContent(q.question);

    const isMulti = detectMultiSelect(q);
    const expectedCount = isMulti ? getExpectedCount(q) : 1;
    const rawSelected = state.userAnswers[qKey];
    const selectedArr = isMulti
      ? (Array.isArray(rawSelected) ? rawSelected : (rawSelected ? [rawSelected] : []))
      : (rawSelected ? [rawSelected] : []);

    const stmtState = state.userAnswers[`${qKey}:stmt`] || {};
    const ddState = state.userAnswers[`${qKey}:dd`] || {};
    const dropState = state.userAnswers[`${qKey}:drop`] || {};

    const isAnsSubmitted = selectedArr.length > 0 || Object.keys(stmtState).length > 0 || Object.keys(ddState).length > 0 || Object.keys(dropState).length > 0;
    const isRevealed = !!state.revealedAnswers[qKey];

    const isTranslated = !!state.activeTranslation[qKey];
    const trans = state.translations[qKey];

    const rawDisplay = isTranslated && trans ? trans.question : q.question;
    const parsedDisplay = parseQuestionContent(rawDisplay);
    const rawExplanation = isTranslated && trans ? trans.explanation : q.explanation;
    const displayExplanation = cleanExplanationText(rawExplanation);

    const showExplanationBox = isAnsSubmitted || isRevealed;

    // Badges
    let badgeLabel = '';
    if (parsed.statements) {
      badgeLabel = `<span class="multi-badge statement-badge"><i class="bi bi-ui-checks-grid"></i> Câu hỏi Đúng / Sai</span>`;
    } else if (parsed.dragDrop) {
      badgeLabel = `<span class="multi-badge dragdrop-badge"><i class="bi bi-arrow-left-right"></i> Câu hỏi Kéo thả / Ghép nối</span>`;
    } else if (parsed.dropdown) {
      badgeLabel = `<span class="multi-badge dropdown-badge"><i class="bi bi-menu-button-wide-fill"></i> Chọn đáp án điền vào chỗ trống</span>`;
    } else if (isMulti) {
      badgeLabel = `<span class="multi-badge"><i class="bi bi-ui-checks"></i> Chọn ${expectedCount} đáp án</span>`;
    }

    html += `
      <div class="question-card glass-panel" id="question-${q.number}">
        <div class="question-header">
          <div class="question-number-badge">
            <span class="qnum-circle">${q.number}</span>
            <span class="qnum-label">Câu ${q.number}</span>
            ${badgeLabel}
          </div>
          <div class="question-actions">
            <button class="action-btn action-reveal ${isRevealed ? 'active' : ''}" onclick="toggleRevealAnswer(${q.number})" title="${isRevealed ? 'Ẩn đáp án' : 'Xem đáp án'}">
              <i class="bi ${isRevealed ? 'bi-eye-slash-fill' : 'bi-eye-fill'}"></i>
            </button>
            <button class="action-btn action-translate ${isTranslated ? 'active' : ''}" onclick="translateQuestion(${q.number})" title="${isTranslated ? 'Xem gốc' : 'Dịch Tiếng Việt'}">
              <i class="bi bi-translate"></i>
            </button>
            <button class="action-btn action-ai" onclick="openAiTutor(${q.number})" title="Hỏi AI Tutor">
              <i class="bi bi-stars"></i>
            </button>
          </div>
        </div>

        <div class="question-text">${marked.parse(parsedDisplay.cleanText || '')}</div>

        <!-- Render Interactive Widgets if present -->
        ${parsed.statements ? renderStatementsWidget(q.number, parsed.statements, isRevealed, stmtState) : ''}
        ${parsed.dragDrop ? renderDragDropWidget(q.number, parsed.dragDrop, isRevealed, ddState) : ''}
        ${parsed.dropdown ? renderDropdownWidget(q.number, parsed.dropdown, isRevealed, dropState) : ''}

        <!-- Multiple Choice Options (if available) -->
        ${(q.options && q.options.length > 0) ? `
          <div class="options-list">
            ${q.options.map(opt => {
              const optLetter = opt.letter;
              let optText = opt.text;

              if (isTranslated && trans && trans.options) {
                const matchedOpt = trans.options.find(o => o.letter === optLetter);
                if (matchedOpt) optText = matchedOpt.text;
              }

              let optClass = 'option-item';
              let radioClass = isMulti ? 'option-radio multi' : 'option-radio';
              let statusIcon = '';
              const isPicked = selectedArr.includes(optLetter);

              if (isAnsSubmitted || isRevealed) {
                if (q.answer && optLetter === q.answer) {
                  optClass += ' correct';
                  statusIcon = '<i class="bi bi-check-circle-fill opt-status-icon correct-icon"></i>';
                }
                if (q.answer && isPicked && optLetter !== q.answer) {
                  optClass += ' incorrect';
                  statusIcon = '<i class="bi bi-x-circle-fill opt-status-icon incorrect-icon"></i>';
                }
                if (isPicked) {
                  optClass += ' selected';
                }
                if (!q.answer && isPicked) {
                  optClass += ' picked';
                }
              } else if (isPicked) {
                optClass += ' picked';
              }

              return `
                <div class="${optClass}" onclick="selectAnswer(${q.number}, '${optLetter}')">
                  <div class="${radioClass}">${optLetter}</div>
                  <div class="option-text">${marked.parse(cleanExplanationText(optText))}</div>
                  ${statusIcon}
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        ${showExplanationBox ? `
          <div class="explanation-box">
            <div class="explanation-header">
              <i class="bi bi-lightbulb-fill"></i>
              <span>Đáp án đúng: ${formatAnswerBadge(q.answer)}</span>
            </div>
            <div class="explanation-content">${marked.parse(displayExplanation || 'Không có giải thích chi tiết.')}</div>
          </div>
        ` : ''}
      </div>
    `;
  });

  elements.questionsContainer.innerHTML = html;
  updateStats();
}

// Toggle Reveal Answer without picking an option
window.toggleRevealAnswer = function(qNum) {
  const qKey = `${state.currentExam}:${qNum}`;
  state.revealedAnswers[qKey] = !state.revealedAnswers[qKey];
  renderQuestions();
};

// Handle Answer Selection (supports multi-select toggle)
window.selectAnswer = function(qNum, letter) {
  const qKey = `${state.currentExam}:${qNum}`;
  const q = state.questions.find(item => item.number === qNum);
  const isMulti = q ? detectMultiSelect(q) : false;

  if (isMulti) {
    // Toggle letter in/out of selected array
    let current = state.userAnswers[qKey];
    if (!Array.isArray(current)) current = current ? [current] : [];
    const idx = current.indexOf(letter);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(letter);
    }
    state.userAnswers[qKey] = current.length > 0 ? current : undefined;
  } else {
    state.userAnswers[qKey] = letter;
  }
  saveUserProgress();
  renderQuestions();
};

// Translate Question using Fast Google Translate API
window.translateQuestion = async function(qNum) {
  const qKey = `${state.currentExam}:${qNum}`;
  
  if (state.activeTranslation[qKey]) {
    state.activeTranslation[qKey] = false;
    renderQuestions();
    return;
  }

  if (state.translations[qKey]) {
    state.activeTranslation[qKey] = true;
    renderQuestions();
    return;
  }

  const q = state.questions.find(item => item.number === qNum);
  if (!q) return;

  showToast(`⚡ Đang dịch câu hỏi ${qNum} siêu tốc...`);

  try {
    const res = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: q.question,
        options: q.options,
        explanation: q.explanation
      })
    });
    const data = await res.json();

    if (data.success && data.data) {
      state.translations[qKey] = data.data;
      state.activeTranslation[qKey] = true;
      showToast(`Đã dịch xong câu hỏi ${qNum}!`, 'success');
      renderQuestions();
    } else {
      showToast(data.error || 'Dịch thất bại', 'error');
    }
  } catch (err) {
    console.error('Translation error:', err);
    showToast('Lỗi khi gọi dịch vụ Dịch Tiếng Việt', 'error');
  }
};

// AI Tutor Chat Integration
window.openAiTutor = function(qNum) {
  const q = state.questions.find(item => item.number === qNum);
  if (!q) return;

  state.activeQuestionForTutor = q;
  elements.drawerQuestionPreview.textContent = `[Câu ${q.number}] ${q.question.slice(0, 100)}...`;

  elements.aiDrawer.classList.add('open');
  elements.aiDrawerOverlay.classList.add('open');
};

function closeAiDrawer() {
  elements.aiDrawer.classList.remove('open');
  elements.aiDrawerOverlay.classList.remove('open');
}

async function sendTutorQuery() {
  const query = elements.chatInput.value.trim();
  if (!query || !state.activeQuestionForTutor) return;

  appendChatBubble('user', query);
  elements.chatInput.value = '';

  const aiBubbleId = appendChatBubble('ai', '<i class="bi bi-three-dots"></i> Đang suy nghĩ...');

  try {
    const res = await fetch('/api/ai/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionContext: state.activeQuestionForTutor,
        userQuery: query
      })
    });
    const data = await res.json();

    if (data.success && data.data && data.data.text) {
      updateChatBubble(aiBubbleId, data.data.text);
    } else if (data.success && data.answer) {
      updateChatBubble(aiBubbleId, data.answer);
    } else {
      updateChatBubble(aiBubbleId, data.error || 'AstroTutor không thể trả lời lúc này.');
    }
  } catch (err) {
    updateChatBubble(aiBubbleId, 'Lỗi kết nối với AstroTutor AI.');
  }
}

function appendChatBubble(sender, text) {
  const id = 'bubble-' + Date.now();
  const div = document.createElement('div');
  div.className = `chat-bubble ${sender}`;
  div.id = id;

  const header = sender === 'user' ? '<i class="bi bi-person-circle"></i> Bạn' : '<i class="bi bi-robot"></i> AstroTutor';
  div.innerHTML = `
    <div class="bubble-header">${header}</div>
    <div class="bubble-content">${marked.parse(cleanExplanationText(text))}</div>
  `;

  elements.chatMessages.appendChild(div);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  return id;
}

function updateChatBubble(id, text) {
  const bubble = document.getElementById(id);
  if (bubble) {
    const content = bubble.querySelector('.bubble-content');
    if (content) content.innerHTML = marked.parse(cleanExplanationText(text));
  }
}

// Pagination Controls
function updatePaginationControls() {
  const isFirst = state.currentPage === 1;
  const isLast = state.currentPage === state.totalPages;

  elements.prevPageBtn.disabled = isFirst;
  elements.nextPageBtn.disabled = isLast;
  elements.prevPageBtn2.disabled = isFirst;
  elements.nextPageBtn2.disabled = isLast;
}

function renderPagePills() {
  if (!elements.pagePills) return;
  const total = state.totalPages;
  const current = state.currentPage;
  
  let pages = [];
  for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
    pages.push(i);
  }

  let html = '';
  pages.forEach(p => {
    html += `
      <div class="page-pill ${p === current ? 'active' : ''}" onclick="goToPage(${p})">${p}</div>
    `;
  });

  elements.pagePills.innerHTML = html;
}

window.goToPage = function(p) {
  if (p >= 1 && p <= state.totalPages) {
    state.currentPage = p;
    elements.pageInput.value = p;
    loadQuestions(state.currentExam, p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// Stats & LocalStorage Progress (Synced to Sticky Top Navbar)
function updateStats() {
  let answered = 0;
  let correct = 0;

  state.questions.forEach(q => {
    const qKey = `${state.currentExam}:${q.number}`;
    const ans = state.userAnswers[qKey];
    if (ans) {
      answered++;
      if (ans === q.answer) correct++;
    }
  });

  if (elements.statAnswered) elements.statAnswered.textContent = answered;
  if (elements.statScore) elements.statScore.textContent = `${correct}/${answered}`;

  if (elements.navStatAnswered) elements.navStatAnswered.textContent = answered;
  if (elements.navStatScore) elements.navStatScore.textContent = `${correct}/${answered}`;
}

function saveUserProgress() {
  localStorage.setItem('userAnswers', JSON.stringify(state.userAnswers));
}

function loadUserProgress() {
  try {
    const saved = localStorage.getItem('userAnswers');
    if (saved) state.userAnswers = JSON.parse(saved);
  } catch (_) {}
}

// Toast Notifications
function showToast(message, type = 'info') {
  if (!elements.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="bi bi-info-circle-fill"></i> <span>${message}</span>`;

  elements.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}
