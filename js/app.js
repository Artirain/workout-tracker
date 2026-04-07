(function () {
  'use strict';

  var MAX_SETS = 5;
  var sessionExercises = [];

  // ── DOM refs ──

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return document.querySelectorAll(sel); };

  // ── Tab Navigation ──

  function initTabs() {
    var nav = $('.bottom-nav');
    if (!nav) return;

    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('.nav-tab');
      if (!btn) return;

      var tab = btn.dataset.tab;
      if (!tab) return;

      switchTab(tab);
    });

    var logo = $('#logo-home');
    if (logo) {
      logo.addEventListener('click', function (e) {
        e.preventDefault();
        switchTab('dashboard');
      });
    }
  }

  function switchTab(tab) {
    $$('.nav-tab').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === tab);
    });

    $$('.tab-content').forEach(function (s) {
      s.classList.toggle('active', s.id === 'tab-' + tab);
    });

    if (tab === 'dashboard') refreshDashboard();
    if (tab === 'history' && window.History) History.init();
    if (tab === 'progress' && window.Progress) Progress.init();
  }

  // ── Exercise Select ──

  function initExerciseSelect() {
    var select = $('#exercise-select');
    if (!select) return;

    populateExerciseSelect();

    select.addEventListener('change', function () {
      if (select.value === '__add_new__') {
        showCustomExerciseInput();
        select.value = '';
      } else {
        hideCustomExerciseInput();
      }
      showLastWorkoutComparison(select.value);
    });
  }

  function populateExerciseSelect() {
    var select = $('#exercise-select');
    if (!select) return;
    var exercises = WorkoutData.getExercises();
    var html = '<option value="">Выбери упражнение...</option>';
    exercises.forEach(function(name) {
      html += '<option value="' + name + '">' + name + '</option>';
    });
    html += '<option value="__add_new__">+ Добавить упражнение...</option>';
    select.innerHTML = html;
  }

  function showCustomExerciseInput() {
    if ($('#custom-exercise-wrap')) return;

    var wrap = document.createElement('div');
    wrap.id = 'custom-exercise-wrap';
    wrap.className = 'form-group';
    wrap.innerHTML =
      '<label for="custom-exercise-name">Название упражнения</label>' +
      '<div style="display:flex;gap:8px">' +
        '<input type="text" id="custom-exercise-name" class="input" placeholder="Введи название...">' +
        '<button class="btn btn--primary btn--sm" id="confirm-custom-exercise">OK</button>' +
        '<button class="btn btn--ghost btn--sm" id="cancel-custom-exercise">Отмена</button>' +
      '</div>';

    var formGroup = $('#exercise-select').closest('.form-group');
    formGroup.after(wrap);

    var input = $('#custom-exercise-name');
    input.focus();

    $('#confirm-custom-exercise').addEventListener('click', function () {
      addCustomExercise();
    });

    $('#cancel-custom-exercise').addEventListener('click', function () {
      hideCustomExerciseInput();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addCustomExercise();
      if (e.key === 'Escape') hideCustomExerciseInput();
    });
  }

  function hideCustomExerciseInput() {
    var wrap = $('#custom-exercise-wrap');
    if (wrap) wrap.remove();
  }

  function addCustomExercise() {
    var input = $('#custom-exercise-name');
    if (!input) return;

    var name = input.value.trim();
    if (!name) return;

    WorkoutData.addExercise(name);
    populateExerciseSelect();
    hideCustomExerciseInput();

    var select = $('#exercise-select');
    select.value = name;
  }

  // ── Sets Management ──

  function initSets() {
    var addSetBtn = $('#add-set');
    if (!addSetBtn) return;

    addSetBtn.addEventListener('click', function () {
      addSetRow();
    });

    var container = $('#sets-container');
    container.addEventListener('click', function (e) {
      if (e.target.closest('.set-delete')) {
        var row = e.target.closest('.set-row');
        if (row && container.querySelectorAll('.set-row').length > 1) {
          row.remove();
          renumberSets();
        }
      }
    });
  }

  function addSetRow() {
    var container = $('#sets-container');
    var rows = container.querySelectorAll('.set-row');

    if (rows.length >= MAX_SETS) return;

    var num = rows.length + 1;
    var row = document.createElement('div');
    row.className = 'set-row';
    row.innerHTML =
      '<span class="set-number">' + num + '</span>' +
      '<input type="number" class="input input-sm" placeholder="Вес (кг)" min="0" step="0.5">' +
      '<span>\u00D7</span>' +
      '<input type="number" class="input input-sm" placeholder="Повторы" min="1">' +
      '<button class="set-delete btn btn--ghost btn--sm" title="Удалить">\u2715</button>';
    container.appendChild(row);
  }

  function renumberSets() {
    var rows = $$('#sets-container .set-row');
    rows.forEach(function (row, i) {
      var num = row.querySelector('.set-number');
      if (num) num.textContent = i + 1;
    });
  }

  function getSetsData() {
    var sets = [];
    $$('#sets-container .set-row').forEach(function (row) {
      var inputs = row.querySelectorAll('input[type="number"]');
      var weight = parseFloat(inputs[0].value) || 0;
      var reps = parseInt(inputs[1].value, 10) || 0;
      if (reps > 0) {
        sets.push({ weight: weight, reps: reps });
      }
    });
    return sets;
  }

  function resetSetsForm() {
    var container = $('#sets-container');
    container.innerHTML =
      '<div class="set-row">' +
        '<span class="set-number">1</span>' +
        '<input type="number" class="input input-sm" placeholder="Вес (кг)" min="0" step="0.5">' +
        '<span>\u00D7</span>' +
        '<input type="number" class="input input-sm" placeholder="Повторы" min="1">' +
      '</div>';
  }

  // ── Workout Session ──

  function initWorkoutSession() {
    ensureSessionUI();

    var addExBtn = $('#add-exercise-to-session');
    if (addExBtn) {
      addExBtn.addEventListener('click', function () {
        addExerciseToSession();
      });
    }

    var saveBtn = $('#save-workout');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        saveWorkout();
      });
    }
  }

  function ensureSessionUI() {
    var workoutCard = $('#tab-workout .card');
    if (!workoutCard) return;

    if (!$('#add-exercise-to-session')) {
      var formActions = workoutCard.querySelector('.form-actions');

      var addExBtn = document.createElement('button');
      addExBtn.className = 'btn btn--outline btn--block';
      addExBtn.id = 'add-exercise-to-session';
      addExBtn.textContent = '+ Добавить упражнение к тренировке';
      formActions.before(addExBtn);
    }

    if (!$('#session-list')) {
      var listWrap = document.createElement('div');
      listWrap.id = 'session-list';
      listWrap.className = 'card session-exercises';
      listWrap.style.display = 'none';
      listWrap.innerHTML = '<h3>Упражнения в тренировке</h3><ul id="session-items"></ul>';
      workoutCard.after(listWrap);
    }
  }

  function getSelectedExerciseName() {
    var select = $('#exercise-select');
    if (!select || !select.value || select.value === '__add_new__') return null;
    return select.value;
  }

  function addExerciseToSession() {
    var name = getSelectedExerciseName();
    if (!name) {
      showToast('Выбери упражнение');
      return;
    }

    var sets = getSetsData();
    if (sets.length === 0) {
      showToast('Добавь хотя бы один подход с повторениями');
      return;
    }

    sessionExercises.push({ name: name, sets: sets });
    renderSessionList();
    resetSetsForm();

    var select = $('#exercise-select');
    select.value = '';
  }

  function renderSessionList() {
    var wrap = $('#session-list');
    var ul = $('#session-items');
    if (!wrap || !ul) return;

    if (sessionExercises.length === 0) {
      wrap.style.display = 'none';
      return;
    }

    wrap.style.display = '';
    ul.innerHTML = '';

    sessionExercises.forEach(function (ex, idx) {
      var li = document.createElement('li');
      li.className = 'session-exercise-item';

      var setsText = ex.sets.map(function (s) {
        return s.weight + ' кг \u00D7 ' + s.reps;
      }).join(', ');

      li.innerHTML =
        '<div class="session-exercise-info">' +
          '<strong>' + escapeHtml(ex.name) + '</strong>' +
          '<span class="session-exercise-sets">' + setsText + '</span>' +
        '</div>' +
        '<button class="btn btn--ghost btn--sm session-remove" data-idx="' + idx + '">\u2715</button>';
      ul.appendChild(li);
    });
  }

  function initSessionListDelegation() {
    document.addEventListener('click', function (e) {
      var removeBtn = e.target.closest('.session-remove');
      if (!removeBtn) return;
      var idx = parseInt(removeBtn.dataset.idx, 10);
      if (!isNaN(idx) && idx >= 0 && idx < sessionExercises.length) {
        sessionExercises.splice(idx, 1);
        renderSessionList();
      }
    });
  }

  function saveWorkout() {
    if (sessionExercises.length === 0) {
      showToast('Добавь хотя бы одно упражнение');
      return;
    }

    var notesEl = $('#workout-notes');
    var notes = notesEl ? notesEl.value.trim() : '';

    var workoutEntry = {
      exercises: sessionExercises.map(function (ex) {
        return { name: ex.name, sets: ex.sets.slice() };
      })
    };
    if (notes) workoutEntry.notes = notes;

    WorkoutData.addWorkout(workoutEntry);

    sessionExercises = [];
    renderSessionList();
    resetSetsForm();
    $('#exercise-select').value = '';
    if (notesEl) notesEl.value = '';
    hideCustomExerciseInput();
    showLastWorkoutComparison('');

    showToast('Тренировка сохранена!', 'success');

    setTimeout(function () {
      switchTab('dashboard');
    }, 600);
  }

  // ── Dashboard ──

  function refreshDashboard() {
    if (window.Dashboard) Dashboard.init();
  }

  // ── Toast Notifications ──

  function showToast(msg, type) {
    var existing = $('#toast-notification');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'toast' + (type ? ' toast--' + type : '');
    toast.textContent = msg;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('toast--visible');
    });

    setTimeout(function () {
      toast.classList.remove('toast--visible');
      setTimeout(function () { toast.remove(); }, 300);
    }, 2500);
  }

  // ── Helpers ──

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Last Workout Comparison ──

  function showLastWorkoutComparison(exerciseName) {
    var card = $('#last-workout-comparison');
    if (!card) return;

    if (!exerciseName || exerciseName === '__add_new__') {
      card.style.display = 'none';
      return;
    }

    var workouts = WorkoutData.getWorkouts();
    var found = null;
    var foundSets = null;

    for (var i = 0; i < workouts.length; i++) {
      var w = workouts[i];
      var exercises = w.exercises || [];
      for (var j = 0; j < exercises.length; j++) {
        if (exercises[j].name === exerciseName) {
          found = w;
          foundSets = exercises[j].sets || [];
          break;
        }
      }
      if (found) break;
    }

    if (!found || foundSets.length === 0) {
      card.style.display = 'none';
      return;
    }

    var dateParts = found.date.split('-');
    var dateLabel = dateParts[2] + '.' + dateParts[1];

    var isBodyweight = foundSets.every(function (s) { return !s.weight || s.weight === 0; });

    var setsText;
    if (isBodyweight) {
      setsText = foundSets.map(function (s) { return s.reps; }).join(', ');
    } else {
      setsText = foundSets.map(function (s) {
        return s.weight + '\u00D7' + s.reps;
      }).join(', ');
    }

    var best1rm = 0;
    if (!isBodyweight) {
      foundSets.forEach(function (s) {
        var w = Number(s.weight) || 0;
        var r = Number(s.reps) || 0;
        if (w > 0 && r > 0) {
          var rm = WorkoutData.calculate1RM(w, r);
          if (rm > best1rm) best1rm = rm;
        }
      });
    }

    card.querySelector('.comparison-card__header').textContent = '\u041F\u0440\u043E\u0448\u043B\u044B\u0439 \u0440\u0430\u0437: ' + dateLabel;
    card.querySelector('.comparison-card__sets').textContent = setsText;

    var rmEl = card.querySelector('.comparison-card__1rm');
    if (best1rm > 0) {
      rmEl.textContent = '\u0420\u0430\u0441\u0447. 1RM: ' + best1rm + '\u043A\u0433';
      rmEl.style.display = '';
    } else {
      rmEl.style.display = 'none';
    }

    card.style.display = '';
  }

  // ── Templates ──

  function initTemplates() {
    var container = $('#template-buttons');
    if (!container) return;

    var templates = [];
    try {
      templates = WorkoutData.getTemplates ? WorkoutData.getTemplates() : [];
    } catch (e) {
      templates = [];
    }

    if (!templates || templates.length === 0) return;

    var dayNames = ['\u0432\u043E\u0441\u043A\u0440\u0435\u0441\u0435\u043D\u044C\u0435', '\u043F\u043E\u043D\u0435\u0434\u0435\u043B\u044C\u043D\u0438\u043A', '\u0432\u0442\u043E\u0440\u043D\u0438\u043A', '\u0441\u0440\u0435\u0434\u0430', '\u0447\u0435\u0442\u0432\u0435\u0440\u0433', '\u043F\u044F\u0442\u043D\u0438\u0446\u0430', '\u0441\u0443\u0431\u0431\u043E\u0442\u0430'];
    var todayDay = dayNames[new Date().getDay()];

    container.innerHTML = '';

    templates.forEach(function (tpl) {
      var btn = document.createElement('button');
      btn.className = 'template-btn';
      if (tpl.day && tpl.day.toLowerCase() === todayDay) {
        btn.classList.add('template-btn--today');
      }
      btn.innerHTML =
        '<span class="template-btn__name">' + escapeHtml(tpl.name) + '</span>' +
        '<span class="template-btn__day">' + escapeHtml(tpl.day || '') + '</span>';

      btn.addEventListener('click', function () {
        applyTemplate(tpl);
      });

      container.appendChild(btn);
    });
  }

  function applyTemplate(tpl) {
    var exercises = tpl.exercises || [];
    if (exercises.length === 0) return;

    sessionExercises = [];

    exercises.forEach(function (name) {
      WorkoutData.addExercise(name);
      sessionExercises.push({ name: name, sets: [] });
    });

    populateExerciseSelect();
    renderSessionList();
    resetSetsForm();

    var select = $('#exercise-select');
    if (select && exercises.length > 0) {
      select.value = exercises[0];
      showLastWorkoutComparison(exercises[0]);
    }

    showToast('\u0428\u0430\u0431\u043B\u043E\u043D \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D', 'success');
  }

  // ── Init ──

  document.addEventListener('DOMContentLoaded', async function () {
    await WorkoutData.init();
    initTabs();
    initExerciseSelect();
    initSets();
    initWorkoutSession();
    initSessionListDelegation();
    initTemplates();
    refreshDashboard();
  });
})();
