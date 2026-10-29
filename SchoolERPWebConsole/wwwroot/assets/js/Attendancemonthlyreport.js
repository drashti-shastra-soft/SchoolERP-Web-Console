// ========================================================================
// Attendance Monthly Report — filters, badges, export, pagination
// ========================================================================

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#AttendanceMonthlyTable')) {
        const table = $('#AttendanceMonthlyTable').DataTable();
        table.button(index).trigger();
    }
}

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_attendanceMonthlyReport';
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

function submitForm() {
    const classEl = document.getElementById('filter_class_id');
    const sectionEl = document.getElementById('filter_section_id');
    const monthEl = document.getElementById('filter_month');
    const yearEl = document.getElementById('filter_year');

    document.getElementById('hdnClassId').value = classEl?.value || '';
    document.getElementById('hdnSectionId').value = sectionEl?.value || '';
    document.getElementById('hdnMonth').value = monthEl?.value || '';
    document.getElementById('hdnYear').value = yearEl?.value || '';

    const form = document.getElementById('frmSearch');
    const formData = new FormData(form);
    const params = new URLSearchParams(formData);

    console.log("Request:", params.toString());

    loadAttendanceReportPartial(params.toString());
}

function applyFilters() {
    const searchEl = document.getElementById('txtSearchInput');
    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    const classEl = document.getElementById('filter_class_id');
    if (classEl?.value) appliedFilters['filter_class_id'] = { label: 'Class', text: getSelectText(classEl) };
    else delete appliedFilters['filter_class_id'];

    const sectionEl = document.getElementById('filter_section_id');
    if (sectionEl?.value) appliedFilters['filter_section_id'] = { label: 'Section', text: getSelectText(sectionEl) };
    else delete appliedFilters['filter_section_id'];

    const monthEl = document.getElementById('filter_month');
    const yearEl = document.getElementById('filter_year');
    if (monthEl?.value && yearEl?.value) {
        appliedFilters['period'] = { label: 'Period', text: `${getSelectText(monthEl)} ${yearEl.value}` };
    } else {
        delete appliedFilters['period'];
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
        filter_class_id: () => { const el = document.getElementById('filter_class_id'); if (el) el.value = ''; },
        filter_section_id: () => { const el = document.getElementById('filter_section_id'); if (el) el.value = ''; },
        txtSearchInput: () => {
            const el = document.getElementById('txtSearchInput');
            if (el) el.value = '';
            document.getElementById('hdnSearch').value = '';
        }
        // Note: "period" (Month/Year) is intentionally not resettable here —
        // the report always needs a month/year, so Reset (below) restores the
        // current month/year rather than clearing it.
    };
    resetMap[filterId]?.();

    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';
    document.getElementById('hdnSearch').value = '';

    const classEl = document.getElementById('filter_class_id');
    if (classEl) classEl.value = '';
    const sectionEl = document.getElementById('filter_section_id');
    if (sectionEl) sectionEl.value = '';

    const today = new Date();
    const monthEl = document.getElementById('filter_month');
    if (monthEl) monthEl.value = String(today.getMonth() + 1);
    const yearEl = document.getElementById('filter_year');
    if (yearEl) yearEl.value = String(today.getFullYear());

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
// DataTable init — destroys any existing instance first (dynamic day
// columns mean the column count can differ between calls) and is called
// both on first page load AND after every AJAX partial reload below.
// ========================================
function initAttendanceDataTable() {
    var companyname = localStorage.getItem("comName");

    // Fully tear down any previous instance before rebuilding. Column count
    // changes month-to-month (28 vs 31 days), so reusing a stale instance's
    // cached column mapping against a table with a different cell count is
    // exactly what produces "Cannot set properties of undefined
    // (setting '_DT_CellIndex')".
    if ($.fn.DataTable.isDataTable('#AttendanceMonthlyTable')) {
        $('#AttendanceMonthlyTable').DataTable().destroy();
    }

    // When there are zero matching students, the table body renders a
    // single "No records found" <td colspan="..."> row instead of one <td>
    // per header column. DataTables maps <td> to columns by position from
    // the raw markup on init, and a hand-authored colspan row (as opposed to
    // its own auto-generated "no data" row) isn't reliably special-cased —
    // it tries to index a cell that doesn't exist and throws exactly the
    // _DT_CellIndex error being seen. Skip DataTable-ifying an empty table;
    // there's nothing to sort/export/print anyway, so a plain table is fine.
    const table = document.getElementById('AttendanceMonthlyTable');
    const rowCount = Number(table?.dataset.rowCount ?? 0);
    if (!table || rowCount === 0) {
        window.exportTable = null;
        return;
    }

    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#AttendanceMonthlyTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Attendance Report - ${companyname}` },
            { extend: 'csv', title: `Attendance Report - ${companyname}` },
            { extend: 'excel', title: `Attendance Report - ${companyname}` },
            { extend: 'pdf', title: `Attendance Report - ${companyname}`, orientation: 'landscape' },
            { extend: 'print', title: `Attendance Report - ${companyname}` }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false,
        scrollX: true
    });
}

