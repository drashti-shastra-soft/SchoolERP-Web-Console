function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#ItemItemIssueTable')) {
        const table = $('#ItemItemIssueTable').DataTable();
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
// ========================================================================
// Item Issue — Add/Edit page
// ========================================================================

document.addEventListener('DOMContentLoaded', function () {

    var companyname = localStorage.getItem("comName");
    // ── DataTable (export only) ───────────────────────────────────────
    if ($.fn.DataTable.isDataTable('#ItemItemIssueTable')) {
        $('#ItemItemIssueTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#ItemItemIssueTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Issue Item - ${companyname}`, exportOptions: { columns: [1, 2,3,4,5,6,7] } },
            { extend: 'csv', title: `Issue Item - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
            { extend: 'excel', title: `Issue Item - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
            { extend: 'pdf', title: `Issue Item - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
            { extend: 'print', title: `Issue Item - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } }
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

    // ── Reset Filters ─────────────────────────────────────────────────
    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        resetAllFilters();
    });

    // ── Render badges on load ─────────────────────────────────────────
    renderFilterBadges();

    bindAutoClear('ddlRole', 'errDdlRole');
    bindAutoClear('ddlIssueTo', 'errDdlIssueTo');
    bindAutoClear('ddlIssueBy', 'errDdlIssueBy');
    bindAutoClear('txtIssueDate', 'errIssueDate');
    bindAutoClear('ddlItemCategory', 'errDdlItemCategory');
    bindAutoClear('ddlItem', 'errDdlItem');
    bindAutoClear('txtQuantity', 'errQuantity');

    // ---- User Type -> Issue To: direct bind, all users for that role ------
    document.getElementById('ddlRole')?.addEventListener('change', function () {
        clearFieldError('ddlRole', 'errDdlRole');
        loadUsersByRole(this.value, 0);   // manual role change -> no preselect
    });

    // Edit mode: a role is already selected, so load its users and
    // preselect the previously-saved Issue To (from the hidden field).
    if (document.getElementById('ddlRole')?.value) {
        const preselectId = document.getElementById('hdnIssueToId')?.value || window.editIssueToId || 0;
        loadUsersByRole(document.getElementById('ddlRole').value, preselectId);
    }

    // ---- Item Category -> Item cascade ------------------------------------
    document.getElementById('ddlItemCategory')?.addEventListener('change', function () {
        loadItemsByCategory(this.value, window.editItemId || 0);
    });

    if (document.getElementById('ddlItemCategory')?.value) {
        loadItemsByCategory(document.getElementById('ddlItemCategory').value, window.editItemId || 0);
    }

    // ---- Item -> Available Quantity ----------------------------------------
    // The quantity is already present on each <option> (data-unit), sourced
    // from GetItemByItemCategory's `it.unit` field — no separate endpoint call.
    document.getElementById('ddlItem')?.addEventListener('change', function () {
        updateAvailableQtyFromSelectedOption();
    });

    // ---- Quantity -> live cap against available stock ----------------------
    document.getElementById('txtQuantity')?.addEventListener('input', function () {
        const available = parseInt(document.getElementById('availableQtyHint')?.dataset.available ?? '-1');
        const entered = parseInt(this.value || '0');
        if (available >= 0 && entered > available) {
            showFieldError('txtQuantity', 'errQuantity', `Only ${available} available in stock.`);
        } else {
            clearFieldError('txtQuantity', 'errQuantity');
        }
    });
});

function bindAutoClear(fieldId, errorId) {
    document.getElementById(fieldId)?.addEventListener('input', () => clearFieldError(fieldId, errorId));
    document.getElementById(fieldId)?.addEventListener('change', () => clearFieldError(fieldId, errorId));
}

function clearFieldError(fieldId, errorId) {
    document.getElementById(fieldId)?.classList.remove('is-invalid');
    document.getElementById(errorId)?.classList.add('d-none');
}

function showFieldError(fieldId, errorId, message) {
    document.getElementById(fieldId)?.classList.add('is-invalid');
    const err = document.getElementById(errorId);
    if (err) { err.textContent = message; err.classList.remove('d-none'); }
}

