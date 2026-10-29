// ============================================================
// VoucherTypeField.js
// Handles: list export, filter badges, search, CRUD (Add/Edit/
// Delete/ToggleStatus) for tbl_Mst_VoucherType_Field, matching
// VoucherFieldRequest exactly.
// ============================================================

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#VoucherTypeFieldTable')) {
        $('#VoucherTypeFieldTable').DataTable().button(index).trigger();
    }
}

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_voucherTypeField';
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
    loadVoucherTypeFieldPartial(params);
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

    if ($.fn.DataTable.isDataTable('#VoucherTypeFieldTable')) {
        $('#VoucherTypeFieldTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#VoucherTypeFieldTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Voucher Type Field - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'csv', title: `Voucher Type Field - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'excel', title: `Voucher Type Field - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'pdf', title: `Voucher Type Field - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'print', title: `Voucher Type Field - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } }
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

window.selectedFieldId = 0;

function selectItem(id, row) {
    IV.clearNotice('classPageNotice');
    window.selectedFieldId = id;
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
    if (window.selectedFieldId === 0) return;
    IV.clearNotice('classPageNotice');
    try {
        if (window.selectedFieldId) {
            location.href = `/VoucherTypeField/Add/${window.selectedFieldId}`;
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
        alert("Please select at least one voucher type field.");
        return;
    }

    // Disable action buttons the moment the confirmation popup opens, so
    // the user can't fire the same (or another) action again while it's
    // showing. Restored below on Cancel, and again by updateButtonStates()
    // once the list reloads after a successful delete.
    $('#btnActive, #btnInactive, #btnDelete').prop('disabled', true);

    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this voucher type field record. This action cannot be undone!",
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
                url: '/VoucherTypeField/Delete',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Voucher type field record has been deleted.', 'success')
                            .then(() => submitForm());
                    } else {
                        updateButtonStates();
                        Swal.fire('Error!', res.message || 'Failed to delete voucher type field.', 'error');
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
// Auto-generate Field Code from Field Label
// ========================================
function autoFillKey() {
    const codeEl = document.getElementById('fldCode');
    if (!codeEl) return;
    // Only auto-fill if the user hasn't manually typed a code yet
    if (codeEl.dataset.manual === 'true') return;

    const label = document.getElementById('fldLabel').value || '';
    codeEl.value = label
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9\s_]/g, '')
        .replace(/\s+/g, '_');
}

document.getElementById('fldCode')?.addEventListener('input', function () {
    this.dataset.manual = 'true';
});

// ========================================
// Field-level error helpers (scoped to this form)
// ========================================
function showVTFError(inputId, errId, msg) {
    document.getElementById(inputId)?.classList.add('is-invalid');
    const err = document.getElementById(errId);
    if (err) { err.textContent = msg; err.classList.remove('d-none'); }
}

function clearVTFError(inputId, errId) {
    document.getElementById(inputId)?.classList.remove('is-invalid');
    const err = document.getElementById(errId);
    if (err) { err.classList.add('d-none'); }
}

// ========================================
// Validation — matches every required property on VoucherFieldRequest
// ========================================
const FIELD_CODE_REGEX = /^[A-Za-z0-9_]+$/;
const WHOLE_NUMBER_REGEX = /^\d+$/;

function validateVoucherTypeFieldForm() {
    let isValid = true;

    // Voucher Type — required
    const voucherId = parseInt(document.getElementById('ddlVoucherType').value, 10) || 0;
    if (voucherId <= 0) {
        showVTFError('ddlVoucherType', 'errVoucherType', 'Please select a voucher type.');
        isValid = false;
    } else {
        clearVTFError('ddlVoucherType', 'errVoucherType');
    }

    // Field Label — required
    const label = document.getElementById('fldLabel').value.trim();
    if (!label) {
        showVTFError('fldLabel', 'errLabel', 'Field label is required.');
        isValid = false;
    } else {
        clearVTFError('fldLabel', 'errLabel');
    }

    // Field Code — required, letters/numbers/underscore only
    const code = document.getElementById('fldCode').value.trim();
    if (!code) {
        showVTFError('fldCode', 'errCode', 'Field code is required.');
        isValid = false;
    } else if (!FIELD_CODE_REGEX.test(code)) {
        showVTFError('fldCode', 'errCode', 'Field code can only contain letters, numbers, and underscores.');
        isValid = false;
    } else {
        clearVTFError('fldCode', 'errCode');
    }

    // Field Type — required (always has a selection, but guard anyway)
    const fieldType = document.getElementById('fldType').value;
    if (!fieldType) {
        showVTFError('fldType', 'errFieldType', 'Field type is required.');
        isValid = false;
    } else {
        clearVTFError('fldType', 'errFieldType');
    }

    // Section — required
    const section = document.getElementById('ddlSection').value;
    if (!section) {
        showVTFError('ddlSection', 'errSection', 'Section is required.');
        isValid = false;
    } else {
        clearVTFError('ddlSection', 'errSection');
    }

    // Display Order — optional, but must be a non-negative whole number if entered
    const displayOrderRaw = document.getElementById('txtDisplayOrder').value.trim();
    if (displayOrderRaw && !WHOLE_NUMBER_REGEX.test(displayOrderRaw)) {
        showVTFError('txtDisplayOrder', 'errDisplayOrder', 'Display order must be a whole number.');
        isValid = false;
    } else {
        clearVTFError('txtDisplayOrder', 'errDisplayOrder');
    }

    // Max Length — optional, whole number if entered
    const maxLengthRaw = document.getElementById('txtMaxLength').value.trim();
    if (maxLengthRaw && !WHOLE_NUMBER_REGEX.test(maxLengthRaw)) {
        showVTFError('txtMaxLength', 'errMaxLength', 'Max length must be a whole number.');
        isValid = false;
    } else {
        clearVTFError('txtMaxLength', 'errMaxLength');
    }

    // Decimal Places — optional, whole number if entered
    const decimalPlacesRaw = document.getElementById('txtDecimalPlaces').value.trim();
    if (decimalPlacesRaw && !WHOLE_NUMBER_REGEX.test(decimalPlacesRaw)) {
        showVTFError('txtDecimalPlaces', 'errDecimalPlaces', 'Decimal places must be a whole number.');
        isValid = false;
    } else {
        clearVTFError('txtDecimalPlaces', 'errDecimalPlaces');
    }

    return isValid;
}

// Clear a field's error as soon as the user starts fixing it
const vtfFieldErrMap = {
    ddlVoucherType: 'errVoucherType',
    fldLabel: 'errLabel',
    fldCode: 'errCode',
    fldType: 'errFieldType',
    ddlSection: 'errSection',
    txtDisplayOrder: 'errDisplayOrder',
    txtMaxLength: 'errMaxLength',
    txtDecimalPlaces: 'errDecimalPlaces'
};
Object.keys(vtfFieldErrMap).forEach(id => {
    const el = document.getElementById(id);
    const evt = (id === 'ddlVoucherType' || id === 'fldType' || id === 'ddlSection') ? 'change' : 'input';
    el?.addEventListener(evt, () => clearVTFError(id, vtfFieldErrMap[id]));
});

// Show/hide the Source* fields based on whether a Source Type is picked —
// purely cosmetic, doesn't block save either way.
function toggleSourceFieldVisibility() {
    const st = document.getElementById('ddlSourceType')?.value;
    const show = !!st;
    ['grpSourceTable', 'grpSourceValueCol', 'grpSourceTextCol', 'grpSourceFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = show ? '' : 'none';
    });
}
document.getElementById('ddlSourceType')?.addEventListener('change', toggleSourceFieldVisibility);
document.addEventListener('DOMContentLoaded', toggleSourceFieldVisibility);

// ========================================
// Save — JSON body matching VoucherFieldRequest exactly
// ========================================
async function saveRecord() {
    if (!validateVoucherTypeFieldForm()) return;

    const id = parseInt(document.getElementById('recordId').value, 10) || 0;
    const isEdit = id > 0;

    if (isEdit && !permCanEdit) {
        IV.setNotice('voucherFieldPageNotice', 'You do not have permission to edit.');
        return;
    }
    if (!isEdit && !permCanAdd) {
        IV.setNotice('voucherFieldPageNotice', 'You do not have permission to add.');
        return;
    }

    const toIntOrNull = (v) => {
        const t = (v || '').trim();
        if (t === '') return null;
        const n = parseInt(t, 10);
        return isNaN(n) ? null : n;
    };
    const toStrOrNull = (v) => {
        const t = (v || '').trim();
        return t === '' ? null : t;
    };

    // NOTE: CompanyID is intentionally NOT sent from the client — the
    // controller stamps it server-side from the logged-in user's session
    // (see VoucherTypeFieldController.Save), so it can't be spoofed here.
    const payload = {
        FieldID: id,
        VoucherId: parseInt(document.getElementById('ddlVoucherType').value, 10) || 0,
        FieldLabel: document.getElementById('fldLabel').value.trim(),
        FieldCode: document.getElementById('fldCode').value.trim(),
        FieldType: document.getElementById('fldType').value,
        Section: document.getElementById('ddlSection').value,
        DisplayOrder: parseInt(document.getElementById('txtDisplayOrder').value.trim(), 10) || 0,
        IsRequired: document.getElementById('fldRequired').checked,
        IsReadOnly: document.getElementById('fldReadOnly').checked,
        MaxLength: toIntOrNull(document.getElementById('txtMaxLength').value),
        DecimalPlaces: toIntOrNull(document.getElementById('txtDecimalPlaces').value),
        DefaultValue: toStrOrNull(document.getElementById('txtDefaultValue').value),
        SourceType: toStrOrNull(document.getElementById('ddlSourceType').value),
        SourceTable: toStrOrNull(document.getElementById('txtSourceTable').value),
        SourceValueCol: toStrOrNull(document.getElementById('txtSourceValueCol').value),
        SourceTextCol: toStrOrNull(document.getElementById('txtSourceTextCol').value),
        SourceFilter: toStrOrNull(document.getElementById('txtSourceFilter').value),
        IsActive: document.getElementById('chkIsActive').checked
    };

    const saveBtn = document.querySelector('button[onclick="saveRecord()"]');
    saveBtn?.setAttribute('disabled', 'true');

    try {
        const r = await fetch('/VoucherTypeField/Save', {
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
                    ? 'Voucher type field has been updated successfully.'
                    : 'Voucher type field has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => { window.location.href = '/VoucherTypeField/Index'; });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save voucher type field.',
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

    Object.values(vtfFieldErrMap).forEach(errId => {
        const el = document.getElementById(errId);
        if (el) el.classList.add('d-none');
    });
    Object.keys(vtfFieldErrMap).forEach(id =>
        document.getElementById(id)?.classList.remove('is-invalid')
    );

    const codeEl = document.getElementById('fldCode');
    if (codeEl) codeEl.dataset.manual = 'false';

    if ($.fn.select2) {
        $('#ddlVoucherType').trigger('change.select2');
        $('#fldType').trigger('change.select2');
        $('#ddlSection').trigger('change.select2');
        $('#ddlSourceType').trigger('change.select2');
    }
    toggleSourceFieldVisibility();
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

    // single-row toggle (checkboxEl passed from the row switch)
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

    // Disable the bulk action buttons the moment the confirmation popup
    // opens, mirroring deleteSelected() above. Restored on Cancel, on
    // error, and (implicitly) by updateButtonStates() once the list
    // reloads after a successful update.
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
                    url: '/VoucherTypeField/ToggleStatus',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(request),
                    success: function (res) {
                        if (res.success) {
                            Swal.fire('Updated!', res.message || 'Status updated successfully.', 'success')
                                .then(() => submitForm());
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
    }
    catch (err) {
        revertAll();
        updateButtonStates();
        console.error(err);
        IV.setNotice('classPageNotice', 'Could not update status.');
        location.reload();
    }
}

// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadVoucherTypeFieldPartial(queryString) {
    const container = document.getElementById('VoucherTypeFieldTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/VoucherTypeField/GetVoucherTypeFieldPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load voucher type fields');
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
    const link = e.target.closest('#VoucherTypeFieldTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadVoucherTypeFieldPartial(query);
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