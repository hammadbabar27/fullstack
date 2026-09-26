const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const list = document.getElementById('task-list');

async function fetchTasks() {
  const res = await fetch('/api/tasks');
  const tasks = await res.json();
  renderTasks(tasks);
}

function renderTasks(tasks) {
  list.innerHTML = '';
  tasks.forEach((task) => {
    const li = document.createElement('li');
    li.className = task.completed ? 'completed' : '';

    const span = document.createElement('span');
    span.textContent = task.title;
    span.onclick = () => toggleTask(task.id, !task.completed);

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'delete-btn';
    delBtn.onclick = () => deleteTask(task.id);

    li.appendChild(span);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

async function toggleTask(id, completed) {
  await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  fetchTasks();
}

async function deleteTask(id) {
  await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  fetchTasks();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;

  await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

  input.value = '';
  fetchTasks();
});

fetchTasks();
