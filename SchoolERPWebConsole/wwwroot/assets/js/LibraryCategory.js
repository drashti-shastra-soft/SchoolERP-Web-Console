function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#tblBudget')) {
        const table = $('#tblBudget').DataTable();
        table.button(index).trigger();
    }
}
// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_libraryCategory';
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

    loadLibraryCategoryPartial(params);
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
    if ($.fn.DataTable.isDataTable('#tblBudget')) {
        $('#tblBudget').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#tblBudget').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Category - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'csv', title: `Category - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'excel', title: `Category - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'pdf', title: `Category - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'print', title: `Category - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } }
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
        renderFilterBadges();   // ← was missing
        document.getElementById('hdnPageIndex').value = 1;
        submitForm();
    });

    // ── Render badges on load ─────────────────────────────────────────
    renderFilterBadges();
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
window.selectedClassId = 0;
const classFieldMap = { txtBudgetName: 'errtxtBudgetName', txtAcronym: 'errtxtAcronym' };



$(document).ready(function () {
    $('#classesTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', exportOptions: { columns: [1, 2, 3] } },
            { extend: 'csv', exportOptions: { columns: [1, 2, 3] } },
            { extend: 'excel', exportOptions: { columns: [1, 2, 3] } },
            { extend: 'pdf', exportOptions: { columns: [1, 2, 3] } },
            { extend: 'print', exportOptions: { columns: [1, 2, 3] } }
        ],
        searching: false,
        paging: false,
        info: false
    });

    $('#ddlSections').select2({
        placeholder: "Select Sections",
        allowClear: true
    });
});

function clearModalValidation() {
    IV.clearMap(classFieldMap);
    IV.clearNotice('classModalNotice');
}

IV.bindAutoClear(classFieldMap);
//change here button disable function
$(document).on('change', '.student-checkbox', function () {
    const $checked = $('.student-checkbox:checked');
    const count = $checked.length;

    // Row highlight
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    $checked.each(function () {
        $(this).closest('tr').addClass('bg-light');
    });

    // Track selected id only when exactly one row is checked (Edit needs a single id)
    window.selectedClassId = count === 1 ? parseInt($checked.first().val()) : 0;

    // Respect permissions like selectItem() does
    $('#btnEdit').prop('disabled', !(permCanEdit && count === 1));
    $('#btnDelete').prop('disabled', !(permCanDelete && count > 0));
    $('#btnActive').prop('disabled', !(permCanEdit && count > 0));
    $('#btnInactive').prop('disabled', !(permCanEdit && count > 0));
});



