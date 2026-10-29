function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#resultsTable')) {
        const table = $('#resultsTable').DataTable();
        table.button(index).trigger();
    }
}

$('#txtName').on('input', function () {
    this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
});

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_accountEntry';
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

// ========================================
// Submit / AJAX partial reload
// FIX: form id now matches the view ("searchForm", not "frmSearch")
// ========================================
function submitForm() {
    const form = document.getElementById('searchForm');
    if (!form) return;

    renderFilterBadges();

    const params = new URLSearchParams(new FormData(form));

    // ── Explicitly read Company / Session by id ─────────────────
    // FIX: don't rely on _CompanySessionFilter's <select> name attributes
    // matching what the controller expects — read by id and set the
    // querystring keys to match GetSearchEntryPartial's parameter names
    // exactly (companyId, sessionID).
    const companyEl = document.getElementById('ddlFilterCompany');
    const sessionEl = document.getElementById('ddlFilterSessions');

    if (companyEl && companyEl.value) {
        params.set('companyId', companyEl.value);
    } else {
        params.delete('companyId');
    }

    if (sessionEl && sessionEl.value) {
        params.set('sessionID', sessionEl.value);
    } else {
        params.delete('sessionID');
    }

    loadSearchEntryPartial(params.toString());
}

function applyFilters() {
    // ── Search text ──────────────────────────────────────────────
    const searchEl = document.getElementById('txtSearchInput');
    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    // ── Search type ──────────────────────────────────────────────
    const searchTypeEl = document.getElementById('search_type');
    if (searchTypeEl && searchTypeEl.value) {
        const label = searchTypeEl.options[searchTypeEl.selectedIndex].text;
        appliedFilters['search_type'] = { label: 'Type', text: label };
    } else {
        delete appliedFilters['search_type'];
    }

    // ── Date range (only meaningful when SearchType === 'period') ──
    const dateFromEl = document.getElementById('date_from');
    const dateToEl = document.getElementById('date_to');

    if (searchTypeEl?.value === 'period' && dateFromEl?.value) {
        appliedFilters['date_from'] = { label: 'From', text: dateFromEl.value };
    } else {
        delete appliedFilters['date_from'];
    }

    if (searchTypeEl?.value === 'period' && dateToEl?.value) {
        appliedFilters['date_to'] = { label: 'To', text: dateToEl.value };
    } else {
        delete appliedFilters['date_to'];
    }

    // ── Company / Session ────────────────────────────────────────
    // NOTE: adjust these selectors to match whatever id/name
    // _CompanySessionFilter actually renders for the two dropdowns.
    // Company
    const companyEl = document.getElementById('ddlFilterCompany');
    if (companyEl?.value && companyEl.value !== '') {
        appliedFilters['ddlFilterCompany'] = {
            label: 'Company',
            text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value
        };
    } else delete appliedFilters['ddlFilterCompany'];

    // Section
    const sectionEl = document.getElementById('ddlFilterSessions');
    if (sectionEl?.value && sectionEl.value !== '') {
        appliedFilters['ddlFilterSection'] = {
            label: 'Section',
            text: sectionEl.options[sectionEl.selectedIndex]?.text || sectionEl.value
        };
    } else delete appliedFilters['ddlFilterSection'];

    saveAppliedFilters();
    renderFilterBadges();
}

function removeFilter(filterId) {
    switch (filterId) {
        case 'txtSearchInput': {
            const el = document.getElementById('txtSearchInput');
            if (el) el.value = '';
            const hdn = document.getElementById('hdnSearch');
            if (hdn) hdn.value = '';
            break;
        }
        case 'search_type': {
            const el = document.getElementById('search_type');
            if (el) { el.value = ''; showdate(''); }
            // falls through intentionally: clearing type also clears any period dates
        }
        case 'date_from': {
            const el = document.getElementById('date_from');
            if (el) el.value = '';
            delete appliedFilters['date_from'];
            break;
        }
        case 'date_to': {
            const el = document.getElementById('date_to');
            if (el) el.value = '';
            delete appliedFilters['date_to'];
            break;
        }
        case 'CompanyId': {
            const el = document.querySelector('[name="CompanyId"]');
            if (el) el.value = '';
            break;
        }
        case 'SessionId': {
            const el = document.querySelector('[name="SessionId"]');
            if (el) el.value = '';
            break;
        }
    }

    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges();

    const pageIndexEl = document.getElementById('hdnPageIndex');
    if (pageIndexEl) pageIndexEl.value = 1;

    submitForm();
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
function resetAllFilters() {
    // ── Search text ──────────────────────────────────────────────
    const searchEl = document.getElementById('txtSearchInput');
    if (searchEl) searchEl.value = '';
    const hdnSearch = document.getElementById('hdnSearch');
    if (hdnSearch) hdnSearch.value = '';

    // ── Search type + dates ──────────────────────────────────────
    const searchTypeEl = document.getElementById('search_type');
    if (searchTypeEl) searchTypeEl.value = '';
    showdate(''); // hides #date_result again

    const dateFromEl = document.getElementById('date_from');
    if (dateFromEl) dateFromEl.value = '';

    const dateToEl = document.getElementById('date_to');
    if (dateToEl) dateToEl.value = '';

    // ── Company / Session ────────────────────────────────────────
    // NOTE: match selectors to whatever _CompanySessionFilter actually renders
    const companyEl = document.getElementById('ddlFilterCompany');
    if (companyEl) companyEl.value = '';

    const sessionEl = document.getElementById('ddlFilterSessions');
    if (sessionEl) sessionEl.value = '';
    // ── Wipe stored filters + badges ─────────────────────────────
    clearAppliedFilters();
    renderFilterBadges();

    // ── Reset paging and reload ──────────────────────────────────
    const pageIndexEl = document.getElementById('hdnPageIndex');
    if (pageIndexEl) pageIndexEl.value = 1;

    submitForm();
}
// ========================================
// DOMContentLoaded — init DataTable + UI
// ========================================
document.addEventListener('DOMContentLoaded', () => {

    // ── Apply Filters ─────────────────────────────────────────────────
    // FIX: this is now the ONLY handler for the Filter button — the inline
    // $('#searchForm').submit() was removed from the view so it no longer
    // races this AJAX call with a full page navigation.
    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        const pageIndexEl = document.getElementById('hdnPageIndex');
        const hdnSearch = document.getElementById('hdnSearch');
        const searchEl = document.getElementById('txtSearchInput');

        if (pageIndexEl) pageIndexEl.value = 1;
        if (hdnSearch && searchEl) hdnSearch.value = searchEl.value;

        applyFilters();
        renderFilterBadges();
        submitForm();
    });

    // ── Reset Filters (only wired if a reset button exists on the page) ─
    document.getElementById('btnResetFilters')?.addEventListener('click', resetAllFilters);

   
});

