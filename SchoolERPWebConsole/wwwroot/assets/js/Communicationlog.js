// ========================================================================
// Email / SMS Log + Schedule Email SMS Log
// filters, badges, sorting, export, pagination, delete schedule
// ========================================================================

const LOG_TYPE = window.commLogType || 'LOG';
const FILTER_KEY = 'appliedFilters_commLog_' + LOG_TYPE;   // separate per tab
let appliedFilters = {};
try {
    const stored = sessionStorage.getItem(FILTER_KEY);
    if (stored) appliedFilters = JSON.parse(stored);
} catch (e) { appliedFilters = {}; }

const $id = id => document.getElementById(id);

function saveAppliedFilters() {
    try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(appliedFilters)); } catch (e) { }
}
function clearAppliedFilters() {
    appliedFilters = {};
    try { sessionStorage.removeItem(FILTER_KEY); } catch (e) { }
}

// ---------------- Export (DataTables buttons, current page) ----------------
function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#CommunicationLogTable')) {
        $('#CommunicationLogTable').DataTable().button(index).trigger();
    }
}

function initExportTable() {
    if (!$('#CommunicationLogTable').length) return;
    if ($.fn.DataTable.isDataTable('#CommunicationLogTable')) {
        $('#CommunicationLogTable').DataTable().destroy();
    }
    const companyname = localStorage.getItem('comName') || '';
    const title = `${window.commLogTitle || 'Communication Log'} - ${companyname}`;
    const exp = { columns: ':not(.no-export)' };

    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#CommunicationLogTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title, exportOptions: exp },
            { extend: 'csv', title, exportOptions: exp },
            { extend: 'excel', title, exportOptions: exp },
            { extend: 'pdf', title, exportOptions: exp },
            { extend: 'print', title, exportOptions: exp }
        ],
        searching: false, paging: false, info: false, ordering: false
    });
}

// ---------------- Submit / partial reload ----------------
function submitForm() {
    const sessionEl = $id('ddlFilterSessions');
    const companyEl = $id('ddlFilterCompany');
    if (sessionEl) $id('hdnSessionID').value = sessionEl.value;
    if (companyEl) $id('hdnCompanyId').value = companyEl.value;
    $id('hdnFromDate').value = $id('dtFilterFrom')?.value || '';
    $id('hdnToDate').value = $id('dtFilterTo')?.value || '';

    const params = new URLSearchParams(new FormData($id('frmSearch'))).toString();
    loadPartial(params);
}

