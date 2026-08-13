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

// Clean explanation text from broken markdown links or RSC object artifacts
function cleanExplanationText(text) {
  if (!text) return '';
  let cleaned = String(text);
  cleaned = cleaned.replace(/\[\s*undefined\s*\]\([^)]*\)/gi, '');
  cleaned = cleaned.replace(/\[\s*\[object\s+Object\]\s*\]\([^)]*\)/gi, '');
  cleaned = cleaned.replace(/http:\/\/localhost:\d+\/\[object%20Object\]/gi, '');
  cleaned = cleaned.replace(/\[object%20Object\]/gi, '');
  cleaned = cleaned.replace(/Learn more:\s*·\s*$/gi, '');
  cleaned = cleaned.replace(/Learn more:\s*$/gi, '');
  return cleaned.trim();
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
    showToast(`Đã chuyển sang chế độ: ${state.mode === 'practice' ? 'Luyện tập (Xem đáp án ngay)' : 'Thi thử'}`);
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

// Render Questions List
function renderQuestions() {
  if (!state.questions || state.questions.length === 0) return;

  let html = '';
  state.questions.forEach((q) => {
    const qKey = `${state.currentExam}:${q.number}`;
    const selectedAns = state.userAnswers[qKey];
    const isAnsSubmitted = !!selectedAns;
    
    const isTranslated = !!state.activeTranslation[qKey];
    const trans = state.translations[qKey];

    const displayQuestion = isTranslated && trans ? trans.question : q.question;
    const rawExplanation = isTranslated && trans ? trans.explanation : q.explanation;
    const displayExplanation = cleanExplanationText(rawExplanation);

    html += `
      <div class="question-card glass-panel" id="question-${q.number}">
        <div class="question-header">
          <div class="question-number"><i class="bi bi-hash"></i> Câu hỏi ${q.number}</div>
          <div class="question-actions">
            <button class="btn btn-outline btn-sm" onclick="translateQuestion(${q.number})" title="Dịch sang Tiếng Việt">
              <i class="bi bi-translate"></i> ${isTranslated ? 'Xem gốc' : 'Dịch Việt'}
            </button>
            <button class="btn btn-purple btn-sm" onclick="openAiTutor(${q.number})" title="Hỏi Trợ lý AI">
              <i class="bi bi-robot"></i> Hỏi AI
            </button>
          </div>
        </div>

        <div class="question-text">${marked.parse(cleanExplanationText(displayQuestion))}</div>

        <div class="options-list">
          ${q.options.map(opt => {
            const optLetter = opt.letter;
            let optText = opt.text;

            if (isTranslated && trans && trans.options) {
              const matchedOpt = trans.options.find(o => o.letter === optLetter);
              if (matchedOpt) optText = matchedOpt.text;
            }

            let optClass = 'option-item';
            if (isAnsSubmitted) {
              if (optLetter === q.answer) {
                optClass += state.mode === 'practice' || isAnsSubmitted ? ' correct' : '';
              }
              if (selectedAns === optLetter && selectedAns !== q.answer) {
                optClass += ' incorrect';
              }
              if (selectedAns === optLetter) {
                optClass += ' selected';
              }
            }

            return `
              <div class="${optClass}" onclick="selectAnswer(${q.number}, '${optLetter}')">
                <div class="option-radio">${optLetter}</div>
                <div class="option-text">${marked.parse(cleanExplanationText(optText))}</div>
              </div>
            `;
          }).join('')}
        </div>

        ${(state.mode === 'practice' && isAnsSubmitted) || (state.mode === 'practice' && displayExplanation) ? `
          <div class="explanation-box">
            <div class="explanation-title"><i class="bi bi-lightbulb-fill"></i> Đáp án đúng: ${formatAnswerBadge(q.answer)}</div>
            <div class="explanation-content">${marked.parse(displayExplanation || 'Không có giải thích chi tiết.')}</div>
          </div>
        ` : ''}
      </div>
    `;
  });

  elements.questionsContainer.innerHTML = html;
  updateStats();
}

// Handle Answer Selection
window.selectAnswer = function(qNum, letter) {
  const qKey = `${state.currentExam}:${qNum}`;
  state.userAnswers[qKey] = letter;
  saveUserProgress();
  renderQuestions();
};

// Translate Question using AI / Proxy Endpoint
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

  showToast(`Đang dịch câu hỏi ${qNum} sang Tiếng Việt...`);

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
    showToast('Lỗi khi gọi dịch vụ AI Translate', 'error');
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

    if (data.success && data.answer) {
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
