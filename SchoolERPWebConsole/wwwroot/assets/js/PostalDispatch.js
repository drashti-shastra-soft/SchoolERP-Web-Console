// Letters-only fields
$('#txtToTitle, #txtFromTitle, #txtNote').on('input', function () {
    this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
});
// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_postalDispatch';
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
    // Sync hidden form fields from dropdowns before submit
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    if (sessionEl) document.getElementById('hdnSessionID').value = sessionEl.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;
    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadPostalDispatchPartial(params);


}

function applyFilters() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const searchEl = document.getElementById('txtSearchInput');

    // Search
    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    // Session
    if (sessionEl?.value && sessionEl.value !== '') {
        appliedFilters['ddlFilterSessions'] = {
            label: 'Session',
            text: sessionEl.options[sessionEl.selectedIndex]?.text || sessionEl.value
        };
    } else delete appliedFilters['ddlFilterSessions'];

    // Company
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
    // Clear the matching dropdown/input
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
    var companyname = localStorage.getItem("comName");
    // ── DataTable (export only) ───────────────────────────────────────
    if ($.fn.DataTable.isDataTable('#tblPostalDispatch')) {
        $('#tblPostalDispatch').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#tblPostalDispatch').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Postal Dispatch - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'csv', title: `Postal Dispatch - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'excel', title: `Postal Dispatch - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'pdf', title: `Postal Dispatch - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'print', title: `Postal Dispatch - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } }
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
        renderFilterBadges();
        submitForm();
    });

    // ── Reset Filters ─────────────────────────────────────────────────
    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
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
    });

    // ── Render badges on load ─────────────────────────────────────────
    renderFilterBadges();


    const input = document.getElementById('txtPinCode');
    const list = document.getElementById('pinCodeSuggestions');

    let debounceTimer;
    let currentItems = [];


    // ── PinCode autocomplete (unrelated — separate guard) ──
    if (!input || !list) {
        console.warn('PinCode autocomplete: input or list element not found');
        return;
    }

    // ── Country -> State -> City cascade ──
    const formCountry = document.getElementById('ddlCountry');
    if (formCountry) {
        const preselectState = document.getElementById('hdnSelectedStateId')?.value;
        const preselectCity = document.getElementById('hdnSelectedCityId')?.value;

        if (window.jQuery) {
            jQuery(formCountry).on('change', function () {
                loadStatesByCountry(this.value, 'ddlState');
            });
        } else {
            formCountry.addEventListener('change', function () {
                loadStatesByCountry(this.value, 'ddlState');
            });
        }

        if (formCountry.value) {
            loadStatesByCountry(formCountry.value, 'ddlState', preselectState).then(() => {
                const stateEl = document.getElementById('ddlState');
                if (stateEl && stateEl.value) {
                    loadCitiesByState(stateEl.value, 'ddlCity', preselectCity);
                }
            });
        }
    }

    const formState = document.getElementById('ddlState');
    if (formState) {
        if (window.jQuery) {
            jQuery(formState).on('change', function () {
                loadCitiesByState(this.value, 'ddlCity');
            });
        } else {
            formState.addEventListener('change', function () {
                loadCitiesByState(this.value, 'ddlCity');
            });
        }
    }

    // ── PinCode input listener (clean, no validation code inside) ──
    input.addEventListener('input', function () {
        const term = this.value.trim();
        clearTimeout(debounceTimer);

        if (term.length < 2) {
            hideList();
            return;
        }
        debounceTimer = setTimeout(() => fetchPinCodes(term), 300);
    });

    async function fetchPinCodes(term) {
        try {
            const res = await fetch(`/Hostel/SearchPostalCode?term=${encodeURIComponent(term)}`);
            const result = await res.json();

            if (result.success && result.data && result.data.length > 0) {
                currentItems = result.data;
                renderList(currentItems);
            } else {
                hideList();
            }
        } catch (err) {
            console.error('SearchPostalCode error:', err);
            hideList();
        }
    }

    function renderList(items) {
        list.innerHTML = '';
        items.forEach((item, idx) => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action';
            li.style.cursor = 'pointer';
            li.textContent = `${item.postalCode ?? item.postalCode}`;
            li.addEventListener('click', () => selectPinItem(idx));
            list.appendChild(li);
        });
        list.style.display = 'block';
    }

    async function selectPinItem(idx) {
        const item = currentItems[idx];
        input.value = item.postalCode ?? item.postalCode;
        hideList();
        const countryId = item.countryId ?? item.countryId;
        const stateId = item.stateId ?? item.stateId;
        const cityId = item.cityId ?? item.cityId;

        if (countryId) {
            $('#ddlCountry').val(countryId).trigger('change.select2');
            $('#ddlCountry').trigger('change');
        }

        if (countryId && stateId) {
            await loadStatesByCountry(countryId, 'ddlState', stateId);
        }

        if (stateId && cityId) {
            await loadCitiesByState(stateId, 'ddlCity', cityId);
        }
    }

    function hideList() {
        list.style.display = 'none';
        list.innerHTML = '';
    }

    document.addEventListener('click', function (e) {
        if (!input.contains(e.target) && !list.contains(e.target)) {
            hideList();
        }
    });

    // ────────────────────────────────────────────────────────────────
    // Add/Edit Postal Dispatch form — real-time validation error clearing
    // Guarded so this is a no-op on pages that don't have this form.
    // ────────────────────────────────────────────────────────────────
    const postalFormEl = document.getElementById('postalForm');
    if (postalFormEl) {
        ['txtToTitle', 'txtDate'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => {
                clearFieldError(id, 'err' + id.replace('txt', ''));
            });
        });
    }


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

        // ── Sync search into appliedFilters before submit ─────────────
        const val = this.value.trim();
        if (val) appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        else delete appliedFilters['txtSearchInput'];
        saveAppliedFilters(); // ← persist before submit
        renderFilterBadges();
        submitForm();
    }, 500);
});

