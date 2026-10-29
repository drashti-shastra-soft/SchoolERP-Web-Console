function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#ItemSupplierTable')) {
        const table = $('#ItemSupplierTable').DataTable();
        table.button(index).trigger();
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
    // Sync hidden form fields from dropdowns before submit
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    if (sessionEl) document.getElementById('hdnSessionID').value = sessionEl.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;

    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadItemCategoryPartial(params);
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
document.addEventListener('DOMContentLoaded', function () {
    var companyname = localStorage.getItem("comName");
    // ── DataTable (export only) — single init, no duplicate ───────────
    if ($.fn.DataTable.isDataTable('#ItemSupplierTable')) {
        $('#ItemSupplierTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#ItemSupplierTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Item Supplier - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'csv', title: `Item Supplier - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'excel', title: `Item Supplier - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'pdf', title: `Item Supplier - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'print', title: `Item Supplier - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });

    // ── Apply Filters ─────────────────────────────────────────────────
    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        document.getElementById('hdnPageIndex').value = 1;
        document.getElementById('hdnSearch').value = document.getElementById('txtSearchInput').value;
        applyFilters();
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

    const name = document.getElementById('txtName');
    const phone = document.getElementById('txtPhone');
    const email = document.getElementById('txtEmail');
    const contactPhone = document.getElementById('txtContactPersonPhone');
    const contactEmail = document.getElementById('txtContactPersonEmail');

    name?.addEventListener('input', function () {
        clearError('txtName', 'nameError');
    });

    phone?.addEventListener('input', function () {
        clearError('txtPhone', 'phoneError');
    });

    email?.addEventListener('input', function () {
        clearError('txtEmail', 'emailError');
    });

    contactPhone?.addEventListener('input', function () {
        clearError('txtContactPersonPhone', 'contactPersonPhoneError');
    });

    contactEmail?.addEventListener('input', function () {
        clearError('txtContactPersonEmail', 'contactPersonEmailError');
    });

    const country = document.getElementById('ddlCountry');
    const state = document.getElementById('ddlState');

    $('#ddlCountry').on('change', function () {
        clearError('ddlCountry', 'countryError');
        const val = $(this).val();
        if (val) {
            loadStatesByCountry(val, 'ddlState');
        } else {
            resetSelect('ddlState', '-- Select Country First --');
            resetSelect('ddlCity', '-- Select State First --');
        }
    });

    $('#ddlState').on('change', function () {
        clearError('ddlState', 'stateError');
        const val = $(this).val();
        if (val) {
            loadCitiesByState(val, 'ddlCity');
        } else {
            resetSelect('ddlCity', '-- Select State First --');
        }
    });

    const input = document.getElementById('txtPinCode');
    const list = document.getElementById('pinCodeSuggestions');
    let debounceTimer;
    let currentItems = [];

   
    // ── PinCode autocomplete (unrelated — separate guard) ──
    if (!input || !list) {
        console.warn('PinCode autocomplete: input or list element not found');
        return;
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
    initializeEditLocation();
});

function clearError(fieldId, errorId) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);

    field?.classList.remove('is-invalid');
    error?.classList.add('d-none');
}

function showError(fieldId, errorId, message) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);

    field?.classList.add('is-invalid');

    if (error) {
        error.textContent = message;
        error.classList.remove('d-none');
    }
}

function resetSelect(id, text) {
    const select = document.getElementById(id);

    if (!select) {
        return;
    }

    select.innerHTML = `<option value="">${text}</option>`;

    if (window.jQuery && $(select).hasClass('select2-hidden-accessible')) {
        $(select).val('').trigger('change');
    }
}

async function initializeEditLocation() {
    const country = document.getElementById('ddlCountry');
    const selectedStateId =
        document.getElementById('hdnSelectedStateId')?.value;

    const selectedCityId =
        document.getElementById('hdnSelectedCityId')?.value;

    if (!country?.value) {
        return;
    }

    await loadStatesByCountry(
        country.value,
        'ddlState',
        selectedStateId
    );

    const state = document.getElementById('ddlState');

    if (state?.value) {
        await loadCitiesByState(
            state.value,
            'ddlCity',
            selectedCityId
        );
    }
}

