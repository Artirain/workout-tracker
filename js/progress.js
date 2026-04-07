(function () {
  'use strict';

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

  var TIME_RANGES = [
    { label: '2 недели', days: 14 },
    { label: '1 месяц', days: 30 },
    { label: '3 месяца', days: 90 },
    { label: 'Всё время', days: 3650 }
  ];

  var chartMaxWeight = null;
  var chartVolume = null;
  var chartSets = null;
  var currentRange = 30;
  var initialized = false;

  var CHART_COLORS = {
    accent: '#3b82f6',
    accentHover: '#60a5fa',
    success: '#22c55e',
    successHover: '#4ade80',
    warning: '#f59e0b',
    textSecondary: '#94a3b8',
    textTertiary: '#64748b',
    border: 'rgba(255,255,255,0.08)',
    surface: 'rgba(255,255,255,0.04)'
  };

  var CHART_DEFAULTS = {
    responsive: true,
    maintainAspectRatio: true,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a26',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        ticks: { color: CHART_COLORS.textTertiary, font: { size: 11 } },
        grid: { color: CHART_COLORS.border }
      },
      y: {
        ticks: { color: CHART_COLORS.textTertiary, font: { size: 11 } },
        grid: { color: CHART_COLORS.border },
        beginAtZero: true
      }
    }
  };

  function getExerciseLabel(name) {
    return EXERCISE_NAMES[name] || name;
  }

  function getAllExerciseNames() {
    var names = {};
    WorkoutData.getWorkouts().forEach(function (w) {
      (w.exercises || []).forEach(function (ex) {
        names[ex.name] = true;
      });
    });
    return Object.keys(names).sort();
  }

  function formatDateShort(dateStr) {
    var parts = dateStr.split('-');
    return parts[2] + '.' + parts[1];
  }

  function getExerciseData(exerciseName, days) {
    var progress = WorkoutData.getExerciseProgress(exerciseName, days);

    var labels = [];
    var maxWeights = [];
    var volumes = [];
    var setsCounts = [];

    progress.forEach(function (p) {
      labels.push(formatDateShort(p.date));
      maxWeights.push(p.maxWeight);
      volumes.push(Math.round(p.totalVolume));
    });

    // sets/reps trend — need to compute from raw workouts
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    var cutoffStr = cutoff.toISOString().slice(0, 10);

    var byDate = {};
    WorkoutData.getWorkouts().forEach(function (w) {
      if (w.date < cutoffStr) return;
      var ex = (w.exercises || []).find(function (e) { return e.name === exerciseName; });
      if (!ex) return;
      if (!byDate[w.date]) byDate[w.date] = { sets: 0, reps: 0 };
      (ex.sets || []).forEach(function (s) {
        byDate[w.date].sets++;
        byDate[w.date].reps += Number(s.reps) || 0;
      });
    });

    progress.forEach(function (p) {
      var d = byDate[p.date];
      setsCounts.push(d ? d.sets : 0);
    });

    return { labels: labels, maxWeights: maxWeights, volumes: volumes, setsCounts: setsCounts };
  }

  function deepMerge(target, source) {
    var result = {};
    Object.keys(target).forEach(function (k) { result[k] = target[k]; });
    Object.keys(source).forEach(function (k) {
      if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k]) && target[k]) {
        result[k] = deepMerge(target[k], source[k]);
      } else {
        result[k] = source[k];
      }
    });
    return result;
  }

  function destroyCharts() {
    if (chartMaxWeight) { chartMaxWeight.destroy(); chartMaxWeight = null; }
    if (chartVolume) { chartVolume.destroy(); chartVolume = null; }
    if (chartSets) { chartSets.destroy(); chartSets = null; }
  }

  function renderCharts(exerciseName) {
    if (!exerciseName || typeof Chart === 'undefined') return;

    destroyCharts();

    var data = getExerciseData(exerciseName, currentRange);

    if (!data.labels.length) return;

    // Chart 1: Max weight (line)
    var ctx1 = document.getElementById('chart-max-weight');
    if (ctx1) {
      chartMaxWeight = new Chart(ctx1, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [{
            label: 'Макс. вес (кг)',
            data: data.maxWeights,
            borderColor: CHART_COLORS.accent,
            backgroundColor: 'rgba(59,130,246,0.1)',
            borderWidth: 2,
            pointBackgroundColor: CHART_COLORS.accent,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
            fill: true
          }]
        },
        options: deepMerge(CHART_DEFAULTS, {
          scales: { y: { title: { display: true, text: 'кг', color: CHART_COLORS.textTertiary } } }
        })
      });
    }

    // Chart 2: Volume (bar)
    var ctx2 = document.getElementById('chart-volume');
    if (ctx2) {
      chartVolume = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: data.labels,
          datasets: [{
            label: 'Объём (кг)',
            data: data.volumes,
            backgroundColor: 'rgba(34,197,94,0.6)',
            borderColor: CHART_COLORS.success,
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: deepMerge(CHART_DEFAULTS, {
          scales: { y: { title: { display: true, text: 'кг', color: CHART_COLORS.textTertiary } } }
        })
      });
    }

    // Chart 3: Sets trend (line)
    var ctx3 = document.getElementById('chart-sets');
    if (ctx3) {
      chartSets = new Chart(ctx3, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [{
            label: 'Подходов',
            data: data.setsCounts,
            borderColor: CHART_COLORS.warning,
            backgroundColor: 'rgba(245,158,11,0.1)',
            borderWidth: 2,
            pointBackgroundColor: CHART_COLORS.warning,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
            fill: true
          }]
        },
        options: CHART_DEFAULTS
      });
    }
  }

  function renderPersonalRecords() {
    var container = document.getElementById('personal-records');
    if (!container) return;

    var records = WorkoutData.getPersonalRecords();
    var names = Object.keys(records);

    if (!names.length) {
      container.innerHTML = '<p style="color:var(--color-text-tertiary);font-size:var(--font-size-sm);">' +
        'Пока нет рекордов</p>';
      return;
    }

    var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:var(--space-2);">';
    names.sort().forEach(function (name) {
      html += '<div style="background:var(--color-surface);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">' +
        '<div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-bottom:var(--space-1);">' +
          getExerciseLabel(name) +
        '</div>' +
        '<div style="font-size:var(--font-size-xl);font-weight:var(--font-weight-bold);color:var(--color-success);">' +
          records[name] + '<span style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);"> кг</span>' +
        '</div>' +
      '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  function populateExerciseSelector() {
    var select = document.getElementById('progress-exercise');
    if (!select) return;

    var current = select.value;
    var names = getAllExerciseNames();

    var html = '<option value="">Выбери упражнение...</option>';
    names.forEach(function (name) {
      var selected = name === current ? ' selected' : '';
      html += '<option value="' + name + '"' + selected + '>' + getExerciseLabel(name) + '</option>';
    });
    select.innerHTML = html;
  }

  function renderTimeRangeSelector() {
    var section = document.getElementById('tab-progress');
    if (!section) return;

    var existing = document.getElementById('time-range-selector');
    if (existing) return;

    var firstCard = section.querySelector('.card');
    if (!firstCard) return;

    var div = document.createElement('div');
    div.id = 'time-range-selector';
    div.style.cssText = 'display:flex;gap:var(--space-2);margin-top:var(--space-3);flex-wrap:wrap;';

    TIME_RANGES.forEach(function (r) {
      var btn = document.createElement('button');
      btn.className = 'btn btn--sm' + (r.days === currentRange ? ' btn--primary' : ' btn--ghost');
      btn.textContent = r.label;
      btn.addEventListener('click', function () {
        currentRange = r.days;
        div.querySelectorAll('.btn').forEach(function (b) {
          b.className = 'btn btn--sm btn--ghost';
        });
        btn.className = 'btn btn--sm btn--primary';
        var sel = document.getElementById('progress-exercise');
        if (sel && sel.value) renderCharts(sel.value);
      });
      div.appendChild(btn);
    });

    firstCard.appendChild(div);
  }

  function ensureRecordsSection() {
    var section = document.getElementById('tab-progress');
    if (!section || document.getElementById('personal-records-card')) return;

    var card = document.createElement('div');
    card.className = 'card';
    card.id = 'personal-records-card';
    card.innerHTML = '<h3>\uD83C\uDFC6 \u041B\u0438\u0447\u043D\u044B\u0435 \u0440\u0435\u043A\u043E\u0440\u0434\u044B</h3>' +
      '<div id="personal-records"></div>';
    section.appendChild(card);
  }

  function bindEvents() {
    var select = document.getElementById('progress-exercise');
    if (select) {
      select.addEventListener('change', function () {
        if (select.value) {
          renderCharts(select.value);
        } else {
          destroyCharts();
        }
      });
    }
  }

  function init() {
    populateExerciseSelector();
    renderTimeRangeSelector();
    ensureRecordsSection();
    renderPersonalRecords();

    if (!initialized) {
      bindEvents();
      initialized = true;
    }

    var select = document.getElementById('progress-exercise');
    if (select && select.value) {
      renderCharts(select.value);
    }
  }

  window.Progress = {
    init: init
  };
})();