// ------------------------------------------------------------------------
// User Type (Role) -> Issue To — direct bind, no search-as-you-type.
// Fetches every user mapped to the selected role and populates the
// <select> options directly (same pattern as the Item Category -> Item
// cascade below).
// ------------------------------------------------------------------------
async function loadUsersByRole(roleId, preselectIssueToId) {
    const issueToEl = document.getElementById('ddlIssueTo');
    if (!issueToEl) return;

    const hasSelect2 = window.jQuery && jQuery(issueToEl).data('select2');

    if (!roleId) {
        issueToEl.innerHTML = '<option value="">-- Select User Type First --</option>';
        issueToEl.disabled = true;
        if (hasSelect2) jQuery(issueToEl).trigger('change');
        return;
    }

    issueToEl.disabled = true;
    issueToEl.innerHTML = '<option value="">Loading...</option>';
    if (hasSelect2) jQuery(issueToEl).trigger('change');

    try {
        const res = await fetch(`/IssueItem/UsersByRole?roleId=${roleId}`, {
            method: 'GET',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.data || []);

        issueToEl.innerHTML = '<option value="">Select Issue To</option>';

        list.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id ?? u.Id ?? u.userId ?? u.referenceID ?? u.userID;
            opt.textContent = u.text ?? u.name ?? u.Name ?? u.username ?? u.displayName;
            if (preselectIssueToId && String(preselectIssueToId) === String(opt.value)) {
                opt.selected = true;
            }
            issueToEl.appendChild(opt);
        });

        issueToEl.disabled = false;
        if (hasSelect2) jQuery(issueToEl).trigger('change');
    } catch (err) {
        console.error('Failed to load users for role:', err);
        issueToEl.innerHTML = '<option value="">Select Issue To</option>';
        issueToEl.disabled = false;
        if (hasSelect2) jQuery(issueToEl).trigger('change');
    }
}

