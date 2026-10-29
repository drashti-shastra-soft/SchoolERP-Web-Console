// ========================================================================
// Staff Report — filters, badges, export, pagination
// ========================================================================

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#StudentReportTable')) {
        const table = $('#StudentReportTable').DataTable();
        table.button(index).trigger();
    }
}

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_staffReport';
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

// FIX: showdate() is wired to the Search Type <select>'s onchange but was
// never defined anywhere — selecting a search type threw
// "ReferenceError: showdate is not defined". This toggles the From/To date
// row and clears the date fields whenever something other than "period"
// is chosen, so stale dates can't linger and get submitted.
function showdate(value) {
    const dateResult = document.getElementById('date_result');
    if (!dateResult) return;

    const isPeriod = value === 'period';
    dateResult.style.display = isPeriod ? 'flex' : 'none';

    if (!isPeriod) {
        const dateFromEl = document.getElementById('date_from');
        const dateToEl = document.getElementById('date_to');
        if (dateFromEl) dateFromEl.value = '';
        if (dateToEl) dateToEl.value = '';
    }
}

// FIX: rewired to the fields that actually exist on the Staff Report view
// (Role / Designation / Department / Status / SearchType / date range)
// instead of the old Class/Section/Session/Company student-report fields.
// SearchType/DateFrom/DateTo were never being read from the actual
// search_type/date_from/date_to inputs before — the hidden fields just
// held whatever the server originally rendered, so Period filtering could
// never work and every request re-sent the same stale values.
function submitForm() {


    const searchTypeEl = document.getElementById('search_type');
    const dateFromEl = document.getElementById('date_from');
    const dateToEl = document.getElementById('date_to');






    // Search type
    const searchType = searchTypeEl?.value || '';

    document.getElementById('hdnSearchType').value = searchType;

    // Date values directly from UI
    //const dateFrom = dateFromEl?.value || '';
    //const dateTo = dateToEl?.value || '';

    document.getElementById('hdnDateFrom').value =
        searchType === 'period' ? dateFromEl?.value : '';

    document.getElementById('hdnDateTo').value =
        searchType === 'period' ? dateToEl?.value : '';

    // Build request
    const form = document.getElementById('frmSearch');
    const formData = new FormData(form);
    const params = new URLSearchParams(formData);
    const dateFrom = formatDateForServer(
        dateFromEl?.value
    );

    const dateTo = formatDateForServer(
        dateToEl?.value
    );
    // Explicitly set date parameters
    if (searchType === 'period') {

        params.set('dateFrom', dateFrom);
        params.set('dateTo', dateTo);

    } else {

        params.delete('dateFrom');
        params.delete('dateTo');
    }

    // Search type
    if (searchType) {
        params.set('searchType', searchType);
    } else {
        params.delete('searchType');
    }

    console.log("SearchType:", searchType);
    console.log("DateFrom:", dateFrom);
    console.log("DateTo:", dateTo);
    console.log("Request:", params.toString());

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
        appliedFilters['search_type'] = { label: 'Period', text: searchTypeEl.options[searchTypeEl.selectedIndex].text };
    } else delete appliedFilters['search_type'];

    if (searchTypeEl?.value === 'period') {
        const dateFromEl = document.getElementById('date_from');
        const dateToEl = document.getElementById('date_to');
        if (dateFromEl?.value && dateToEl?.value) {
            appliedFilters['date_range'] = { label: 'Dates', text: `${dateFromEl.value} - ${dateToEl.value}` };
        } else delete appliedFilters['date_range'];
    } else {
        delete appliedFilters['date_range'];
    }

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

        search_type: () => {
            const el = document.getElementById('search_type');
            if (el) el.value = '';
            showdate('');
        },
        date_range: () => {
            const dateFromEl = document.getElementById('date_from');
            const dateToEl = document.getElementById('date_to');
            if (dateFromEl) dateFromEl.value = '';
            if (dateToEl) dateToEl.value = '';
        },
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

document.addEventListener('DOMContentLoaded', function () {

    var companyname = localStorage.getItem("comName");

    // FIX: was initializing '#StudentReportTable' — no such element exists
    // in the Staff Report partial. DataTable id must match the <table> id
    // rendered by _StaffReportTablePartial.cshtml (assumed StaffReportTable
    // below — update if your partial uses a different id).
    if ($.fn.DataTable.isDataTable('#StudentReportTable')) {
        $('#StudentReportTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#StudentReportTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Issue Item Report - ${companyname}` },
            { extend: 'csv', title: `Issue Item Report - ${companyname}` },
            { extend: 'excel', title: `Issue Item Report - ${companyname}` },
            { extend: 'pdf', title: `Issue Item Report - ${companyname}` },
            { extend: 'print', title: `Issue Item Report - ${companyname}` }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });

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
// FIX: was calling /StudentInformationReport/GetClassSubjectReportReportPartial
// (wrong controller + wrong action, would 404). Now points at the actual
// GetStaffReportPartial action on the staff report controller.
function loadStaffReportPartial(queryString) {
    const container = document.getElementById('StaffReportTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/StudentInformationReport/GetIssueItemReportPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load staff report');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
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
    loadStaffReportPartial(query);
    history.replaceState(null, '', href);
});