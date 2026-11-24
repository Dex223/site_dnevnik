const STORAGE_KEY = 'dnevnik-rashodov';
let expenses = []
let editingId = null;

function loadExpenses(){
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) return [];
  try{
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  }catch(error) {
    console.error("Не удалось прочитать сохраненный траты: ", error);
    return[];
  }
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
}

function sumOf(list){
  let total = 0;
  for(const item of list){
    total = total + item.amount

  }
  return total;
}

function currentMonthKey(){
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return year + '-'  + month;
}
function sumForMonth(list, monthKey){
  let total = 0;
  for (const item of list){
    if(item.date.slice(0, 7) === monthKey){
      total = total + item.amount;
    }
  }
  return total;
}
function statsByCategory(list) {
  const total = sumOf(list);
  if (total === 0) return [];

  const byCategory = {};
  
  for (const item of list) {
    const key = item.category;
    byCategory[key] = (byCategory[key] || 0) + item.amount;
  }

  const result = [];
  for (const category in byCategory) {
    result.push({
      category: category,
      sum: byCategory[category],
      percent: Math.round((byCategory[category] / total)* 100)
    });
  }

  result.sort((a, b) => b.sum - a.sum);
  return result;
}
function formatMoney(value){
  const rounded = Math.round(value * 100) / 100;
  const parts = String(rounded).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join(',') + ' ₽';
}
function formatDate(iso){
  if (!iso) return '';
  const parts = iso.split('-');
  return parts[2] + '.' + parts[1] + '.' + parts[0];
}
function todayIso(){
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}
function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function getVisibleExpenses() {
  const searchText = document.querySelector("#search").value.trim().toLowerCase();
  const category = document.querySelector('#filter-category').value;
  const sortBy = document.querySelector('#sort-by').value;

  let result = expenses.filter(function (item) {
    const matchesCategory = (category === '') || (item.category === category);
    const matchesSearch = searchText === '' ||
    (item.comment || '').toLowerCase().includes(searchText);

    return matchesCategory && matchesSearch;
  });

  if (sortBy === 'date-desc') {
    result.sort((a, b) => b.date.localeCompare(a.date));
  } else if (sortBy === 'date-asc') {
    result.sort((a, b) => a.date.localeCompare(b.date));
  }else if (sortBy === 'amount-desc') {
    result.sort((a, b) => b.amount - a.amount);
  }else if (sortBy === 'amount-asc') {
  result.sort((a, b) => a.amount - b.amount);
  }
return result;
}
function render(){
  const visible = getVisibleExpenses();
  renderTotals();
  renderList(visible);
  renderStats(visible);

}
function renderTotals(){
  document.querySelector('#total-all').textContent = formatMoney(sumOf(expenses));
  document.querySelector('#total-month').textContent = formatMoney(sumForMonth(expenses, currentMonthKey()));
  document.querySelector('#total-count').textContent = expenses.length;
}
function renderList(list){
  const ul = document.querySelector('#expense-list');
  const emptyState = document.querySelector('#empty-state')

  ul.innerHTML = '';

  if (list.length === 0) {
    emptyState.hidden = false;
    if(expenses.length === 0) {
      emptyState.textContent = "Пока пусто. Добавь первую трату.";
    } else {
      emptyState.textContent = "Ничего не найдено по этим фильтрам.";
    }
    return;
  }
    

  emptyState.hidden = true;

  for (const item of list) {
    ul.appendChild(createExpenseElement(item));
  }
}
function createExpenseElement(item){
  const li = document.createElement('li');
  li.className = 'expense-item';

  const main = document.createElement('div')
  main.className = 'expense-main'

  const top = document.createElement('div')
  top.className = 'expense-top'

  const amount = document.createElement('span')
  amount.className = 'expense-amount';
  amount.textContent = formatMoney(item.amount);

  const category = document.createElement('span')
  category.className = 'expense-category';
  category.textContent = item.category;

  const date = document.createElement('span');
  date.className = 'expense-date';
  date.textContent = formatDate(item.date);

  top.appendChild(amount);
  top.appendChild(category);
  top.appendChild(date);
  main.appendChild(top);

  if (item.comment){
    const comment = document.createElement('div');
    comment.className = 'expense-comment'; 
    comment.textContent = item.comment;
    main.appendChild(comment);
  }
  const actions = document.createElement('div');
  actions.className = 'expense-actions';
  
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'btn-icon';
  editBtn.textContent = 'Изменить';
  editBtn.addEventListener('click', function(){
    startEdit(item.id);
  });
  
    const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn-icon';
  deleteBtn.textContent = 'Удалить';
  deleteBtn.addEventListener('click', function () {
    deleteExpense(item.id);
  });
  
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  li.appendChild(main);
  li.appendChild(actions);
  return li;
}
function renderStats(list){
 const container = document.querySelector('#category-stats');
 container.innerHTML = '';

 const stats = statsByCategory(list);

 if(stats.length === 0) {
  container.textContent = "Нет данных.";
  return;
 }

 for (const row of stats) {
  const block = document.createElement('div');
  block.className = 'category-stat';
  
  const label = document.createElement('div');
  label.className = 'category-stat-label';
  label.textContent = row.category + ': ' + formatMoney(row.sum) +  ' · ' + row.percent + '%';

  const bar = document.createElement('div');
  bar.className = 'category-stat-bar';

  const fill = document.createElement('div');
  fill.className = 'category-stat-fill';
  fill.style.width = row.percent + '%';

  bar.appendChild(fill);
  block.appendChild(label);
  block.appendChild(bar);
  container.appendChild(block);
 }
}
function handleSubmit(event) {
  event.preventDefault();

  const amountInput = document.querySelector('#input-amount');
  const categoryInput = document.querySelector('#input-category');
  const dateInput = document.querySelector('#input-date');
  const commentInput = document.querySelector('#input-comment');
  const errorBox = document.querySelector('#form-error');

  const amount = Number(amountInput.value);
  const comment = commentInput.value.trim();

  if(!amountInput.value.trim() || Number.isNaN(amount)) {
    errorBox.textContent = 'Введи сумму числом.';
    errorBox.hidden = false;
    return;
  }
  if (amount <= 0) {
    errorBox.textContent = 'Сумма должна быть больше нуля.' ;
    errorBox.hidden = false;
    return;
  }
  if(!dateInput.value){
    errorBox.textContent = 'Выбери дату.';
    errorBox.hidden = false;
    return;
  }
  errorBox.hidden = true;

  if(editingId !== null) {
    const item = expenses.find(function (e) {return e.id === editingId; });
    if (item) {
      item.amount = amount;
      item.category = categoryInput.value;
      item.date = dateInput.value;
      item.comment = comment;
    }
    cancelEdit();
  }else{

  expenses.push({
    id: makeId(),
    amount: amount,
    category: categoryInput.value,
    date: dateInput.value,
    comment: comment
  });
  document.querySelector('#form-expense').reset();
  dateInput.value = todayIso();
  }
  saveExpenses();
  render();
}
function deleteExpense(id) {
  expenses = expenses.filter(function (item) {return item.id !== id; });

  if (editingId === id) cancelEdit();

  saveExpenses();
  render();
}
function startEdit(id) {
  const item = expenses.find(function (e) { return e.id === id; });
  if (!item) return;

  editingId = id;

  document.querySelector('#input-amount').value = item.amount;
  document.querySelector('#input-category').value = item.category;
  document.querySelector('#input-date').value = item.date;
  document.querySelector('#input-comment').value = item.comment;

  document.querySelector('#form-title').textContent = "Редактировать траты";
  document.querySelector('#btn-save').textContent = "Сохранить";
  document.querySelector('#btn-cancel-edit').hidden = false;
  document.querySelector('#form-error').hidden = true;

  document.querySelector('#input-amount').focus();
}
function cancelEdit() {
  editingId = null;

  document.querySelector('#form-title').textContent = 'Новая трата';
  document.querySelector('#btn-save').textContent = 'Добавить';
  document.querySelector('#btn-cancel-edit').hidden = true;
  document.querySelector('#form-error').hidden = true;
  resetForm();
}
function showError(text) {
  const errorBox = document.querySelector('#form-error');
  errorBox.textContent = text;
  errorBox.hidden = false;
}
function resetForm() {
  document.querySelector('#input-amount').value = '';
  document.querySelector('#input-category').value = '';
  document.querySelector('#input-comment').value = '';
  document.querySelector('#input-date').value = todayIso();
  document.querySelector('#form-error').hidden = true;
}
function resetFilters() {
  document.querySelector('#search').value = '';
  document.querySelector('#filter-category').value = '';
  document.querySelector('#sort-by').value = 'date-desc';
  render();
}
function init(){
 expenses = loadExpenses();

 document.querySelector('#form-expense').addEventListener('submit', handleSubmit);
 document.querySelector('#input-date').value = todayIso();
 document.querySelector('#search').addEventListener('input', render);
 document.querySelector('#filter-category').addEventListener('change', render);
 document.querySelector('#sort-by').addEventListener('change', render);
 document.querySelector('#btn-reset-filters').addEventListener('click', resetFilters);
 document.querySelector('#btn-cancel-edit').addEventListener('click', cancelEdit);

 render();
}
init();