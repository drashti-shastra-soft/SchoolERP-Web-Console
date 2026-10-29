// ========================================================================
// Student Attendance Type Report — filters, badges, export, pagination
// ========================================================================

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#AttendanceTypeTable')) {
        const table = $('#AttendanceTypeTable').DataTable();
        table.button(index).trigger();
    }
}

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_dailyattendancereport';
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

// showdate() is wired to the Search Type <select>'s onchange. Toggles the
// From/To date row and clears the date fields whenever something other
// than "period" is chosen, so stale dates can't linger and get submitted.
function showdate(value) {
    
    const dateFromEl = document.getElementById('date_from');
    if (dateFromEl) dateFromEl.value = '';
    
}

// FIX (search finality): Class / Section / Attendance Type live OUTSIDE
// #frmSearch (they're in the filter dropdown, not the hidden form), so
// `new FormData(form)` below never picked up whatever the user currently
// had selected in those three dropdowns — it only ever re-sent whatever
// the hidden fields held from the last full page render. SearchType/
// DateFrom/DateTo already got this treatment; ClassId/SectionId/
// AttendanceType did not, so those three filters silently never reached
// the server. Now all filter dropdowns are copied into their hidden
// fields BEFORE FormData(form) is read, so every filter round-trips.
function submitForm() {

    const searchTypeEl = document.getElementById('search_type');
    const dateFromEl = document.getElementById('date_from');

    // Search type
    const searchType = searchTypeEl?.value || '';
    document.getElementById('hdnSearchType').value = searchType;

    document.getElementById('hdnDateFrom').value =
        searchType === 'period' ? dateFromEl?.value : '';

    
    // Build request
    const form = document.getElementById('frmSearch');
    const formData = new FormData(form);
    const params = new URLSearchParams(formData);

    const dateFrom = formatDateForServer(dateFromEl?.value);

    // Explicitly set date parameters
    params.set('dateFrom', dateFrom);

    

   
    loadStaffReportPartial(params.toString());
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

    const searchTypeEl = document.getElementById('search_type');
    if (searchTypeEl?.value) {
        // FIX: label was hardcoded to 'Period' regardless of which search
        // type was actually chosen (e.g. selecting "Today" showed a
        // "Period: Today" badge). Label is now static/generic; the option
        // text already carries the specific value.
        appliedFilters['search_type'] = { label: 'Search Type', text: searchTypeEl.options[searchTypeEl.selectedIndex].text };
    } else delete appliedFilters['search_type'];
    const dateFromEl = document.getElementById('date_from');
    if (dateFromEl?.value) {
        appliedFilters['date_range'] = { label: 'Dates', text: `${dateFromEl.value}` };
    } else delete appliedFilters['date_range'];

    
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
       
        date_range: () => {
            const dateFromEl = document.getElementById('date_from');
            
            if (dateFromEl) dateFromEl.value = '';
        },       
    };
    resetMap[filterId]?.();

    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

function resetSelect(id) {
    const el = document.getElementById(id);
    if (el) el.value = '';
}

function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';
    document.getElementById('hdnSearch').value = '';

    const searchTypeEl = document.getElementById('search_type');
    if (searchTypeEl) searchTypeEl.value = '';
    showdate('');


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

// FIX: DataTable init used to run once, inline, in DOMContentLoaded, against
// whatever table node happened to exist at first page load. After an AJAX
// filter/page reload (loadStaffReportPartial) swaps in a freshly-rendered
// <table id="AttendanceTypeTable">, that old node — and the DataTables
// instance built on it — is gone, but nothing ever re-initialized the new
// one. Pulled into its own function so it can be called both on first load
// and after every partial reload.
//
// Also guards against the classic "Cannot set properties of undefined
// (setting '_DT_CellIndex')" crash: that happens when a <tbody> row has
// fewer <td>s than there are <th>s in <thead> — most commonly an empty-
// state row like <tr><td colspan="9">No records found</td></tr> that's
// missing DataTables' required class="dataTables_empty" marker (which is
// what tells DataTables to skip column-count validation on that row). If a
// mismatch is detected, this skips DataTable() entirely (leaving a plain,
// unstyled-but-functional table) instead of throwing and aborting every
// other event handler this script still needs to register below.
function initAttendanceTypeTable() {
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

    initAttendanceTypeTable();

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

    // Keep the From/To row in sync with whatever SearchType the server
    // actually rendered as selected (e.g. deep link / postback with
    // SearchType=period).
    const initialSearchType = document.getElementById('search_type')?.value || '';
    showdate(initialSearchType);

    renderFilterBadges();



    
});

// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadStaffReportPartial(queryString) {
    const container = document.getElementById('StaffReportTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/AttendanceReport/GetStudentAttendanceDailyPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load report');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';
            // FIX: re-init the DataTable against the freshly-rendered table
            // node — see initAttendanceTypeTable() for why this was missing.
            initAttendanceTypeTable();
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
    loadStaffReportPartial(query);
    history.replaceState(null, '', href);
});


function resetSectionDropdown() {
    const sectionEl = document.getElementById('filter_section_id');
    if (!sectionEl) return;
    sectionEl.innerHTML = '<option value="">-- Select Class First --</option>';
    sectionEl.disabled = false;
}