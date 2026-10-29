function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#SMSTypeTable')) {
        $('#SMSTypeTable').DataTable().button(index).trigger();
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
    loadSMSTypePartial(params);
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

    if ($.fn.DataTable.isDataTable('#SMSTypeTable')) {
        $('#SMSTypeTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#SMSTypeTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `SMS Type - ${companyname}`, exportOptions: { columns: [1, 2] } },
            { extend: 'csv', title: `SMS Type - ${companyname}`, exportOptions: { columns: [1, 2] } },
            { extend: 'excel', title: `SMS Type - ${companyname}`, exportOptions: { columns: [1, 2] } },
            { extend: 'pdf', title: `SMS Type - ${companyname}`, exportOptions: { columns: [1, 2] } },
            { extend: 'print', title: `SMS Type - ${companyname}`, exportOptions: { columns: [1, 2] } }
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
            location.href = `/SMSType/Add/${window.selectedPurposesId}`;
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
        text: "You are about to delete this sms type record. This action cannot be undone!",
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
                url: '/SMSType/Delete',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'SMS type head record has been deleted.', 'success')
                            .then(() => submitForm());
                    } else {
                        updateButtonStates();
                        Swal.fire('Error!', res.message || 'Failed to delete sms type.', 'error');
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
// Validation helpers
// ========================================
const URL_REGEX = /^https?:\/\/[^\s$.?#].[^\s]*$/i;
const ALLOWED_LOGO_EXT = ['jpg', 'jpeg', 'png', 'svg', 'webp'];
const MAX_LOGO_MB = window.maxFileSizeMB || 2; // set window.maxFileSizeMB from the view if you want server value mirrored client-side

function showFieldError(inputId, errId, msg) {
    document.getElementById(inputId)?.classList.add('is-invalid');
    const err = document.getElementById(errId);
    if (err) { err.textContent = msg; err.classList.remove('d-none'); }
}

function clearFieldError(inputId, errId) {
    document.getElementById(inputId)?.classList.remove('is-invalid');
    const err = document.getElementById(errId);
    if (err) { err.textContent = ''; err.classList.add('d-none'); }
}

function validatePaymentTypeForm() {
    let isValid = true;

    // Payment Type name — required
    const name = document.getElementById('txtPaymentType').value.trim();
    if (!name) {
        showFieldError('txtPaymentType', 'nameError', 'Payment type name is required.');
        isValid = false;
    } else {
        clearFieldError('txtPaymentType', 'nameError');
    }

    // Website URL — optional, but must be a valid http(s) URL if entered
    const websiteUrl = document.getElementById('txtWebsiteUrl').value.trim();
    if (websiteUrl && !URL_REGEX.test(websiteUrl)) {
        showFieldError('txtWebsiteUrl', 'websiteUrlError', 'Enter a valid URL, e.g. https://example.com');
        isValid = false;
    } else {
        clearFieldError('txtWebsiteUrl', 'websiteUrlError');
    }

    // Display order — must be a non-negative integer if entered
    const displayOrderRaw = document.getElementById('txtDisplayOrder').value.trim();
    if (displayOrderRaw && (!/^\d+$/.test(displayOrderRaw))) {
        showFieldError('txtDisplayOrder', 'displayOrderError', 'Display order must be a whole number.');
        isValid = false;
    } else {
        clearFieldError('txtDisplayOrder', 'displayOrderError');
    }

    // Logo file — optional, but validate type/size client-side if one is chosen
    const fileEl = document.getElementById('attachmentFile');
    const file = fileEl?.files?.[0];
    if (file) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (!ALLOWED_LOGO_EXT.includes(ext)) {
            showFieldError('attachmentFile', 'fileError', `Unsupported file type. Allowed: ${ALLOWED_LOGO_EXT.join(', ')}`);
            isValid = false;
        } else if (file.size > MAX_LOGO_MB * 1024 * 1024) {
            showFieldError('attachmentFile', 'fileError', `File exceeds the ${MAX_LOGO_MB} MB limit.`);
            isValid = false;
        } else {
            clearFieldError('attachmentFile', 'fileError');
        }
    } else {
        clearFieldError('attachmentFile', 'fileError');
    }

    return isValid;
}

// ========================================
// Remove existing logo (called from the view's ✕ button)
// ========================================
function removeExistingFile() {
    document.getElementById('hdnRemoveFile').value = 'true';
    document.getElementById('hdnExistingFile').value = '';
    document.getElementById('existingFileInfo')?.remove();
    // if the user had also picked a new file, that still wins on submit —
    // only clear the "remove" flag if they pick a new file afterward
    document.getElementById('attachmentFile')?.addEventListener('change', function onPick() {
        if (this.files?.length) document.getElementById('hdnRemoveFile').value = 'false';
        this.removeEventListener('change', onPick);
    });
}

// ========================================
// Reset (called from the view's Reset button)
// ========================================
function resetForm() {
    const form = document.getElementById('accountHeadForm');
    form?.reset();
    ['nameError', 'websiteUrlError', 'displayOrderError', 'fileError'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = ''; el.classList.add('d-none'); }
    });
    ['txtPaymentType', 'txtWebsiteUrl', 'txtDisplayOrder', 'attachmentFile'].forEach(id =>
        document.getElementById(id)?.classList.remove('is-invalid')
    );
    document.getElementById('hdnRemoveFile').value = 'false';
}

// ========================================
// Save — multipart/form-data to match [FromForm] + IFormFile on the server
// ========================================
async function saveRecord() {
    if (!validatePaymentTypeForm()) return;

    const id = parseInt(document.getElementById('recordId').value, 10) || 0;
    const isEdit = id > 0;

    if (isEdit && !permCanEdit) {
        Swal.fire('Error!', 'You do not have permission to edit.', 'error');
        return;
    }
    if (!isEdit && !permCanAdd) {
        Swal.fire('Error!', 'You do not have permission to add.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('SMSTypeId', id);
    formData.append('SMSType', document.getElementById('txtPaymentType').value.trim());   
    formData.append('WebsiteUrl', document.getElementById('txtWebsiteUrl').value.trim());
    formData.append('DisplayOrder', document.getElementById('txtDisplayOrder').value.trim() || '0');
    formData.append('IsActive', document.getElementById('chkIsActive').checked);
    formData.append('ExistingFileName', document.getElementById('hdnExistingFile').value || '');
    formData.append('RemoveAttachment', document.getElementById('hdnRemoveFile').value || 'false');

    const file = document.getElementById('attachmentFile')?.files?.[0];
    if (file) formData.append('attachmentFile', file);

    const saveBtn = document.querySelector('button[onclick="saveRecord()"]');
    saveBtn?.setAttribute('disabled', 'true');

    try {
        const r = await fetch('/SMSType/Save', {
            method: 'POST',
            body: formData   // no Content-Type header — browser sets the multipart boundary itself
        });

        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        const res = await r.json();

        if (res.success !== false && res?.data?.result?.result !== 0) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit
                    ? 'SMS type has been updated successfully.'
                    : 'SMS type has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => { window.location.href = '/SMSType/Index'; });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || res?.data?.result?.message || 'Failed to save sms type.',
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
                    url: '/SMSType/ToggleStatus',
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
function loadSMSTypePartial(queryString) {
    const container = document.getElementById('SMSTypeTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/SMSType/GetSMSTypePartial?${queryString}`, {
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
    const link = e.target.closest('#SMSTypeTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadSMSTypePartial(query);
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

