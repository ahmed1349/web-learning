/**
 * JS Fundamentals demo — vanilla JS (pre-React patterns)
 * Concepts: const/let, arrow functions, arrays & objects, map/filter,
 * DOM APIs, classList, localStorage, event listeners.
 */

// --- Storage keys (string constants avoid typos) ---
const STORAGE_TASKS = 'js-demo-tasks';
const STORAGE_THEME = 'js-demo-theme';
/** After login from HTML/log_in.html we hand off via sessionStorage */
const SESSION_LOGGED_IN = 'js-demo-session-auth';

/** @type {{ id: string, text: string, completed: boolean }[]} */
let tasks = [];

// --- DOM refs (queried once the DOM is ready) ---
let loginSection;
let appSection;
let loginForm;
let loginEmail;
let loginPassword;
let loginError;
let taskInput;
let addTaskBtn;
let taskList;
let themeToggle;
let logoutBtn;

/** True when we're on login-only page (no dashboard in the same document) */
let isLoginOnlyPage = false;

// -----------------------------------------------------------------
// Persistence — JSON.stringify / JSON.parse bridge JS objects ↔ strings
// -----------------------------------------------------------------

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_TASKS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_TASKS, JSON.stringify(tasks));
}

function loadTheme() {
  return localStorage.getItem(STORAGE_THEME) === 'dark' ? 'dark' : 'light';
}

function saveTheme(mode) {
  localStorage.setItem(STORAGE_THEME, mode);
}

function applyTheme(mode) {
  document.body.classList.toggle('dark', mode === 'dark');
  if (themeToggle) {
    themeToggle.setAttribute('aria-pressed', mode === 'dark' ? 'true' : 'false');
    themeToggle.textContent = mode === 'dark' ? 'Light mode' : 'Dark mode';
  }
}

// -----------------------------------------------------------------
// Login
// -----------------------------------------------------------------

function showLoginError(message) {
  if (!loginError) return;
  loginError.textContent = message;
  loginError.hidden = !message;
}

function showApp() {
  if (loginSection) {
    loginSection.classList.add('is-hidden');
    loginSection.hidden = true;
  }
  if (appSection) {
    appSection.hidden = false;
    appSection.classList.add('is-visible');
  }
  if (taskInput) taskInput.focus();
}

function showLogin() {
  if (appSection) {
    appSection.hidden = true;
    appSection.classList.remove('is-visible');
  }
  if (loginSection) {
    loginSection.hidden = false;
    loginSection.classList.remove('is-hidden');
  }
  showLoginError('');
}

/**
 * handleLogin — prevent default submit, validate, then swap sections.
 * @param {SubmitEvent} event
 */
function handleLogin(event) {
  event.preventDefault();

  const email = (loginEmail?.value ?? '').trim();
  const password = (loginPassword?.value ?? '').trim();

  if (!email || !password) {
    showLoginError('Please enter both email and password.');
    return;
  }

  showLoginError('');

  if (isLoginOnlyPage) {
    // Hand off to main index.html (session flag, not persisted across browser restarts)
    sessionStorage.setItem(SESSION_LOGGED_IN, '1');
    window.location.href = '../index.html';
    return;
  }

  showApp();
}

function handleLogout() {
  // Requirement: clear UI session — keep tasks in localStorage
  sessionStorage.removeItem(SESSION_LOGGED_IN);
  showLogin();
  if (loginEmail) loginEmail.focus();
}

// -----------------------------------------------------------------
// Tasks — array of objects; map() for rendering, filter() for deletes
// -----------------------------------------------------------------

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function addTask() {
  const text = (taskInput?.value ?? '').trim();
  if (!text) return;

  tasks.push({
    id: generateId(),
    text,
    completed: false,
  });
  saveTasks();
  if (taskInput) taskInput.value = '';
  updateAddButtonState();
  renderTasks();
}

/**
 * toggleTask — find by id, flip completed, re-render (immutable-style update on one field)
 * @param {string} id
 */
