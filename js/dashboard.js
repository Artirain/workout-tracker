(function () {
  'use strict';

  var WATER_GOAL = 2000;
  var WATER_STEP = 250;

  var EXERCISE_NAMES = {
    'bench-press': 'Жим лёжа',
    'incline-press': 'Жим на наклонной',
    'dumbbell-fly': 'Разводка гантелей',
    'deadlift': 'Становая тяга',
    'pull-up': 'Подтягивания',
    'barbell-row': 'Тяга штанги в наклоне',
    'squat': 'Приседания',
    'leg-press': 'Жим ногами',
    'lunges': 'Выпады',
    'overhead-press': 'Жим стоя',
    'lateral-raise': 'Махи в стороны',
    'bicep-curl': 'Сгибания на бицепс',
    'tricep-extension': 'Разгибания на трицепс'
  };

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatDate(dateStr) {
    var parts = dateStr.split('-');
    return parts[2] + '.' + parts[1] + '.' + parts[0];
  }

  function renderStats() {
    var today = todayStr();
    var workouts = WorkoutData.getWorkouts().filter(function (w) {
      return w.date === today;
    });

    var totalSets = 0;
    var totalVolume = 0;

    workouts.forEach(function (w) {
      (w.exercises || []).forEach(function (ex) {
        (ex.sets || []).forEach(function (s) {
          totalSets++;
          totalVolume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
        });
      });
    });

    var elWorkouts = document.getElementById('today-workouts');
    var elSets = document.getElementById('today-sets');
    var elVolume = document.getElementById('today-volume');

    if (elWorkouts) elWorkouts.textContent = workouts.length;
    if (elSets) elSets.textContent = totalSets;
    if (elVolume) elVolume.textContent = Math.round(totalVolume).toLocaleString('ru-RU');
  }

  function renderWaterTracker() {
    var container = document.querySelector('.water-tracker');
    if (!container) return;

    var today = todayStr();
    var current = WorkoutData.getWaterForDate(today);
    var pct = Math.min(current / WATER_GOAL, 1);
    var radius = 54;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference * (1 - pct);

    container.innerHTML =
      '<h2>\uD83D\uDCA7 \u0412\u043E\u0434\u0430</h2>' +
      '<div style="display:flex;align-items:center;gap:var(--space-6);flex-wrap:wrap;justify-content:center;">' +
        '<div class="progress-ring" style="width:130px;height:130px;">' +
          '<svg class="progress-ring__svg" width="130" height="130" viewBox="0 0 130 130">' +
            '<circle class="progress-ring__track" cx="65" cy="65" r="' + radius + '" stroke-width="10"/>' +
            '<circle class="progress-ring__fill" cx="65" cy="65" r="' + radius + '" stroke-width="10"' +
              ' stroke-dasharray="' + circumference + '"' +
              ' stroke-dashoffset="' + offset + '"' +
              ' style="stroke:var(--color-accent);"/>' +
          '</svg>' +
          '<span class="progress-ring__label" style="font-size:var(--font-size-lg);">' +
            current + '<br><span style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);">\u043C\u043B</span>' +
          '</span>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:var(--space-3);align-items:center;">' +
          '<span style="color:var(--color-text-secondary);font-size:var(--font-size-sm);">' +
            current + ' / ' + WATER_GOAL + ' \u043C\u043B</span>' +
          '<div style="display:flex;gap:var(--space-2);">' +
            '<button class="btn btn--sm btn--outline" id="water-minus">\u2212 ' + WATER_STEP + ' \u043C\u043B</button>' +
            '<button class="btn btn--sm btn--primary" id="water-plus">+ ' + WATER_STEP + ' \u043C\u043B</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.getElementById('water-plus').addEventListener('click', function () {
      var val = WorkoutData.getWaterForDate(today) + WATER_STEP;
      WorkoutData.setWater(today, val);
      renderWaterTracker();
    });

    document.getElementById('water-minus').addEventListener('click', function () {
      var val = Math.max(0, WorkoutData.getWaterForDate(today) - WATER_STEP);
      WorkoutData.setWater(today, val);
      renderWaterTracker();
    });
  }

  function getExerciseLabel(name) {
    return EXERCISE_NAMES[name] || name;
  }

  function renderRecentWorkouts() {
    var list = document.getElementById('recent-list');
    if (!list) return;

    var workouts = WorkoutData.getWorkouts().slice(0, 5);

    if (!workouts.length) {
      list.innerHTML = '<li class="empty-state">\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043E\u043A. \u041D\u0430\u0447\u043D\u0438 \u043F\u0440\u044F\u043C\u043E \u0441\u0435\u0439\u0447\u0430\u0441!</li>';
      return;
    }

    list.innerHTML = workouts.map(function (w) {
      var exercises = (w.exercises || []).map(function (ex) {
        var setsInfo = (ex.sets || []).map(function (s) {
          return (s.weight || 0) + '\u043A\u0433 \u00D7 ' + (s.reps || 0);
        }).join(', ');
        return '<strong>' + getExerciseLabel(ex.name) + '</strong>: ' + setsInfo;
      }).join('<br>');

      var totalVol = 0;
      (w.exercises || []).forEach(function (ex) {
        (ex.sets || []).forEach(function (s) {
          totalVol += (Number(s.weight) || 0) * (Number(s.reps) || 0);
        });
      });

      return '<li class="card card--interactive" style="margin-bottom:var(--space-2);list-style:none;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">' +
          '<span class="badge badge--accent">' + formatDate(w.date) + '</span>' +
          '<span style="color:var(--color-text-tertiary);font-size:var(--font-size-xs);">' +
            Math.round(totalVol).toLocaleString('ru-RU') + ' \u043A\u0433</span>' +
        '</div>' +
        '<div style="font-size:var(--font-size-sm);color:var(--color-text-secondary);line-height:1.6;">' + exercises + '</div>' +
      '</li>';
    }).join('');
  }

  function init() {
    renderStats();
    renderWaterTracker();
    renderRecentWorkouts();
  }

  window.Dashboard = {
    init: init,
    renderStats: renderStats,
    renderWaterTracker: renderWaterTracker,
    renderRecentWorkouts: renderRecentWorkouts
  };
})();
