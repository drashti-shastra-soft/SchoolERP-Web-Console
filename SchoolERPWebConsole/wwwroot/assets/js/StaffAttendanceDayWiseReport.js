// ========================================================================
// Staff Day Wise Attendance Report — filters, badges, export, pagination
// Rewritten to match Reports/StaffReport/Index.cshtml exactly:
//   container:      #StaffReportTableContainer
//   search input:   #txtSearchInput -> hidden #hdnSearch (name="searchTerm")
//   filter form:    #frmSearch (submitted via FormData, not hand-built params)
//   apply button:   #btnApplyFilters
//   reset buttons:  #btnResetFilters, #btnResetAllFilters
//   endpoint:       /AttendanceReport/GetStaffAttendanceDayWisePartial
// ========================================================================

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#DailyAttendanceTable')) {
        const table = $('#DailyAttendanceTable').DataTable();
        table.button(index).trigger();
    }
}

function getTodayIso() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_staffDayWiseReport';
let appliedFilters = {};
try {
    const stored = sessionStorage.getItem(FILTER_KEY);
    if (stored) appliedFilters = JSON.parse(stored);
} catch (e) { appliedFilters = {}; }

function saveAppliedFilters() {
    try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(appliedFilters)); }
    catch (e) { console.warn('sessionStorage unavailable'); }
}

function clearAppliedFilters() {
    appliedFilters = {};
    try { sessionStorage.removeItem(FILTER_KEY); } catch (e) { }
}

function getSelectText(selectEl) {
    return selectEl && selectEl.selectedIndex >= 0 ? selectEl.options[selectEl.selectedIndex].text : '';
}

// ========================================
// Submit — syncs visible controls into the hidden #frmSearch fields,
// then posts the WHOLE form via FormData so param names always match
// whatever fields actually exist in the markup.
// ========================================
function submitForm() {
    const roleEl = document.getElementById('filter_role_id');
    const sourceEl = document.getElementById('filter_source');
    const dateEl = document.getElementById('filter_date');

    document.getElementById('hdnRoleId').value = roleEl?.value || '';
    document.getElementById('hdnAttendanceType').value = sourceEl?.value || '';
    document.getElementById('hdnDateFrom').value = dateEl?.value || '';

    const form = document.getElementById('frmSearch');
    //const formData = new FormData(form);
    //const params = new URLSearchParams(formData);

    const formData = new FormData(form);
    const params = new URLSearchParams(formData);

    const dateFrom = formatDateForServer(dateEl?.value);

    // Explicitly set date parameters
    params.set('dateFrom', dateFrom);

    loadReportPartial(params.toString());
}
function formatDateForServer(value) {
    if (!value) return '';

    const parts = value.split('-');

    // UI format: dd-MM-yyyy
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    return value;
}
function applyFilters() {
    const searchEl = document.getElementById('txtSearchInput');
    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    const roleEl = document.getElementById('filter_role_id');
    if (roleEl?.value) appliedFilters['filter_role_id'] = { label: 'Role', text: getSelectText(roleEl) };
    else delete appliedFilters['filter_role_id'];

    const sourceEl = document.getElementById('filter_source');
    if (sourceEl?.value) appliedFilters['filter_source'] = { label: 'Source', text: getSelectText(sourceEl) };
    else delete appliedFilters['filter_source'];

    const dateEl = document.getElementById('filter_date');
    if (dateEl?.value) appliedFilters['filter_date'] = { label: 'Date', text: dateEl.value };
    else delete appliedFilters['filter_date'];

    saveAppliedFilters();
    renderFilterBadges();
}

function renderFilterBadges() {
    const container = document.getElementById('badgeContainer');
    const mainContainer = document.getElementById('activeFilterBadges');
    if (!container || !mainContainer) return;

    container.innerHTML = '';
    const activeCount = Object.keys(appliedFilters).length;

    Object.entries(appliedFilters).forEach(([id, { label, text }]) => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-primary-subtle text-primary border border-primary-subtle d-flex align-items-center gap-1 fw-medium px-2 py-1';
        badge.innerHTML = `${label}: ${text} <i class="ti ti-x ms-1 cursor-pointer" onclick="removeFilter('${id}')" style="font-size:10px;"></i>`;
        container.appendChild(badge);
    });

    mainContainer.style.display = activeCount > 0 ? 'block' : 'none';
}

