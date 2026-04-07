(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var btn = document.getElementById('export-csv');
    if (!btn) return;

    btn.addEventListener('click', function() {
      var workouts = WorkoutData.getWorkouts();
      if (!workouts.length) return;

      var rows = [['Дата', 'Упражнение', 'Сет', 'Вес (кг)', 'Повторы', 'Заметки']];

      workouts.forEach(function(w) {
        (w.exercises || []).forEach(function(ex) {
          (ex.sets || []).forEach(function(s, i) {
            rows.push([
              w.date,
              ex.name,
              i + 1,
              s.weight || 0,
              s.reps || 0,
              (w.notes || '').replace(/"/g, '""')
            ]);
          });
        });
      });

      var csv = rows.map(function(r) {
        return r.map(function(cell) {
          return '"' + String(cell) + '"';
        }).join(',');
      }).join('\n');

      // BOM for Excel UTF-8
      var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'workouts_' + new Date().toISOString().slice(0, 10) + '.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  });
})();