let selectedId = 0;
const canEdit = window.canEdit;
const canDelete = window.canDelete;

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#tblPostalDispatch')) {
        const table = $('#tblPostalDispatch').DataTable();
        table.button(index).trigger();
    }
}





function selectItem(id, row) {
    selectedId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    row.classList.add('bg-light');
    //row.querySelector('input[type="radio"]').checked = true;

    if (canEdit) document.getElementById('btnEdit').disabled = false;
    if (canDelete) document.getElementById('btnDelete').disabled = false;
    let checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    // Edit sirf 1 record select hone par
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
}


function editSelected() {
    if (!selectedId) return;

    try {

        if (selectedId) {
            location.href = `/FrontOffice/AddPostalDispatch/${selectedId}`;
        }

    } catch (err) {
        console.error(err);
    }

}

// ========================================
// Postal Dispatch form — field-level validation helpers
// ========================================

/**
 * Shows an inline error message below a field and marks the field as invalid.
 */
function setFieldError(inputId, errId, message) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(errId);

    if (input) input.classList.add('is-invalid');
    if (err) {
        err.textContent = message;
        err.style.display = 'block';
    }
}

/**
 * Clears an inline error message and invalid state for a field.
 */
function clearFieldError(inputId, errId) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(errId);

    if (input) input.classList.remove('is-invalid');
    if (err) {
        err.textContent = '';
        err.style.display = 'none';
    }
}

document.getElementById('txtPinCode')?.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 6);
    clearFieldError('txtPinCode', 'errPinCode');
});
/**
 * Validates the Add/Edit Postal Dispatch form.
 * Returns true if the form is valid, false otherwise (and displays inline errors).
 */