function removeFilter(filterId) {
    const resetMap = {
        filter_role_id: () => { const el = document.getElementById('filter_role_id'); if (el) el.value = ''; },
        filter_source: () => { const el = document.getElementById('filter_source'); if (el) el.value = ''; },
        filter_date: () => { const el = document.getElementById('filter_date'); if (el) el.value = ''; },
        txtSearchInput: () => {
            const el = document.getElementById('txtSearchInput');
            if (el) el.value = '';
            document.getElementById('hdnSearch').value = '';
        }
    };
    resetMap[filterId]?.();

    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

// resetAllFilters() — referenced by both #btnResetFilters (in the filter
// dropdown) and #btnResetAllFilters (the "Clear All" badge button). This
// was missing entirely before, causing a ReferenceError on click.
function resetAllFilters() {
    const searchEl = document.getElementById('txtSearchInput');
    if (searchEl) searchEl.value = '';
    const hdnSearchEl = document.getElementById('hdnSearch');
    if (hdnSearchEl) hdnSearchEl.value = '';

    const roleEl = document.getElementById('filter_role_id');
    if (roleEl) roleEl.value = '';

    const sourceEl = document.getElementById('filter_source');
    if (sourceEl) sourceEl.value = '';

    const dateEl = document.getElementById('filter_date');
    if (dateEl) dateEl.value = getTodayIso();

    clearAppliedFilters();
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

// ========================================
// Search input — debounced server submit
// ========================================
let searchTimer = null;
document.getElementById('txtSearchInput')?.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        document.getElementById('hdnSearch').value = this.value;
        document.getElementById('hdnPageIndex').value = 1;

        const val = this.value.trim();
        if (val) appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        else delete appliedFilters['txtSearchInput'];
        saveAppliedFilters();
        renderFilterBadges();
        submitForm();
    }, 500);
});

// ========================================
// DataTable init — destroys any existing instance first
// ========================================
function initDailyAttendanceDataTable() {
    const table = document.getElementById('AttendanceTypeTable');
    if (!table) return;

    if ($.fn.DataTable.isDataTable('#AttendanceTypeTable')) {
        $('#AttendanceTypeTable').DataTable().destroy();
    }

    const headerCellCount = table.querySelectorAll('thead tr:first-child th, thead tr:first-child td').length;

    const hasEmptyRow = table.querySelector('tbody tr .dataTables_empty') !== null;
    const badRow = Array.from(table.querySelectorAll('tbody tr')).find(row =>
        row.cells.length !== headerCellCount
    );

    // No data at all, or a malformed row of any kind → don't init DataTables.
    // Leave the plain server-rendered table (with its "No records found" row)
    // as-is; export buttons just won't be available on an empty result set.
    if (headerCellCount === 0 || hasEmptyRow || badRow) {
        return;
    }

    var companyname = localStorage.getItem("comName");
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#AttendanceTypeTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Student Attendance Type Report - ${companyname}` },
            { extend: 'csv', title: `Student Attendance Type Report - ${companyname}` },
            { extend: 'excel', title: `Student Attendance Type Report - ${companyname}` },
            { extend: 'pdf', title: `Student Attendance Type Report - ${companyname}` },
            { extend: 'print', title: `Student Attendance Type Report - ${companyname}` }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const dateEl = document.getElementById('filter_date');
    if (dateEl && !dateEl.value) dateEl.value = getTodayIso();

    initDailyAttendanceDataTable();

    document.getElementById('filter-dropdown')?.addEventListener('click', e => e.stopPropagation());

    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        document.getElementById('hdnPageIndex').value = 1;
        document.getElementById('hdnSearch').value = document.getElementById('txtSearchInput').value;
        applyFilters();
        submitForm();
    });

    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        resetAllFilters();
    });

    renderFilterBadges();
});

// ========================================
// Partial reload — matches the real container id (#StaffReportTableContainer)
// and endpoint (/AttendanceReport/GetStaffAttendanceDayWisePartial)
// ========================================
function loadReportPartial(queryString) {
    const container = document.getElementById('StaffReportTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/AttendanceReport/GetStaffAttendanceDayWisePartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load daily attendance report');
            return res.text();
        })
        .then(html => {
            // GUARD: if the endpoint ever regresses to returning the full
            // page (e.g. wrong action wired up, or a 404/error page served
            // instead of the partial), the response will contain a
            // doctype/html/head or the page layout's nav markup. Injecting
            // that here is what produced the nested "Loading... / Loading..."
            // + doubled toolbar UI seen previously. Fail loudly instead of
            // silently re-rendering the whole page inside itself.
            const looksLikeFullPage = /<!DOCTYPE html>|<html[\s>]|<head[\s>]/i.test(html);
            if (looksLikeFullPage) {
                console.error('GetStaffAttendanceDayWisePartial returned a full page instead of a partial view. Check that the controller action returns PartialView(...), not View(...).');
                container.style.opacity = '1';
                if (window.toast) window.toast.error('Could not refresh the list (unexpected server response).');
                return;
            }

            $(container).html(html);
            initDailyAttendanceDataTable();
            container.style.opacity = '1';
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// Pagination click interception, scoped to this container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#StaffReportTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('pageNumber') || 1;
    loadReportPartial(query);
    history.replaceState(null, '', href);
});