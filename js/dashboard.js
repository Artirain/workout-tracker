(function () {
  'use strict';

  var WATER_GOAL = 2000;
  var WATER_STEP = 250;

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function formatDate(dateStr) {
    var parts = dateStr.split('-');
    return parts[2] + '.' + parts[1] + '.' + parts[0];
  }

  function renderStats() {
    var today = todayStr();
    var allWorkouts = WorkoutData.getWorkouts();
    var workouts = allWorkouts.filter(function (w) {
      return w.date === today;
    });

    var isToday = workouts.length > 0;
    var statsWorkouts = workouts;
    var headingEl = document.querySelector('.today-summary h2');

    if (!isToday && allWorkouts.length > 0) {
      var lastWorkout = allWorkouts[0];
      statsWorkouts = [lastWorkout];
      var parts = lastWorkout.date.split('-');
      var ddmm = parts[2] + '.' + parts[1];
      if (headingEl) headingEl.innerHTML = '\uD83D\uDCCA \u041F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0430 (' + ddmm + ')';
    } else {
      if (headingEl) headingEl.innerHTML = '\uD83D\uDCCA \u0421\u0432\u043E\u0434\u043A\u0430 \u0437\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F';
    }

    var totalSets = 0;
    var weightSum = 0;
    var weightCount = 0;

    statsWorkouts.forEach(function (w) {
      (w.exercises || []).forEach(function (ex) {
        (ex.sets || []).forEach(function (s) {
          totalSets++;
          var weight = Number(s.weight) || 0;
          if (weight > 0) {
            weightSum += weight;
            weightCount++;
          }
        });
      });
    });

    var avgWeight = weightCount > 0 ? (weightSum / weightCount) : 0;

    var elWorkouts = document.getElementById('today-workouts');
    var elSets = document.getElementById('today-sets');
    var elAvgWeight = document.getElementById('today-avg-weight');

    if (elWorkouts) elWorkouts.textContent = statsWorkouts.length;
    if (elSets) elSets.textContent = totalSets;
    if (elAvgWeight) elAvgWeight.textContent = weightCount > 0
      ? (Math.round(avgWeight * 10) / 10).toLocaleString('ru-RU') + ' \u043A\u0433'
      : '\u2014';
  }

  var activeWaterDate = null;

  function renderWaterForDate(date) {
    var widget = document.getElementById('water-widget');
    if (!widget) return;

    activeWaterDate = date;
    var current = WorkoutData.getWaterForDate(date);
    var pct = Math.min(current / WATER_GOAL, 1);
    var radius = 62;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference * (1 - pct);
    var parts = date.split('-');
    var dateLabel = parts[2] + '.' + parts[1] + '.' + parts[0];

    widget.style.display = '';
    widget.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<h2>\uD83D\uDCA7 \u0412\u043E\u0434\u0430</h2>' +
        '<span class="badge badge--accent">' + dateLabel + '</span>' +
      '</div>' +
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

    document.getElementById('water-plus').addEventListener('click', function () {
      var val = WorkoutData.getWaterForDate(activeWaterDate) + WATER_STEP;
      WorkoutData.setWater(activeWaterDate, val);
      renderWaterForDate(activeWaterDate);
      renderRecentWorkouts();
    });

    document.getElementById('water-minus').addEventListener('click', function () {
      var val = Math.max(0, WorkoutData.getWaterForDate(activeWaterDate) - WATER_STEP);
      WorkoutData.setWater(activeWaterDate, val);
      renderWaterForDate(activeWaterDate);
      renderRecentWorkouts();
    });

    widget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideWaterWidget() {
    var widget = document.getElementById('water-widget');
    if (widget) widget.style.display = 'none';
    activeWaterDate = null;
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
    var water = WorkoutData.getWaterForDate(w.date);

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
        (water > 0
          ? '<div class="card__footer" style="justify-content:space-between;font-weight:600;">' +
              '<span>\uD83D\uDCA7 \u0412\u043E\u0434\u0430</span>' +
              '<span style="color:#38bdf8;">' + water + ' \u043C\u043B</span>' +
            '</div>'
          : '') +
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
      var water = WorkoutData.getWaterForDate(w.date);
      var waterHtml = water > 0
        ? '<div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:4px;">' +
            '\uD83D\uDCA7 ' + water + ' \u043C\u043B</div>'
        : '';

      return '<li class="card card--interactive" data-workout-idx="' + idx + '" ' +
        'style="margin-bottom:var(--space-2);list-style:none;cursor:pointer;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">' +
          '<span class="badge badge--accent">' + formatDate(w.date) + '</span>' +
          '<span style="color:var(--color-text-tertiary);font-size:var(--font-size-xs);">' +
            Math.round(totalVol).toLocaleString('ru-RU') + ' \u043A\u0433</span>' +
        '</div>' +
        '<div style="font-size:var(--font-size-sm);color:var(--color-text-secondary);line-height:1.6;' +
          'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + exerciseNames + '</div>' +
        waterHtml +
        '<div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:4px;">' +
          '\u041D\u0430\u0436\u043C\u0438 \u0434\u043B\u044F \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0441\u0442\u0435\u0439</div>' +
      '</li>';
    }).join('');

    var items = list.querySelectorAll('[data-workout-idx]');
    items.forEach(function (item) {
      item.addEventListener('click', function () {
        var idx = Number(item.getAttribute('data-workout-idx'));
        var w = workouts[idx];
        if (w) {
          showWorkoutModal(w);
          renderWaterForDate(w.date);
        }
      });
    });
  }

  function init() {
    if (typeof WorkoutData === 'undefined') {
      document.addEventListener('DOMContentLoaded', function () {
        renderStats();
        renderRecentWorkouts();
      });
      return;
    }
    renderStats();
    renderRecentWorkouts();
  }

  window.Dashboard = {
    init: init,
    renderStats: renderStats,
    renderWaterForDate: renderWaterForDate,
    hideWaterWidget: hideWaterWidget,
    renderRecentWorkouts: renderRecentWorkouts
  };
})();
