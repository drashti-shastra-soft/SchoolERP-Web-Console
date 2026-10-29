function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#PaymentTypeTable')) {
        $('#PaymentTypeTable').DataTable().button(index).trigger();
    }
}

$('#txtName').on('input', function () {
    this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
});
// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_complaintType';
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
    loadPaymentTypePartial(params);
}

function applyFilters() {
    const searchEl = document.getElementById('txtSearchInput');

    // Search
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
    // Clear the matching dropdown/input
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

    if ($.fn.DataTable.isDataTable('#PaymentTypeTable')) {
        $('#PaymentTypeTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#PaymentTypeTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Payment Type - ${companyname}`, exportOptions: { columns: [1, 2] } },
            { extend: 'csv', title: `Payment Type - ${companyname}`, exportOptions: { columns: [1, 2] } },
            { extend: 'excel', title: `Payment Type - ${companyname}`, exportOptions: { columns: [1, 2] } },
            { extend: 'pdf', title: `Payment Type - ${companyname}`, exportOptions: { columns: [1, 2] } },
            { extend: 'print', title: `Payment Type - ${companyname}`, exportOptions: { columns: [1, 2] } }
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
// Search input — debounced server submit
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
window.selectedPurposesId = 0;
const classFieldMap = { txtClassName: 'errTxtClassName', ddlSections: 'errDdlSections' };




function clearModalValidation() {
    IV.clearMap(classFieldMap);
    IV.clearNotice('classModalNotice');
}

IV.bindAutoClear(classFieldMap);

function selectItem(id, row) {
    IV.clearNotice('classPageNotice');
    window.selectedPurposesId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    //row.classList.add('bg-light');
    //row.querySelector('input[type="radio"]').checked = true;
    const btnEdit = document.getElementById('btnEdit');
    const btnDelete = document.getElementById('btnDelete');
    if (btnEdit && permCanEdit) btnEdit.disabled = false;
    if (btnDelete && permCanDelete) btnDelete.disabled = false;
    let checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    // Edit sirf 1 record select hone par
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
}



async function editSelected() {
    if (!canEdit) {
        IV.setNotice('classPageNotice', 'You do not have permission to edit.');
        return;
    }
    if (window.selectedPurposesId === 0) return;
    IV.clearNotice('classPageNotice');
    clearModalValidation();
    try {

        if (window.selectedPurposesId) {
            location.href = `/PaymentTypeField/Add/${window.selectedPurposesId}`;
        }

    } catch (err) {
        console.error(err);
    }
}

async function deleteSelected() {
    if (!canDelete) {
        IV.setNotice('classPageNotice', 'You do not have permission to delete.');
        return;
    }

    let selectedIds = [];
    $('.student-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        alert("Please select at least one Class.");
        return;
    }

    // Disable the action buttons the moment the confirmation popup opens,
    // so the user can't fire the same (or another) action again while it's
    // showing. They're restored below on Cancel, and again by
    // updateButtonStates() once the list reloads after a successful delete.
    $('#btnActive, #btnInactive, #btnDelete').prop('disabled', true);

    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this voucher type record. This action cannot be undone!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        customClass: {
            customClass: {
                confirmButton: 'btn btn-danger me-2',
                cancelButton: 'btn btn-secondary'
            },
            buttonsStyling: false
        }
    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                url: '/PaymentTypeField/Delete',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Voucher type head record has been deleted.', 'success')
                            .then(() => submitForm());
                    } else {
                        updateButtonStates();
                        Swal.fire('Error!', res.message || 'Failed to delete voucher type.', 'error');
                    }
                },
                error: function () {
                    updateButtonStates();
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        } else {
            // Cancel clicked — selection didn't change, so just restore
            // the buttons to whatever state the current selection implies.
            updateButtonStates();
        }
    });
}
// ========================================
// Auto-generate Field Key from Field Label
// ========================================
function autoFillKey() {
    const keyEl = document.getElementById('fldKey');
    if (!keyEl) return;
    // Only auto-fill if the user hasn't manually typed a key yet
    if (keyEl.dataset.manual === 'true') return;

    const label = document.getElementById('fldLabel').value || '';
    keyEl.value = label
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9\s_]/g, '')
        .replace(/\s+/g, '_');
}

document.getElementById('fldKey')?.addEventListener('input', function () {
    this.dataset.manual = 'true';
});

// ========================================
// Field-level error helpers (scoped to this form)
// ========================================
function showPTFError(inputId, errId, msg) {
    document.getElementById(inputId)?.classList.add('is-invalid');
    const err = document.getElementById(errId);
    if (err) { err.textContent = msg; err.classList.remove('d-none'); }
}

function clearPTFError(inputId, errId) {
    document.getElementById(inputId)?.classList.remove('is-invalid');
    const err = document.getElementById(errId);
    if (err) { err.classList.add('d-none'); }
}

// ========================================
// Validation
// ========================================
const FIELD_KEY_REGEX = /^[A-Za-z0-9_]+$/;

