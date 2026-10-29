function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#classesTable')) {
        const table = $('#classesTable').DataTable();
        table.button(index).trigger();
    }
}
// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_hostelType';
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

    loadClassPartial(params);
}
// ✅ NEW — fetches only the class table+pagination partial
function loadClassPartial(queryString) {
    const container = document.getElementById('classTableContainer');
    if (!container) return;
    var companyname = localStorage.getItem("comName");
    container.style.opacity = '0.5';

    fetch(`/Academics/GetClassPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load classes');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';

            if ($.fn.DataTable.isDataTable('#classTable')) {
                $('#classTable').DataTable().destroy();
            }
            exportTable = $('#classTable').DataTable({
                dom: 'Bfrtip',
                buttons: [
                    { extend: 'copy', title: `Class - ${companyname}`, exportOptions: { columns: [1, 2,3,4], rows: ':visible' } },
                    { extend: 'csv', title: `Class - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'excel', title: `Class - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'pdf', title: `Class - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'print', title: `Class - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } }
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

// ✅ NEW — pagination click interception, scoped to the class container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#classTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    loadClassPartial(query);
    history.replaceState(null, '', href);
});


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

// ✅ CHANGED — add renderFilterBadges() at the end
function applyFilters() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const sectionEl = document.getElementById('ddlFilterSection');
    const searchEl = document.getElementById('txtSearchInput');

    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    if (sessionEl?.value && sessionEl.value !== '') {
        appliedFilters['ddlFilterSessions'] = {
            label: 'Session',
            text: sessionEl.options[sessionEl.selectedIndex]?.text || sessionEl.value
        };
    } else delete appliedFilters['ddlFilterSessions'];

    if (companyEl?.value && companyEl.value !== '') {
        appliedFilters['ddlFilterCompany'] = {
            label: 'Company',
            text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value
        };
    } else delete appliedFilters['ddlFilterCompany'];

    if (sectionEl?.value && sectionEl.value !== '') {
        appliedFilters['ddlFilterSection'] = {
            label: 'Section',
            text: sectionEl.options[sectionEl.selectedIndex]?.text || sectionEl.value
        };
    } else delete appliedFilters['ddlFilterSection'];

    saveAppliedFilters();
    renderFilterBadges(); // ✅ NEW
}

function removeFilter(filterId) {
    if (filterId === 'ddlFilterSessions') {
        const el = document.getElementById('ddlFilterSessions');
        if (el) { el.value = ''; if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change'); }
    } else if (filterId === 'ddlFilterCompany') {
        const el = document.getElementById('ddlFilterCompany');
        if (el) { el.value = ''; if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change'); }
    } else if (filterId === 'txtSearchInput') {
        const el = document.getElementById('txtSearchInput');
        if (el) el.value = '';
        document.getElementById('hdnSearch').value = '';
    } else if (filterId === 'ddlFilterSection') {
        const el = document.getElementById('ddlFilterSection');
        if (el) { el.value = ''; if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change'); }
    }
    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges(); // ✅ NEW
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';
    document.getElementById('hdnSearch').value = '';

    ['ddlFilterSessions', 'ddlFilterCompany', 'ddlFilterSection'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = '';
        if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
    });

    clearAppliedFilters();
    renderFilterBadges(); // ✅ NEW
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

// ========================================
// DOMContentLoaded — init DataTable + UI
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // ...DataTable init stays here (this is the export-only table, fine to keep)...

    document.getElementById('filter-dropdown')?.addEventListener('click', e => e.stopPropagation());

    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        document.getElementById('hdnPageIndex').value = 1;
        document.getElementById('hdnSearch').value = document.getElementById('txtSearchInput').value;
        applyFilters();
        submitForm();
    });

    // ✅ CHANGED — call the single resetAllFilters() function, don't duplicate its body
    document.getElementById('btnResetFilters')?.addEventListener('click', resetAllFilters);

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

        const val = this.value.trim();
        if (val) appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        else delete appliedFilters['txtSearchInput'];
        saveAppliedFilters();
        renderFilterBadges(); // ✅ NEW

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
const classFieldMap = {
    txtClassName: 'errTxtClassName',
    ddlSections: 'errDdlSections'
};



$(document).ready(function () {
    var companyname = localStorage.getItem("comName");
    $('#classesTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Class - ${companyname}`, exportOptions: { columns: [1, 2, 3,4] } },
            { extend: 'csv', title: `Class - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'excel', title: `Class - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'pdf', title: `Class - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'print', title: `Class - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } }
        ],
        searching: false,
        paging: false,
        info: false
    });

    $('#ddlSections').select2({
        placeholder: "Select Sections",
        allowClear: true
    });

    // ✅ single source of truth for filter dropdown select2 init
    function initFilterSelect2(selector) {
        var $el = $(selector);
        if (!$el.hasClass('select2-hidden-accessible')) { // ✅ guard prevents double-init
            $el.select2({
                dropdownParent: $('#filter-dropdown'),
                width: '100%',
                allowClear: true
            });
        }
    }
    function preselectFilterDropdowns() {
        const companyEl = document.getElementById('ddlFilterCompany');
        const hdnCompanyID = document.getElementById('hdnCompanyID');

        if (companyEl && hdnCompanyID && hdnCompanyID.value) {
            // Only force it if nothing is already selected in the <select>
            if (!companyEl.value) {
                companyEl.value = hdnCompanyID.value;
            }
            $(companyEl).trigger('change'); // repaint Select2's visible label
        }
    }

    initFilterSelect2('#ddlFilterCompany');
    initFilterSelect2('#ddlFilterSessions');
    initFilterSelect2('#ddlFilterSection');
    preselectFilterDropdowns();

    $('#btnFilterToggle').on('shown.bs.dropdown', function () {
        initFilterSelect2('#ddlFilterCompany');
        initFilterSelect2('#ddlFilterSessions');
        initFilterSelect2('#ddlFilterSection');
        preselectFilterDropdowns();
    });
});

