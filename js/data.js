(function () {
  'use strict';

  const KEYS = {
    exercises: 'wt_exercises',
    workouts: 'wt_workouts',
    water: 'wt_water'
  };

  const DEFAULT_EXERCISES = ['Жим лежа', 'Присед', 'Подтягивания', 'Бабочка'];

  function load(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  }

  function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function generateId() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function dateNDaysAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  // ── Exercises ──

  /** @returns {string[]} List of exercise names */
  function getExercises() {
    var list = load(KEYS.exercises);
    if (!list) {
      save(KEYS.exercises, DEFAULT_EXERCISES);
      return DEFAULT_EXERCISES.slice();
    }
    return list;
  }

  /** @param {string} name - Exercise name to add */
  function addExercise(name) {
    var n = name.trim();
    if (!n) return;
    var list = getExercises();
    if (list.indexOf(n) !== -1) return;
    list.push(n);
    save(KEYS.exercises, list);
  }

  /** @param {string} name - Exercise name to remove */
  function removeExercise(name) {
    var list = getExercises().filter(function (e) { return e !== name; });
    save(KEYS.exercises, list);
  }

  // ── Workouts ──

  function loadWorkouts() {
    return load(KEYS.workouts) || [];
  }

  /** @returns {Object[]} All workouts sorted by date descending */
  function getWorkouts() {
    return loadWorkouts().sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });
  }

  /**
   * @param {string} id - Workout ID
   * @returns {Object|undefined} Workout entry or undefined
   */
  function getWorkout(id) {
    return loadWorkouts().find(function (w) { return w.id === id; });
  }

  /**
   * @param {Object} workout - Workout data (date, exercises). ID is auto-generated.
   * @returns {Object} Saved workout with generated id
   */
  function addWorkout(workout) {
    var all = loadWorkouts();
    var entry = Object.assign({}, workout, { id: generateId() });
    if (!entry.date) entry.date = todayStr();
    all.push(entry);
    save(KEYS.workouts, all);
    return entry;
  }

  /**
   * @param {string} id - Workout ID
   * @param {Object} workout - Updated workout data
   */
  function updateWorkout(id, workout) {
    var all = loadWorkouts();
    var idx = all.findIndex(function (w) { return w.id === id; });
    if (idx === -1) return;
    all[idx] = Object.assign({}, workout, { id: id });
    save(KEYS.workouts, all);
  }

  /** @param {string} id - Workout ID to delete */
  function deleteWorkout(id) {
    var all = loadWorkouts().filter(function (w) { return w.id !== id; });
    save(KEYS.workouts, all);
  }

  // ── Water ──

  function loadWater() {
    return load(KEYS.water) || {};
  }

  /**
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {number} Water amount in ml (0 if not set)
   */
  function getWaterForDate(date) {
    return loadWater()[date] || 0;
  }

  /**
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {number} amount - Water amount in ml
   */
  function setWater(date, amount) {
    var data = loadWater();
    data[date] = amount;
    save(KEYS.water, data);
  }

  /**
   * @param {number} days - Number of past days to include
   * @returns {{date: string, amount: number}[]} Water data sorted by date ascending
   */
  function getWaterHistory(days) {
    var data = loadWater();
    var result = [];
    for (var i = days - 1; i >= 0; i--) {
      var d = dateNDaysAgo(i);
      result.push({ date: d, amount: data[d] || 0 });
    }
    return result;
  }

  // ── Progress / Stats ──

  /**
   * @param {string} exerciseName - Exercise name
   * @param {number} days - Number of past days
   * @returns {{date: string, maxWeight: number, totalVolume: number}[]}
   */
  function getExerciseProgress(exerciseName, days) {
    var cutoff = dateNDaysAgo(days);
    var workouts = loadWorkouts().filter(function (w) {
      return w.date >= cutoff;
    });

    var byDate = {};
    workouts.forEach(function (w) {
      var ex = (w.exercises || []).find(function (e) { return e.name === exerciseName; });
      if (!ex) return;

      var maxW = 0;
      var vol = 0;
      (ex.sets || []).forEach(function (s) {
        var weight = Number(s.weight) || 0;
        var reps = Number(s.reps) || 0;
        if (weight > maxW) maxW = weight;
        vol += weight * reps;
      });

      if (!byDate[w.date]) {
        byDate[w.date] = { date: w.date, maxWeight: 0, totalVolume: 0 };
      }
      if (maxW > byDate[w.date].maxWeight) byDate[w.date].maxWeight = maxW;
      byDate[w.date].totalVolume += vol;
    });

    return Object.values(byDate).sort(function (a, b) {
      return a.date.localeCompare(b.date);
    });
  }

  /** @returns {Object<string, number>} Map of exercise name → best weight ever */
  function getPersonalRecords() {
    var records = {};
    loadWorkouts().forEach(function (w) {
      (w.exercises || []).forEach(function (ex) {
        (ex.sets || []).forEach(function (s) {
          var weight = Number(s.weight) || 0;
          if (!records[ex.name] || weight > records[ex.name]) {
            records[ex.name] = weight;
          }
        });
      });
    });
    return records;
  }

  // ── JSON Sync Layer ──

  function workoutFingerprint(w) {
    var parts = [w.date || ''];
    (w.exercises || []).forEach(function (ex) {
      parts.push(ex.name || '');
      (ex.sets || []).forEach(function (s) {
        parts.push(String(s.weight || 0) + 'x' + String(s.reps || 0));
      });
    });
    return parts.join('|');
  }

  function mergeWorkouts(localArr, remoteArr) {
    var seen = {};
    var merged = [];

    localArr.forEach(function (w) {
      var key = workoutFingerprint(w);
      if (!seen[key]) {
        seen[key] = true;
        merged.push(w);
      }
    });

    remoteArr.forEach(function (w) {
      var key = workoutFingerprint(w);
      if (!seen[key]) {
        seen[key] = true;
        if (!w.id) w.id = generateId();
        merged.push(w);
      }
    });

    return merged;
  }

  function mergeWater(localObj, remoteObj) {
    var merged = Object.assign({}, localObj);
    Object.keys(remoteObj).forEach(function (date) {
      var remote = remoteObj[date] || 0;
      var local = merged[date] || 0;
      merged[date] = Math.max(local, remote);
    });
    return merged;
  }

  function mergeExercises(localArr, remoteArr) {
    var set = {};
    localArr.forEach(function (e) { set[e] = true; });
    remoteArr.forEach(function (e) { set[e] = true; });
    return Object.keys(set);
  }

  async function init() {
    try {
      var resp = await fetch('data/workouts.json');
      if (!resp.ok) return;
      var remote = await resp.json();

      var localWorkouts = loadWorkouts();
      var remoteWorkouts = remote.workouts || [];
      var merged = mergeWorkouts(localWorkouts, remoteWorkouts);
      save(KEYS.workouts, merged);

      var localWater = loadWater();
      var remoteWater = remote.water || {};
      save(KEYS.water, mergeWater(localWater, remoteWater));

      var localExercises = getExercises();
      var remoteExercises = remote.exercises || [];
      save(KEYS.exercises, mergeExercises(localExercises, remoteExercises));
    } catch (e) {
      // JSON file unavailable — use localStorage only
    }
  }

  // ── Public API ──

  window.WorkoutData = {
    init: init,

    getExercises: getExercises,
    addExercise: addExercise,
    removeExercise: removeExercise,

    getWorkouts: getWorkouts,
    getWorkout: getWorkout,
    addWorkout: addWorkout,
    updateWorkout: updateWorkout,
    deleteWorkout: deleteWorkout,

    getWaterForDate: getWaterForDate,
    setWater: setWater,
    getWaterHistory: getWaterHistory,

    getExerciseProgress: getExerciseProgress,
    getPersonalRecords: getPersonalRecords
  };
})();
