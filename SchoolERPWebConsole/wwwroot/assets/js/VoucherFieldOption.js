// ============================================================
// VoucherTypeFieldOption.js
// Handles: list export, filter badges, search, CRUD (Add/Edit/
// Delete/ToggleStatus) for tbl_mst_VoucherType_FieldOption,
// matching VoucherFieldOptionRequest exactly.
// ============================================================

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#VoucherTypeFieldOptionTable')) {
        $('#VoucherTypeFieldOptionTable').DataTable().button(index).trigger();
    }
}

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_voucherTypeFieldOption';
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
    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();
    loadVoucherTypeFieldOptionPartial(params);
}

function applyFilters() {
    const searchEl = document.getElementById('txtSearchInput');

    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

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
    if (filterId === 'txtSearchInput') {
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

    clearAppliedFilters();
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

// ========================================
// DOMContentLoaded — init DataTable + UI
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    var companyname = localStorage.getItem("comName");

    if ($.fn.DataTable.isDataTable('#VoucherTypeFieldOptionTable')) {
        $('#VoucherTypeFieldOptionTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#VoucherTypeFieldOptionTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Voucher Type Field Option - ${companyname}`, exportOptions: { columns: [1, 2, 3] } },
            { extend: 'csv', title: `Voucher Type Field Option - ${companyname}`, exportOptions: { columns: [1, 2, 3] } },
            { extend: 'excel', title: `Voucher Type Field Option - ${companyname}`, exportOptions: { columns: [1, 2, 3] } },
            { extend: 'pdf', title: `Voucher Type Field Option - ${companyname}`, exportOptions: { columns: [1, 2, 3] } },
            { extend: 'print', title: `Voucher Type Field Option - ${companyname}`, exportOptions: { columns: [1, 2, 3] } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });
});

let searchTimer = null;
document.getElementById('txtSearchInput')?.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        document.getElementById('hdnSearch').value = this.value;
        document.getElementById('hdnPageIndex').value = 1;
        submitForm();
    }, 500);
});

// ========================================
// Permissions + shared inline-validation helper
// ========================================
const permCanAdd = window.canAdd;
const permCanEdit = window.canEdit;
const permCanDelete = window.canDelete;
const IV = window.InlineFormValidation || {
    clearMap: (map) => Object.keys(map).forEach(k => {
        document.getElementById(k)?.classList.remove('is-invalid');
        const err = document.getElementById(map[k]); if (err) err.textContent = '';
    }),
    setFieldError: (id, errId, msg) => {
        document.getElementById(id)?.classList.add('is-invalid');
        const err = document.getElementById(errId); if (err) err.textContent = msg;
    },
    setNotice: (id, msg) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    },
    clearNotice: (id) => { const el = document.getElementById(id); if (el) el.innerHTML = ''; },
    bindAutoClear: (map) => Object.keys(map).forEach(k => document.getElementById(k)?.addEventListener('input', () => {
        document.getElementById(k)?.classList.remove('is-invalid');
        const err = document.getElementById(map[k]); if (err) err.textContent = '';
    }))
};

window.selectedOptionId = 0;

function selectItem(id, row) {
    IV.clearNotice('classPageNotice');
    window.selectedOptionId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));

    let checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
}

async function editSelected() {
    if (!permCanEdit) {
        IV.setNotice('classPageNotice', 'You do not have permission to edit.');
        return;
    }
    if (window.selectedOptionId === 0) return;
    IV.clearNotice('classPageNotice');
    try {
        if (window.selectedOptionId) {
            location.href = `/VoucherFieldOption/Add/${window.selectedOptionId}`;
        }
    } catch (err) {
        console.error(err);
    }
}

async function deleteSelected() {
    if (!permCanDelete) {
        IV.setNotice('classPageNotice', 'You do not have permission to delete.');
        return;
    }

    let selectedIds = [];
    $('.student-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        alert("Please select at least one option.");
        return;
    }

    $('#btnActive, #btnInactive, #btnDelete').prop('disabled', true);

    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this voucher type field option record. This action cannot be undone!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        customClass: {
            confirmButton: 'btn btn-danger me-2',
            cancelButton: 'btn btn-secondary'
        },
        buttonsStyling: false
    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                url: '/VoucherTypeFieldOption/Delete',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Voucher type field option record has been deleted.', 'success')
                            .then(() => submitForm());
                    } else {
                        updateButtonStates();
                        Swal.fire('Error!', res.message || 'Failed to delete voucher type field option.', 'error');
                    }
                },
                error: function () {
                    updateButtonStates();
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        } else {
            updateButtonStates();
        }
    });
}