function clearModalValidation() {
    IV.clearMap(classFieldMap);
    IV.clearNotice('classModalNotice');
}
// select2 (#ddlSections) fires 'change', not 'input'
$('#ddlSections').on('change', function () {
    document.getElementById('ddlSections')?.classList.remove('is-invalid');
    const err = document.getElementById('errDdlSections');
    if (err) err.textContent = '';
});

// plain <select> (#ddlSequenceOrder) also fires 'change', not 'input'
document.getElementById('ddlSequenceOrder')?.addEventListener('change', function () {
    this.classList.remove('is-invalid');
    const err = document.getElementById('errtxtSequenceOrder');
    if (err) err.textContent = '';
});
IV.bindAutoClear(classFieldMap);

function selectItem(id, row) {
    IV.clearNotice('classPageNotice');
    window.selectedClassId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    row.classList.add('bg-light');

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
        IV.setNotice('classPageNotice', 'You do not have permission to edit.');
        return;
    }
    if (window.selectedClassId === 0) return;
    IV.clearNotice('classPageNotice');
    clearModalValidation();
    try {

        if (window.selectedClassId) {
            location.href = `/Academics/AddClass/${window.selectedClassId}`;
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
        alert("Please select at least one Class.");
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this Class record. This action cannot be undone!",
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
                url: '/Academics/DeleteClass',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Class record has been deleted.', 'success')
                            .then(() => location.reload());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete Class.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}

// and only calls the API if everything passes. No more "fix one, resubmit, hit the next" loop.
async function saveItem() {
    const cid = parseInt(document.getElementById('txtItemId').value);
    const companyID = parseInt(document.getElementById('hdnCompanyID').value);
    const sessionID = parseInt(document.getElementById('hdnSessionID').value);
    if (cid === 0 && !permCanAdd) {
        IV.setNotice('classModalNotice', 'You do not have permission to add.');
        return;
    }
    if (cid > 0 && !permCanEdit) {
        IV.setNotice('classModalNotice', 'You do not have permission to edit.');
        return;
    }

    clearModalValidation();

    const name = document.getElementById('txtClassName').value.trim();
    const displayLabel = document.getElementById('txtDisplayLabel').value.trim();
    const sequenceOrder = null;// document.getElementById('ddlSequenceOrder').value;
    const selectedSections = $('#ddlSections').val() || [];
    const sectionIds = selectedSections.map(v => parseInt(v));

    let isValid = true; // ✅ NEW — track validity instead of returning early

    if (!name) {
        IV.setFieldError('txtClassName', 'errTxtClassName', 'Class is required.');
        isValid = false;
    }    

    //if (!sequenceOrder) {
    //    IV.setFieldError('ddlSequenceOrder', 'errtxtSequenceOrder', 'Promotion order is required.');
    //    isValid = false;
    //}

    if (sectionIds.length === 0) {
        IV.setFieldError('ddlSections', 'errDdlSections', 'At least one section must be assigned.');
        isValid = false;
    }

    if (!isValid) return; // ✅ NEW — stop only after collecting ALL errors, not on the first one

    const isActiveEl = document.getElementById('isActive');
    const isActive = isActiveEl ? isActiveEl.checked : false;

    const data = {
        classID: cid,
        className: name,
        isActive: isActive,
        sectionIds: sectionIds,
        sequenceOrder: sequenceOrder,
        displayLabel: displayLabel || name,
        companyID: companyID,
        sessionID: sessionID
    };

    try {
        const r = await fetch('/Academics/SaveClass', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const res = await r.json();
        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: cid > 0 ? 'Class has been Updated Successfully.' : 'Class has been Added Successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                window.location.href = '/Academics/Class';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save class.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
    } catch (err) {
        console.error(err);
        IV.setNotice('classModalNotice', 'Could not save class.');
    }
}

function updateButtonStates() {
    let checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
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
                    url: '/Academics/ToggleClassStatus',
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