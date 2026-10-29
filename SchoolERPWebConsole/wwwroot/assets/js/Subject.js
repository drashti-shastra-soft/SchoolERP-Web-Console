// ========================================
// Export helper (DataTable buttons)
// ========================================
function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#subjectsTable')) {
        $('#subjectsTable').DataTable().button(index).trigger();
    }
}

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_subject';
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

    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadSubjectPartial(params);
}

function loadSubjectPartial(queryString) {
    const container = document.getElementById('subjectTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';
    var companyname = localStorage.getItem("comName");
    fetch(`/Academics/GetSubjectPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load subjects');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';

            if ($.fn.DataTable.isDataTable('#subjectsTable')) {
                $('#subjectsTable').DataTable().destroy();
            }
            exportTable = $('#subjectsTable').DataTable({
                dom: 'Bfrtip',
                buttons: [
                    { extend: 'copy', title: `Subjects - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'csv', title: `Subjects- ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'excel', title: `Subjects - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'pdf', title: `Subjects - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'print', title: `Subjects- ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } }
                ],
                searching: false,
                paging: false,
                info: false,
                ordering: false
            });

            updateButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// ✅ NEW — pagination click interception, scoped to the subject container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#subjectTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    loadSubjectPartial(query);
    history.replaceState(null, '', href);
});

// ✅ CHANGED — added renderFilterBadges() at the end
function applyFilters() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const searchEl = document.getElementById('txtSearchInput');

    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    if (sessionEl?.value && sessionEl.value !== '') {
        appliedFilters['ddlFilterSessions'] = {
            label: 'Session',
            text: sessionEl.options[sessionEl.selectedIndex]?.text || sessionEl.value
        };
    } else delete appliedFilters['ddlFilterSessions'];

    if (companyEl?.value && companyEl.value !== '') {
        appliedFilters['ddlFilterCompany'] = {
            label: 'Company',
            text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value
        };
    } else delete appliedFilters['ddlFilterCompany'];

    saveAppliedFilters();
    renderFilterBadges(); // ✅ NEW
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

// ✅ CHANGED — added renderFilterBadges() after saveAppliedFilters()
function removeFilter(filterId) {
    if (filterId === 'ddlFilterSessions') {
        const el = document.getElementById('ddlFilterSessions');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
    } else if (filterId === 'ddlFilterCompany') {
        const el = document.getElementById('ddlFilterCompany');
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
    renderFilterBadges(); // ✅ NEW
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

// ✅ CHANGED — added renderFilterBadges() after clearAppliedFilters()
function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';
    document.getElementById('hdnSearch').value = '';

    ['ddlFilterSessions', 'ddlFilterCompany'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = '';
        if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
    });

    clearAppliedFilters();
    renderFilterBadges(); // ✅ NEW
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

// ========================================
// DOMContentLoaded — init DataTable + UI
// ✅ CHANGED — this is now the ONLY DOMContentLoaded block. The duplicate
// block that used to sit at the bottom of the file has been removed entirely
// (it was re-initializing the DataTable, re-binding Select2, and double-firing
// btnApplyFilters/btnResetFilters click handlers).
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        document.getElementById('hdnPageIndex').value = 1;
        document.getElementById('hdnSearch').value = document.getElementById('txtSearchInput').value;
        applyFilters();
        submitForm();
    });

    var companyname = localStorage.getItem("comName");
    // ── DataTable (export only) ───────────────────────────────────────
    if ($.fn.DataTable.isDataTable('#subjectsTable')) {
        $('#subjectsTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#subjectsTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Subjects - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'csv', title: `Subjects - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'excel', title: `Subjects - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'pdf', title: `Subjects - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'print', title: `Subjects - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });

    // ── Select2 ───────────────────────────────────────────────────────
    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            jQuery('#ddlFilterSessions, #ddlFilterCompany').select2({
                width: '100%',
                dropdownParent: jQuery('#filter-dropdown'),
                allowClear: true,
                placeholder: function () { return jQuery(this).data('placeholder') || 'Select'; }
            });
        }
    } catch (e) {
        console.warn('Select2 init skipped:', e);
    }

    // ── Keep filter dropdown open while interacting inside ────────────
    document.getElementById('filter-dropdown')?.addEventListener('click', e => e.stopPropagation());

    // ── Apply Filters ─────────────────────────────────────────────────
    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        document.getElementById('hdnPageIndex').value = 1;
        document.getElementById('hdnSearch').value = document.getElementById('txtSearchInput').value;
        applyFilters();
        submitForm();
    });

    // ── Reset Filters ───────────────────────────────────────────────
    // ✅ CHANGED — calls the single resetAllFilters() function instead of
    // duplicating its body inline (removes the double-submit risk).
    document.getElementById('btnResetFilters')?.addEventListener('click', resetAllFilters);

    // ── Render badges on load ─────────────────────────────────────────
    renderFilterBadges();
});

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
        renderFilterBadges(); // ✅ NEW

        submitForm();
    }, 500);
});