function validatePostalForm() {
    let isValid = true;

    const fieldErrorPairs = [
        ['txtToTitle', 'errToTitle'],
        ['txtDate', 'errDate'],
        ['txtPinCode', 'errPinCode']
    ];
    fieldErrorPairs.forEach(([inputId, errId]) => clearFieldError(inputId, errId));

    // ── To Title ─────────────────────────────────────────────────────
    const toTitle = document.getElementById('txtToTitle')?.value.trim() || '';
    if (!toTitle) {
        setFieldError('txtToTitle', 'errToTitle', 'To Title is required.');
        isValid = false;
    } else if (toTitle.length < 2) {
        setFieldError('txtToTitle', 'errToTitle', 'To Title must be at least 2 characters.');
        isValid = false;
    }

    // ── Pin Code ─────────────────────────────────────────────────────
    const pinCode = document.getElementById('txtPinCode')?.value.trim() || '';
    if (!pinCode) {
        setFieldError('txtPinCode', 'errPinCode', 'Pin Code is required.');
        isValid = false;
    } else if (!/^\d+$/.test(pinCode)) {
        setFieldError('txtPinCode', 'errPinCode', 'Pin Code must contain digits only.');
        isValid = false;
    } else if (pinCode.length !== 6) {
        setFieldError('txtPinCode', 'errPinCode', 'Pin Code must be exactly 6 digits.');
        isValid = false;
    } else if (!/^[1-9]/.test(pinCode)) {
        setFieldError('txtPinCode', 'errPinCode', 'Pin Code cannot start with 0.');
        isValid = false;
    }
    // ── Date ─────────────────────────────────────────────────────────
    const dateVal = document.getElementById('txtDate')?.value;
    if (!dateVal) {
        setFieldError('txtDate', 'errDate', 'Date is required.');
        isValid = false;
    } else {
        const selectedDate = new Date(dateVal);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (selectedDate > today) {
            setFieldError('txtDate', 'errDate', 'Date cannot be in the future.');
            isValid = false;
        }
    }

    return isValid;
}

function saveRecord() {
    const form = document.getElementById('postalForm');

    if (!validatePostalForm()) {
        const firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    const formData = new FormData();
    formData.append('postalDispatchID', parseInt(document.getElementById('hdnPostalDispatchID').value) || 0);
    formData.append('companyID', parseInt(document.getElementById('hdnCompanyID').value) || 0);
    formData.append('sessionID', parseInt(document.getElementById('hdnSessionID').value) || 0);
    formData.append('toTitle', document.getElementById('txtToTitle').value.trim());
    formData.append('fromTitle', document.getElementById('txtFromTitle').value.trim() || '');
    formData.append('referenceNo', document.getElementById('txtReferenceNo').value.trim() || '');
    formData.append('address', document.getElementById('txtAddress').value.trim() || '');
    formData.append('note', document.getElementById('txtNote').value.trim() || '');
    formData.append('date', document.getElementById('txtDate').value);
    formData.append('isActive', document.getElementById('chkActive').checked);
    var id = parseInt(document.getElementById('hdnPostalDispatchID').value) || 0;
    formData.append('postalCode', document.getElementById('txtPinCode').value.trim() || null);
    formData.append('countryId', document.getElementById('ddlCountry').value || null);
    formData.append('stateId', document.getElementById('ddlState').value || null);
    formData.append('cityId', document.getElementById('ddlCity').value || null);
    const isEdit = id > 0;
    const fileInput = document.getElementById('attachmentFile');
    if (fileInput.files[0]) {
        formData.append('attachmentFile', fileInput.files[0]);
    }

    fetch('/FrontOffice/SavePostalDispatch', {
        method: 'POST',
        body: formData
    })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Saved!',
                    text: isEdit
                        ? 'Postal Dispatch has been Updated Successfully.'
                        : 'Postal Dispatch has been Added Successfully.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                }).then(() => {
                    window.location.href = '/FrontOffice/PostalDispatch';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: res.message || 'Failed to save postal dispatch.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-danger' },
                    buttonsStyling: false
                });
            }
        })
        .catch(() => {
            Swal.fire('Error!', 'An unexpected error occurred while saving.', 'error');
        });
}