// ========================================
// Auto-generate Option Value from Option Label
// ========================================
function autoFillOptionValue() {
    const valEl = document.getElementById('fldOptionValue');
    if (!valEl) return;
    // Only auto-fill if the user hasn't manually typed a value yet
    if (valEl.dataset.manual === 'true') return;

    const label = document.getElementById('fldOptionLabel').value || '';
    valEl.value = label
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9\s_]/g, '')
        .replace(/\s+/g, '_');
}

document.getElementById('fldOptionValue')?.addEventListener('input', function () {
    this.dataset.manual = 'true';
});

// ========================================
// Field-level error helpers (scoped to this form)
// ========================================
function showVFOError(inputId, errId, msg) {
    document.getElementById(inputId)?.classList.add('is-invalid');
    const err = document.getElementById(errId);
    if (err) { err.textContent = msg; err.classList.remove('d-none'); }
}

function clearVFOError(inputId, errId) {
    document.getElementById(inputId)?.classList.remove('is-invalid');
    const err = document.getElementById(errId);
    if (err) { err.classList.add('d-none'); }
}

// ========================================
// Validation
// ========================================
const WHOLE_NUMBER_REGEX = /^\d+$/;

function validateVoucherTypeFieldOptionForm() {
    let isValid = true;

    // Voucher Type Field — required
    const fieldId = parseInt(document.getElementById('ddlField').value, 10) || 0;
    if (fieldId <= 0) {
        showVFOError('ddlField', 'errField', 'Please select a voucher type field.');
        isValid = false;
    } else {
        clearVFOError('ddlField', 'errField');
    }

    // Option Label — required
    const label = document.getElementById('fldOptionLabel').value.trim();
    if (!label) {
        showVFOError('fldOptionLabel', 'errOptionLabel', 'Option label is required.');
        isValid = false;
    } else {
        clearVFOError('fldOptionLabel', 'errOptionLabel');
    }

    // Option Value — required
    const value = document.getElementById('fldOptionValue').value.trim();
    if (!value) {
        showVFOError('fldOptionValue', 'errOptionValue', 'Option value is required.');
        isValid = false;
    } else {
        clearVFOError('fldOptionValue', 'errOptionValue');
    }

    // Display Order — optional, but must be a non-negative whole number if entered
    const displayOrderRaw = document.getElementById('txtDisplayOrder').value.trim();
    if (displayOrderRaw && !WHOLE_NUMBER_REGEX.test(displayOrderRaw)) {
        showVFOError('txtDisplayOrder', 'errDisplayOrder', 'Display order must be a whole number.');
        isValid = false;
    } else {
        clearVFOError('txtDisplayOrder', 'errDisplayOrder');
    }

    return isValid;
}

// Clear a field's error as soon as the user starts fixing it
const vfoFieldErrMap = {
    ddlField: 'errField',
    fldOptionLabel: 'errOptionLabel',
    fldOptionValue: 'errOptionValue',
    txtDisplayOrder: 'errDisplayOrder'
};
Object.keys(vfoFieldErrMap).forEach(id => {
    const el = document.getElementById(id);
    const evt = (id === 'ddlField') ? 'change' : 'input';
    el?.addEventListener(evt, () => clearVFOError(id, vfoFieldErrMap[id]));
});