document.addEventListener('DOMContentLoaded', function () {

    initAttendanceDataTable();

    document.getElementById('filter-dropdown')?.addEventListener('click', e => e.stopPropagation());

    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        document.getElementById('hdnPageIndex').value = 1;
        document.getElementById('hdnSearch').value = document.getElementById('txtSearchInput').value;
        applyFilters();
        submitForm();
    });

    // FIX: this block auto-submitted the report the instant Class, Section,
    // Month, or Year changed — bypassing the Apply button entirely and
    // firing a server round-trip (and a full DataTable rebuild) per click,
    // before the user was done choosing filters. The grid should only
    // reload on Apply, on the debounced search box, on pagination, and on
    // Reset. Removed:
    //
    //   ['filter_class_id', 'filter_section_id', 'filter_month', 'filter_year'].forEach(id => {
    //       document.getElementById(id)?.addEventListener('change', () => {
    //           document.getElementById('hdnPageIndex').value = 1;
    //           applyFilters();
    //           submitForm();
    //       });
    //   });
    //
    // The Class -> Section cascade listener below is intentionally kept —
    // it only repopulates the Section <select>'s options; it does not call
    // submitForm(), so it doesn't reload the grid.

    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        resetAllFilters();
    });

    // Class -> Section cascade wiring
    document.getElementById('filter_class_id')?.addEventListener('change', function () {
        loadSectionsByClass(this.value, 0);
    });

    // If a class filter is already applied on load (postback / deep link), load its sections
    const preselectedClassId = document.getElementById('filter_class_id')?.value;
    if (preselectedClassId) {
        const preselectedSectionId = document.getElementById('hdnSectionId')?.value || 0;
        loadSectionsByClass(preselectedClassId, preselectedSectionId);
    }

    renderFilterBadges();
});

// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadAttendanceReportPartial(queryString) {
    const container = document.getElementById('AttendanceReportTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/AttendanceReport/GetAttendanceMonthlyReportPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load attendance report');
            return res.text();
        })
        .then(html => {
            // Uses $(...).html() rather than innerHTML so jQuery's cleanData
            // runs on the removed <table> first, clearing any stale entry in
            // DataTables' global settings registry for
            // '#AttendanceMonthlyTable' before the new table (with a
            // possibly different day-column count) is inserted.
            $(container).html(html);

            // The day-column count can differ from the previous render
            // (28 vs 31 days), so the DataTable must be fully rebuilt here —
            // it is not automatically re-initialized just because new markup
            // was inserted.
            initAttendanceDataTable();

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
    const link = e.target.closest('#AttendanceReportTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('pageNumber') || 1;
    loadAttendanceReportPartial(query);
    history.replaceState(null, '', href);
});

// ========================================
// Class -> Section cascade
// ========================================
function resetSectionDropdown() {
    const sectionEl = document.getElementById('filter_section_id');
    if (!sectionEl) return;
    sectionEl.innerHTML = '<option value="">All Sections</option>';
    sectionEl.disabled = false;
}

async function loadSectionsByClass(classId, preselectSectionId) {
    const sectionEl = document.getElementById('filter_section_id');
    if (!sectionEl) return;

    if (!classId) {
        resetSectionDropdown();
        return;
    }

    sectionEl.disabled = true;
    sectionEl.innerHTML = '<option value="">Loading...</option>';

    try {
        const res = await fetch(`/StudentInformation/GetSections?classId=${classId}`, {
            method: 'GET',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (!res.ok) {
            console.error(`GetSections failed: HTTP ${res.status} for classId=${classId}. ` +
                `Check that this route actually exists / matches your controller.`);
            sectionEl.innerHTML = '<option value="">All Sections</option>';
            sectionEl.disabled = false;
            return;
        }

        const result = await res.json();

        const list = Array.isArray(result) ? result
            : Array.isArray(result?.data) ? result.data
                : [];

        if (list.length === 0) {
            console.warn('GetSections returned no usable array. Raw response:', result);
        }

        sectionEl.innerHTML = '<option value="">All Sections</option>';
        list.forEach(s => {
            const id = s.id ?? s.Id ?? s.ID;
            const name = s.name ?? s.Name ?? s.NAME;

            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = name;
            if (preselectSectionId && String(preselectSectionId) === String(id)) {
                opt.selected = true;
            }
            sectionEl.appendChild(opt);
        });

        sectionEl.disabled = false;
    } catch (err) {
        console.error('Failed to load sections for class:', err);
        sectionEl.innerHTML = '<option value="">All Sections</option>';
        sectionEl.disabled = false;
    }
}