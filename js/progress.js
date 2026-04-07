(function () {
  'use strict';

  var chartMaxWeight = null;
  var chartMuscleGroups = null;
  var initialized = false;

  var CHART_COLORS = {
    accent: '#3b82f6',
    accentHover: '#60a5fa',
    success: '#22c55e',
    textTertiary: '#64748b',
    border: 'rgba(255,255,255,0.08)'
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

  function formatNum(n) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  /**
   * Collect all sessions for an exercise across all time.
   * Returns array sorted by date ascending:
   * [{ date, maxWeight, maxReps, totalVolume, sets: [{weight, reps}] }]
   */
  function getExerciseSessions(exerciseName) {
    var byDate = {};
    WorkoutData.getWorkouts().forEach(function (w) {
      (w.exercises || []).forEach(function (ex) {
        if (ex.name !== exerciseName) return;
        if (!byDate[w.date]) {
          byDate[w.date] = { date: w.date, maxWeight: 0, maxReps: 0, totalVolume: 0, sets: [] };
        }
        var entry = byDate[w.date];
        (ex.sets || []).forEach(function (s) {
          var weight = Number(s.weight) || 0;
          var reps = Number(s.reps) || 0;
          entry.sets.push({ weight: weight, reps: reps });
          if (weight > entry.maxWeight) entry.maxWeight = weight;
          if (reps > entry.maxReps) entry.maxReps = reps;
          entry.totalVolume += weight * reps;
        });
      });
    });
    return Object.values(byDate).sort(function (a, b) {
      return a.date.localeCompare(b.date);
    });
  }

  function isBodyweight(sessions) {
    return sessions.every(function (s) { return s.maxWeight === 0; });
  }

  function renderComparison(exerciseName, sessions) {
    var container = document.getElementById('progress-comparison');
    if (!container) return;

    if (!sessions.length) {
      container.innerHTML = '';
      return;
    }

    var first = sessions[0];
    var last = sessions[sessions.length - 1];
    var bw = isBodyweight(sessions);

    var mainLabel, mainValue, mainChange;

    if (bw) {
      mainLabel = 'Макс. повторения';
      var firstMaxReps = first.maxReps;
      var lastMaxReps = last.maxReps;
      mainValue = firstMaxReps + ' → ' + lastMaxReps;
      if (sessions.length > 1 && firstMaxReps > 0) {
        var pct = ((lastMaxReps - firstMaxReps) / firstMaxReps * 100);
        var sign = pct >= 0 ? '+' : '';
        var cls = pct > 0 ? 'positive' : (pct < 0 ? 'negative' : 'neutral');
        mainChange = '<span class="progress-stat__change ' + cls + '">' + sign + formatNum(pct) + '%</span>';
      } else {
        mainChange = '';
      }
    } else {
      mainLabel = 'Макс. вес';
      var firstMax = first.maxWeight;
      var lastMax = last.maxWeight;
      mainValue = formatNum(firstMax) + 'кг → ' + formatNum(lastMax) + 'кг';
      if (sessions.length > 1 && firstMax > 0) {
        var pct = ((lastMax - firstMax) / firstMax * 100);
        var sign = pct >= 0 ? '+' : '';
        var cls = pct > 0 ? 'positive' : (pct < 0 ? 'negative' : 'neutral');
        mainChange = '<span class="progress-stat__change ' + cls + '">' + sign + formatNum(pct) + '%</span>';
      } else {
        mainChange = '';
      }
    }

    var avgWeight = 0;
    if (!bw) {
      var totalW = 0;
      var countW = 0;
      sessions.forEach(function (s) {
        s.sets.forEach(function (set) {
          if (set.weight > 0) { totalW += set.weight; countW++; }
        });
      });
      avgWeight = countW > 0 ? totalW / countW : 0;
    }

    var html = '<div class="card card--accent">' +
      '<h3>\uD83D\uDCC8 Прогресс: ' + exerciseName + '</h3>' +
      '<div class="progress-comparison">' +
        '<div class="progress-stat">' +
          '<span class="progress-stat__label">' + mainLabel + '</span>' +
          '<span class="progress-stat__value">' + mainValue + '</span>' +
          mainChange +
        '</div>' +
        '<div class="progress-stat">' +
          '<span class="progress-stat__label">Тренировок</span>' +
          '<span class="progress-stat__value">' + sessions.length + '</span>' +
        '</div>' +
        '<div class="progress-stat">' +
          '<span class="progress-stat__label">Период</span>' +
          '<span class="progress-stat__value">' + formatDateShort(first.date) + ' — ' + formatDateShort(last.date) + '</span>' +
        '</div>';

    if (!bw && avgWeight > 0) {
      html += '<div class="progress-stat">' +
        '<span class="progress-stat__label">Средний вес</span>' +
        '<span class="progress-stat__value">' + formatNum(avgWeight) + 'кг</span>' +
      '</div>';
    }

    html += '</div></div>';
    container.innerHTML = html;
  }

  function renderSessionHistory(sessions) {
    var container = document.getElementById('progress-sessions');
    if (!container) return;

    if (!sessions.length) {
      container.innerHTML = '';
      return;
    }

    var bw = isBodyweight(sessions);

    // Find best session index
    var bestIdx = 0;
    sessions.forEach(function (s, i) {
      if (bw) {
        if (s.maxReps > sessions[bestIdx].maxReps) bestIdx = i;
      } else {
        if (s.maxWeight > sessions[bestIdx].maxWeight) bestIdx = i;
      }
    });

    var html = '<div class="card"><h3>\uD83D\uDCCB Все тренировки</h3><div class="session-history">';

    // Show in reverse chronological order
    for (var i = sessions.length - 1; i >= 0; i--) {
      var s = sessions[i];
      var isBest = i === bestIdx;
      var rowClass = 'session-history__row' + (isBest ? ' session-history__row--best' : '');

      var setsStr = s.sets.map(function (set) {
        if (bw) return set.reps;
        return formatNum(set.weight) + '\u00D7' + set.reps;
      }).join(', ');

      var maxStr = bw
        ? ('макс ' + s.maxReps + ' повт')
        : (formatNum(s.maxWeight) + 'кг');

      html += '<div class="' + rowClass + '">' +
        '<span class="session-history__date">' + formatDateShort(s.date) + '</span>' +
        '<span class="session-history__sets">' + setsStr + '</span>' +
        '<span class="session-history__max">' + maxStr + (isBest ? ' \u2B50' : '') + '</span>' +
      '</div>';
    }

    html += '</div></div>';
    container.innerHTML = html;
  }

  function destroyChart() {
    if (chartMaxWeight) { chartMaxWeight.destroy(); chartMaxWeight = null; }
    if (chartMuscleGroups) { chartMuscleGroups.destroy(); chartMuscleGroups = null; }
  }

  function renderChart(sessions) {
    destroyChart();

    if (!sessions.length || typeof Chart === 'undefined') return;

    var bw = isBodyweight(sessions);

    var labels = sessions.map(function (s) { return formatDateShort(s.date); });
    var data = sessions.map(function (s) { return bw ? s.maxReps : s.maxWeight; });

    var ctx = document.getElementById('chart-max-weight');
    if (!ctx) return;

    // Update chart heading
    var heading = ctx.parentElement.querySelector('h3');
    if (heading) heading.textContent = bw ? 'Макс. повторения' : 'Максимальный вес';

    chartMaxWeight = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: bw ? 'Макс. повторения' : 'Макс. вес (кг)',
          data: data,
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
        scales: { y: { title: { display: true, text: bw ? 'повт' : 'кг', color: CHART_COLORS.textTertiary } } }
      })
    });
  }

  function renderPersonalRecords() {
    var container = document.getElementById('personal-records');
    if (!container) return;

    var records = WorkoutData.getPersonalRecords();
    var records1RM = WorkoutData.getPersonalRecords1RM();
    var names = Object.keys(records);

    if (!names.length) {
      container.innerHTML = '<p style="color:var(--color-text-tertiary);font-size:var(--font-size-sm);">' +
        'Пока нет рекордов</p>';
      return;
    }

    var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:var(--space-2);">';
    names.sort().forEach(function (name) {
      var est1RM = records1RM[name];
      var rmLine = '';
      if (est1RM && est1RM > records[name]) {
        rmLine = '<div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-top:2px;">' +
          '1RM \u2248 ' + formatNum(est1RM) + ' кг</div>';
      }
      html += '<div style="background:var(--color-surface);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">' +
        '<div style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);margin-bottom:var(--space-1);">' +
          name +
        '</div>' +
        '<div style="font-size:var(--font-size-xl);font-weight:var(--font-weight-bold);color:var(--color-success);">' +
          records[name] + '<span style="font-size:var(--font-size-xs);color:var(--color-text-tertiary);"> кг</span>' +
        '</div>' +
        rmLine +
      '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  var MUSCLE_GROUP_COLORS = {
    '\u0413\u0440\u0443\u0434\u044C': '#3b82f6',
    '\u0421\u043F\u0438\u043D\u0430': '#22c55e',
    '\u041D\u043E\u0433\u0438': '#f59e0b',
    '\u041F\u043B\u0435\u0447\u0438': '#8b5cf6',
    '\u0420\u0443\u043A\u0438': '#ef4444',
    '\u041A\u043E\u0440': '#06b6d4',
    '\u0414\u0440\u0443\u0433\u043E\u0435': '#64748b'
  };

  function renderMuscleGroupChart() {
    if (chartMuscleGroups) { chartMuscleGroups.destroy(); chartMuscleGroups = null; }

    var ctx = document.getElementById('chart-muscle-groups');
    if (!ctx || typeof Chart === 'undefined') return;

    var stats = WorkoutData.getMuscleGroupStats(30);
    var groups = Object.keys(stats);
    if (!groups.length) return;

    var labels = [];
    var data = [];
    var colors = [];
    groups.forEach(function (g) {
      labels.push(g);
      data.push(stats[g]);
      colors.push(MUSCLE_GROUP_COLORS[g] || '#64748b');
    });

    chartMuscleGroups = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 400 },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: CHART_COLORS.textTertiary,
              padding: 12,
              generateLabels: function (chart) {
                var ds = chart.data.datasets[0];
                return chart.data.labels.map(function (label, i) {
                  return {
                    text: label + ' (' + ds.data[i] + ')',
                    fillStyle: ds.backgroundColor[i],
                    hidden: false,
                    index: i
                  };
                });
              }
            }
          },
          tooltip: {
            backgroundColor: '#1a1a26',
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: function (context) {
                var total = context.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                var pct = total > 0 ? Math.round(context.raw / total * 100) : 0;
                return context.label + ': ' + context.raw + ' подходов (' + pct + '%)';
              }
            }
          }
        }
      }
    });
  }

  function renderAchievements() {
    var container = document.getElementById('achievements-list');
    if (!container) return;

    var workouts = WorkoutData.getWorkouts();
    var records = WorkoutData.getPersonalRecords();
    var waterHistory = WorkoutData.getWaterHistory(365);

    // Check max reps for Подтягивания
    var maxPullUpReps = 0;
    workouts.forEach(function (w) {
      (w.exercises || []).forEach(function (ex) {
        if (ex.name.indexOf('\u041F\u043E\u0434\u0442\u044F\u0433\u0438\u0432\u0430\u043D\u0438\u044F') !== -1) {
          (ex.sets || []).forEach(function (s) {
            var reps = Number(s.reps) || 0;
            if (reps > maxPullUpReps) maxPullUpReps = reps;
          });
        }
      });
    });

    // Check if bench press improved (first vs last session)
    var benchImproved = false;
    var benchSessions = [];
    workouts.slice().sort(function (a, b) { return a.date.localeCompare(b.date); }).forEach(function (w) {
      (w.exercises || []).forEach(function (ex) {
        if (ex.name === '\u0416\u0438\u043C' || ex.name === '\u0416\u0438\u043C \u043B\u0435\u0436\u0430') {
          var maxW = 0;
          (ex.sets || []).forEach(function (s) {
            var weight = Number(s.weight) || 0;
            if (weight > maxW) maxW = weight;
          });
          if (maxW > 0) benchSessions.push(maxW);
        }
      });
    });
    if (benchSessions.length >= 2 && benchSessions[benchSessions.length - 1] > benchSessions[0]) {
      benchImproved = true;
    }

    // Workouts in last 7 days
    var now = new Date();
    var weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    var weekAgoStr = weekAgo.toISOString().slice(0, 10);
    var workoutsThisWeek = workouts.filter(function (w) { return w.date >= weekAgoStr; }).length;

    // Water >= 2000
    var hasWaterDay = waterHistory.some(function (d) { return d.amount >= 2000; });

    // Max bench weight
    var maxBench = 0;
    ['\u0416\u0438\u043C', '\u0416\u0438\u043C \u043B\u0435\u0436\u0430'].forEach(function (name) {
      if (records[name] && records[name] > maxBench) maxBench = records[name];
    });

    // Max squat weight
    var maxSquat = 0;
    ['\u041F\u0440\u0438\u0441\u0435\u0434', '\u041F\u0440\u0438\u0441\u0435\u0434 \u043D\u043E\u0433\u0430\u043C\u0438'].forEach(function (name) {
      if (records[name] && records[name] > maxSquat) maxSquat = records[name];
    });

    var achievements = [
      { icon: '\uD83C\uDFCB\uFE0F', name: '\u041F\u0435\u0440\u0432\u0430\u044F \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0430', earned: workouts.length >= 1 },
      { icon: '\uD83D\uDD25', name: '5 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043E\u043A', earned: workouts.length >= 5 },
      { icon: '\uD83D\uDCAA', name: '10 \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043E\u043A', earned: workouts.length >= 10 },
      { icon: '\uD83D\uDCC8', name: '\u041D\u043E\u0432\u044B\u0439 \u0440\u0435\u043A\u043E\u0440\u0434 \u0432 \u0436\u0438\u043C\u0435', earned: benchImproved },
      { icon: '\uD83E\uDDD7', name: '\u041F\u043E\u0434\u0442\u044F\u0433\u0438\u0432\u0430\u043D\u0438\u044F 15+', earned: maxPullUpReps >= 15 },
      { icon: '\uD83E\uDDD7\u200D\u2642\uFE0F', name: '\u041F\u043E\u0434\u0442\u044F\u0433\u0438\u0432\u0430\u043D\u0438\u044F 20+', earned: maxPullUpReps >= 20 },
      { icon: '\uD83D\uDCC5', name: '\u041D\u0435\u0434\u0435\u043B\u044F \u0431\u0435\u0437 \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u043E\u0432', earned: workoutsThisWeek >= 3 },
      { icon: '\uD83D\uDCA7', name: '\u0412\u043E\u0434\u043D\u044B\u0439 \u0431\u0430\u043B\u0430\u043D\u0441', earned: hasWaterDay },
      { icon: '\uD83C\uDFCB\uFE0F\u200D\u2642\uFE0F', name: '\u0416\u0438\u043C 70\u043A\u0433', earned: maxBench >= 70 },
      { icon: '\uD83E\uDDB5', name: '\u041F\u0440\u0438\u0441\u0435\u0434 100\u043A\u0433+', earned: maxSquat >= 100 }
    ];

    var html = '';
    achievements.forEach(function (a) {
      var cls = a.earned ? 'achievement achievement--earned' : 'achievement achievement--locked';
      html += '<div class="' + cls + '">' +
        '<span class="achievement__icon">' + a.icon + '</span>' +
        '<span class="achievement__name">' + a.name + '</span>' +
      '</div>';
    });
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
      html += '<option value="' + name + '"' + selected + '>' + name + '</option>';
    });
    select.innerHTML = html;
  }

  function ensureRecordsSection() {
    var section = document.getElementById('tab-progress');
    if (!section || document.getElementById('personal-records-card')) return;

    var card = document.createElement('div');
    card.className = 'card';
    card.id = 'personal-records-card';
    card.innerHTML = '<h3>\uD83C\uDFC6 Личные рекорды</h3>' +
      '<div id="personal-records"></div>';
    section.appendChild(card);
  }

  function onExerciseChange(exerciseName) {
    if (!exerciseName) {
      destroyChart();
      var comp = document.getElementById('progress-comparison');
      var sess = document.getElementById('progress-sessions');
      if (comp) comp.innerHTML = '';
      if (sess) sess.innerHTML = '';
      return;
    }

    var sessions = getExerciseSessions(exerciseName);
    renderComparison(exerciseName, sessions);
    renderSessionHistory(sessions);
    renderChart(sessions);
  }

  function bindEvents() {
    var select = document.getElementById('progress-exercise');
    if (select) {
      select.addEventListener('change', function () {
        onExerciseChange(select.value);
      });
    }
  }

  function init() {
    populateExerciseSelector();
    ensureRecordsSection();
    renderPersonalRecords();
    renderMuscleGroupChart();
    renderAchievements();

    if (!initialized) {
      bindEvents();
      initialized = true;
    }

    var select = document.getElementById('progress-exercise');
    if (select && select.value) {
      onExerciseChange(select.value);
    }
  }

  window.Progress = {
    init: init
  };
})();