function loadPartial(queryString) {
    const container = $id('CommunicationLogTableContainer');
    if (!container) return;
    container.style.opacity = '0.5';

    fetch(`/Communication/GetCommunicationLogPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => { if (!res.ok) throw new Error('Failed to load log'); return res.text(); })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';
            initExportTable();           // re-bind export to the new table
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// ---------------- Filters + badges ----------------
function applyFilters() {
    const setBadge = (key, label, text) => {
        if (text) appliedFilters[key] = { label, text };
        else delete appliedFilters[key];
    };
    const selText = el => el?.value ? (el.options[el.selectedIndex]?.text || el.value) : '';

    setBadge('txtSearchInput', 'Search', $id('txtSearchInput')?.value.trim());
    setBadge('dtFilterFrom', 'From', $id('dtFilterFrom')?.value);
    setBadge('dtFilterTo', 'To', $id('dtFilterTo')?.value);
    setBadge('ddlFilterSessions', 'Session', selText($id('ddlFilterSessions')));
    setBadge('ddlFilterCompany', 'Company', selText($id('ddlFilterCompany')));

    saveAppliedFilters();
    renderFilterBadges();
}

function renderFilterBadges() {
    const container = $id('badgeContainer');
    const main = $id('activeFilterBadges');
    if (!container || !main) return;

    container.innerHTML = '';
    Object.entries(appliedFilters).forEach(([id, { label, text }]) => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-primary-subtle text-primary border border-primary-subtle d-flex align-items-center gap-1 fw-medium px-2 py-1';
        const t = document.createElement('span');
        t.textContent = `${label}: ${text}`;          // textContent = no XSS from search text
        const x = document.createElement('i');
        x.className = 'ti ti-x ms-1';
        x.style.cssText = 'font-size:10px;cursor:pointer;';
        x.addEventListener('click', () => removeFilter(id));
        badge.append(t, x);
        container.appendChild(badge);
    });
    main.style.display = Object.keys(appliedFilters).length > 0 ? 'block' : 'none';
}

function resetEl(id) { const el = $id(id); if (el) el.value = ''; }

function removeFilter(filterId) {
    if (filterId === 'txtSearchInput') { resetEl('txtSearchInput'); $id('hdnSearch').value = ''; }
    else resetEl(filterId);

    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges();
    $id('hdnPageIndex').value = 1;
    submitForm();
}

function resetAllFilters() {
    ['txtSearchInput', 'dtFilterFrom', 'dtFilterTo', 'ddlFilterSessions', 'ddlFilterCompany'].forEach(resetEl);
    $id('hdnSearch').value = '';
    $id('hdnSortColumn').value = '';
    $id('hdnSortDir').value = 'DESC';
    clearAppliedFilters();
    renderFilterBadges();
    $id('hdnPageIndex').value = 1;
    submitForm();
}

// ---------------- Search (debounced) ----------------
let searchTimer = null;
$id('txtSearchInput')?.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        $id('hdnSearch').value = this.value;
        $id('hdnPageIndex').value = 1;
        applyFilters();
        submitForm();
    }, 500);
});

// ---------------- Sorting (header click) ----------------
document.addEventListener('click', function (e) {
    const th = e.target.closest('#CommunicationLogTableContainer th.sortable');
    if (!th) return;

    const col = th.dataset.sort;
    const curCol = $id('hdnSortColumn').value;
    const curDir = $id('hdnSortDir').value;
    $id('hdnSortDir').value = (curCol === col && curDir === 'ASC') ? 'DESC' : 'ASC';
    $id('hdnSortColumn').value = col;
    $id('hdnPageIndex').value = 1;
    submitForm();
});

// ---------------- Pagination ----------------
document.addEventListener('click', function (e) {
    const link = e.target.closest('#CommunicationLogTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    $id('hdnPageIndex').value = new URLSearchParams(query).get('pageNumber') || 1;
    loadPartial(query);
    history.replaceState(null, '', href);
});

// ---------------- Schedule: delete / details ----------------
document.addEventListener('click', async function (e) {
    const del = e.target.closest('.btn-delete-schedule');
    if (del) {
        if (!confirm('Delete this scheduled message?')) return;
        try {
            const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
            const res = await fetch('/Communication/DeleteSchedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'RequestVerificationToken': token,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: new URLSearchParams({ id: del.dataset.id })
            });
            const r = await res.json();
            if (r.success) { window.toast?.success(r.message || 'Deleted.'); submitForm(); }
            else window.toast?.error(r.message || 'Delete failed.');
        } catch (err) {
            console.error(err);
            window.toast?.error('Delete failed.');
        }
        return;
    }

    const view = e.target.closest('.btn-view-log');
    if (view) {
        // TODO: open details modal / navigate, e.g. /CommunicationLog/Details?id=...
        console.log('View communication', view.dataset.id);
    }
});

// ---------------- Init ----------------
document.addEventListener('DOMContentLoaded', function () {
    initExportTable();

    $id('filter-dropdown')?.addEventListener('click', e => e.stopPropagation());

    $id('btnApplyFilters')?.addEventListener('click', () => {
        $id('hdnPageIndex').value = 1;
        $id('hdnSearch').value = $id('txtSearchInput').value;
        applyFilters();
        submitForm();
    });
    $id('btnResetFilters')?.addEventListener('click', resetAllFilters);

    renderFilterBadges();
});