// ------------------------------------------------------------------------
// Item Category -> Item cascade
// ------------------------------------------------------------------------
// GetItemByItemCategory returns each item's available quantity inline as
// `it.unit`. We store it on the <option> as data-unit so we never need a
// second round-trip to the server just to know how much stock is available.
// ------------------------------------------------------------------------
async function loadItemsByCategory(categoryId, preselectItemId) {
    const itemDdl = document.getElementById('ddlItem');
    if (!itemDdl) return;

    const hasSelect2 = window.jQuery && jQuery(itemDdl).data('select2');

    if (!categoryId) {
        itemDdl.innerHTML = '<option value="">-- Select Item Category First --</option>';
        itemDdl.disabled = true;
        if (hasSelect2) jQuery(itemDdl).trigger('change');
        resetAvailableQtyHint();
        return;
    }

    itemDdl.disabled = true;
    itemDdl.innerHTML = '<option value="">Loading...</option>';
    if (hasSelect2) jQuery(itemDdl).trigger('change');

    try {
        const res = await fetch(`/ItemStock/GetItemByItemCategory?itemCategoryId=${categoryId}`, {
            method: 'GET',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const result = await res.json();

        itemDdl.innerHTML = '<option value="">Select Item</option>';

        const items = result.data || [];
        items.forEach(it => {
            const opt = document.createElement('option');
            opt.value = it.id ?? it.Id ?? it.itemId;
            opt.textContent = it.name ?? it.Name ?? it.itemName;
            // Available quantity comes straight from this endpoint — cache it
            // on the option itself instead of calling another endpoint later.
            opt.dataset.unit = it.unit ?? it.Unit ?? it.availableQuantity ?? 0;
            if (preselectItemId && parseInt(preselectItemId) === parseInt(opt.value)) {
                opt.selected = true;
            }
            itemDdl.appendChild(opt);
        });

        itemDdl.disabled = false;
        if (hasSelect2) jQuery(itemDdl).trigger('change');

        if (preselectItemId) {
            updateAvailableQtyFromSelectedOption();
        } else {
            resetAvailableQtyHint();
        }
    } catch (err) {
        console.error('Failed to load items for category:', err);
        itemDdl.innerHTML = '<option value="">Select Item</option>';
        itemDdl.disabled = false;
        if (hasSelect2) jQuery(itemDdl).trigger('change');
        resetAvailableQtyHint();
    }
}

// ------------------------------------------------------------------------
// Available Quantity — read from the selected <option>'s data-unit
// (populated in loadItemsByCategory from GetItemByItemCategory's `it.unit`).
// No AJAX call here — the value already lives on the option.
// ------------------------------------------------------------------------
function updateAvailableQtyFromSelectedOption() {
    const itemDdl = document.getElementById('ddlItem');
    const hint = document.getElementById('availableQtyHint');
    if (!itemDdl || !hint) return;

    const selectedOpt = itemDdl.options[itemDdl.selectedIndex];
    if (!selectedOpt || !selectedOpt.value) {
        resetAvailableQtyHint();
        return;
    }

    const qty = parseInt(selectedOpt.dataset.unit ?? '0');
    hint.textContent = `Available Quantity: ${qty}`;
    hint.dataset.available = qty;

    // Re-validate whatever quantity is currently typed against the new limit
    const qtyInput = document.getElementById('txtQuantity');
    if (qtyInput && qtyInput.value) {
        const entered = parseInt(qtyInput.value || '0');
        if (entered > qty) {
            showFieldError('txtQuantity', 'errQuantity', `Only ${qty} available in stock.`);
        } else {
            clearFieldError('txtQuantity', 'errQuantity');
        }
    }
}

function resetAvailableQtyHint() {
    const hint = document.getElementById('availableQtyHint');
    if (hint) {
        hint.textContent = 'Available Quantity: —';
        delete hint.dataset.available;
    }
}

// ------------------------------------------------------------------------
// Validation
// ------------------------------------------------------------------------
function validateItemIssueForm() {
    let isValid = true;

    [['ddlRole', 'errDdlRole'], ['ddlIssueTo', 'errDdlIssueTo'], ['ddlIssueBy', 'errDdlIssueBy'],
    ['txtIssueDate', 'errIssueDate'], ['ddlItemCategory', 'errDdlItemCategory'],
    ['ddlItem', 'errDdlItem'], ['txtQuantity', 'errQuantity']]
        .forEach(([f, e]) => clearFieldError(f, e));

    const roleId = document.getElementById('ddlRole')?.value;
    const issueTo = document.getElementById('ddlIssueTo')?.value;
    const issueBy = document.getElementById('ddlIssueBy')?.value;
    const issueDate = document.getElementById('txtIssueDate')?.value;
    const categoryId = document.getElementById('ddlItemCategory')?.value;
    const itemId = document.getElementById('ddlItem')?.value;
    const quantity = parseInt(document.getElementById('txtQuantity')?.value || '0');

    if (!roleId) { showFieldError('ddlRole', 'errDdlRole', 'User Type is required.'); isValid = false; }
    if (!issueTo) { showFieldError('ddlIssueTo', 'errDdlIssueTo', 'Issue To is required.'); isValid = false; }
    if (!issueBy) { showFieldError('ddlIssueBy', 'errDdlIssueBy', 'Issue By is required.'); isValid = false; }
    if (!issueDate) { showFieldError('txtIssueDate', 'errIssueDate', 'Issue Date is required.'); isValid = false; }
    if (!categoryId) { showFieldError('ddlItemCategory', 'errDdlItemCategory', 'Item Category is required.'); isValid = false; }
    if (!itemId) { showFieldError('ddlItem', 'errDdlItem', 'Item is required.'); isValid = false; }

    if (!quantity || quantity <= 0) {
        showFieldError('txtQuantity', 'errQuantity', 'Quantity must be greater than zero.');
        isValid = false;
    } else {
        const available = parseInt(document.getElementById('availableQtyHint')?.dataset.available ?? '-1');
        if (available >= 0 && quantity > available) {
            showFieldError('txtQuantity', 'errQuantity', `Only ${available} available in stock.`);
            isValid = false;
        }
    }

    return isValid;
}

// ------------------------------------------------------------------------
// Save — matches ItemIssueRequest exactly
// ------------------------------------------------------------------------


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

// ------------------------------------------------------------------------
// Row selection — btnEdit is only enabled when exactly ONE row is checked
// AND that row's Status is "Issued" (returned/other statuses can't be edited).
// Requires the row to carry a data-status attribute, e.g.:
//   <tr class="item-row" data-status="@item.Status" ...>
// ------------------------------------------------------------------------
function selectItem(id, row) {
    IV.clearNotice('classPageNotice');
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));

    const checkedBoxes = $('.student-checkbox:checked');
    const checkedCount = checkedBoxes.length;

    // Delete: enabled whenever at least one row is checked (and permitted)
    $('#btnDelete').prop('disabled', checkedCount === 0 || !permCanDelete);

    // Edit: enabled only for a single checked row whose Status is "Issued"
    let canEditThis = false;
    window.selectedPurposesId = 0;

    if (checkedCount === 1 && permCanEdit) {
        const selectedRow = checkedBoxes.closest('tr.item-row');
        const status = selectedRow.data('status');
        window.selectedPurposesId = parseInt(checkedBoxes.val());
        canEditThis = status === 'Issued';
    }

    $('#btnEdit').prop('disabled', !canEditThis);
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
            location.href = `/IssueItem/ConfirmReturn/${window.selectedPurposesId}`;
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
        text: "You are about to delete this item category record. This action cannot be undone!",
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
                url: '/IssueItem/Delete',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Item category record has been deleted.', 'success')
                            .then(() => submitForm());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete item category.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}


