// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_multiClassStudents';
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
// submitForm — syncs hidden fields, reloads partial.
// Safe to call from anywhere (apply/reset/pagination/after-save).
// ========================================
function submitForm() {
    const classEl = document.getElementById('ddlFilterClass');
    const sectionEl = document.getElementById('ddlFilterSection');
    const searchEl = document.getElementById('txtSearchInput');

    if (classEl) document.getElementById('hdnClassId').value = classEl.value;
    if (sectionEl) document.getElementById('hdnSectionId').value = sectionEl.value;
    if (searchEl) document.getElementById('hdnSearch').value = searchEl.value.trim();

    const form = document.getElementById('frmSearch');
    if (!form) {
        console.warn('submitForm: #frmSearch not found, skipping reload.');
        return;
    }
    const params = new URLSearchParams(new FormData(form)).toString();

    loadMultiClassStudentsPartial(params);
}

function applyFilters() {
    const classEl = document.getElementById('ddlFilterClass');
    const sectionEl = document.getElementById('ddlFilterSection');
    const searchEl = document.getElementById('txtSearchInput');

    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    if (classEl?.value && classEl.value !== '') {
        appliedFilters['ddlFilterClass'] = {
            label: 'Class',
            text: classEl.options[classEl.selectedIndex]?.text || classEl.value
        };
    } else delete appliedFilters['ddlFilterClass'];

    if (sectionEl?.value && sectionEl.value !== '') {
        appliedFilters['ddlFilterSection'] = {
            label: 'Section',
            text: sectionEl.options[sectionEl.selectedIndex]?.text || sectionEl.value
        };
    } else delete appliedFilters['ddlFilterSection'];

    document.getElementById('hdnPageIndex').value = 1;

    saveAppliedFilters();
    renderFilterBadges();
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

function removeFilter(filterId) {
    if (filterId === 'ddlFilterClass') {
        const el = document.getElementById('ddlFilterClass');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
        document.getElementById('ddlFilterSection').innerHTML = '<option value="">All Sections</option>';
    } else if (filterId === 'ddlFilterSection') {
        const el = document.getElementById('ddlFilterSection');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
    } else if (filterId === 'txtSearchInput') {
        const el = document.getElementById('txtSearchInput');
        if (el) el.value = '';
        document.getElementById('hdnSearch').value = '';
    }

    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';
    document.getElementById('hdnSearch').value = '';

    ['ddlFilterClass', 'ddlFilterSection'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = '';
        if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
    });

    clearAppliedFilters();
    document.getElementById('hdnPageIndex').value = 1;
    renderFilterBadges();

    const toggleEl = document.getElementById('btnFilterToggle');
    if (toggleEl && window.bootstrap) {
        const dd = bootstrap.Dropdown.getInstance(toggleEl) || new bootstrap.Dropdown(toggleEl);
        dd.hide();
    }

    submitForm();
}

// ========================================
// DOMContentLoaded — single init point
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    clearAppliedFilters();
    renderFilterBadges();

    // ── Class → Section cascading dropdown ──────────────────────────
    $('#ddlFilterClass').on('change', function () {
        const classId = $(this).val();
        loadSectionsByClass(classId, '#ddlFilterSection');
    });

    // ── Select2 ───────────────────────────────────────────────────────
    if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
        jQuery('#ddlFilterClass, #ddlFilterSection').select2({
            width: '100%',
            dropdownParent: jQuery('#filter-dropdown'),
            allowClear: true,
            placeholder: function () { return jQuery(this).data('placeholder') || 'Select'; }
        });
    }

    // Prevent Bootstrap's outside-click auto-close firing on Select2 clicks
    $('#filter-dropdown').on('click', function (e) { e.stopPropagation(); });
    $(document).on('click', '.select2-results__option, .select2-selection', function (e) { e.stopPropagation(); });

    $('#btnFilterToggle').on('shown.bs.dropdown', function () {
        $('#ddlFilterClass, #ddlFilterSection').each(function () {
            if ($(this).hasClass('select2-hidden-accessible')) {
                $(this).select2('destroy');
            }
        });
        $('#ddlFilterClass').select2({ dropdownParent: $('#filter-dropdown'), width: '100%' });
        $('#ddlFilterSection').select2({ dropdownParent: $('#filter-dropdown'), width: '100%' });

        var dropdownInstance = bootstrap.Dropdown.getInstance(this);
        if (dropdownInstance && dropdownInstance._popper) {
            dropdownInstance._popper.setOptions({
                modifiers: [
                    { name: 'flip', enabled: false },
                    { name: 'preventOverflow', enabled: false }
                ]
            });
        }
    });

    // ── Apply / Reset ────────────────────────────────────────────────
    document.getElementById('btnApplyFilters')?.addEventListener('click', (e) => {
        e.preventDefault();
        applyFilters();
    });

    document.getElementById('btnResetFilters')?.addEventListener('click', (e) => {
        e.preventDefault();
        resetAllFilters();
    });
});

// ========================================
// Text search — debounce-triggers reload via submitForm()
// ========================================
const searchInput = document.getElementById('txtSearchInput');
if (searchInput) {
    let debounceTimer = null;
    searchInput.addEventListener('input', function () {
        const val = this.value.trim();
        document.getElementById('hdnSearch').value = val;
        if (val) {
            appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        } else {
            delete appliedFilters['txtSearchInput'];
        }
        saveAppliedFilters();
        renderFilterBadges();

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            document.getElementById('hdnPageIndex').value = 1;
            submitForm();
        }, 300);
    });

    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(debounceTimer);
            applyFilters();
        }
    });
}

