function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#tblCustomFields')) {
        const table = $('#tblCustomFields').DataTable();
        table.button(index).trigger();
    }
}
// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_purpose';
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
    const sectionEl = document.getElementById('ddlFilterSection');
    if (sessionEl) document.getElementById('hdnSessionID').value = sessionEl.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;
    if (sectionEl) document.getElementById('hdnSectionID').value = sectionEl.value;
    
    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadPurposePartial(params);

}

function applyFilters() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const sectionEl = document.getElementById('ddlFilterSection');
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

    // Section
    if (sectionEl?.value && sectionEl.value !== '') {
        appliedFilters['ddlFilterSection'] = {
            label: 'Section',
            text: sectionEl.options[sectionEl.selectedIndex]?.text || sectionEl.value
        };
    } else delete appliedFilters['ddlFilterSection'];

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
    } else if (filterId === 'ddlFilterSection') {
        const el = document.getElementById('ddlFilterSection');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
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
    // NOTE: hdnBelongsTo is intentionally left untouched here — the
    // Student/Staff module tab selection is independent of the
    // dismissible filter badges, so "Clear All" should not silently
    // jump the user back to a different tab/module.

    ['ddlFilterSessions', 'ddlFilterCompany', 'ddlFilterSection'].forEach(id => {
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
    if ($.fn.DataTable.isDataTable('#tblCustomFields')) {
        $('#tblCustomFields').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#tblCustomFields').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `System Fields - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
            { extend: 'csv', title: `System Fields - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
            { extend: 'excel', title: `System Fields - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
            { extend: 'pdf', title: `System Fields - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
            { extend: 'print', title: `System Fields - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });

    // ── Select2 ───────────────────────────────────────────────────────
    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            jQuery('#ddlFilterSessions, #ddlFilterCompany', '#ddlFilterSection').select2({
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
        ['ddlFilterSessions', 'ddlFilterCompany', 'ddlFilterSection'].forEach(id => {
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
    clearAppliedFilters();
    renderFilterBadges();
});

// ========================================
// Module tabs (Student / Staff) — drive the belogto filter
// ========================================
// Wires the Bootstrap pill tabs into the same server-side query-string
// flow that search/session/company/section already use. The hidden
// #hdnBelongsTo field must exist inside #frmSearch with
// name="belogto" (matching the controller action's parameter name
// exactly, since submitForm() serializes the form via FormData()).
document.addEventListener('DOMContentLoaded', () => {
    const moduleTabs = document.getElementById('moduleTabs');
    if (!moduleTabs) return;

    moduleTabs.addEventListener('shown.bs.tab', function (e) {
        // Prefer an explicit data-belongs-to attribute on the tab button;
        // fall back to inferring from the target pane id if not present.
        const target = e.target.getAttribute('data-bs-target') || '';
        const belongsTo = e.target.dataset.belongsTo
            || (target === '#staff-fields' ? 'Staff' : 'Student');

        const hdn = document.getElementById('hdnBelongsTo');
        if (hdn) hdn.value = belongsTo;

        document.getElementById('hdnPageIndex').value = 1;
        submitForm();
    });
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
            location.href = `/Settings/AddCustomFields/${window.selectedPurposesId}`;
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
        text: "You are about to delete this purpose record. This action cannot be undone!",
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
                url: '/Settings/DeleteField',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Field record has been deleted.', 'success')
                            .then(() => location.reload());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete field.', 'error');
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
async function saveField() {
    if (!validateFieldForm()) return;   // ← ADD THIS, replaces the old alert() check

    const data = {
        fieldId: parseInt($('#FieldId').val() || 0),
        belongsTo: $('#BelongsTo').val(),
        fieldName: $('#FieldName').val().trim(),
        fieldType: $('#FieldType').val(),
        fieldValues: $('#FieldValues').val(),
        isSystemField: false,
        isRequired: $('#IsRequired').is(':checked'),
        onTable: $('#OnTable').is(':checked'),
        isActive: $('#IsActive').is(':checked'),
        displayOrder: parseInt($('#DisplayOrder').val() || 0),
        gridColumn: parseInt($('#GridColumn').val() || 12),
        companyId: parseInt($('#CompanyID').val()) || 0,
        sessionId: parseInt($('#SessionID').val()) || 0
    };

    var id = parseInt($('#FieldId').val() || 0);
    const isEdit = id > 0;
    try {
        const response = await fetch('/Settings/UpsertField', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const res = await response.json();
        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit
                    ? 'Custom fields has been updated successfully.'
                    : 'Custom fields has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                window.location.href = '/Settings/CustomFields';
            });
        } else {
            IV.setNotice('fieldModalNotice', res.message || 'Failed to save field.');
        }
    } catch (error) {
        console.error('Error saving field:', error);
        IV.setNotice('fieldModalNotice', 'Could not save custom field.');
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
                    url: '/Settings/ToggleFieldStatus',
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
function loadPurposePartial(queryString) {
    const container = document.getElementById('customFieldsTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/Settings/GetSystemFieldsPartial?${queryString}`, {
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

            if ($.fn.DataTable.isDataTable('#tblCustomFields')) {
                $('#tblCustomFields').DataTable().destroy();
            }
            exportTable = $('#tblCustomFields').DataTable({
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
    const link = e.target.closest('#customFieldsTableContainer .page-link');
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
}// wwwroot/js/copyPurposeModal.js
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
const PURPOSE_ENTITY_COLUMNS = {
    CustomFields: {
        headers: ['Order', 'Module', 'Field Name', 'Type', 'Grid', 'Required', 'On Table', 'Status'],
        row: (r, i) => `
            <td>${i + 1}</td>
            <td>${r.displayOrder ?? '-'}</td>
            <td>${r.belongsTo ?? '-'}</td>
            <td>${r.fieldName ?? '-'}</td>
            <td>${r.fieldType ?? '-'}</td>
            <td>${r.gridColumn ?? '-'}</td>
            <td>${r.isRequired ?? '-'}</td>
            <td>${r.onTable ?? '-'}</td>
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
const PURPOSE_GET_ACTION_OVERRIDES = {
    LibraryPurpose: 'GetAllPurposes'
};
const PURPOSE_COPY_ACTION_OVERRIDES = {
    // LibraryPurpose: 'CopyPurposes'  // uncomment/adjust if your copy action differs too
};

function purposeGetAction(entityType) {
    return PURPOSE_GET_ACTION_OVERRIDES[entityType] || entityType;
}
function purposeCopyAction(entityType) {
    return PURPOSE_COPY_ACTION_OVERRIDES[entityType] || `Copy${entityType}`;
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

        // Sessions — reuse the shared window.fetchSessions() helper already
        // used by copySessionModal.js, so session data isn't fetched twice
        // with two different implementations.
        const sessions = window.fetchSessions ? await window.fetchSessions() : [];
        sessions.forEach(s => {
            const optFrom = new Option(s.sessionTitle, s.sessionId);
            if (currentSessionId && String(currentSessionId) === String(s.sessionId)) {
                optFrom.selected = true;
            }
            sessDdl.add(optFrom);

            // "To" session intentionally has no default.
            sessDdlTo.add(new Option(s.sessionTitle, s.sessionId));
        });

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

// ── Called by every page's Copy button — ONLY ARGUMENT CHANGES ─────
function openCopyCustomFieldsModal(entityType) {
    currentPurposeConfig = { entityType, loadedIds: [] };

    document.getElementById('tableSectionBudget').classList.add('d-none');
    document.getElementById('validationBoxBudget').classList.add('d-none');
    document.getElementById('btnCopyBudget').disabled = true;
    document.getElementById('budgetTbody').innerHTML = '';

    new bootstrap.Modal(document.getElementById('copyPurposeModal')).show();
    initPurpose();
}

// ── Runs on EVERY dropdown change — From company/session AND To
//    company/session all call this via onchange in the partial, so the
//    Copy button's enabled state is always re-evaluated the moment any
//    of the four values changes. ──────────────────────────────────────
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
    const config = PURPOSE_ENTITY_COLUMNS[currentPurposeConfig.entityType];
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
        const resp = await fetch(`/Settings/GetAllFields?companyId=${fromAcc}&sessionId=${fromSess ?? 0}&isSystemField=false`);
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
        currentPurposeConfig.loadedIds = res.data.map(r => r.id ?? r.purposeId ?? r.budgetId);
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
        const res = await fetch(`/Settings/CopyField`, {
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

// Expose the only entry point pages need.
//window.openCopyPurposeModal = openCopyPurposeModal;

const fieldFieldMap = {
    BelongsTo: 'errBelongsTo',
    FieldType: 'errFieldType',
    FieldName: 'errFieldName',
    GridColumn: 'errGridColumn'
};

function clearFieldFormValidation() {
    IV.clearMap(fieldFieldMap);
    IV.clearNotice('fieldModalNotice');
}

function validateFieldForm() {
    clearFieldFormValidation();
    let ok = true;

    const belongsTo = $('#BelongsTo').val();
    const fieldType = $('#FieldType').val();
    const fieldName = $('#FieldName').val().trim();

    if (!belongsTo) {
        IV.setFieldError('BelongsTo', 'errBelongsTo', 'Please select who this field belongs to.');
        ok = false;
    }
    if (!fieldType) {
        IV.setFieldError('FieldType', 'errFieldType', 'Please select a field type.');
        ok = false;
    }
    if (!fieldName) {
        IV.setFieldError('FieldName', 'errFieldName', 'Field name is required.');
        ok = false;
    }

    // Grid column: required, whole number, between 1 and 12
    const gridRaw = $('#GridColumn').val().trim();
    const gridNum = Number(gridRaw);
    if (gridRaw === '' || !Number.isInteger(gridNum)) {
        IV.setFieldError('GridColumn', 'errGridColumn', 'Enter a whole number.');
        ok = false;
    } else if (gridNum < 1 || gridNum > 12) {
        IV.setFieldError('GridColumn', 'errGridColumn', 'Grid column must be between 1 and 12.');
        ok = false;
    }

    // FieldValues only required when the section is visible (select/multiselect)
    const valuesVisible = !$('#divValues').hasClass('d-none');
    if (valuesVisible) {
        const fieldValues = $('#FieldValues').val().trim();
        if (!fieldValues) {
            IV.setFieldError('FieldValues', 'errFieldValues', 'Please enter at least one option.');
            ok = false;
        }
    }

    return ok;
}
// Auto-clear red border + message the moment the user changes the value
IV.bindAutoClear(fieldFieldMap);

// bindAutoClear from the IV shim only listens for 'input' events — that
// covers FieldName's text input, but <select> elements fire 'change',
// not 'input', in all browsers reliably. Bind those explicitly too:
['BelongsTo', 'FieldType'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
        document.getElementById(id)?.classList.remove('is-invalid');
        const err = document.getElementById(fieldFieldMap[id]);
        if (err) err.textContent = '';
    });
});

document.getElementById('FieldValues')?.addEventListener('input', () => {
    document.getElementById('FieldValues')?.classList.remove('is-invalid');
    const err = document.getElementById('errFieldValues');
    if (err) err.textContent = '';
});