function toggleTask(id) {
  tasks = tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );
  saveTasks();
  renderTasks();
}

/**
 * deleteTask — filter() removes without mutating the original array reference pattern
 * @param {string} id
 */
function deleteTask(id) {
  // IDs we generate are safe for attribute selectors (no quotes / special chars)
  const card = taskList?.querySelector(`[data-task-id="${id}"]`);
  if (card) {
    card.classList.add('task-leave');
    setTimeout(() => {
      tasks = tasks.filter((task) => task.id !== id);
      saveTasks();
      renderTasks();
    }, 240);
  } else {
    tasks = tasks.filter((task) => task.id !== id);
    saveTasks();
    renderTasks();
  }
}

function updateAddButtonState() {
  if (!addTaskBtn || !taskInput) return;
  addTaskBtn.disabled = taskInput.value.trim().length === 0;
}

/**
 * renderTasks — conditional rendering: empty state vs map() to HTML
 */
function renderTasks() {
  if (!taskList) return;

  if (tasks.length === 0) {
    taskList.innerHTML =
      '<p class="task-list-empty" role="status">No tasks yet — add one above.</p>';
    return;
  }

  // map() transforms each task object into an HTML string (template literals)
  taskList.innerHTML = tasks
    .map(
      (task) => `
    <article class="task-card card ${task.completed ? 'is-done' : ''}" data-task-id="${task.id}" role="listitem">
      <p class="task-text">${escapeHtml(task.text)}</p>
      <div class="task-actions">
        <button type="button" class="btn btn-success btn-sm js-toggle" data-id="${task.id}" aria-label="Toggle complete">
          ${task.completed ? 'Undo' : 'Done'}
        </button>
        <button type="button" class="btn btn-danger btn-sm js-delete" data-id="${task.id}" aria-label="Delete task">
          Delete
        </button>
      </div>
    </article>
  `
    )
    .join('');

  // Event delegation: one listener on the container for dynamic buttons
  taskList.querySelectorAll('.js-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (id) toggleTask(id);
    });
  });
  taskList.querySelectorAll('.js-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (id) deleteTask(id);
    });
  });
}

/** Basic XSS safety when injecting user text into innerHTML */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// -----------------------------------------------------------------
// Dark mode toggle
// -----------------------------------------------------------------

function toggleDarkMode() {
  const next = document.body.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(next);
  saveTheme(next);
}

// -----------------------------------------------------------------
// Boot — wire listeners when DOM is ready
// -----------------------------------------------------------------

function init() {
  loginSection = document.getElementById('login-section');
  appSection = document.getElementById('app-section');
  loginForm = document.getElementById('login-form');
  loginEmail = document.getElementById('login-email');
  loginPassword = document.getElementById('login-password');
  loginError = document.getElementById('login-error');
  taskInput = document.getElementById('task-input');
  addTaskBtn = document.getElementById('add-task-btn');
  taskList = document.getElementById('task-list');
  themeToggle = document.getElementById('theme-toggle');
  logoutBtn = document.getElementById('logout-btn');

  isLoginOnlyPage = !appSection;

  const theme = loadTheme();
  applyTheme(theme);

  tasks = loadTasks();

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (!isLoginOnlyPage) {
    if (themeToggle) themeToggle.addEventListener('click', toggleDarkMode);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (addTaskBtn) addTaskBtn.addEventListener('click', addTask);
    if (taskInput) {
      taskInput.addEventListener('input', updateAddButtonState);
      taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (!addTaskBtn?.disabled) addTask();
        }
      });
    }

    const fromLoginPage = sessionStorage.getItem(SESSION_LOGGED_IN) === '1';
    if (fromLoginPage) {
      sessionStorage.removeItem(SESSION_LOGGED_IN);
      showApp();
    } else {
      showLogin();
    }

    renderTasks();
    updateAddButtonState();
  }
}

document.addEventListener('DOMContentLoaded', init);