// ========================================
// Validation & UI helpers
// ========================================
const IV = {
    clearMap: (map) => Object.keys(map).forEach(k => {
        document.getElementById(k)?.classList.remove('is-invalid');
        const err = document.getElementById(map[k]); if (err) err.textContent = '';
    }),
    setFieldError: (id, errId, msg) => {
        document.getElementById(id)?.classList.add('is-invalid');
        const err = document.getElementById(errId); if (err) err.textContent = msg;
    },
    setNotice: (id, msg, type = 'danger') => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    },
    clearNotice: (id) => { const el = document.getElementById(id); if (el) el.innerHTML = ''; },
    bindAutoClear: (map) => Object.keys(map).forEach(k => document.getElementById(k)?.addEventListener('input', () => {
        document.getElementById(k)?.classList.remove('is-invalid');
        const err = document.getElementById(map[k]); if (err) err.textContent = '';
    }))
};

const fieldMap = { txtSubjectName: 'errTxtSubjectName', ddlSubjectType: 'errDdlSubjectType' };
let selectedId = 0;
IV.bindAutoClear(fieldMap);

// ✅ NEW — ddlSubjectType is a <select>; if it's plain (not select2), 'change'
// still needs a listener since bindAutoClear only wires 'input' (which never
// fires on <select> elements — same issue found in the Class file earlier).
document.getElementById('ddlSubjectType')?.addEventListener('change', function () {
    this.classList.remove('is-invalid');
    const err = document.getElementById('errDdlSubjectType');
    if (err) err.textContent = '';
});

// ========================================
// Row selection
// ========================================
function selectItem(id, row) {
    IV.clearNotice('pageNotice');
    selectedId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light-primary'));
    row.classList.add('bg-light-primary');

    const checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
}

// ========================================
// Edit
// ========================================
async function editSelected() {
    if (!window.canEdit) { IV.setNotice('pageNotice', 'You do not have permission to edit.'); return; }
    if (selectedId === 0) return;
    IV.clearNotice('pageNotice');
    location.href = `/Academics/AddSubject/${selectedId}`;
}

// ========================================
// Delete
// ========================================
async function deleteSelected() {
    if (!window.canDelete) { IV.setNotice('pageNotice', 'You do not have permission to delete.'); return; }

    const selectedIds = [];
    $('.student-checkbox:checked').each(function () { selectedIds.push(parseInt($(this).val())); });
    if (selectedIds.length === 0) { alert('Please select at least one subject.'); return; }

    Swal.fire({
        title: 'Are you sure?',
        text: 'You are about to delete this subject record. This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-secondary' },
        buttonsStyling: false
    }).then(result => {
        if (!result.isConfirmed) return;
        $.ajax({
            url: '/Academics/DeleteSubject',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(selectedIds),
            success: res => res.success
                ? Swal.fire('Deleted!', 'Subject record has been deleted.', 'success')
                    .then(() => loadSubjectPartial(new URLSearchParams(new FormData(document.getElementById('frmSearch'))).toString())) // ✅ CHANGED — was location.reload()
                : Swal.fire('Error!', res.message || 'Failed to delete subject.', 'error'),
            error: () => Swal.fire('Error!', 'An unexpected error occurred.', 'error')
        });
    });
}