function deleteSelected() {
    if (!selectedId) return;


    let selectedIds = [];
    $('.student-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        alert("Please select at least one student.");
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this postal dispatch record. This action cannot be undone!",
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
                url: '/FrontOffice/DeletePostalDispatch',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Postal dispatch record has been deleted.', 'success')
                            .then(() => location.reload());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete postal dispatch.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}


async function toggleStatus(id, isActive, checkboxEl) {
    if (!canEdit) {
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

    //// helper to revert every affected checkbox
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
                    url: '/FrontOffice/TogglePostalDispatchStatus',
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
    }
    catch (err) {
        revertAll();
        console.error(err);
        IV.setNotice('sectionPageNotice', 'Could not update status.');
        location.reload();
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

function removeExistingFile() {
    document.getElementById('existingFileInfo')?.remove();
    document.getElementById('hdnRemoveFile').value = 'true';
    document.getElementById('hdnExistingFile').value = '';
}
const maxFileSizeMB = 1;
const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

document.getElementById('attachmentFile')?.addEventListener('change', function () {

    const fileInfo = document.getElementById('fileInfo');
    const file = this.files[0];

    if (!file) {
        fileInfo.textContent = '';
        return;
    }

    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

    if (file.size > maxFileSizeBytes) {
        fileInfo.textContent = `File is ${sizeMB} MB. Max allowed size is ${maxFileSizeMB} MB.`;
        fileInfo.classList.remove('text-muted');
        fileInfo.classList.add('text-danger');
        this.value = '';
    } else {
        fileInfo.textContent = `Selected file size: ${sizeMB} MB`;
        fileInfo.classList.remove('text-danger');
        fileInfo.classList.add('text-muted');

        document.getElementById('hdnRemoveFile').value = 'false';
        document.getElementById('existingFileInfo')?.remove();
    }
});


// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadPostalDispatchPartial(queryString) {
    const container = document.getElementById('postalDispatchTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/FrontOffice/GetPostalDispatchPartial?${queryString}`, {
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

            if ($.fn.DataTable.isDataTable('#tblPostalDispatch')) {
                $('#tblPostalDispatch').DataTable().destroy();
            }
            exportTable = $('#tblPostalDispatch').DataTable({
                dom: 'Bfrtip',
                buttons: [
                    { extend: 'copy', exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'csv', exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'excel', exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'pdf', exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'print', exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } }
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

// ✅ Pagination click interception, scoped to the hostel type container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#postalDispatchTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadPostalDispatchPartial(query);
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
// ========================================
// Country -> State -> City cascade (shared helpers)
// ========================================
async function loadStatesByCountry(countryId, targetSelectId, preselectStateId = null) {
    const stateEl = document.getElementById(targetSelectId);
    if (!stateEl) return;

    stateEl.innerHTML = '<option value="">-- Select --</option>';
    if (window.jQuery && jQuery(stateEl).data('select2')) jQuery(stateEl).trigger('change');

    if (!countryId) return;

    try {
        const res = await fetch(`/PostalCode/GetStatesByCountry?countryID=${countryId}`);
        const result = await res.json();
        const states = result.data || [];
        stateEl.innerHTML = '<option value="">Select</option>';
        states.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.stateId;
            opt.textContent = s.stateName;
            if (preselectStateId && parseInt(preselectStateId) === s.stateId) opt.selected = true;
            stateEl.appendChild(opt);
        });
        if (window.jQuery && jQuery(stateEl).data('select2')) jQuery(stateEl).trigger('change');
    } catch (err) {
        console.error('Failed to load states:', err);
    }
}

async function loadCitiesByState(stateId, targetSelectId, preselectCityId = null) {
    const cityEl = document.getElementById(targetSelectId);
    if (!cityEl) return;

    cityEl.innerHTML = '<option value="">-- Select --</option>';
    if (window.jQuery && jQuery(cityEl).data('select2')) jQuery(cityEl).trigger('change');

    if (!stateId) return;

    try {
        const res = await fetch(`/PostalCode/GetCitiesByState?stateID=${stateId}`);
        const result = await res.json();
        const cities = result.data || [];
        cityEl.innerHTML = '<option value="">Select</option>';
        cities.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.cityId;
            opt.textContent = c.cityName;
            if (preselectCityId && parseInt(preselectCityId) === c.cityId) opt.selected = true;
            cityEl.appendChild(opt);
        });
        if (window.jQuery && jQuery(cityEl).data('select2')) jQuery(cityEl).trigger('change');
    } catch (err) {
        console.error('Failed to load cities:', err);
    }
}


(function () {
    var modalEl = document.getElementById('modalDispatchAttachment');
    if (!modalEl || modalEl.dataset.bound === '1') return;
    modalEl.dataset.bound = '1';

    var modalAttachment = new bootstrap.Modal(modalEl);
    //var loading = document.getElementById('dispatchAttachmentLoading');
    var img = document.getElementById('imgDispatchAttachment');
    var frame = document.getElementById('frmDispatchAttachment');
    var unsupported = document.getElementById('dispatchAttachmentUnsupported');
    var btnDownload = document.getElementById('btnDownloadDispatchAttachment');
    var btnDownloadLabel = document.getElementById('btnDownloadDispatchAttachmentLabel');

    var currentUrl = '';
    var currentFileName = '';

    var IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];
    var PDF_EXTS = ['pdf'];

    function getExtension(name) {
        var parts = (name || '').split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }

    function resetPreview() {
       // loading.style.display = 'flex';
        img.style.display = 'none';
        img.src = '';
        frame.style.display = 'none';
        frame.src = '';
        unsupported.classList.add('d-none');
        unsupported.classList.remove('d-flex');
    }

    // Reset the preview each time the popup closes so the previous
    // file doesn't briefly flash before the next one loads.
    modalEl.addEventListener('hidden.bs.modal', resetPreview);

    window.viewDispatchAttachment = function (id, title, fileName, attachmentPath) {
        currentUrl = attachmentPath;
        currentFileName = fileName || 'attachment';

        document.getElementById('modalDispatchAttachmentTitle').textContent = title || 'Attachment';
        resetPreview();

        var ext = getExtension(fileName);

        if (IMAGE_EXTS.indexOf(ext) !== -1) {
            img.onload = function () {
               // loading.style.display = 'none';
                img.style.display = 'block';
            };
            img.onerror = function () {
              //  loading.style.display = 'none';
                unsupported.classList.remove('d-none');
                unsupported.classList.add('d-flex');
            };
            img.src = attachmentPath;
        } else if (PDF_EXTS.indexOf(ext) !== -1) {
            frame.onload = function () {
              //  loading.style.display = 'none';
                frame.style.display = 'block';
            };
            frame.src = attachmentPath;
        } else {
           // loading.style.display = 'none';
            unsupported.classList.remove('d-none');
            unsupported.classList.add('d-flex');
        }

        modalAttachment.show();
    };

    // ── Download button: fetches the file as a blob and saves it
    // locally instead of navigating the browser away from the popup.
    btnDownload.addEventListener('click', function () {
        if (!currentUrl) return;

        btnDownload.disabled = true;
        btnDownloadLabel.textContent = 'Downloading...';

        fetch(currentUrl)
            .then(function (res) {
                if (!res.ok) throw new Error('Download failed');
                return res.blob();
            })
            .then(function (blob) {
                var blobUrl = window.URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = blobUrl;
                a.download = currentFileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(blobUrl);
            })
            .catch(function (err) {
                console.error(err);
                if (window.Swal) {
                    Swal.fire('Error!', 'Could not download the attachment.', 'error');
                } else {
                    alert('Could not download the attachment.');
                }
            })
            .finally(function () {
                btnDownload.disabled = false;
                btnDownloadLabel.textContent = 'Download';
            });
    });
})();

