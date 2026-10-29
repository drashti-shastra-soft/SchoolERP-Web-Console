
function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#currenciesTable')) {
        const table = $('#currenciesTable').DataTable();
        table.button(index).trigger();
    }
}
// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_language';
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

    loadPurposePartial(params);
}

function applyFilters() {
    const searchEl = document.getElementById('txtSearchInput');

    // Search
    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    saveAppliedFilters();
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
    renderFilterBadges();          // ← ADD THIS
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';
    document.getElementById('hdnSearch').value = '';
    clearAppliedFilters();
    renderFilterBadges();          // ← ADD THIS
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}
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

$(document).ready(function () {
    var companyname = localStorage.getItem("comName");
    $('#currenciesTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Language  - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6] } },
            { extend: 'csv', title: `Language  - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6] } },
            { extend: 'excel', title: `Language  - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6] } },
            { extend: 'pdf', title: `Language  - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6] } },
            { extend: 'print', title: `Language  - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6] } }
        ],
        searching: false,
        paging: false,
        info: false
    });

});
// ============================================================
// Currency Add/Edit Page Script
// ============================================================

const permCanAdd = window.canAdd === true;
const permCanEdit = window.canEdit === true;
const permCanDelete = window.canDelete === true;
const IV = window.InlineFormValidation;
// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    attachLiveValidationHandlers();
});

// ------------------------------------------------------------
// CLEAR ERROR ON USER INPUT / SELECTION
// ------------------------------------------------------------
function attachLiveValidationHandlers() {
    const fieldIds = [
        'txtCurrencyTitle',
        'txtCurrencyCode',
        'txtCurrencySymbol',
        'txtCurrencyConvRate'
    ];

    fieldIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => clearFieldError(id));
    });

    const checkboxIds = ['chkCurrencyBase', 'chkIsActive'];
    checkboxIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', () => clearFieldError(id));
    });
}

function clearFieldError(fieldId) {
    const input = document.getElementById(fieldId);
    const err = document.getElementById('err' + fieldId.charAt(0).toUpperCase() + fieldId.slice(1));
    if (input) input.classList.remove('is-invalid');
    if (err) err.textContent = '';
    hideNotice();
}

function setFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const err = document.getElementById('err' + fieldId.charAt(0).toUpperCase() + fieldId.slice(1));
    if (input) input.classList.add('is-invalid');
    if (err) err.textContent = message;
}

function hideNotice() {
    const notice = document.getElementById('currencyModalNotice');
    if (notice) {
        notice.classList.add('d-none');
        notice.textContent = '';
    }
}

function showNotice(message) {
    const notice = document.getElementById('currencyModalNotice');
    if (notice) {
        notice.textContent = message;
        notice.classList.remove('d-none');
    } else if (window.IV && typeof IV.setNotice === 'function') {
        IV.setNotice('currencyModalNotice', message);
    }
}

// ------------------------------------------------------------
// VALIDATION
// ------------------------------------------------------------
function validateCurrencyForm() {
    let isValid = true;

    // Clear all previous errors first
    ['txtCurrencyTitle', 'txtCurrencyCode', 'txtCurrencySymbol', 'txtCurrencyConvRate']
        .forEach(clearFieldError);

    const title = document.getElementById('txtCurrencyTitle').value.trim();
    const code = document.getElementById('txtCurrencyCode').value.trim();
    const symbol = document.getElementById('txtCurrencySymbol').value.trim();
    const rateRaw = document.getElementById('txtCurrencyConvRate').value.trim();

    // ---- Currency Title ----
    if (!title) {
        setFieldError('txtCurrencyTitle', 'Currency title is required.');
        isValid = false;
    } else if (title.length > 100) {
        setFieldError('txtCurrencyTitle', 'Currency title cannot exceed 100 characters.');
        isValid = false;
    }

    // ---- Currency Code ----
    if (!code) {
        setFieldError('txtCurrencyCode', 'Currency code is required.');
        isValid = false;
    } else if (!/^[A-Za-z]{3,5}$/.test(code)) {
        setFieldError('txtCurrencyCode', 'Currency code must be 3-5 letters (e.g. USD).');
        isValid = false;
    }

    // ---- Currency Symbol ----
    if (!symbol) {
        setFieldError('txtCurrencySymbol', 'Currency symbol is required.');
        isValid = false;
    } else if (symbol.length > 10) {
        setFieldError('txtCurrencySymbol', 'Currency symbol cannot exceed 10 characters.');
        isValid = false;
    }

    // ---- Conversion Rate ----
    if (!rateRaw) {
        setFieldError('txtCurrencyConvRate', 'Conversion rate is required.');
        isValid = false;
    } else {
        const rate = parseFloat(rateRaw);
        if (isNaN(rate)) {
            setFieldError('txtCurrencyConvRate', 'Conversion rate must be a valid number.');
            isValid = false;
        } else if (rate <= 0) {
            setFieldError('txtCurrencyConvRate', 'Conversion rate must be greater than 0.');
            isValid = false;
        }
    }

    return isValid;
}