// ========================================
// Save (modal)
// ✅ CHANGED — validates ALL fields and shows ALL errors together instead of
// stopping at the first one. This is why "Subject Type" never showed its
// error in your screenshot — the function returned before checking it.
// ========================================
async function saveItem() {
    const sid = parseInt(document.getElementById('txtItemId').value);
    if (sid === 0 && !window.canAdd) { IV.setNotice('modalNotice', 'You do not have permission to add.'); return; }
    if (sid > 0 && !window.canEdit) { IV.setNotice('modalNotice', 'You do not have permission to edit.'); return; }

    IV.clearMap(fieldMap); // ✅ NEW — clear previous errors before revalidating

    const name = document.getElementById('txtSubjectName').value.trim();
    const displayLabel = document.getElementById('txtDisplayLabel').value.trim();
    const ddl = document.getElementById('ddlSubjectType');

    const typeId = ddl.value;
    const typeName = ddl.options[ddl.selectedIndex].text;
    const companyID = document.getElementById('hdnCompanyID').value;
    const sessionID = document.getElementById('hdnSessionID').value;

    let isValid = true; // ✅ NEW

    if (!name) {
        IV.setFieldError('txtSubjectName', 'errTxtSubjectName', 'Subject name is required.');
        isValid = false;
    }

    if (!typeId) {
        IV.setFieldError('ddlSubjectType', 'errDdlSubjectType', 'Subject type is required.');
        isValid = false;
    }

    if (!isValid) return; // ✅ NEW — only stop after checking everything

    const data = {
        subjectID: sid,
        subjectName: name,
        displayLabel: displayLabel || name,
        subjectCode: document.getElementById('txtSubjectCode').value.trim(),
        subjectTypeID: typeId,
        subjectType: typeName,
        isActive: document.getElementById('isActive').checked,
        companyID: companyID,
        sessionID: sessionID
    };
    const isEdit = sid > 0;
    try {
        const r = await fetch('/Academics/SaveSubject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const res = await r.json();
        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit
                    ? 'Subject has been updated successfully.'
                    : 'Subject has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                window.location.href = '/Academics/Subject';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save subject.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }       
    } catch (err) {
        console.error(err);
        IV.setNotice('modalNotice', 'Could not save subject.'); // ✅ FIXED — was 'classModalNotice' (wrong id, leftover from Class.js copy-paste)
    }
}

// ========================================
// Toggle Status
// ========================================
async function toggleStatus(id, isActive, checkboxEl) {
    let sectionIds = [];
    let checkedBoxes = [];
    $('.student-checkbox:checked').each(function () {
        sectionIds.push(parseInt($(this).val()));
        checkedBoxes.push(this);
    });
    if (sectionIds.length === 0) {
        if (id != 0) {
            sectionIds.push(parseInt(id));
            if (checkboxEl) checkedBoxes.push(checkboxEl);
        } else {
            showToast('Please select at least one user', false);
            return;
        }
    }
    const request = { ids: sectionIds.join(','), isActive: isActive };

    //function revertAll() {
    //    checkedBoxes.forEach(cb => { cb.checked = !isActive; });
    //}

    function revertAll() {
        checkedBoxes.forEach(cb => {
            if (cb.classList.contains('student-checkbox')) {
                // Bulk action path: this is a row-selection checkbox, not the status switch.
                // On cancel/failure we deselect it — we never toggle its "value" based on isActive.
                cb.checked = false;
            } else {
                // Single-row inline switch path: revert the switch to the state it had
                // before the attempted change.
                cb.checked = !isActive;
            }
        });
    }

    try {
        const config = isActive
            ? { icon: 'question', title: 'Activate Record(s)?', text: 'Activating this record will make it visible and available for use across the system. Do you want to continue?' }
            : { icon: 'warning', title: 'Deactivate Record(s)?', text: 'Deactivating this record will hide it from the system and prevent it from being used. Do you want to continue?' };

        Swal.fire({
            icon: config.icon,
            title: config.title,
            text: config.text,
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, proceed!',
            customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-secondary' },
            buttonsStyling: false
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: '/Academics/ToggleSubjectStatus',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(request),
                    success: function (res) {
                        if (res.success) {
                            Swal.fire('Updated!', res.message || 'Status updated successfully.', 'success')
                                .then(() => location.reload());
                        } else {
                            revertAll();
                            updateButtonStates(); 
                            Swal.fire('Error!', res.message || 'Failed to update status.', 'error');
                        }
                    },
                    error: function (xhr) {
                        revertAll();
                        updateButtonStates(); 
                        console.error('Status update error:', xhr.status, xhr.responseText);
                        Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                    }
                });
            } else {
                // Cancel clicked — revert whatever was optimistically toggled,
                // and fully resync selection state + buttons + row highlight.
                revertAll();
                selectedId = 0;
                window.selectedId = 0;
                document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
                updateButtonStates();
            }
        });
    } catch (err) {
        revertAll();
        console.error(err);
        IV.setNotice('sectionPageNotice', 'Could not update status.');
        location.reload();
    }
}

// ========================================
// Helpers
// ========================================
function updateButtonStates() {
    const count = $('.student-checkbox:checked').length;
    $('#btnEdit').prop('disabled', count !== 1);
    $('#btnDelete').prop('disabled', count === 0);
    $('#btnActive').prop('disabled', count === 0);
    $('#btnInactive').prop('disabled', count === 0);
}

// ✅ CHANGED — was addEventListener('change', ...) on the raw element,
// which doesn't reliably fire for Select2 since it triggers change via jQuery.
// Also added setSelect2Invalid() to sync the visible Select2 box, not just the hidden <select>.
$('#ddlSubjectType').on('change', function () {
    this.classList.remove('is-invalid');
    setSelect2Invalid('ddlSubjectType', false); // ✅ NEW
    const err = document.getElementById('errDdlSubjectType');
    if (err) err.textContent = '';
});

// ✅ NEW — same helper used for ddlSections, reused here for ddlSubjectType
function setSelect2Invalid(selectId, isInvalid) {
    const $el = $('#' + selectId);
    $el.toggleClass('is-invalid', isInvalid);
    const $rendered = $el.next('.select2-container').find('.select2-selection');
    $rendered.toggleClass('is-invalid', isInvalid);
}