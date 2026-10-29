// ========================================================================
// Student Information Report — filters, badges, cascade, export, pagination
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
const FILTER_KEY = 'appliedFilters_studentReport';
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

function submitForm() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    if (sessionEl) document.getElementById('hdnSessionID').value = sessionEl.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;

    document.getElementById('hdnClassId').value = document.getElementById('ddlFilterClass')?.value || '';
    document.getElementById('hdnSectionId').value = document.getElementById('ddlFilterSection')?.value || '';

    // NEW: sync SearchType / DateFrom / DateTo into the actual submitted form,
    // since their visible inputs live outside #frmSearch
    const searchTypeEl = document.getElementById('search_type');
    const dateFromEl = document.getElementById('date_from');
    const dateToEl = document.getElementById('date_to');

    //const searchTypeVal = searchTypeEl?.value || '';
    //document.getElementById('hdnSearchType').value = searchTypeVal;

    // If using Flatpickr:
    const searchTypeVal = searchTypeEl?.value || '';
    document.getElementById('hdnSearchType').value = searchTypeVal;

    if (searchTypeVal === 'period') {
        // Prefer the picker's own selectedDates/formatted value over raw .value
        const fromVal = dateFromEl?._flatpickr ? dateFromEl._flatpickr.input.value : dateFromEl?.value;
        const toVal = dateToEl?._flatpickr ? dateToEl._flatpickr.input.value : dateToEl?.value;

        document.getElementById('hdnDateFrom').value = fromVal || '';
        document.getElementById('hdnDateTo').value = toVal || '';
    } else {
        document.getElementById('hdnDateFrom').value = '';
        document.getElementById('hdnDateTo').value = '';
    }

    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadStudentReportPartial(params);
}

// ========================================
// Search Type -> Date range toggle
// ========================================
function showdate(value) {
    const dateResult = document.getElementById('date_result');
    if (!dateResult) return;

    if (value === 'period') {
        dateResult.style.display = 'flex';
    } else {
        dateResult.style.display = 'none';
        // clear stale values so a leftover date range doesn't get submitted
        const dateFromEl = document.getElementById('date_from');
        const dateToEl = document.getElementById('date_to');
        if (dateFromEl) dateFromEl.value = '';
        if (dateToEl) dateToEl.value = '';
    }
}

function applyFilters() {
    const searchEl = document.getElementById('txtSearchInput');
    const classEl = document.getElementById('ddlFilterClass');
    const sectionEl = document.getElementById('ddlFilterSection');
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');

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


    if (classEl?.value) {
        appliedFilters['ddlFilterClass'] = { label: 'Class', text: classEl.options[classEl.selectedIndex].text };
    } else delete appliedFilters['ddlFilterClass'];

    if (sectionEl?.value) {
        appliedFilters['ddlFilterSection'] = { label: 'Section', text: sectionEl.options[sectionEl.selectedIndex].text };
    } else delete appliedFilters['ddlFilterSection'];



    if (sessionEl?.value) {
        appliedFilters['ddlFilterSessions'] = { label: 'Session', text: sessionEl.options[sessionEl.selectedIndex]?.text || sessionEl.value };
    } else delete appliedFilters['ddlFilterSessions'];

    if (companyEl?.value) {
        appliedFilters['ddlFilterCompany'] = { label: 'Company', text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value };
    } else delete appliedFilters['ddlFilterCompany'];

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
        ddlFilterSessions: () => resetSelect('ddlFilterSessions'),
        ddlFilterCompany: () => resetSelect('ddlFilterCompany'),
        ddlFilterClass: () => { resetSelect('ddlFilterClass'); resetSectionDropdown(); },
        ddlFilterSection: () => resetSelect('ddlFilterSection'),
        txtSearchInput: () => {
            const el = document.getElementById('txtSearchInput');
            if (el) el.value = '';
            document.getElementById('hdnSearch').value = '';
        },
        // NEW
        search_type: () => {
            const el = document.getElementById('search_type');
            if (el) el.value = '';
            showdate('');
        },
        date_from: () => { const el = document.getElementById('date_from'); if (el) el.value = ''; },
        date_to: () => { const el = document.getElementById('date_to'); if (el) el.value = ''; }
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

function resetSectionDropdown() {
    const sectionEl = document.getElementById('ddlFilterSection');
    if (sectionEl) {
        sectionEl.innerHTML = '<option value="">-- Select Class First --</option>';
        sectionEl.disabled = true;
    }
}

function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';
    document.getElementById('hdnSearch').value = '';

    ['ddlFilterSessions', 'ddlFilterCompany', 'ddlFilterClass']
        .forEach(id => resetSelect(id));

    resetSectionDropdown();

    // NEW: reset SearchType + date range too
    const searchTypeEl = document.getElementById('search_type');
    if (searchTypeEl) searchTypeEl.value = '';
    showdate(''); // hides date_result and clears date_from/date_to
    document.getElementById('hdnSearchType').value = '';
    document.getElementById('hdnDateFrom').value = '';
    document.getElementById('hdnDateTo').value = '';

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
// Class -> Section cascade
// ========================================
async function loadSectionsByClass(classId, preselectSectionId) {
    const sectionEl = document.getElementById('ddlFilterSection');
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
        const result = await res.json();
        const list = result || [];

        sectionEl.innerHTML = '<option value="">All Sections</option>';
        list.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id ?? s.id ?? s.id;
            opt.textContent = s.name ?? s.name ?? s.name;
            if (preselectSectionId && String(preselectSectionId) === String(opt.value)) {
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

document.addEventListener('DOMContentLoaded', function () {

    var companyname = localStorage.getItem("comName");

    if ($.fn.DataTable.isDataTable('#StudentReportTable')) {
        $('#StudentReportTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#StudentReportTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Class & Section Report - ${companyname}` },
            { extend: 'csv', title: `Class & Section Report - ${companyname}` },
            { extend: 'excel', title: `Class & Section Report - ${companyname}` },
            { extend: 'pdf', title: `Class & Section Report - ${companyname}` },
            { extend: 'print', title: `Class & Section Report - ${companyname}` }
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

    renderFilterBadges();

    // Class -> Section cascade wiring
    document.getElementById('ddlFilterClass')?.addEventListener('change', function () {
        loadSectionsByClass(this.value, 0);
    });

    // If a class filter is already applied on load (postback / deep link), load its sections
    const preselectedClassId = document.getElementById('ddlFilterClass')?.value;
    if (preselectedClassId) {
        const preselectedSectionId = document.getElementById('hdnSectionId')?.value || 0;
        loadSectionsByClass(preselectedClassId, preselectedSectionId);
    }
});

// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadStudentReportPartial(queryString) {
    const container = document.getElementById('StudentReportTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/StudentInformationReport/GetAdmissionReportPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load student report');
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

// ✅ Pagination click interception, scoped to this container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#StudentReportTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('pageNumber') || 1;
    loadStudentReportPartial(query);
    history.replaceState(null, '', href);
});