async function saveRecord() {
    const recordId = parseInt(document.getElementById('recordId')?.value || '0');
    const canSave = recordId > 0 ? window.canEdit === true : window.canAdd === true;

    if (!canSave) {
        showPageError('You do not have permission to save this record.');
        return;
    }

    if (!validateItemIssueForm()) {
        return;
    }

    const button = document.getElementById('btnSave');
    if (button) button.disabled = true;

    const returnDateVal = document.getElementById('txtReturnDate')?.value;

    const request = {
        ItemIssueId: recordId,
        CompanyID: parseInt(document.getElementById('hdnCompanyID')?.value || '0'),
        SessionID: parseInt(document.getElementById('hdnSessionID')?.value || '0'),
        RoleId: parseInt(document.getElementById('ddlRole').value),
        IssueTo: parseInt(document.getElementById('ddlIssueTo').value),
        IssueBy: parseInt(document.getElementById('ddlIssueBy').value),
        IssueDate: document.getElementById('txtIssueDate').value,
        ReturnDate: returnDateVal || null,
        Note: document.getElementById('txtNote')?.value.trim() || null,
        ItemCategoryId: parseInt(document.getElementById('ddlItemCategory').value),
        ItemId: parseInt(document.getElementById('ddlItem').value),
        Quantity: parseInt(document.getElementById('txtQuantity').value),
        Status: 'Issued',
        IsActive: document.getElementById('chkIsActive')?.checked === true
    };

    try {
        const response = await fetch('/IssueItem/Save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(request)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Unable to save item issue.');
        }

        await Swal.fire({
            icon: 'success',
            title: 'Saved',
            text: result.message || (recordId > 0
                ? 'Item issue updated successfully.'
                : 'Item issued successfully.'),
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-success' },
            buttonsStyling: false
        });

        window.location.href = '/IssueItem/Index';
    } catch (error) {
        console.error('Item issue save error:', error);
        showPageError(error.message || 'Unable to save item issue.');
    } finally {
        if (button) button.disabled = false;
    }
}

function showPageError(message) {
    const notice = document.getElementById('pageNotice');
    if (notice) {
        notice.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                ${escapeHtml(message)}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>`;
    }
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
}

// ========================================================================
// Confirm Return — "Return" button in the Confirm Return modal
// Matches ItemIssueReturnModel exactly:
//   ItemIssueId, QuantityReturned, ReturnedBy, ActualReturnDate,
//   UserId, UserName, IpAddress
// ========================================================================

async function confirmReturn() {
    const itemIssueId = parseInt(document.getElementById('hdnItemIssueId')?.value || '0');
    const quantity = parseInt(document.getElementById('hdnQuantity')?.value || '0');

    if (!itemIssueId || itemIssueId <= 0) {
        Swal.fire('Error!', 'No issue record selected to return.', 'error');
        return;
    }

    if (!quantity || quantity <= 0) {
        Swal.fire('Error!', 'Quantity to return must be greater than zero.', 'error');
        return;
    }

    const btnReturn = document.getElementById('btnConfirmReturn');
    if (btnReturn) btnReturn.disabled = true;

    const request = {
        ItemIssueId: itemIssueId,
        QuantityReturned: quantity,
        ReturnedBy: window.currentUserId || 0,
        ActualReturnDate: new Date().toISOString(),
        UserId: window.currentUserId || 0,
        UserName: window.currentUserName || null,
        IpAddress: null
    };

    try {
        const response = await fetch('/IssueItem/Return', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(request)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Unable to return item.');
        }

        // Close the Confirm Return modal, if it's a Bootstrap modal
        const modalEl = document.getElementById('confirmReturnModal');
        if (modalEl && window.bootstrap) {
            bootstrap.Modal.getInstance(modalEl)?.hide();
        }

        await Swal.fire({
            icon: 'success',
            title: 'Returned!',
            text: result.message || 'Item has been returned successfully.',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-success' },
            buttonsStyling: false
        });

        // Refresh the list — reuse the page's existing partial-reload flow
        if (typeof submitForm === 'function') {
            submitForm();
        } else {
            window.location.reload();
        }
    } catch (error) {
        console.error('Confirm return error:', error);
        Swal.fire('Error!', error.message || 'Unable to return item.', 'error');
    } finally {
        if (btnReturn) btnReturn.disabled = false;
    }
}

// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadItemCategoryPartial(queryString) {
    const container = document.getElementById('ItemIssueTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/IssueItem/GetItemIssuePartial?${queryString}`, {
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
    const link = e.target.closest('#ItemIssueTableContainer .page-link');
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
    // NOTE: mirrors selectItem()'s edit rule. Status isn't known here from the
    // checkbox alone, so also gate on the row's data-status when available.
    const checkedBoxes = $('.student-checkbox:checked');
    const count = checkedBoxes.length;

    let canEditThis = false;
    if (count === 1 && permCanEdit) {
        const selectedRow = checkedBoxes.closest('tr.item-row');
        canEditThis = selectedRow.data('status') === 'Issued';
    }

    $('#btnEdit').prop('disabled', !canEditThis);
    $('#btnDelete').prop('disabled', count === 0 || !permCanDelete);
    $('#btnActive').prop('disabled', count === 0);
    $('#btnInactive').prop('disabled', count === 0);
}