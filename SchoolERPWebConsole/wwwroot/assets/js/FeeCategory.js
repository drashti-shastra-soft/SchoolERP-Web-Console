// Letters-only fields
$('#txtName, #txtDisplayName').on('input', function () {
    this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
});

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#BudgetHeadTable')) {
        const table = $('#BudgetHeadTable').DataTable();
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

    loadFeeCategoryPartial(params);
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
    if ($.fn.DataTable.isDataTable('#BudgetHeadTable')) {
        $('#BudgetHeadTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#BudgetHeadTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            {
                extend: 'copy', title: `Category Group - ${companyname}`, exportOptions: { columns: [1, 2] }
            },
            { extend: 'csv', title: `Category Group - ${companyname}`, exportOptions: { columns: [1, 2] } },
            { extend: 'excel', title: `Category Group - ${companyname}`, exportOptions: { columns: [1, 2] } },
            { extend: 'pdf', title: `Category Group - ${companyname}`, exportOptions: { columns: [1, 2] } },
            { extend: 'print', title: `Category Group - ${companyname}`, exportOptions: { columns: [1, 2] } }
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
            location.href = `/FeeCategory/Add/${window.selectedPurposesId}`;
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
        text: "You are about to delete this fees category record. This action cannot be undone!",
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
                url: '/FeeCategory/Delete',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Fees category head record has been deleted.', 'success')
                            .then(() => submitForm());
                    } else {
                        updateButtonStates();
                        Swal.fire('Error!', res.message || 'Failed to delete fees category.', 'error');
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

// Save
async function saveRecord() {
   
    const categoryGroup = document.getElementById('ddlCategoryGroup').value;
    if (!categoryGroup) {
        document.getElementById('ErrorddlCategoryGroup').classList.remove('d-none');
        return;
    }
    document.getElementById('ErrorddlCategoryGroup').classList.add('d-none');

    const name = document.getElementById('txtName').value.trim();
    if (!name) {
        document.getElementById('nameError').classList.remove('d-none');
        return;
    }
    document.getElementById('nameError').classList.add('d-none');
   

    const displayName = document.getElementById('txtDisplayName').value.trim() || null;


    const isActive = document.getElementById('chkIsActive').checked;



    const id = document.getElementById('recordId').value || 0;
    const companyID = document.getElementById('hdnCompanyID').value || 0;
    const sessionID = document.getElementById('hdnSessionID').value || 0;
    const isEdit = id > 0;

    const data = {
        feeCategoryId: id,
        categoryGroupId: categoryGroup,
        feeCategoryName: name,
        displayLabel: displayName || name,
        isActive: isActive,
        companyID: companyID,
        sessionID: sessionID
    };

    // Route to the correct backend endpoint based on IsSystem.
    // Regular users never see the System Type checkbox, so this branch
    // only fires for admins who explicitly opted in.
    const endpoint = '/FeeCategory/Save';

    const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const res = await r.json();
    if (res.success) {
        Swal.fire({
            icon: 'success',
            title: 'Saved!',
            text: isEdit
                ? 'Fees category has been updated successfully.'
                : 'Fees category has been added successfully.',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-success' },
            buttonsStyling: false
        }).then(() => {
            window.location.href = '/FeeCategory/Index';
        });
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: res.message || 'Failed to save fees category.',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-danger' },
            buttonsStyling: false
        });
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
                    url: '/FeeCategory/ToggleStatus',
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
        IV.setNotice('sectionPageNotice', 'Could not update status.');
        location.reload();
    }
}


// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadFeeCategoryPartial(queryString) {
    const container = document.getElementById('FeeCategoryTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/FeeCategory/GetFeeCategoryPartial?${queryString}`, {
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
    const link = e.target.closest('#FeeCategoryTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadFeeCategoryPartial(query);
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
    AccountType: {
        headers: ['Category Group Name','Fees Category Name', 'Display Name', 'Status'],
        row: (r, i) => `
            <td>${i + 1}</td>
            <td>${r.categoryGroupName ?? '-'}</td>
            <td>${r.feeCategoryName ?? '-'}</td>
            <td>${r.displayLabel ?? '-'}</td>
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
function openAccountTypeModal(entityType) {
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
        const resp = await fetch(`/FeeCategory/GetAll?companyId=${fromAcc}&sessionId=${fromSess ?? 0}`);
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
        const res = await fetch(`/FeeCategory/CopyFeeCategory`, {
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
window.openAccountTypeModal = openAccountTypeModal;
window.onFromCompanyChangeBudget = onFromCompanyChangeBudget;
window.onToCompanyChangeBudget = onToCompanyChangeBudget;
window.validateCopyBudget = validateCopyBudget;
window.handleCopyBudget = handleCopyBudget;