/**
 * TaskFlow - Gerenciador de Tarefas Avançado (Vanilla JS)
 * Arquitetura baseada em Padrão de Estado e Módulos Clean Code.
 */

(() => {
  'use strict';

  // ==========================================================================
  // 1. ESTADO DA APLICAÇÃO (STATE)
  // ==========================================================================
  const state = {
    tasks: [],
    filter: 'all',        // 'all' | 'pending' | 'completed'
    searchQuery: '',      // Texto de busca
    sortBy: 'created-desc', // 'created-desc' | 'created-asc' | 'priority-desc' | 'priority-asc'
    lastDeletedTask: null  // Para funcionalidade de Desfazer (Undo)
  };

  // Mapeamento de Peso de Prioridades para Ordenação
  const PRIORITY_WEIGHTS = { alta: 3, media: 2, baixa: 1 };

  // Chaves para LocalStorage
  const STORAGE_KEY = 'taskflow_tasks_data';
  const THEME_KEY = 'taskflow_theme_pref';

  // ==========================================================================
  // 2. REFERÊNCIAS DO DOM
  // ==========================================================================
  const DOM = {
    html: document.documentElement,
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),
    
    // Stats
    statTotal: document.getElementById('statTotal'),
    statPending: document.getElementById('statPending'),
    statCompleted: document.getElementById('statCompleted'),
    progressPercentage: document.getElementById('progressPercentage'),
    progressBarFill: document.getElementById('progressBarFill'),
    progressBarContainer: document.getElementById('progressBarContainer'),

    // Formulário de Criação
    taskForm: document.getElementById('taskForm'),
    taskTitleInput: document.getElementById('taskTitle'),
    taskPrioritySelect: document.getElementById('taskPriority'),
    taskCategorySelect: document.getElementById('taskCategory'),
    taskDueDateInput: document.getElementById('taskDueDate'),
    taskInputError: document.getElementById('taskInputError'),

    // Controles
    searchInput: document.getElementById('searchInput'),
    filterButtons: document.querySelectorAll('.btn-filter'),
    sortSelect: document.getElementById('sortSelect'),
    clearCompletedBtn: document.getElementById('clearCompletedBtn'),

    // Lista e Empty State
    taskList: document.getElementById('taskList'),
    emptyState: document.getElementById('emptyState'),

    // Modal de Edição
    editModal: document.getElementById('editModal'),
    editTaskForm: document.getElementById('editTaskForm'),
    editTaskId: document.getElementById('editTaskId'),
    editTaskTitle: document.getElementById('editTaskTitle'),
    editTaskPriority: document.getElementById('editTaskPriority'),
    editTaskCategory: document.getElementById('editTaskCategory'),
    editTaskDueDate: document.getElementById('editTaskDueDate'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    modalOverlay: document.getElementById('modalOverlay'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  // ==========================================================================
  // 3. GERENCIAMENTO DE PERSISTÊNCIA & TEMA
  // ==========================================================================
  const loadState = () => {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    if (savedTasks) {
      try {
        state.tasks = JSON.parse(savedTasks);
      } catch (error) {
        console.error('Erro ao ler do localStorage:', error);
        state.tasks = [];
      }
    }
  };

  const saveState = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  };

  const initTheme = () => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    DOM.html.setAttribute('data-theme', theme);
    DOM.themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
  };

  const toggleTheme = () => {
    const currentTheme = DOM.html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    DOM.html.setAttribute('data-theme', newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    DOM.themeIcon.textContent = newTheme === 'dark' ? '🌙' : '☀️';
  };

  // ==========================================================================
  // 4. LÓGICA DE NEGÓCIO & REGRAS DE TAREFA
  // ==========================================================================
  const addTask = (title, priority, category, dueDate) => {
    const newTask = {
      id: crypto.randomUUID(),
      title: title.trim(),
      priority,
      category,
      dueDate: dueDate || null,
      completed: false,
      createdAt: new Date().toISOString()
    };

    state.tasks.unshift(newTask);
    saveState();
    render();
    showToast('Tarefa criada com sucesso!');
  };

  const toggleTaskStatus = (id) => {
    state.tasks = state.tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    saveState();
    render();
  };

  const deleteTask = (id) => {
    const taskToDelete = state.tasks.find(t => t.id === id);
    if (!taskToDelete) return;

    state.lastDeletedTask = taskToDelete;
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveState();
    render();

    showToast('Tarefa removida.', 'Desfazer', () => {
      if (state.lastDeletedTask) {
        state.tasks.push(state.lastDeletedTask);
        state.lastDeletedTask = null;
        saveState();
        render();
      }
    });
  };

  const updateTask = (id, updatedData) => {
    state.tasks = state.tasks.map(task => 
      task.id === id ? { ...task, ...updatedData } : task
    );
    saveState();
    render();
    showToast('Tarefa atualizada!');
  };

  const clearCompletedTasks = () => {
    const completedCount = state.tasks.filter(t => t.completed).length;
    if (completedCount === 0) return;

    if (confirm(`Deseja realmente excluir ${completedCount} tarefas concluídas?`)) {
      state.tasks = state.tasks.filter(t => !t.completed);
      saveState();
      render();
      showToast('Tarefas concluídas removidas.');
    }
  };

  // ==========================================================================
  // 5. FILTRAGEM, PROCESSAMENTO E RENDERIZAÇÃO (UI)
  // ==========================================================================
  const getProcessedTasks = () => {
    return state.tasks
      .filter(task => {
        // Filtro por Status
        if (state.filter === 'pending') return !task.completed;
        if (state.filter === 'completed') return task.completed;
        return true;
      })
      .filter(task => {
        // Filtro por Busca Textual
        return task.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
               task.category.toLowerCase().includes(state.searchQuery.toLowerCase());
      })
      .sort((a, b) => {
        // Ordenação
        if (state.sortBy === 'created-desc') return new Date(b.createdAt) - new Date(a.createdAt);
        if (state.sortBy === 'created-asc') return new Date(a.createdAt) - new Date(b.createdAt);
        if (state.sortBy === 'priority-desc') return PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
        if (state.sortBy === 'priority-asc') return PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority];
        return 0;
      });
  };

  const updateStats = () => {
    const total = state.tasks.length;
    const completed = state.tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    DOM.statTotal.textContent = total;
    DOM.statPending.textContent = pending;
    DOM.statCompleted.textContent = completed;
    DOM.progressPercentage.textContent = `${percentage}%`;
    
    DOM.progressBarFill.style.width = `${percentage}%`;
    DOM.progressBarContainer.setAttribute('aria-valuenow', percentage);
  };

  const createTaskElement = (task) => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'task-item--completed' : ''}`;
    li.dataset.id = task.id;

    // Formatação amigável de data
    const formattedDate = task.dueDate 
      ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')
      : null;

    li.innerHTML = `
      <div class="task-item__left">
        <input 
          type="checkbox" 
          class="task-checkbox" 
          ${task.completed ? 'checked' : ''} 
          aria-label="Marcar como concluída"
        >
        <div class="task-item__content">
          <span class="task-item__title"></span>
          <div class="task-item__meta">
            <span class="badge badge--${task.priority}">${task.priority}</span>
            <span>📂 ${task.category}</span>
            ${formattedDate ? `<span>📅 ${formattedDate}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="task-item__actions">
        <button type="button" class="btn-icon btn-edit" aria-label="Editar tarefa">✏️</button>
        <button type="button" class="btn-icon btn-icon--danger btn-delete" aria-label="Excluir tarefa">🗑️</button>
      </div>
    `;

    // Evita vulnerabilidades XSS inserindo o título com textContent
    li.querySelector('.task-item__title').textContent = task.title;

    return li;
  };

  const render = () => {
    updateStats();
    const processedTasks = getProcessedTasks();

    DOM.taskList.innerHTML = '';

    if (processedTasks.length === 0) {
      DOM.emptyState.classList.remove('hidden');
    } else {
      DOM.emptyState.classList.add('hidden');
      const fragment = document.createDocumentFragment();
      processedTasks.forEach(task => {
        fragment.appendChild(createTaskElement(task));
      });
      DOM.taskList.appendChild(fragment);
    }
  };

  // ==========================================================================
  // 6. MODAL & SYSTEM TOAST NOTIFICATIONS
  // ==========================================================================
  const openEditModal = (id) => {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    DOM.editTaskId.value = task.id;
    DOM.editTaskTitle.value = task.title;
    DOM.editTaskPriority.value = task.priority;
    DOM.editTaskCategory.value = task.category;
    DOM.editTaskDueDate.value = task.dueDate || '';

    DOM.editModal.classList.remove('hidden');
    DOM.editTaskTitle.focus();
  };

  const closeEditModal = () => {
    DOM.editModal.classList.add('hidden');
    DOM.editTaskForm.reset();
  };

  const showToast = (message, actionText = null, actionCallback = null) => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    toast.appendChild(textSpan);

    if (actionText && actionCallback) {
      const actionBtn = document.createElement('button');
      actionBtn.className = 'toast__btn';
      actionBtn.textContent = actionText;
      actionBtn.addEventListener('click', () => {
        actionCallback();
        toast.remove();
      });
      toast.appendChild(actionBtn);
    }

    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };

  // ==========================================================================
  // 7. EVENT LISTENERS & INICIALIZAÇÃO
  // ==========================================================================
  const bindEvents = () => {
    // Alternador de Tema
    DOM.themeToggleBtn.addEventListener('click', toggleTheme);

    // Form de Criação com Validação Básica
    DOM.taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = DOM.taskTitleInput.value.trim();

      if (!title) {
        DOM.taskInputError.textContent = 'Por favor, digite uma descrição para a tarefa.';
        DOM.taskTitleInput.focus();
        return;
      }

      DOM.taskInputError.textContent = '';
      addTask(
        title,
        DOM.taskPrioritySelect.value,
        DOM.taskCategorySelect.value,
        DOM.taskDueDateInput.value
      );

      DOM.taskForm.reset();
      DOM.taskPrioritySelect.value = 'media';
    });

    // Delegação de Eventos na Lista de Tarefas (Otimização de Performance)
    DOM.taskList.addEventListener('click', (e) => {
      const taskItem = e.target.closest('.task-item');
      if (!taskItem) return;

      const taskId = taskItem.dataset.id;

      if (e.target.classList.contains('task-checkbox')) {
        toggleTaskStatus(taskId);
      } else if (e.target.classList.contains('btn-delete')) {
        deleteTask(taskId);
      } else if (e.target.classList.contains('btn-edit')) {
        openEditModal(taskId);
      }
    });

    // Filtros por Status
    DOM.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.filterButtons.forEach(b => b.classList.remove('btn-filter--active'));
        btn.classList.add('btn-filter--active');
        state.filter = btn.dataset.filter;
        render();
      });
    });

    // Busca e Ordenação
    DOM.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      render();
    });

    DOM.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      render();
    });

    // Ações globais
    DOM.clearCompletedBtn.addEventListener('click', clearCompletedTasks);

    // Modal de Edição
    DOM.editTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = DOM.editTaskId.value;
      const title = DOM.editTaskTitle.value.trim();

      if (!title) return;

      updateTask(id, {
        title,
        priority: DOM.editTaskPriority.value,
        category: DOM.editTaskCategory.value,
        dueDate: DOM.editTaskDueDate.value || null
      });

      closeEditModal();
    });

    DOM.closeModalBtn.addEventListener('click', closeEditModal);
    DOM.cancelEditBtn.addEventListener('click', closeEditModal);
    DOM.modalOverlay.addEventListener('click', closeEditModal);

    // Suporte a tecla ESC para fechar modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !DOM.editModal.classList.contains('hidden')) {
        closeEditModal();
      }
    });
  };

  // Inicializador da Aplicação
  const init = () => {
    initTheme();
    loadState();
    bindEvents();
    render();
  };

  init();
})();