// ========================================
// Search input — debounced server submit
// FIX: removed the conflicting client-side keyup row filter that used to
// live further down this file — the server already filters and reloads
// the table via AJAX, so a local text filter on top of that just hid
// freshly-loaded rows unpredictably.
// ========================================
let searchTimer = null;

document.getElementById('txtSearchInput')?.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        const hdnSearch = document.getElementById('hdnSearch');
        const pageIndexEl = document.getElementById('hdnPageIndex');
        if (hdnSearch) hdnSearch.value = this.value;
        if (pageIndexEl) pageIndexEl.value = 1;

        const val = this.value.trim();
        if (val) appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        else delete appliedFilters['txtSearchInput'];
        saveAppliedFilters();
        renderFilterBadges();
        submitForm();
    }, 500);
});

// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// FIX: correct endpoint for this page, and rebuilds the correct table id
// (#resultsTable, not the leftover #tblPostalDispatch from another page).
// ========================================
function loadSearchEntryPartial(queryString) {
    const container = document.getElementById('searchEntryTableContainer');
    if (!container) return;
    var companyname = localStorage.getItem("comName");
    container.style.opacity = '0.5';

    fetch(`/Expense/GetSearchEntryPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load account entries');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';

            if ($.fn.DataTable.isDataTable('#resultsTable')) {
                $('#resultsTable').DataTable().destroy();
            }
            $('#resultsTable').DataTable({
                dom: 'Bfrtip',
                buttons: [
                    { extend: 'copy', title: `Search Expense - ${companyname}`, exportOptions: { columns: [0, 1, 2, 3, 4] } },
                    { extend: 'csv', title: `Search Expense - ${companyname}`, exportOptions: { columns: [0, 1, 2, 3, 4] } },
                    { extend: 'excel', title: `Search Expense - ${companyname}`, exportOptions: { columns: [0, 1, 2, 3, 4] } },
                    { extend: 'pdf', title: `Search Expense - ${companyname}`, exportOptions: { columns: [0, 1, 2, 3, 4] } },
                    { extend: 'print', title: `Search Expense - ${companyname}`, exportOptions: { columns: [0, 1, 2, 3, 4] } }
                ],
                searching: false,
                paging: false,
                info: false,
                language: {
                    emptyTable: "No records found."
                }
            });
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// ✅ Pagination click interception, scoped to the search results container
// FIX: null-checks hdnPageIndex before setting .value — this used to throw
// if the element didn't exist, silently breaking pagination.
document.addEventListener('click', function (e) {
    const link = e.target.closest('#searchEntryTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    const pageIndexEl = document.getElementById('hdnPageIndex');
    if (pageIndexEl) pageIndexEl.value = new URLSearchParams(query).get('PageIndex') || 1;

    loadSearchEntryPartial(query);
    history.replaceState(null, '', href);
});

// ========================================
// Initial DataTable init (server-rendered rows on first page load)
// ========================================
$(document).ready(function () {
    $('#resultsTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', exportOptions: { columns: [0, 1, 2, 3, 4] } },
            { extend: 'csv', exportOptions: { columns: [0, 1, 2, 3, 4] } },
            { extend: 'excel', exportOptions: { columns: [0, 1, 2, 3, 4] } },
            { extend: 'pdf', exportOptions: { columns: [0, 1, 2, 3, 4] } },
            { extend: 'print', exportOptions: { columns: [0, 1, 2, 3, 4] } }
        ],
        searching: false,
        paging: false,
        info: false,
        language: {
            emptyTable: "No records found."
        }
    });
});

function showdate(val) {
    if (val === 'period') {
        $('#date_result').css('display', 'flex');
    } else {
        $('#date_result').hide();
    }
}

$(document).ready(function () {
    setTimeout(function () {
        if (typeof $.fn.datetimepicker === 'function') {
            $('.datetimepicker').datetimepicker({
                format: 'DD-MM-YYYY',
                icons: {
                    up: "fas fa-angle-up",
                    down: "fas fa-angle-down",
                    next: 'fas fa-angle-right',
                    previous: 'fas fa-angle-left'
                }
            });
        }
    }, 200);
});