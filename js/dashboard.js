(function () {
  'use strict';

  var WATER_GOAL = 2000;
  var WATER_STEP = 250;

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
    var radius = 62;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference * (1 - pct);

    container.innerHTML =
      '<h2>\uD83D\uDCA7 \u0412\u043E\u0434\u0430</h2>' +
      '<div class="water-ring-container">' +
        '<div class="water-ring">' +
          '<svg width="150" height="150" viewBox="0 0 150 150">' +
            '<circle class="water-ring__track" cx="75" cy="75" r="' + radius + '" stroke-width="10"/>' +
            '<circle class="water-ring__fill" cx="75" cy="75" r="' + radius + '" stroke-width="10"' +
              ' stroke-dasharray="' + circumference + '"' +
              ' stroke-dashoffset="' + offset + '"/>' +
          '</svg>' +
          '<div class="water-ring__label">' +
            '<span class="water-ring__amount">' + current + '</span>' +
            '<span class="water-ring__goal">\u0438\u0437 ' + WATER_GOAL + ' \u043C\u043B</span>' +
          '</div>' +
        '</div>' +
        '<div class="water-ring-actions">' +
          '<button class="btn--water btn--water-minus" id="water-minus">\u2212</button>' +
          '<span class="water-ring-actions__amount">' + WATER_STEP + ' \u043C\u043B</span>' +
          '<button class="btn--water" id="water-plus">+</button>' +
        '</div>' +
      '</div>';

    var plusBtn = document.getElementById('water-plus');
    var minusBtn = document.getElementById('water-minus');

    if (plusBtn) {
      plusBtn.addEventListener('click', function () {
        var val = WorkoutData.getWaterForDate(today) + WATER_STEP;
        WorkoutData.setWater(today, val);
        renderWaterTracker();
      });
    }

    if (minusBtn) {
      minusBtn.addEventListener('click', function () {
        var val = Math.max(0, WorkoutData.getWaterForDate(today) - WATER_STEP);
        WorkoutData.setWater(today, val);
        renderWaterTracker();
      });
    }
  }

  function formatSet(s) {
    var weight = Number(s.weight) || 0;
    var reps = Number(s.reps) || 0;
    if (weight === 0) {
      return '\u00D7 ' + reps;
    }
    return weight + '\u043A\u0433 \u00D7 ' + reps;
  }

  function calcWorkoutVolume(w) {
    var total = 0;
    (w.exercises || []).forEach(function (ex) {
      (ex.sets || []).forEach(function (s) {
        total += (Number(s.weight) || 0) * (Number(s.reps) || 0);
      });
    });
    return total;
  }

  function showWorkoutModal(w) {
    var existing = document.getElementById('workout-detail-modal');
    if (existing) existing.remove();

    var totalVol = calcWorkoutVolume(w);

    var exercisesHtml = (w.exercises || []).map(function (ex) {
      var setsHtml = (ex.sets || []).map(function (s, i) {
        return '<div class="history-set">' +
          '<span class="history-set__number">\u0421\u0435\u0442 ' + (i + 1) + '</span>' +
          '<span class="history-set__weight">' + formatSet(s) + '</span>' +
        '</div>';
      }).join('');

      return '<div class="history-exercise">' +
        '<div class="history-exercise__name">' + ex.name + '</div>' +
        '<div class="history-exercise__details" style="display:block;">' + setsHtml + '</div>' +
      '</div>';
    }).join('');

    var modal = document.createElement('div');
    modal.id = 'workout-detail-modal';
    modal.className = 'workout-modal-overlay';

    modal.innerHTML =
      '<div class="workout-modal">' +
        '<button class="workout-modal__close" id="modal-close-btn">\u00D7</button>' +
        '<div class="card__header">' +
          '<span class="badge badge--accent">' +
            '\uD83C\uDFCB\uFE0F ' + formatDate(w.date) + '</span>' +
        '</div>' +
        exercisesHtml +
        '<div class="card__footer" style="justify-content:space-between;font-weight:600;">' +
          '<span>\u041E\u0431\u0449\u0438\u0439 \u043E\u0431\u044A\u0451\u043C</span>' +
          '<span>' + Math.round(totalVol).toLocaleString('ru-RU') + ' \u043A\u0433</span>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    document.getElementById('modal-close-btn').addEventListener('click', function () {
      modal.remove();
    });

    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  function renderRecentWorkouts() {
    var list = document.getElementById('recent-list');
    if (!list) return;

    var workouts = WorkoutData.getWorkouts().slice(0, 5);

    if (!workouts.length) {
      list.innerHTML = '<li class="empty-state">\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043E\u043A. \u041D\u0430\u0447\u043D\u0438 \u043F\u0440\u044F\u043C\u043E \u0441\u0435\u0439\u0447\u0430\u0441!</li>';
      return;
    }

    list.innerHTML = workouts.map(function (w, idx) {
      var exerciseNames = (w.exercises || []).map(function (ex) {
        return ex.name;
      }).join(', ');

      var totalVol = calcWorkoutVolume(w);

      return '<li class="card card--interactive" data-workout-idx="' + idx + '" ' +
        'style="margin-bottom:var(--space-2);list-style:none;cursor:pointer;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">' +
          '<span class="badge badge--accent">' + formatDate(w.date) + '</span>' +
          '<span style="color:var(--color-text-tertiary);font-size:var(--font-size-xs);">' +
            Math.round(totalVol).toLocaleString('ru-RU') + ' \u043A\u0433</span>' +
        '</div>' +
        '<div style="font-size:var(--font-size-sm);color:var(--color-text-secondary);line-height:1.6;' +
          'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + exerciseNames + '</div>' +
        '<div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:4px;">' +
          '\u041D\u0430\u0436\u043C\u0438 \u0434\u043B\u044F \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0441\u0442\u0435\u0439</div>' +
      '</li>';
    }).join('');

    var items = list.querySelectorAll('[data-workout-idx]');
    items.forEach(function (item) {
      item.addEventListener('click', function () {
        var idx = Number(item.getAttribute('data-workout-idx'));
        var w = workouts[idx];
        if (w) showWorkoutModal(w);
      });
    });
  }

  function init() {
    if (typeof WorkoutData === 'undefined') {
      document.addEventListener('DOMContentLoaded', function () {
        renderStats();
        renderWaterTracker();
        renderRecentWorkouts();
      });
      return;
    }
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