function validateSupplierForm() {
    let isValid = true;

    const supplierName =
        document.getElementById('txtName')?.value.trim();

    const phone =
        document.getElementById('txtPhone')?.value.trim();

    const email =
        document.getElementById('txtEmail')?.value.trim();

    const contactPhone =
        document.getElementById('txtContactPersonPhone')?.value.trim();

    const contactEmail =
        document.getElementById('txtContactPersonEmail')?.value.trim();

    clearError('txtName', 'nameError');
    clearError('txtPhone', 'phoneError');
    clearError('txtEmail', 'emailError');
    clearError('txtContactPersonPhone', 'contactPersonPhoneError');
    clearError('txtContactPersonEmail', 'contactPersonEmailError');

    if (!supplierName) {
        showError(
            'txtName',
            'nameError',
            'Supplier name is required.'
        );

        isValid = false;
    }

    if (phone && !isValidPhone(phone)) {
        showError(
            'txtPhone',
            'phoneError',
            'Enter a valid phone number.'
        );

        isValid = false;
    }

    if (email && !isValidEmail(email)) {
        showError(
            'txtEmail',
            'emailError',
            'Enter a valid email address.'
        );

        isValid = false;
    }

    if (contactPhone && !isValidPhone(contactPhone)) {
        showError(
            'txtContactPersonPhone',
            'contactPersonPhoneError',
            'Enter a valid contact phone number.'
        );

        isValid = false;
    }

    if (contactEmail && !isValidEmail(contactEmail)) {
        showError(
            'txtContactPersonEmail',
            'contactPersonEmailError',
            'Enter a valid contact email address.'
        );

        isValid = false;
    }

    return isValid;
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
    return /^[0-9+\-\s()]{7,20}$/.test(value);
}

async function saveRecord() {
    const recordId =
        parseInt(document.getElementById('recordId')?.value || '0');

    const canSave = recordId > 0
        ? window.canEdit === true
        : window.canAdd === true;

    if (!canSave) {
        showPageError('You do not have permission to save this record.');
        return;
    }

    if (!validateSupplierForm()) {
        return;
    }

    const button = document.getElementById('btnSave');

    if (button) {
        button.disabled = true;
    }

    const request = {
        itemSupplierId: recordId,

        name: getValue('txtName'),
        phone: getNullableValue('txtPhone'),
        email: getNullableValue('txtEmail'),
        address: getNullableValue('txtAddress'),
        postalCode: getNullableValue('txtPinCode'),

        countryId: getNullableInt('ddlCountry'),
        stateId: getNullableInt('ddlState'),
        cityId: getNullableInt('ddlCity'),

        contactPersonName:
            getNullableValue('txtContactPersonName'),

        contactPersonPhone:
            getNullableValue('txtContactPersonPhone'),

        contactPersonEmail:
            getNullableValue('txtContactPersonEmail'),

        description:
            getNullableValue('txtDescription'),

        companyID: getNullableInt('hdnCompanyID'),
        sessionID: getNullableInt('hdnSessionID'),

        isActive:
            document.getElementById('chkIsActive')?.checked === true,

        userId: window.currentUserId || null,
        ipAddress: null
    };
    const isEdit = recordId > 0;
    try {
        const response = await fetch('/ItemSupplier/Save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(request)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || 'Unable to save item supplier.'
            );
        }

        await Swal.fire({
            icon: 'success',
            title: 'Saved',
            text: isEdit
                ? 'Item supplier has been Updated Successfully.'
                : 'Item supplier has been Added Successfully.',
            confirmButtonText: 'OK',
            customClass: {
                confirmButton: 'btn btn-success'
            },
            buttonsStyling: false
        });

        window.location.href = '/ItemSupplier/Index';
    }
    catch (error) {
        console.error('Item supplier save error:', error);

        showPageError(
            error.message || 'Unable to save item supplier.'
        );
    }
    finally {
        if (button) {
            button.disabled = false;
        }
    }
}

function getValue(id) {
    return document.getElementById(id)?.value.trim() || '';
}

function getNullableValue(id) {
    const value = getValue(id);
    return value === '' ? null : value;
}

function getNullableInt(id) {
    const value = getValue(id);

    if (!value) {
        return null;
    }

    const parsed = parseInt(value);

    return Number.isNaN(parsed) ? null : parsed;
}

