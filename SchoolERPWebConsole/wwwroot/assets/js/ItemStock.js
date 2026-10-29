function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#ItemCategoryTable')) {
        const table = $('#ItemCategoryTable').DataTable();
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
document.addEventListener('DOMContentLoaded', () => {
    var companyname = localStorage.getItem("comName");
    // ── DataTable (export only) ───────────────────────────────────────
    if ($.fn.DataTable.isDataTable('#ItemCategoryTable')) {
        $('#ItemCategoryTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#ItemCategoryTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Item Stock - ${companyname}`, exportOptions: { columns: [1, 2,3,4,5,6,7] } },
            { extend: 'csv', title: `Item Stock - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
            { extend: 'excel', title: `Item Stock - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
            { extend: 'pdf', title: `Item Stock - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
            { extend: 'print', title: `Item Stock - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } }
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

    const category = document.getElementById('ddlItemCategory');

    // Auto-clear each field's error state as soon as the user interacts with it
    bindAutoClear('ddlItemCategory', 'errDdlItemCategory');
    bindAutoClear('ddlItem', 'errDdlItem');
    bindAutoClear('txtQtyCount', 'errQuantity');
    bindAutoClear('txtPurchasePrice', 'errPurchasePrice');
    bindAutoClear('txtDate', 'errDate');

    // Item Category change -> load Items for that category
    category?.addEventListener('change', function () {
        const categoryId = this.value;
        loadItemsByCategory(categoryId, window.editItemId || 0);
    });

    // Quantity stepper: unit dropdown x count = actual quantity saved
    document.getElementById('ddlQtyUnit')?.addEventListener('change', recomputeQuantity);
    document.getElementById('txtQtyCount')?.addEventListener('input', recomputeQuantity);
    recomputeQuantity();

    // File input -> show selected filename
    document.getElementById('attachmentFile')?.addEventListener('change', function () {
        const info = document.getElementById('fileInfo');
        if (info) info.textContent = this.files?.[0]?.name || '';
        document.getElementById('hdnRemoveFile').value = 'false';
    });

    // If editing and a category is already selected, load its items on page load
    if (category?.value) {
        loadItemsByCategory(category.value, window.editItemId || 0);
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
            location.href = `/ItemStock/Add/${window.selectedPurposesId}`;
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
        text: "You are about to delete this item stock record. This action cannot be undone!",
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
                url: '/ItemStock/Delete',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Item stock record has been deleted.', 'success')
                            .then(() => submitForm());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete item stock.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}

// Save
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
// Item Category -> Item cascade
// ------------------------------------------------------------------------
async function loadItemsByCategory(categoryId, preselectItemId) {
    const itemDdl = document.getElementById('ddlItem');
    const qtyUnit = document.getElementById('qtyUnit');
    if (!itemDdl) return;

    const hasSelect2 = window.jQuery && jQuery(itemDdl).data('select2');

    if (!categoryId) {
        itemDdl.innerHTML = '<option value="">-- Select Item Category First --</option>';
        itemDdl.disabled = true;
        if (hasSelect2) jQuery(itemDdl).trigger('change');
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
            qtyUnit.textContent = it.unit;
            if (preselectItemId && parseInt(preselectItemId) === parseInt(opt.value)) {
                opt.selected = true;
            }
            itemDdl.appendChild(opt);
        });

        itemDdl.disabled = false;
        if (hasSelect2) jQuery(itemDdl).trigger('change');
    } catch (err) {
        console.error('Failed to load items for category:', err);
        itemDdl.innerHTML = '<option value="">Select Item</option>';
        itemDdl.disabled = false;
        if (hasSelect2) jQuery(itemDdl).trigger('change');
    }
}

// ------------------------------------------------------------------------
// Quantity stepper: count x unit-multiplier = actual saved quantity
// ------------------------------------------------------------------------
function recomputeQuantity() {
    const unitEl = document.getElementById('ddlQtyUnit');
    const countEl = document.getElementById('txtQtyCount');
    const hiddenEl = document.getElementById('txtQuantity');
    const hintEl = document.getElementById('qtyMultiplierHint');

    const multiplier = parseInt(unitEl?.value || '1') || 1;
    const count = parseInt(countEl?.value || '0') || 0;
    const total = multiplier * count;

    if (hiddenEl) hiddenEl.value = total;
    if (hintEl) hintEl.textContent = multiplier > 1 ? `(×${multiplier} = ${total} total)` : '';
}

function removeExistingFile() {
    document.getElementById('hdnRemoveFile').value = 'true';
    document.getElementById('existingFileInfo')?.remove();
}

// ------------------------------------------------------------------------
// Validation
// ------------------------------------------------------------------------
function validateItemStockForm() {
    let isValid = true;

    ['ddlItemCategory:errDdlItemCategory', 'ddlItem:errDdlItem', 'txtQtyCount:errQuantity',
        'txtPurchasePrice:errPurchasePrice', 'txtDate:errDate']
        .forEach(pair => {
            const [f, e] = pair.split(':');
            clearFieldError(f, e);
        });

    const categoryId = document.getElementById('ddlItemCategory')?.value;
    const itemId = document.getElementById('ddlItem')?.value;
    const qtyCount = parseInt(document.getElementById('txtQtyCount')?.value || '0');
    const price = parseFloat(document.getElementById('txtPurchasePrice')?.value || '');
    const date = document.getElementById('txtDate')?.value;

    if (!categoryId) {
        showFieldError('ddlItemCategory', 'errDdlItemCategory', 'Item Category is required.');
        isValid = false;
    }

    if (!itemId) {
        showFieldError('ddlItem', 'errDdlItem', 'Item is required.');
        isValid = false;
    }

    if (!qtyCount || qtyCount <= 0) {
        showFieldError('txtQtyCount', 'errQuantity', 'Quantity must be greater than zero.');
        isValid = false;
    }

    if (price === '' || isNaN(price) || price < 0) {
        showFieldError('txtPurchasePrice', 'errPurchasePrice', 'Purchase price is required.');
        isValid = false;
    }

    if (!date) {
        showFieldError('txtDate', 'errDate', 'Date is required.');
        isValid = false;
    }

    return isValid;
}

// ------------------------------------------------------------------------
// Save — multipart FormData, since the controller accepts an IFormFile
// alongside the model. NOTE: the controller action must bind the model
// via [FromForm] (not [FromBody]) for this to work — [FromBody] only
// accepts a JSON body and cannot coexist with a file upload in the same
// request.
// ------------------------------------------------------------------------
async function saveRecord() {
    const recordId = parseInt(document.getElementById('recordId')?.value || '0');
    const canSave = recordId > 0 ? window.canEdit === true : window.canAdd === true;

    if (!canSave) {
        showPageError('You do not have permission to save this record.');
        return;
    }

    recomputeQuantity();

    if (!validateItemStockForm()) {
        return;
    }

    const button = document.getElementById('btnSave');
    if (button) button.disabled = true;

    const formData = new FormData();
    formData.append('ItemStockId', recordId);
    formData.append('ItemCategoryId', document.getElementById('ddlItemCategory').value);
    formData.append('ItemId', document.getElementById('ddlItem').value);
    formData.append('ItemSupplierId', document.getElementById('ddlItemSupplier')?.value || '');
    formData.append('ItemStoreId', document.getElementById('ddlItemStore')?.value || '');
    formData.append('Quantity', document.getElementById('txtQuantity').value);
    formData.append('PurchasePrice', document.getElementById('txtPurchasePrice').value);
    formData.append('PurchaseDate', document.getElementById('txtDate').value);
    formData.append('Description', document.getElementById('txtDescription')?.value.trim() || '');
    formData.append('IsActive', document.getElementById('chkIsActive')?.checked === true);
    formData.append('CompanyID', document.getElementById('hdnCompanyID')?.value || 0);
    formData.append('SessionID', document.getElementById('hdnSessionID')?.value || 0);
    formData.append('ExistingFileName', document.getElementById('hdnExistingFile')?.value || '');
    formData.append('RemoveAttachment', document.getElementById('hdnRemoveFile')?.value || 'false');

    const fileInput = document.getElementById('attachmentFile');
    if (fileInput?.files?.[0]) {
        formData.append('attachmentFile', fileInput.files[0]);
    }

    try {
        const response = await fetch('/ItemStock/Save', {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }, // do NOT set Content-Type — browser sets the multipart boundary
            body: formData
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Unable to save item stock.');
        }

        await Swal.fire({
            icon: 'success',
            title: 'Saved',
            text: recordId > 0
                ? 'Item stock updated successfully.'
                : 'Item stock added successfully.',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-success' },
            buttonsStyling: false
        });

        window.location.href = '/ItemStock/Index';
    } catch (error) {
        console.error('Item stock save error:', error);
        showPageError(error.message || 'Unable to save item stock.');
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
                    url: '/ItemStock/ToggleStatus',
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
    const container = document.getElementById('itemCategoryTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/ItemStock/GetItemStockPartial?${queryString}`, {
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
    const link = e.target.closest('#itemCategoryTableContainer .page-link');
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