// ========================================
// Export helper (DataTable buttons)
// ========================================
function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#examTable')) {
        $('#examTable').DataTable().button(index).trigger();
    }
}

// ========================================
// ✅ FIX — single shared DataTable/export initializer.
// Previously this logic was duplicated: once (wrongly) targeting
// '#subjectsTable' in DOMContentLoaded, and once (correctly) targeting
// '#examTable' inside loadCoScholasticPartial(). Because the actual table's
// id is "examTable", the DOMContentLoaded copy never attached to anything,
// so Print/Export did nothing until after the first AJAX reload. Now both
// call this one function so they can't drift apart again.
// ========================================
function initExportTable() {
    if ($.fn.DataTable.isDataTable('#examTable')) {
        $('#examTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';

    var companyname = localStorage.getItem("comName");

    window.exportTable = $('#examTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Co-Scholastic - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
            { extend: 'csv', title: `Co-Scholastic - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
            { extend: 'excel', title: `Co-Scholastic - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
            { extend: 'pdf', title: `Co-Scholastic - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
            { extend: 'print', title: `Co-Scholastic - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });
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

    loadCoScholasticPartial(params);
}

function loadCoScholasticPartial(queryString) {
    // ✅ FIX — was 'ExamTableContainer', which doesn't exist. The real
    // container in Index.cshtml is id="CoScholasticTableContainer". This
    // mismatch made the function silently no-op on every search/page click.
    const container = document.getElementById('CoScholasticTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/CoScholastic/GetCoScholasticPartial?${queryString}`, {
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

            initExportTable(); // ✅ FIX — reuse the same initializer, now targeting #examTable
            updateButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// Pagination click interception, scoped to the subject container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#CoScholasticTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    loadCoScholasticPartial(query);
    history.replaceState(null, '', href);
});

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
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

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
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

// ========================================
// DOMContentLoaded — init DataTable + UI
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // ✅ FIX — initialize the export table on the *real* table id via the
    // shared initExportTable() function, instead of the old inline block
    // that targeted the non-existent '#subjectsTable'.
    initExportTable();

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
        renderFilterBadges();

        submitForm();
    }, 500);
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
    location.href = `/CoScholastic/Add/${selectedId}`;
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
        text: 'You are about to delete this record. This action cannot be undone!',
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
            url: '/CoScholastic/Delete',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(selectedIds),
            success: res => res.success
                ? Swal.fire('Deleted!', 'Record has been deleted.', 'success')
                    .then(() => loadCoScholasticPartial(new URLSearchParams(new FormData(document.getElementById('frmSearch'))).toString()))
                : Swal.fire('Error!', res.message || 'Failed to delete record.', 'error'),
            error: () => Swal.fire('Error!', 'An unexpected error occurred.', 'error')
        });
    });
}

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
    clearNotice: (id) => { const el = document.getElementById(id); if (el) el.innerHTML = ''; }
};

const fieldMap = {
    txtTitle: 'errTxtTitle',
    txtSrNo: 'errTxtSrNo',
    ddlParentID: 'errDdlParentID'
};

Object.keys(fieldMap).forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
        document.getElementById(id)?.classList.remove('is-invalid');
        const err = document.getElementById(fieldMap[id]); if (err) err.textContent = '';
    });
});

let selectedId = 0;

// ========================================
// Save (Add or Edit)
// ========================================
async function saveItem() {
    const sid = parseInt(document.getElementById('txtItemId').value) || 0;

    if (sid === 0 && !window.canAdd) { IV.setNotice('modalNotice', 'You do not have permission to add.'); return; }
    if (sid > 0 && !window.canEdit) { IV.setNotice('modalNotice', 'You do not have permission to edit.'); return; }

    IV.clearMap(fieldMap);
    IV.clearNotice('modalNotice');

    const parentValRaw = document.getElementById('ddlParentID').value;
    const parentID = parentValRaw ? parseInt(parentValRaw) : null;
    const srNoRaw = document.getElementById('txtSrNo').value.trim();
    const title = document.getElementById('txtTitle').value.trim();
    const isGroup = document.getElementById('isGroup').checked;
    const isActive = document.getElementById('isActive').checked;
    const companyID = parseInt(document.getElementById('hdnCompanyID').value) || 0;

    let isValid = true;

    if (!title) {
        IV.setFieldError('txtTitle', 'errTxtTitle', 'Title is required.');
        isValid = false;
    }
    if (srNoRaw === '' || isNaN(parseInt(srNoRaw))) {
        IV.setFieldError('txtSrNo', 'errTxtSrNo', 'Sr No. is required.');
        isValid = false;
    }

    if (!isValid) return;

    const data = {
        coScholasticID: sid,
        parentID: parentID,
        companyID: companyID,
        srNo: parseInt(srNoRaw),
        title: title,
        isGroup: isGroup,
        isActive: isActive
    };

    const isEdit = sid > 0;

    try {
        const r = await fetch('/CoScholastic/Save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const res = await r.json();

        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit ? 'Co-Scholastic has been updated successfully.' : 'Co-Scholastic has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                window.location.href = '/CoScholastic/Index';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save Co-Scholastic.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
    } catch (err) {
        console.error(err);
        IV.setNotice('modalNotice', 'Could not save Co-Scholastic.');
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
            showToast('Please select at least one record', false);
            return;
        }
    }
    const request = { ids: sectionIds.join(','), isActive: isActive };

    function revertAll() {
        checkedBoxes.forEach(cb => {
            if (cb.classList.contains('student-checkbox')) {
                cb.checked = false;
            } else {
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
                    url: '/CoScholastic/ToggleStatus',
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

// ========================================
// Reset form
// ========================================
function resetForm() {
    IV.clearMap(fieldMap);
    IV.clearNotice('modalNotice');
    document.getElementById('itemForm').reset();
}