function showPageError(message) {
    const notice = document.getElementById('pageNotice');

    if (notice) {
        notice.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show"
                 role="alert">
                ${escapeHtml(message)}
                <button type="button"
                        class="btn-close"
                        data-bs-dismiss="alert">
                </button>
            </div>`;
    }
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
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

        // ── Sync search into appliedFilters before submit ─────────────
        const val = this.value.trim();
        if (val) appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        else delete appliedFilters['txtSearchInput'];
        saveAppliedFilters(); // ← persist before submit
        renderFilterBadges();
        submitForm();
    }, 500);
});
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
            location.href = `/ItemSupplier/Add/${window.selectedPurposesId}`;
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
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this item supplier record. This action cannot be undone!",
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
                url: '/ItemSupplier/Delete',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Item supplier record has been deleted.', 'success')
                            .then(() => submitForm());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete item supplier.', 'error');
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
                    url: '/ItemSupplier/ToggleStatus',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(request),
                    success: function (res) {
                        if (res.success) {
                            Swal.fire('Updated!', res.message || 'Status updated successfully.', 'success')
                                .then(() => submitForm());
                        } else {
                            revertAll();
                            Swal.fire('Error!', res.message || 'Failed to update status.', 'error');
                        }
                    },
                    error: function (xhr) {
                        revertAll();
                        console.error('Status update error:', xhr.status, xhr.responseText);
                        Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                    }
                });
            } else {
                // ✅ Cancel clicked — revert whatever was toggled
                revertAll();
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


// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadItemCategoryPartial(queryString) {
    const container = document.getElementById('itemSupplierTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/ItemSupplier/GetItemSupplierPartial?${queryString}`, {
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
    const link = e.target.closest('#itemSupplierTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadItemCategoryPartial(query);
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

function toggleDescription(link) {
    const wrapper = link.closest('.desc-cell');
    const shortEl = wrapper.querySelector('.desc-short');
    const fullEl = wrapper.querySelector('.desc-full');

    const isExpanded = !fullEl.classList.contains('d-none');

    if (isExpanded) {
        // Collapse
        fullEl.classList.add('d-none');
        shortEl.classList.remove('d-none');
        link.textContent = 'View more';
    } else {
        // Expand
        shortEl.classList.add('d-none');
        fullEl.classList.remove('d-none');
        link.textContent = 'View less';
    }
}

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


//
// "Copy to another Session/Company" modal controller for Purpose
// (and any other entity that shares its Company + Session scoping).
// Pairs 1:1 with Shared/_CopyPurposeModal.cshtml.
//
// No row selection here — the table is a preview of what will be copied.
// Copy always copies ALL rows currently loaded for the source
// company/session; the Copy button just enables/disables based on whether
// From/To are both filled and not identical.
//
// This is intentionally a SEPARATE file from copySessionModal.js — even
// though both deal with Company + Session, they own different element
// IDs, a different modal (#copyPurposeModal vs #copySessionModal), and a
// different payload shape on the wire (see CopyPurposeRequestModel).
// Do NOT merge them into one shared config object.
//
// Usage from any page's own "Copy" button:
//   openCopyPurposeModal('Purpose');
//
// Element IDs this file owns (must match _CopyPurposeModal.cshtml):
//   fromAccountBudget, fromSessionBudget, toAccountBudget, toSessionBudget,
//   validationBoxBudget, tableSectionBudget, tblBudgetCopy, budgetTbody,
//   btnCopyBudget

// ── Entity column config (Company + Session scoped entities) ───────
const COMPLAINTTYPE_ENTITY_COLUMNS = {
    ComplaintType: {
        headers: ['Name', 'Phone', 'Email', 'Address', 'Contact Person Name', 'Contact Person Phone', 'Contact Person Email','Description', 'Status'],
        row: (r, i) => `
            <td>${i + 1}</td>
            <td>${r.name ?? '-'}</td>
            <td>${r.phone ?? '-'}</td>
            <td>${r.email ?? '-'}</td>
            <td>${r.address ?? '-'}</td>
            <td>${r.contactPersonName ?? '-'}</td>
            <td>${r.ContactPersonPhone ?? '-'}</td>
            <td>${r.contactPersonEmail ?? '-'}</td>
            <td>${r.description ?? '-'}</td>
            <td><span class="badge bg-${r.isActive ? 'success' : 'secondary'}-subtle
                text-${r.isActive ? 'success' : 'secondary'}">
                ${r.isActive ? 'Active' : 'Inactive'}</span></td>`
    }
    // Add more Company+Session-scoped entities here.
};

// ── Optional overrides when a controller action's name doesn't match
//    the entity key above 1:1. Example: the "LibraryPurpose" entity's
//    GET action is actually named GetAllPurposes, not "LibraryPurpose".
//    Leave an entity out of these maps if its action name == entity key.
const COMPLAINTTYPE_GET_ACTION_OVERRIDES = {
    LibraryPurpose: 'GetAllPurposes'
};
const COMPLAINTTYPE_COPY_ACTION_OVERRIDES = {
    // LibraryPurpose: 'CopyPurposes'  // uncomment/adjust if your copy action differs too
};

function purposeGetAction(entityType) {
    return COMPLAINTTYPE_GET_ACTION_OVERRIDES[entityType] || entityType;
}
function purposeCopyAction(entityType) {
    return COMPLAINTTYPE_COPY_ACTION_OVERRIDES[entityType] || `Copy${entityType}`;
}

// ── Global config set by each page's Copy button ───────────────────
let currentPurposeConfig = {
    entityType: '',   // e.g. 'Purpose'
    loadedIds: []      // ids of every row currently shown in the table —
    // this whole set is what gets copied, no per-row picking
};

// ── Bind company + session dropdowns, then load table + validate once ──
async function initPurpose() {
    try {
        const ddl = document.getElementById("fromAccountBudget");
        const ddlTo = document.getElementById("toAccountBudget");
        const sessDdl = document.getElementById("fromSessionBudget");
        const sessDdlTo = document.getElementById("toSessionBudget");
        if (!ddl || !sessDdl) return;

        ddl.innerHTML = '<option value="">From company</option>';
        ddlTo.innerHTML = '<option value="">To company</option>';
        sessDdl.innerHTML = '<option value="">Select Session</option>';
        sessDdlTo.innerHTML = '<option value="">Select To session</option>';

        const currentCompanyId = window.getCompanyId ? window.getCompanyId() : null;
        const currentSessionId = window.getSessionId ? window.getSessionId() : null;

        // Companies
        const companies = await fetchCompaniesPurpose();
        companies.forEach(c => {
            const label = c.schoolName || `Company #${c.companyId}`;

            const optFrom = new Option(label, c.companyId);
            if (currentCompanyId && String(currentCompanyId) === String(c.companyId)) {
                optFrom.selected = true;
            }
            ddl.add(optFrom);

            // "To" intentionally has no default — user must actively choose.
            ddlTo.add(new Option(label, c.companyId));
        });

        // Sessions — company-scoped via /Sessions/GetByCompany, loaded
        // for BOTH sides against the current/default company. "From"
        // stays disabled until this load actually completes; "To" is
        // enabled the same way (it isn't disabled by markup at all).
        await Promise.all([
            loadSessionsForCompanyPurpose(currentCompanyId, sessDdl, currentSessionId),
            loadSessionsForCompanyPurpose(currentCompanyId, sessDdlTo, currentSessionId)
        ]);

        // Same fix pattern as copySessionModal.js: defaulting "From" above
        // means the table needs an explicit load here, instead of waiting
        // for an onchange event that may never fire. Copy button itself
        // stays disabled until "To" is also chosen — see validateCopyBudget.
        loadPurposeTableData(currentCompanyId, currentSessionId);
        validateCopyBudget();
    } catch (e) {
        console.error(e);
    }
}

async function fetchCompaniesPurpose() {
    const resp = await fetch('/Company/GetAssignedCompanies', { method: 'GET' });
    const payload = await resp.json();
    if (!payload || payload.success !== true || !Array.isArray(payload.data)) {
        throw new Error(payload?.message || 'Failed to load companies');
    }
    return payload.data;
}

// ── Load sessions for a given company into a given <select>. ───────
//    Company-wise record fetch: always disabled while no company is
//    chosen / while the request is in flight, and only re-enabled once
//    the company-scoped session list has actually loaded. This applies
//    the same way to BOTH fromSessionBudget and toSessionBudget — the
//    only visual difference between them is the initial `disabled`
//    attribute in the markup (From starts disabled, To doesn't), not
//    the loading logic itself.
//    Backed by SessionsController.GetByCompany(int? companyId), which
//    returns { success, data: [{ sessionId, sessionTitle }, ...] }.
async function loadSessionsForCompanyPurpose(companyId, selectEl, currentSessionId) {
    if (!selectEl) return;

    if (!companyId) {
        selectEl.innerHTML = '<option value="">Select Session</option>';
        selectEl.disabled = true;
        return;
    }

    // Disable while (re)loading so a stale/previous company's sessions
    // can never be submitted mid-fetch.
    selectEl.disabled = true;
    selectEl.innerHTML = '<option value="">Loading...</option>';

    try {
        const resp = await fetch(`/Sessions/GetByCompany?companyId=${companyId}`, { method: 'GET' });
        const payload = await resp.json();

        selectEl.innerHTML = '<option value="">Select Session</option>';

        if (payload && payload.success && Array.isArray(payload.data)) {
            payload.data.forEach(s => {
                const opt = new Option(s.sessionTitle, s.sessionId);
                if (currentSessionId && String(currentSessionId) === String(s.sessionId)) {
                    opt.selected = true;
                }
                selectEl.add(opt);
            });
        }
        document.getElementById('fromSessionBudget').disabled = true;
    } catch (e) {
        console.error('loadSessionsForCompanyPurpose error:', e);
        selectEl.innerHTML = '<option value="">Select Session</option>';
    } finally {
        // Enabled again regardless of success/failure so the user can
        // retry by re-selecting the company; company-wise data is what
        // was requested either way.
        selectEl.disabled = false;
    }
}

// ── Fired when "From company" changes. Re-fetches the From session
//    list scoped to the newly chosen company, then re-validates. ───
async function onFromCompanyChangeBudget() {
    const companyId = document.getElementById('fromAccountBudget').value;
    const sessDdl = document.getElementById('fromSessionBudget');
    await loadSessionsForCompanyPurpose(companyId, sessDdl, null);
    validateCopyBudget();
}

// ── Fired when "To company" changes. Re-fetches the To session list
//    scoped to the newly chosen company, then re-validates. This is
//    the piece that was previously missing — "To session" never
//    reloaded when the destination company changed. ─────────────────
async function onToCompanyChangeBudget() {
    const companyId = document.getElementById('toAccountBudget').value;
    const sessDdlTo = document.getElementById('toSessionBudget');
    await loadSessionsForCompanyPurpose(companyId, sessDdlTo, null);
    validateCopyBudget();
}

// ── Called by every page's Copy button — ONLY ARGUMENT CHANGES ─────
function openItemCategoryModal(entityType) {
    currentPurposeConfig = { entityType, loadedIds: [] };

    //document.getElementById('tableSectionBudget').classList.add('d-none');
    document.getElementById('validationBoxBudget').classList.add('d-none');
    document.getElementById('btnCopyBudget').disabled = true;
    document.getElementById('budgetTbody').innerHTML = '';

    // Reset to the swapped default disable state on every open: From
    // session disabled until it's loaded company-wise, To session left
    // enabled (matches the markup's default `disabled` on fromSessionBudget
    // only). initPurpose() below re-populates and re-enables From once
    // its company-scoped fetch completes.
    document.getElementById('fromAccountBudget').disabled = true;
    document.getElementById('fromSessionBudget').disabled = true;

    new bootstrap.Modal(document.getElementById('copyPurposeModal')).show();
    initPurpose();
}

// ── Runs whenever a session <select> changes directly (company changes
//    now go through onFromCompanyChangeBudget/onToCompanyChangeBudget
//    above, which call this themselves after refreshing sessions). ────
function validateCopyBudget() {
    const fromAcc = document.getElementById('fromAccountBudget').value;
    const fromSess = document.getElementById('fromSessionBudget').value;
    const toAcc = document.getElementById('toAccountBudget').value;
    const toSess = document.getElementById('toSessionBudget').value;

    const allFilled = fromAcc && fromSess && toAcc && toSess;
    // Only a conflict when BOTH company and session match — copying to a
    // different session under the same company (or vice versa) is fine.
    const isSame = fromAcc === toAcc && fromSess === toSess;

    document.getElementById('validationBoxBudget').classList.toggle('d-none', !isSame);

    if (allFilled && !isSame) {
        // Reload the preview for whatever "From" is currently selected,
        // then enable Copy once we know there's something to copy.
        loadPurposeTableData(fromAcc, fromSess);
    } else {
        document.getElementById('tableSectionBudget').classList.add('d-none');
        document.getElementById('btnCopyBudget').disabled = true;
    }
}

// ── Loads (preview-only) rows for the current entity type from the
//    chosen source company/session, and enables Copy if there's data ──
async function loadPurposeTableData(fromAcc, fromSess) {
    const config = COMPLAINTTYPE_ENTITY_COLUMNS[currentPurposeConfig.entityType];
    if (!config || !fromAcc) return [];

    const thead = document.querySelector('#tblBudgetCopy thead tr');
    const tbody = document.getElementById('budgetTbody');

    try {
        thead.innerHTML = `
        <th style="width:40px">#</th>
        ${config.headers.map(h => `<th>${h}</th>`).join('')}`;

        tbody.innerHTML = `<tr>
            <td colspan="${config.headers.length + 1}" class="text-center py-3 text-muted">
                <div class="spinner-border spinner-border-sm me-2"></div>Loading...
            </td>
        </tr>`;

        const action = purposeGetAction(currentPurposeConfig.entityType);
        const resp = await fetch(`/ItemSupplier/GetAll?companyId=${fromAcc}&sessionId=${fromSess ?? 0}`);
        const res = await resp.json();

        if (!res.success || !res.data?.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${config.headers.length + 1}" class="text-center py-3 text-muted">
                        No records found.
                    </td>
                </tr>`;
            document.getElementById('tableSectionBudget').classList.remove('d-none');
            currentPurposeConfig.loadedIds = [];
            document.getElementById('btnCopyBudget').disabled = true;
            return [];
        }

        tbody.innerHTML = res.data.map((r, i) =>
            `<tr>${config.row(r, i)}</tr>`
        ).join('');

        document.getElementById('tableSectionBudget').classList.remove('d-none');

        // Copy will send every id here — no checkbox selection.
        currentPurposeConfig.loadedIds = res.data.map(r => r.id ?? r.studentHouseID ?? r.studentHouseID);
        document.getElementById('btnCopyBudget').disabled = currentPurposeConfig.loadedIds.length === 0;

        return res.data;
    } catch (err) {
        console.error('loadPurposeTableData error:', err);
        tbody.innerHTML = `
            <tr>
                <td colspan="${config.headers.length + 1}" class="text-center py-3 text-danger">
                    <i class="ti ti-alert-circle me-1"></i>Failed to load data. Please try again.
                </td>
            </tr>`;
        document.getElementById('tableSectionBudget').classList.remove('d-none');
        currentPurposeConfig.loadedIds = [];
        document.getElementById('btnCopyBudget').disabled = true;
        return [];
    }
}

// ── The Copy button click — copies every row currently loaded ──────
async function handleCopyBudget() {
    const fromAcc = document.getElementById('fromAccountBudget').value;
    const fromSess = document.getElementById('fromSessionBudget').value;
    const toAcc = document.getElementById('toAccountBudget').value;
    const toSess = document.getElementById('toSessionBudget').value;

    if (!currentPurposeConfig.entityType) {
        console.error('Unknown entity type:', currentPurposeConfig.entityType);
        return;
    }

    const payload = {
        fromCompanyId: fromAcc,
        fromSessionId: fromSess,
        toCompanyId: toAcc,
        toSessionId: toSess
    };

    const action = purposeCopyAction(currentPurposeConfig.entityType);
    document.getElementById('btnCopyBudget').disabled = true;

    try {
        const res = await fetch(`/ItemSupplier/CopyItemSupplier`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('copyPurposeModal')).hide();
            showToastPurpose(data.message, 'success');
        } else {
            showToastPurpose(data.message || 'Copy failed.', 'danger');
        }
    } catch {
        showToastPurpose('Network error. Please try again.', 'danger');
    } finally {
        document.getElementById('btnCopyBudget').disabled = false;
    }
}

function showToastPurpose(msg, type) {
    // Reuse the page-level showToast if it already exists (e.g. from
    // copySessionModal.js loaded on the same page); otherwise fall back.
    if (typeof showToast === 'function') {
        showToast(msg, type);
    } else {
        alert(msg);
    }
}

// Expose entry points pages / the partial need.
window.onFromCompanyChangeBudget = onFromCompanyChangeBudget;
window.onToCompanyChangeBudget = onToCompanyChangeBudget;
window.validateCopyBudget = validateCopyBudget;
window.handleCopyBudget = handleCopyBudget;