// ========================================
// Save — JSON body matching VoucherFieldOptionRequest exactly
// ========================================
async function saveRecord() {
    if (!validateVoucherTypeFieldOptionForm()) return;

    const id = parseInt(document.getElementById('recordId').value, 10) || 0;
    const isEdit = id > 0;

    if (isEdit && !permCanEdit) {
        IV.setNotice('voucherFieldOptionPageNotice', 'You do not have permission to edit.');
        return;
    }
    if (!isEdit && !permCanAdd) {
        IV.setNotice('voucherFieldOptionPageNotice', 'You do not have permission to add.');
        return;
    }

    // NOTE: CompanyID is intentionally NOT sent from the client — the
    // controller stamps it server-side from the logged-in user's session
    // (see VoucherTypeFieldOptionController.Save).
    const payload = {
        OptionID: id,
        FieldID: parseInt(document.getElementById('ddlField').value, 10) || 0,
        OptionLabel: document.getElementById('fldOptionLabel').value.trim(),
        OptionValue: document.getElementById('fldOptionValue').value.trim(),
        DisplayOrder: parseInt(document.getElementById('txtDisplayOrder').value.trim(), 10) || 0,
        IsDefault: document.getElementById('fldIsDefault').checked,
        IsActive: document.getElementById('chkIsActive').checked
    };

    const saveBtn = document.querySelector('button[onclick="saveRecord()"]');
    saveBtn?.setAttribute('disabled', 'true');

    try {
        const r = await fetch('/VoucherFieldOption/Save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        const res = await r.json();

        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit
                    ? 'Voucher type field option has been updated successfully.'
                    : 'Voucher type field option has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => { window.location.href = '/VoucherFieldOption/Index'; });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save voucher type field option.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error!', 'An unexpected error occurred while saving.', 'error');
    } finally {
        saveBtn?.removeAttribute('disabled');
    }
}

// ========================================
// Reset
// ========================================
function resetForm() {
    const form = document.getElementById('accountHeadForm');
    form?.reset();

    Object.values(vfoFieldErrMap).forEach(errId => {
        const el = document.getElementById(errId);
        if (el) el.classList.add('d-none');
    });
    Object.keys(vfoFieldErrMap).forEach(id =>
        document.getElementById(id)?.classList.remove('is-invalid')
    );

    const valEl = document.getElementById('fldOptionValue');
    if (valEl) valEl.dataset.manual = 'false';

    if ($.fn.select2) $('#ddlField').trigger('change.select2');
}

async function toggleStatus(id, isActive, checkboxEl) {
    if (!permCanEdit) {
        IV.setNotice('classPageNotice', 'You do not have permission to change status.');
        if (checkboxEl) checkboxEl.checked = !isActive;
        location.reload();
        return;
    }

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

    const request = {
        ids: sectionIds.join(','),
        isActive: isActive
    };

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

    $('#btnActive, #btnInactive, #btnDelete').prop('disabled', true);

    try {
        const config = isActive
            ? { icon: 'question', title: 'Activate Record(s)?', text: 'Activating this record will make it visible and available for use across the system. Do you want to continue?', confirmText: 'Yes, Activate', confirmBtnClass: 'btn btn-success me-2', successTitle: 'Activated Successfully!', successText: 'The selected record(s) have been activated and are now available for use.' }
            : { icon: 'warning', title: 'Deactivate Record(s)?', text: 'Deactivating this record will hide it from the system and prevent it from being used. Do you want to continue?', confirmText: 'Yes, Deactivate', confirmBtnClass: 'btn btn-danger me-2', successTitle: 'Deactivated Successfully!', successText: 'The selected record(s) have been deactivated and are no longer available for use.' };

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
                    url: '/VoucherFieldOption/ToggleStatus',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(request),
                    success: function (res) {
                        if (res.success) {
                            Swal.fire('Updated!', res.message || 'Status updated successfully.', 'success')
                                .then(() => submitForm());
                        } else {
                            revertAll();
                            updateButtonStates();             // ✅ resync on failure too
                            Swal.fire('Error!', res.message || 'Failed to update status.', 'error');
                        }
                    },
                    error: function (xhr) {
                        revertAll();
                        updateButtonStates();                   // ✅ resync on failure too
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
    }
    catch (err) {
        revertAll();
        console.error(err);
        IV.setNotice('classPageNotice', 'Could not update status.');
        location.reload();
    }
}

// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadVoucherTypeFieldOptionPartial(queryString) {
    const container = document.getElementById('VoucherTypeFieldOptionTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/VoucherFieldOption/GetVoucherTypeFieldOptionPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load voucher type field options');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';
            updateButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// Pagination click interception, scoped to this container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#VoucherTypeFieldOptionTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadVoucherTypeFieldOptionPartial(query);
    history.replaceState(null, '', href);
});

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