// ========================================
// Class list cache — needed for the per-row Class <select> options
// rendered client-side when a new row is added
// ========================================
let allClasses = [];

async function loadInitialClasses() {
    const ddl = document.getElementById('ddlFilterClass');
    if (!ddl) return;
    allClasses = Array.from(ddl.options)
        .filter(o => o.value)
        .map(o => ({ classID: o.value, className: o.text }));
}
loadInitialClasses();

async function loadSectionsByClass(classId, targetSelector) {
    const ddl = $(targetSelector);
    ddl.empty().append('<option value="">Select Section</option>');
    if (!classId) return;

    try {
        const resp = await fetch(`/StudentInformation/GetSectionsByClass?classId=${classId}`);
        const res = await resp.json();
        if (res.success) {
            res.data.forEach(s => ddl.append(`<option value="${s.sectionID}">${s.sectionName}</option>`));
        }
    } catch (err) {
        console.error(err);
    }
}

// ========================================
// Multi-class row rendering (client-side, for Add Row only —
// existing rows come from the server-rendered partial)
// ========================================
function addMultiClassRow(studentId) {
    const rowId = `new_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const html = `
    <div class="multi-class-row p-3 border-bottom" id="row_${rowId}" data-multiclass-id="0">
        <div class="row g-2 align-items-end">
            <div class="col-md-5">
                <label class="form-label mb-1 fs-12">Class</label>
                <select class="form-select form-select-sm ddl-class" onchange="handleClassChange(this, 'row_${rowId}')">
                    <option value="">Select Class</option>
                    ${allClasses.map(c => `<option value="${c.classID}">${c.className}</option>`).join('')}
                </select>
            </div>
            <div class="col-md-4">
                <label class="form-label mb-1 fs-12">Section</label>
                <select class="form-select form-select-sm ddl-section">
                    <option value="">Select Section</option>
                </select>
            </div>
            <div class="col-md-3">
                ${canDelete ? `
                <button class="btn btn-danger w-100" onclick="removeMultiClassRow('row_${rowId}', 0, ${studentId})">
                    <i class="ti ti-trash me-1"></i>Remove
                </button>` : ''}
            </div>
        </div>
    </div>`;
    $(`#multiClassRows_${studentId}`).append(html);
}

async function handleClassChange(el, rowId) {
    const classId = $(el).val();
    const sectionDdl = $(`#${rowId} .ddl-section`);
    await loadSectionsByClass(classId, sectionDdl);
}

// Tracks MultiClassIDs removed client-side per student, sent as
// isDeleted=true in the next bulk Update call for that student.
const pendingDeletes = {}; // { studentId: [multiClassId, ...] }

function removeMultiClassRow(rowId, multiClassId, studentId) {
    if (multiClassId > 0) {
        if (!pendingDeletes[studentId]) pendingDeletes[studentId] = [];
        pendingDeletes[studentId].push(multiClassId);
    }
    $(`#${rowId}`).remove();
}

// ========================================
// Bulk save — single Update button per student card
// ========================================
async function updateStudentMultiClasses(studentId) {
    const rows = [];

    $(`#multiClassRows_${studentId} .multi-class-row`).each(function () {
        const row = $(this);
        const classId = row.find('.ddl-class').val();
        const sectionId = row.find('.ddl-section').val();
        const multiClassId = parseInt(row.attr('data-multiclass-id')) || 0;

        if (!classId || !sectionId) return;

        rows.push({
            multiClassID: multiClassId,
            classID: parseInt(classId),
            sectionID: parseInt(sectionId),
            isDeleted: false
        });
    });

    (pendingDeletes[studentId] || []).forEach(id => {
        rows.push({ multiClassID: id, classID: 0, sectionID: 0, isDeleted: true });
    });

    if (rows.length === 0) {
        showToast('Nothing to update.', 'warning');
        return;
    }

    const payload = { studentID: studentId, rows: rows };

    try {
        const resp = await fetch('/StudentInformation/BulkUpsertMultiClass', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const res = await resp.json();

        if (res.success) {
            showToast(res.message, 'success');
            delete pendingDeletes[studentId];
            submitForm(); // reload partial, keeps current filters/page
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'An unexpected error occurred while saving.', 'error');
    }
}

function showToast(msg, type = 'success') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<div class="toast align-items-center text-bg-${type} border-0 show position-fixed bottom-0 end-0 m-3" role="alert" style="z-index:9999">
            <div class="d-flex"><div class="toast-body">${msg}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div></div>`;
    document.body.appendChild(wrapper);
    setTimeout(() => wrapper.remove(), 3000);
}

// ========================================
// Partial reload — single reload path for filter/search/apply/reset/
// pagination/after-save
// ========================================
function loadMultiClassStudentsPartial(queryString) {
    const container = document.getElementById('multiClassStudentsContainer');
    if (!container) {
        console.warn('loadMultiClassStudentsPartial: #multiClassStudentsContainer not found, skipping reload.');
        return;
    }

    container.style.opacity = '0.5';

    fetch(`/StudentInformation/GetMultiClassStudentsPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load students');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';
            renderFilterBadges();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// Pagination click interception
document.addEventListener('click', function (e) {
    const link = e.target.closest('#multiClassStudentsContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('page') || 1;
    loadMultiClassStudentsPartial(query);
    history.replaceState(null, '', href);
});