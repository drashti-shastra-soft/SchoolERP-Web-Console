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
const FILTER_KEY = 'appliedFilters_attandancetypeeport';
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
    const dateToEl = document.getElementById('date_to');
    const classEl = document.getElementById('filter_class_id');
    const sectionEl = document.getElementById('filter_section_id');
    const attendanceTypeEl = document.getElementById('filter_attendance_type');

    // Search type
    const searchType = searchTypeEl?.value || '';
    document.getElementById('hdnSearchType').value = searchType;

    document.getElementById('hdnDateFrom').value =
        searchType === 'period' ? dateFromEl?.value : '';

    document.getElementById('hdnDateTo').value =
        searchType === 'period' ? dateToEl?.value : '';

    // Class / Section / Attendance Type — copy current dropdown values into
    // the hidden fields that actually live inside #frmSearch.
    document.getElementById('hdnClassId').value = classEl?.value || '';
    document.getElementById('hdnSectionId').value = sectionEl?.value || '';
    document.getElementById('hdnAttendanceType').value = attendanceTypeEl?.value || '';

    // Build request
    const form = document.getElementById('frmSearch');
    const formData = new FormData(form);
    const params = new URLSearchParams(formData);

    const dateFrom = formatDateForServer(dateFromEl?.value);
    const dateTo = formatDateForServer(dateToEl?.value);

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

    // Class / Section / Attendance Type
    if (classEl?.value) params.set('classId', classEl.value); else params.delete('classId');
    if (sectionEl?.value) params.set('sectionId', sectionEl.value); else params.delete('sectionId');
    if (attendanceTypeEl?.value) params.set('attendanceType', attendanceTypeEl.value); else params.delete('attendanceType');

    console.log("SearchType:", searchType);
    console.log("DateFrom:", dateFrom);
    console.log("DateTo:", dateTo);
    console.log("ClassId:", classEl?.value);
    console.log("SectionId:", sectionEl?.value);
    console.log("AttendanceType:", attendanceTypeEl?.value);
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
        // FIX: label was hardcoded to 'Period' regardless of which search
        // type was actually chosen (e.g. selecting "Today" showed a
        // "Period: Today" badge). Label is now static/generic; the option
        // text already carries the specific value.
        appliedFilters['search_type'] = { label: 'Search Type', text: searchTypeEl.options[searchTypeEl.selectedIndex].text };
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

    // FIX (search finality): Class/Section/Attendance Type were never
    // tracked as applied filters at all, so they never showed up as
    // badges and had no "x" reset wiring in removeFilter().
    const classEl = document.getElementById('filter_class_id');
    if (classEl?.value) {
        appliedFilters['filter_class_id'] = { label: 'Class', text: classEl.options[classEl.selectedIndex].text };
    } else delete appliedFilters['filter_class_id'];

    const sectionEl = document.getElementById('filter_section_id');
    if (sectionEl?.value) {
        appliedFilters['filter_section_id'] = { label: 'Section', text: sectionEl.options[sectionEl.selectedIndex].text };
    } else delete appliedFilters['filter_section_id'];

    const attendanceTypeEl = document.getElementById('filter_attendance_type');
    if (attendanceTypeEl?.value) {
        appliedFilters['filter_attendance_type'] = { label: 'Type', text: attendanceTypeEl.options[attendanceTypeEl.selectedIndex].text };
    } else delete appliedFilters['filter_attendance_type'];

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
        },
        // FIX: no reset handlers existed for these, so the "x" on their
        // badges (once badges exist at all — see applyFilters fix above)
        // would silently no-op.
        filter_class_id: () => {
            const el = document.getElementById('filter_class_id');
            if (el) el.value = '';
            resetSectionDropdown();
        },
        filter_section_id: () => {
            const el = document.getElementById('filter_section_id');
            if (el) el.value = '';
        },
        filter_attendance_type: () => {
            const el = document.getElementById('filter_attendance_type');
            if (el) el.value = '';
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

    resetSelect('filter_class_id');
    resetSectionDropdown();
    resetSelect('filter_attendance_type');

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
    const badRow = Array.from(table.querySelectorAll('tbody tr')).find(row => {
        if (row.querySelector('.dataTables_empty')) return false; // recognized empty-state row, skip
        return row.cells.length !== headerCellCount;
    });

    if (headerCellCount === 0 || badRow) {
        console.error(
            'AttendanceTypeTable: header/row cell-count mismatch — skipping DataTable() init to avoid ' +
            'the "_DT_CellIndex" crash. Give the empty-state <td> class="dataTables_empty", or make sure ' +
            'every data row has exactly one <td> per header column.',
            { headerCellCount, badRow }
        );
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

    //initAttendanceTypeTable();

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

    // Class -> Section cascade wiring — this only repopulates the Section
    // dropdown's options; it does NOT submit/reload the report grid. The
    // grid only reloads when Apply is clicked.
    document.getElementById('filter_class_id')?.addEventListener('change', function () {
        loadSectionsByClass(this.value, 0);
    });

    // If a class filter is already applied on load (postback / deep link), load its sections
    const preselectedClassId = document.getElementById('filter_class_id')?.value;
    if (preselectedClassId) {
        // FIX (class-wise section bind): this looked up 'hdnSectionId' but
        // the view's hidden field id is 'hdnSectionID' (capital ID).
        // getElementById is case-sensitive, so this always returned null,
        // preselectedSectionId always fell back to 0, and a previously
        // selected section could never survive a postback/deep link. The
        // view's hidden field id has been normalized to 'hdnSectionId' to
        // match the rest of the camelCase ids (hdnClassId, hdnCompanyId,
        // etc.) — update this line instead if you keep 'hdnSectionID' in
        // the view.
        const preselectedSectionId = document.getElementById('hdnSectionId')?.value || 0;
        loadSectionsByClass(preselectedClassId, preselectedSectionId);
    }
});

// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadStaffReportPartial(queryString) {
    const container = document.getElementById('StaffReportTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/AttendanceReport/GetStudentAttendanceTypePartial?${queryString}`, {
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

function resetSectionDropdown() {
    const sectionEl = document.getElementById('filter_section_id');
    if (!sectionEl) return;
    sectionEl.innerHTML = '<option value="">-- Select Class First --</option>';
    sectionEl.disabled = false;
}