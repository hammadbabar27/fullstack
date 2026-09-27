const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

// Guard: no token, no access
if (!token) {
  window.location.href = '/login.html';
}

document.getElementById('welcome-msg').textContent = user ? `Welcome, ${user.username}` : '';

const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');
const filterCategory = document.getElementById('filter-category');
const filterPriority = document.getElementById('filter-priority');
const filterCompleted = document.getElementById('filter-completed');
const taskCategorySelect = document.getElementById('task-category');
const addCategoryBtn = document.getElementById('add-category-btn');
const newCategoryInput = document.getElementById('new-category-name');

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: authHeaders(options.headers || {}),
  });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
    throw new Error('Session expired');
  }
  return res;
}

// ---------- Categories ----------
async function loadCategories() {
  const res = await apiFetch('/api/categories');
  const categories = await res.json();

  [filterCategory, taskCategorySelect].forEach((select) => {
    const keepFirst = select.firstElementChild;
    select.innerHTML = '';
    select.appendChild(keepFirst);
    categories.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });
  });
}

addCategoryBtn.addEventListener('click', async () => {
  const name = newCategoryInput.value.trim();
  if (!name) return;
  const res = await apiFetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (res.ok) {
    newCategoryInput.value = '';
    loadCategories();
  } else {
    const data = await res.json();
    alert(data.error || 'Could not add category');
  }
});

// ---------- Tasks ----------
async function loadTasks() {
  const params = new URLSearchParams();
  if (filterCategory.value) params.set('category', filterCategory.value);
  if (filterPriority.value) params.set('priority', filterPriority.value);
  if (filterCompleted.value) params.set('completed', filterCompleted.value);

  const res = await apiFetch(`/api/tasks?${params.toString()}`);
  const tasks = await res.json();
  renderTasks(tasks);
}

function formatDueDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = d < today;
  return `<span class="due-date ${overdue ? 'overdue' : ''}">Due ${d.toLocaleDateString()}</span>`;
}

function renderTasks(tasks) {
  taskList.innerHTML = '';
  if (tasks.length === 0) {
    taskList.innerHTML = '<li class="empty">No tasks match these filters.</li>';
    return;
  }

  tasks.forEach((task) => {
    const li = document.createElement('li');
    li.className = task.completed ? 'completed' : '';

    const main = document.createElement('div');
    main.className = 'task-main';

    const titleRow = document.createElement('div');
    titleRow.className = 'task-title-row';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!task.completed;
    checkbox.onchange = () => toggleTask(task.id, checkbox.checked);

    const span = document.createElement('span');
    span.textContent = task.title;

    titleRow.appendChild(checkbox);
    titleRow.appendChild(span);

    const meta = document.createElement('div');
    meta.className = 'task-meta';
    meta.innerHTML = `
      <span class="priority priority-${task.priority}">${task.priority}</span>
      ${task.category_name ? `<span class="category" style="background:${task.category_color}">${task.category_name}</span>` : ''}
      ${formatDueDate(task.due_date)}
    `;

    main.appendChild(titleRow);
    main.appendChild(meta);

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'delete-btn';
    delBtn.onclick = () => deleteTask(task.id);

    li.appendChild(main);
    li.appendChild(delBtn);
    taskList.appendChild(li);
  });
}

async function toggleTask(id, completed) {
  await apiFetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  loadTasks();
}

async function deleteTask(id) {
  await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
  loadTasks();
}

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('task-title').value.trim();
  const category_id = taskCategorySelect.value || null;
  const priority = document.getElementById('task-priority').value;
  const due_date = document.getElementById('task-due-date').value || null;
  if (!title) return;

  await apiFetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, category_id, priority, due_date }),
  });

  taskForm.reset();
  loadTasks();
});

[filterCategory, filterPriority, filterCompleted].forEach((el) =>
  el.addEventListener('change', loadTasks)
);

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
});

loadCategories().then(loadTasks);
