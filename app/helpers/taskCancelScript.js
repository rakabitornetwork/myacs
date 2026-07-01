export function taskCancelHelperScript() {
  return `<script>
(function () {
  function injectTasksCancel(page) {
    if (!page || page.component !== 'Tasks/Index') return;
    var auth = page.props.auth || {};
    if (!auth.user || auth.canWrite === false) return;
    var tasks = page.props.tasks || [];

    function add() {
      var table = document.querySelector('.ui-table');
      if (!table) return;
      var thead = table.querySelector('thead tr');
      var rows = table.querySelectorAll('tbody tr');
      if (!thead || !rows.length) return;

      if (!thead.querySelector('.myacs-aksi-col')) {
        var th = document.createElement('th');
        th.className = 'text-right myacs-aksi-col';
        th.style.minWidth = '84px';
        th.textContent = 'Aksi';
        thead.appendChild(th);
      }

      rows.forEach(function (row, i) {
        if (row.querySelector('.myacs-cancel-cell')) return;
        var task = tasks[i];
        if (!task) return;
        var td = document.createElement('td');
        td.className = 'text-right myacs-cancel-cell';
        if (task.status === 'pending') {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = 'Batalkan';
          btn.className =
            'rounded border border-red-200 bg-white px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50';
          btn.onclick = function () {
            if (confirm('Batalkan task ini?')) {
              var f = document.createElement('form');
              f.method = 'POST';
              f.action = '/tasks/' + task.id + '/cancel';
              document.body.appendChild(f);
              f.submit();
            }
          };
          td.appendChild(btn);
        } else {
          td.textContent = '—';
          td.style.color = '#d4d4d8';
          td.style.fontSize = '10px';
        }
        row.appendChild(td);
      });
    }

    setTimeout(add, 100);
    setTimeout(add, 500);
    setTimeout(add, 1200);
  }

  document.addEventListener('inertia:success', function (e) {
    injectTasksCancel(e.detail.page);
  });

  document.addEventListener('DOMContentLoaded', function () {
    try {
      var el = document.getElementById('app');
      if (el && el.dataset.page) injectTasksCancel(JSON.parse(el.dataset.page));
    } catch (err) {}
  });
})();
</script>`;
}