async function editSelected() {
    if (!permCanEdit) {
        IV.setNotice('classPageNotice', 'You do not have permission to edit.');
        return;
    }
    if (window.selectedClassId === 0) return;
    IV.clearNotice('classPageNotice');
    clearModalValidation();
    try {

        if (window.selectedClassId) {
            location.href = `/LibraryCategory/Add/${window.selectedClassId}`;
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
        alert("Please select at least one Country.");
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this library category record. This action cannot be undone!",
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
                url: '/LibraryCategory/DeleteLibraryCategory',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Library category record has been deleted.', 'success')
                            .then(() => location.reload());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete library category.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}

async function saveItem() {

    const cid = parseInt(document.getElementById('txtItemId').value);
    if (cid === 0 && !permCanAdd) {
        IV.setNotice('classModalNotice', 'You do not have permission to add.');
        return;
    }
    if (cid > 0 && !permCanEdit) {
        IV.setNotice('classModalNotice', 'You do not have permission to edit.');
        return;
    }
    clearModalValidation();

    const name = document.getElementById('txtCategoryName').value.trim();
    if (!name) {
        IV.setFieldError('txtCategoryName', 'errtxtCategoryName', 'Category name is required.');
        return;
    }

    const classNo = document.getElementById('txtClassNo').value.trim();
    if (!classNo) {
        IV.setFieldError('txtClassNo', 'errtxtClassNo', 'Class No name is required.');
        return;
    }


    // ✅ Fix 3: isActive null guard
    const isActiveEl = document.getElementById('isActive');
    const isActive = isActiveEl ? isActiveEl.checked : false;
    const displayLabel = document.getElementById('txtDisplayLabel').value.trim();
    const data = {
        categoryId: cid,
        categoryName: name,
        displayLabel: displayLabel || name,
        classNo: classNo,
        isActive: isActive
    };
    const isEdit = cid > 0;
    try {

        const r = await fetch('/LibraryCategory/SaveLibraryCategory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        const res = await r.json();
        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit
                    ? 'Library Category has been updated successfully.'
                    : 'Library Category has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                window.location.href = '/LibraryCategory/Index';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save category.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }

    } catch (err) {
        console.error(err);
        IV.setNotice('classModalNotice', 'Could not save category.');
    }
}

async function toggleStatus(id, isActive, checkboxEl) {
    if (!permCanEdit) {
        IV.setNotice('classPageNotice', 'You do not have permission to change status.');
        if (checkboxEl) {
            checkboxEl.checked = !isActive;
            $(checkboxEl).trigger('change'); // ensure UI/plugin state syncs
        }
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
            showToast('Please select at least one user', false);
            return;
        }
    }

    const request = { ids: sectionIds.join(','), isActive: isActive };

    // helper to revert every affected checkbox/switch
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
                    url: '/LibraryCategory/ToggleLibraryCategory',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(request),
                    success: function (res) {
                        if (res.success) {
                            Swal.fire('Updated!', res.message || 'Status updated successfully.', 'success')
                                .then(() => location.reload());
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
                // Cancel clicked — revert whatever was toggled
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
function loadLibraryCategoryPartial(queryString) {
    const container = document.getElementById('categoryTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/LibraryCategory/GetLibraryCategoryPartial?${queryString}`, {
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

            if ($.fn.DataTable.isDataTable('#tblBudget')) {
                $('#tblBudget').DataTable().destroy();
            }
            exportTable = $('#tblBudget').DataTable({
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
    const link = e.target.closest('#categoryTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadLibraryCategoryPartial(query);
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

// wwwroot/js/copyBudgetModal.js
//
// "Copy Library Budget to another Company" modal controller.
// This is intentionally SEPARATE from copySessionModal.js:
//   - Library Budget has no SessionID (see TBL_MST_LibraryBudget / the
//     SP_TBL_MST_LibraryBudget_UPSERT proc) — so this modal has NO session
//     dropdowns at all, only From Company / To Company.
//   - It posts to a company-only copy endpoint (backed by
//     SP_MST_LibraryBudget_COPYCOMPANY), not /CopySession/*.
//
// Pairs 1:1 with _CopyBudgetModal.cshtml. Must be included via
// <script src="~/assets/js/copyBudgetModal.js"></script> on any page that
// calls openCopyBudgetModal() — it is NOT bundled into LibraryBudget.js.

const BUDGET_COLUMNS = {
    headers: ['Subject Name', 'Display Label', 'Class No', 'Status'],
    // ── FIXED: row() previously had no checkbox cell at all, so nothing
    // could ever be selected and btnCopyBudget stayed disabled forever.
    // Added the checkbox cell (class="budget-row-check", value=BudgetId)
    // that toggleSelectAllBudget()/updateBudgetCount()/handleCopyBudget()
    // all depend on.
    row: (r, i) => `        
        <td>${i + 1}</td>
        <td>${r.subjectname ?? '-'}</td>
        <td>${r.displayLabel ?? '-'}</td>
        <td>${r.classNo ?? '-'}</td>
        <td><span class="badge bg-${r.isActive ? 'success' : 'secondary'}-subtle
            text-${r.isActive ? 'success' : 'secondary'}">
            ${r.isActive ? 'Active' : 'Inactive'}</span></td>`
};

// ── Open modal, reset state, load companies ────────────────────────
function openCopyLibraryCategoryModal() {
    document.getElementById('tableSectionBudget').classList.add('d-none');
    document.getElementById('validationBoxBudget').classList.add('d-none');
    document.getElementById('btnCopyBudget').disabled = true;
    document.getElementById('budgetTbody').innerHTML = '';

    new bootstrap.Modal(document.getElementById('copyBudgetModal')).show();
    initBudgetCopy();
}

// ── Populate From/To company dropdowns, default From to current company ──
async function initBudgetCopy() {
    try {
        const ddlFrom = document.getElementById('fromAccountBudget');
        const ddlTo = document.getElementById('toAccountBudget');
        if (!ddlFrom || !ddlTo) return;

        ddlFrom.innerHTML = '<option value="">From company</option>';
        ddlTo.innerHTML = '<option value="">To company</option>';

        const companies = await fetchCompaniesForBudget();
        const currentCompanyId = window.getCompanyId ? window.getCompanyId() : null;

        companies.forEach(c => {
            const optFrom = document.createElement('option');
            optFrom.value = String(c.companyId);
            optFrom.textContent = c.schoolName || `Company #${c.companyId}`;
            if (currentCompanyId && String(currentCompanyId) === String(c.companyId)) {
                optFrom.selected = true;
            }
            ddlFrom.appendChild(optFrom);

            const optTo = document.createElement('option');
            optTo.value = String(c.companyId);
            optTo.textContent = c.schoolName || `Company #${c.companyId}`;
            ddlTo.appendChild(optTo);
            // "To" intentionally has no default — user must actively choose it.
        });

        // Load table immediately for the pre-selected From company, then
        // re-validate so btnCopyBudget's disabled state is correct on open.
        if (ddlFrom.value) {
            await loadBudgetTableData(ddlFrom.value);
        }
        validateCopyBudget();
    } catch (e) {
        console.error(e);
    }
}

async function fetchCompaniesForBudget() {
    const resp = await fetch('/Company/GetAssignedCompanies', { method: 'GET' });
    const payload = await resp.json();
    if (!payload || payload.success !== true || !Array.isArray(payload.data)) {
        throw new Error(payload?.message || 'Failed to load companies');
    }
    return payload.data;
}

// ── Runs on every dropdown change (wired via onchange in the partial) ──
function validateCopyBudget() {
    const fromAcc = document.getElementById('fromAccountBudget').value;
    const toAcc = document.getElementById('toAccountBudget').value;

    const allFilled = fromAcc && toAcc;
    const isSame = fromAcc && toAcc && fromAcc === toAcc;

    document.getElementById('validationBoxBudget').classList.toggle('d-none', !isSame);

    if (fromAcc) {
        // loadBudgetTableData(fromAcc);
    } else {
        document.getElementById('tableSectionBudget').classList.add('d-none');
    }

    updateBudgetCount();
}

// ── Load budgets for the selected From company ─────────────────────
async function loadBudgetTableData(fromAcc) {
    const theadRow = document.querySelector('#tblBudgetCopy thead tr');
    const tbody = document.getElementById('budgetTbody');

    try {
        // ── FIXED: header now includes the leading checkbox <th> to match
        // the checkbox cell added to each row, keeping column counts
        // consistent (was previously missing, causing header/row misalignment).
        theadRow.innerHTML = `        
        <th style="width:40px">#</th>
        ${BUDGET_COLUMNS.headers.map(h => `<th>${h}</th>`).join('')}`;

        tbody.innerHTML = `<tr>
            <td colspan="${BUDGET_COLUMNS.headers.length + 2}" class="text-center py-3 text-muted">
                <div class="spinner-border spinner-border-sm me-2"></div>Loading...
            </td>
        </tr>`;

        // Company-only — no sessionId in the query string.
        const resp = await fetch(`/LibraryCategory/GetAll?companyId=${fromAcc}`);
        const res = await resp.json();

        if (!res.success || !res.data?.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${BUDGET_COLUMNS.headers.length + 2}"
                        class="text-center py-3 text-muted">
                        No records found.
                    </td>
                </tr>`;
            document.getElementById('tableSectionBudget').classList.remove('d-none');
            document.getElementById('btnCopyBudget').disabled = true;
            return [];
        }

        tbody.innerHTML = res.data.map((r, i) =>
            `<tr>${BUDGET_COLUMNS.row(r, i)}</tr>`
        ).join('');

        document.getElementById('tableSectionBudget').classList.remove('d-none');
        updateBudgetCount();

        return res.data;
    } catch (err) {
        console.error('loadBudgetTableData error:', err);
        tbody.innerHTML = `
            <tr>
                <td colspan="${BUDGET_COLUMNS.headers.length + 2}"
                    class="text-center py-3 text-danger">
                    <i class="ti ti-alert-circle me-1"></i>
                    Failed to load data. Please try again.
                </td>
            </tr>`;
        document.getElementById('tableSectionBudget').classList.remove('d-none');
        document.getElementById('btnCopyBudget').disabled = true;
        return [];
    }
}

// ── Select all / count ────────────────────────────────────────────
function toggleSelectAllBudget(cb) {
    document.querySelectorAll('.budget-row-check').forEach(c => c.checked = cb.checked);
    updateBudgetCount();
}

function updateBudgetCount() {
    const checked = document.querySelectorAll('.budget-row-check:checked').length;
    const selCount = document.getElementById('selCountBudget');
    if (selCount) selCount.textContent = `${checked} selected`;

    const fromAcc = document.getElementById('fromAccountBudget').value;
    const toAcc = document.getElementById('toAccountBudget').value;
    const isSame = fromAcc && toAcc && fromAcc === toAcc;

    document.getElementById('btnCopyBudget').disabled = !(fromAcc && toAcc && !isSame);
}

// ── Copy button click ───────────────────────────────────────────────
async function handleCopyBudget() {
    const fromAcc = document.getElementById('fromAccountBudget').value;
    const toAcc = document.getElementById('toAccountBudget').value;

    const selectedIds = [...document.querySelectorAll('.budget-row-check:checked')]
        .map(c => c.value);

    // Company-only payload — no session fields, matching
    // SP_MST_LibraryBudget_COPYCOMPANY's parameters.
    const payload = {
        fromCompanyId: fromAcc,
        toCompanyId: toAcc,
        ids: selectedIds
    };

    document.getElementById('btnCopyBudget').disabled = true;

    try {
        const res = await fetch('/LibraryCategory/CopyLibraryCategory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            bootstrap.Modal.getInstance(
                document.getElementById('copyBudgetModal')).hide();
            // showBudgetToast(`${data.message}`, 'success');
            const config = data.success
                ? {
                    icon: 'question',
                    title: 'Copy Record(s)?',
                    text: data.message,
                    confirmText: 'OK!',
                    confirmBtnClass: 'btn btn-success me-2',
                    successTitle: 'Activated Successfully!',
                    successText: 'The selected record(s) have been activated and are now available for use.'
                }
                : {
                    icon: 'warning',
                    title: 'Copy Record(s)?',
                    text: data.message,
                    confirmText: 'OK!',
                    confirmBtnClass: 'btn btn-danger me-2',
                    successTitle: 'Deactivated Successfully!',
                    successText: 'The selected record(s) have been deactivated and are no longer available for use.'
                };


            Swal.fire({
                icon: config.icon,
                title: config.title,
                text: config.text,
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'OK!',
                customClass: {
                    confirmButton: 'btn btn-danger me-2',
                    cancelButton: 'btn btn-secondary'
                },
                buttonsStyling: false
            }).then(() => location.reload());
        } else {
            //showBudgetToast(data.message || 'Copy failed.', 'danger');
            const config = data.success
                ? {
                    icon: 'question',
                    title: 'Copy Record(s)?',
                    text: data.message,
                    confirmText: 'Ok',
                    confirmBtnClass: 'btn btn-success me-2',
                    successTitle: 'Activated Successfully!',
                    successText: 'The selected record(s) have been activated and are now available for use.'
                }
                : {
                    icon: 'warning',
                    title: 'Copy Record(s)?',
                    text: data.message,
                    confirmText: 'OK!',
                    confirmBtnClass: 'btn btn-danger me-2',
                    successTitle: 'Deactivated Successfully!',
                    successText: 'The selected record(s) have been deactivated and are no longer available for use.'
                };


            Swal.fire({
                icon: config.icon,
                title: config.title,
                text: config.text,
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'OK!',
                customClass: {
                    confirmButton: 'btn btn-danger me-2',
                    cancelButton: 'btn btn-secondary'
                },
                buttonsStyling: false
            }).then(() => document.getElementById('copyBudgetModal').show());
        }
    } catch {
        //showBudgetToast('Network error. Please try again.', 'danger');
        Swal.fire('Network error. Please try again.', 'danger')
            .then(() => location.reload());
    } finally {
        document.getElementById('btnCopyBudget').disabled = false;
    }
}

function showBudgetToast(msg, type) {
    alert(msg);
}

// Expose the entry points the page needs.
window.openCopyLibraryCategoryModal = openCopyLibraryCategoryModal;
window.validateCopyBudget = validateCopyBudget;
window.toggleSelectAllBudget = toggleSelectAllBudget;
window.updateBudgetCount = updateBudgetCount;
window.handleCopyBudget = handleCopyBudget;