function validatePaymentTypeFieldForm() {
    let isValid = true;

    // Payment Type — required
    const paymentTypeId = parseInt(document.getElementById('ddlPaymentType').value, 10) || 0;
    if (paymentTypeId <= 0) {
        showPTFError('ddlPaymentType', 'errPaymentType', 'Please select a payment type.');
        isValid = false;
    } else {
        clearPTFError('ddlPaymentType', 'errPaymentType');
    }

    // Field Label — required
    const label = document.getElementById('fldLabel').value.trim();
    if (!label) {
        showPTFError('fldLabel', 'errLabel', 'Field label is required.');
        isValid = false;
    } else {
        clearPTFError('fldLabel', 'errLabel');
    }

    // Field Key — required, letters/numbers/underscore only
    const key = document.getElementById('fldKey').value.trim();
    if (!key) {
        showPTFError('fldKey', 'errKey', 'Field key is required.');
        isValid = false;
    } else if (!FIELD_KEY_REGEX.test(key)) {
        showPTFError('fldKey', 'errKey', 'Field key can only contain letters, numbers, and underscores.');
        isValid = false;
    } else {
        clearPTFError('fldKey', 'errKey');
    }

    // Display Order — optional, but must be a non-negative whole number if entered
    const displayOrderRaw = document.getElementById('txtDisplayOrder').value.trim();
    if (displayOrderRaw && !/^\d+$/.test(displayOrderRaw)) {
        showPTFError('txtDisplayOrder', 'errDisplayOrder', 'Display order must be a whole number.');
        isValid = false;
    } else {
        clearPTFError('txtDisplayOrder', 'errDisplayOrder');
    }

    return isValid;
}

// Clear a field's error as soon as the user starts fixing it
['ddlPaymentType', 'fldLabel', 'fldKey', 'txtDisplayOrder'].forEach(id => {
    const el = document.getElementById(id);
    const errMap = {
        ddlPaymentType: 'errPaymentType',
        fldLabel: 'errLabel',
        fldKey: 'errKey',
        txtDisplayOrder: 'errDisplayOrder'
    };
    el?.addEventListener(id === 'ddlPaymentType' ? 'change' : 'input', () => clearPTFError(id, errMap[id]));
});

// ========================================
// Save — JSON body matching PaymentFieldRequest
// ========================================
async function saveRecord() {
    if (!validatePaymentTypeFieldForm()) return;

    const id = parseInt(document.getElementById('recordId').value, 10) || 0;
    const isEdit = id > 0;

    if (isEdit && !permCanEdit) {
        IV.setNotice('classPageNotice', 'You do not have permission to edit.');
        return;
    }
    if (!isEdit && !permCanAdd) {
        IV.setNotice('classPageNotice', 'You do not have permission to add.');
        return;
    }

    const payload = {
        FieldID: id,
        PaymentTypeId: parseInt(document.getElementById('ddlPaymentType').value, 10) || 0,
        FieldLabel: document.getElementById('fldLabel').value.trim(),
        FieldKey: document.getElementById('fldKey').value.trim(),
        FieldType: document.getElementById('fldType').value,
        IsRequired: document.getElementById('fldRequired').checked,
        IsSecret: document.getElementById('fldSecret').checked,
        DisplayOrder: parseInt(document.getElementById('txtDisplayOrder').value.trim(), 10) || 0,
        IsActive: document.getElementById('chkIsActive').checked
    };

    const saveBtn = document.querySelector('button[onclick="saveRecord()"]');
    saveBtn?.setAttribute('disabled', 'true');

    try {
        const r = await fetch('/PaymentTypeField/Save', {
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
                    ? 'Payment type field has been updated successfully.'
                    : 'Payment type field has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => { window.location.href = '/PaymentTypeField/Index'; });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save payment type field.',
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

    ['errLabel', 'errKey', 'errDisplayOrder', 'errPaymentType'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('d-none');
    });
    ['fldLabel', 'fldKey', 'txtDisplayOrder', 'ddlPaymentType'].forEach(id =>
        document.getElementById(id)?.classList.remove('is-invalid')
    );

    const keyEl = document.getElementById('fldKey');
    if (keyEl) keyEl.dataset.manual = 'false';

    if ($.fn.select2) $('#ddlPaymentType').trigger('change.select2');
}
async function toggleStatus(id, isActive, checkboxEl) {
    if (!permCanEdit) {
        IV.setNotice('classPageNotice', 'You do not have permission to change status.');
        if (checkboxEl) checkboxEl.checked = !isActive;
        location.reload();
        return;
    }

    // ✅ collect both ids AND the actual checkbox elements
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
            showToast('Please select at least one user', false);
            return;
        }
    }

    const request = {
        ids: sectionIds.join(','),
        isActive: isActive
    };

    // helper to revert every affected checkbox
    function revertAll() {
        checkedBoxes.forEach(cb => { cb.checked = !isActive; });
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
                    url: '/PaymentTypeField/ToggleStatus',
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
                // ✅ Cancel clicked — revert whatever was toggled, and
                // restore the buttons to match the current selection.
                revertAll();
                updateButtonStates();
            }
        });
    }
    catch (err) {
        revertAll();
        updateButtonStates();
        console.error(err);
        IV.setNotice('sectionPageNotice', 'Could not update status.');
        location.reload();
    }
}


// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadPaymentTypePartial(queryString) {
    const container = document.getElementById('PaymentTypeTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/PaymentTypeField/GetPaymentTypeFieldPartial?${queryString}`, {
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
            updateButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// ✅ Pagination click interception, scoped to the hostel type container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#PaymentTypeTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadPaymentTypePartial(query);
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