// ------------------------------------------------------------
// SAVE
// ------------------------------------------------------------
async function saveItem() {
    const cid = parseInt(document.getElementById('txtItemId').value) || 0;

    if (cid === 0 && !permCanAdd) {
        showNotice('You do not have permission to add.');
        return;
    }
    if (cid > 0 && !permCanEdit) {
        showNotice('You do not have permission to edit.');
        return;
    }

    if (!validateCurrencyForm()) return;

    hideNotice();

    const title = document.getElementById('txtCurrencyTitle').value.trim();
    const code = document.getElementById('txtCurrencyCode').value.trim();
    const symbol = document.getElementById('txtCurrencySymbol').value.trim();
    const rate = parseFloat(document.getElementById('txtCurrencyConvRate').value);
    const isEdit = cid > 0;
    const data = {
        currencyId: cid,
        currencyTitle: title,
        currencyCode: code,
        currencySymbol: symbol,
        currencyConvRate: rate,
        currencyBase: document.getElementById('chkCurrencyBase').checked,
        isActive: document.getElementById('chkIsActive').checked
    };

    const btn = document.getElementById('btnSave');
    const originalHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';
    }

    try {
        const resp = await fetch('/Currencies/Save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const res = await resp.json();

        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit
                    ? 'Currency has been updated successfully.'
                    : 'Currency has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                window.location.href = '/Currencies/Index';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save currencies.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
    } catch (err) {
        console.error(err);
        showNotice('Could not save currency.');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml || '<i class="ti ti-device-floppy me-1"></i> Save';
        }
    }
}

function selectItem(id, row) {
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
    if (!permCanEdit) {
        IV.setNotice('languagePageNotice', 'You do not have permission to edit.');
        return;
    }

    if (window.selectedPurposesId === 0) return;
    IV.clearNotice('classPageNotice');
    try {

        if (window.selectedPurposesId) {
            location.href = `/Currencies/Add/${window.selectedPurposesId}`;
        }

    } catch (err) {
        console.error(err);
    }
}

async function deleteSelected() {
    if (!permCanDelete) {
        IV.setNotice('languagePageNotice', 'You do not have permission to delete.');
        return;
    }

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
        text: "You are about to delete this currencies record. This action cannot be undone!",
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
                url: '/Currencies/Delete',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Currencies record has been deleted.', 'success')
                            .then(() => refreshCurrencyList());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete currencies.', 'error');
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
                    url: '/Currencies/ToggleStatus',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(request),
                    success: function (res) {
                        if (res.success) {
                            Swal.fire('Updated!', res.message || 'Status updated successfully.', 'success')
                                .then(() => refreshCurrencyList());
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
function loadPurposePartial(queryString) {
    const container = document.getElementById('currencyTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/Currencies/GetCurrencyPartial?${queryString}`, {
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
    const link = e.target.closest('#currencyTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadPurposePartial(query);
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
// Helper — rebuild current filter/page querystring and refresh partial
// ========================================
function refreshCurrencyList() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    if (sessionEl) document.getElementById('hdnSessionID').value = sessionEl.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;

    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadPurposePartial(params);
}