(function () {
  'use strict';

  function formatDate(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    var months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function getAllExerciseNames(workouts) {
    var names = {};
    workouts.forEach(function (w) {
      (w.exercises || []).forEach(function (ex) {
        names[ex.name] = true;
      });
    });
    return Object.keys(names).sort();
  }

  function populateFilterDropdown() {
    var select = document.getElementById('history-exercise-filter');
    if (!select) return;

    var current = select.value;
    var allWorkouts = WorkoutData.getWorkouts();
    var names = getAllExerciseNames(allWorkouts);

    var html = '<option value="">\u0412\u0441\u0435 \u0443\u043F\u0440\u0430\u0436\u043D\u0435\u043D\u0438\u044F</option>';
    names.forEach(function (name) {
      var selected = name === current ? ' selected' : '';
      html += '<option value="' + name + '"' + selected + '>' + name + '</option>';
    });
    select.innerHTML = html;
  }

  function getFilteredWorkouts() {
    var dateFilter = document.getElementById('history-date');
    var exerciseFilter = document.getElementById('history-exercise-filter');

    var dateVal = dateFilter ? dateFilter.value : '';
    var exerciseVal = exerciseFilter ? exerciseFilter.value : '';

    var workouts = WorkoutData.getWorkouts();

    if (dateVal) {
      workouts = workouts.filter(function (w) {
        return w.date === dateVal;
      });
    }

    if (exerciseVal) {
      workouts = workouts.filter(function (w) {
        return (w.exercises || []).some(function (ex) {
          return ex.name === exerciseVal;
        });
      });
    }

    return workouts;
  }

  function groupByDate(workouts) {
    var groups = {};
    var order = [];
    workouts.forEach(function (w) {
      if (!groups[w.date]) {
        groups[w.date] = [];
        order.push(w.date);
      }
      groups[w.date].push(w);
    });
    return { groups: groups, order: order };
  }

  function renderWorkouts() {
    var container = document.getElementById('history-list');
    if (!container) return;

    var workouts = getFilteredWorkouts();

    if (!workouts.length) {
      container.innerHTML =
        '<div class="card empty-state">' +
          '<p>\uD83D\uDCAD \u0418\u0441\u0442\u043E\u0440\u0438\u044F \u043F\u0443\u0441\u0442\u0430. \u0421\u0434\u0435\u043B\u0430\u0439 \u043F\u0435\u0440\u0432\u0443\u044E \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443!</p>' +
        '</div>';
      return;
    }

    var data = groupByDate(workouts);
    var html = '';

    data.order.forEach(function (date) {
      html += '<div style="margin-bottom:var(--space-4);">';
      html += '<h3 style="color:var(--color-text-secondary);font-size:var(--font-size-sm);' +
        'text-transform:uppercase;letter-spacing:var(--letter-spacing-caps);margin-bottom:var(--space-2);' +
        'padding-left:var(--space-2);">' + formatDate(date) + '</h3>';

      data.groups[date].forEach(function (w) {
        var exercisesHtml = (w.exercises || []).map(function (ex) {
          var setsHtml = (ex.sets || []).map(function (s, i) {
            return '<span class="badge" style="font-variant-numeric:tabular-nums;">' +
              (i + 1) + '. ' + (s.weight || 0) + '\u043A\u0433 \u00D7 ' + (s.reps || 0) +
            '</span>';
          }).join(' ');

          return '<div style="margin-bottom:var(--space-3);">' +
            '<div style="font-weight:var(--font-weight-semibold);color:var(--color-text-primary);margin-bottom:var(--space-1);">' +
              ex.name +
            '</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:var(--space-1);">' + setsHtml + '</div>' +
          '</div>';
        }).join('');

        html += '<div class="card" style="margin-bottom:var(--space-2);">' +
          exercisesHtml +
          '<div style="display:flex;justify-content:flex-end;margin-top:var(--space-2);">' +
            '<button class="btn btn--sm btn--ghost" style="color:var(--color-error);" data-delete-id="' + w.id + '">' +
              '\uD83D\uDDD1 \u0423\u0434\u0430\u043B\u0438\u0442\u044C' +
            '</button>' +
          '</div>' +
        '</div>';
      });

      html += '</div>';
    });

    container.innerHTML = html;

    container.querySelectorAll('[data-delete-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-delete-id');
        if (confirm('\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443?')) {
          WorkoutData.deleteWorkout(id);
          renderWorkouts();
          if (window.Dashboard) Dashboard.init();
        }
      });
    });
  }

  function bindFilters() {
    var dateFilter = document.getElementById('history-date');
    var exerciseFilter = document.getElementById('history-exercise-filter');

    if (dateFilter) {
      dateFilter.addEventListener('change', renderWorkouts);
    }
    if (exerciseFilter) {
      exerciseFilter.addEventListener('change', renderWorkouts);
    }
  }

  var filtersInitialized = false;

  function init() {
    populateFilterDropdown();
    renderWorkouts();
    if (!filtersInitialized) {
      bindFilters();
      filtersInitialized = true;
    }
  }

  window.History = {
    init: init,
    renderWorkouts: renderWorkouts
  };
})();
