// Letters-only fields
$('#txtTitle, #txtDisplayLabel').on('input', function () {
    this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
});
function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#tblRoomType')) {
        const table = $('#tblRoomType').DataTable();
        table.button(index).trigger();
    }
}

// Map each required field to its error element
const roomTypeFieldMap = {
    ddlACNonAC: 'errDdlACNonAC',
    txtTitle: 'errtxtTitle',
    txtBedCapacity: 'errBedCapacity'
};

// ========================================
// Inline validation fallback
// ========================================
const IV = window.InlineFormValidation || {
    setNotice: (id, msg) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    },
    clearNotice: (id) => { const el = document.getElementById(id); if (el) el.innerHTML = ''; }
};

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_hotelRoomType';
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
    // Sync hidden form fields from dropdowns/search before submit.
    // This sync lives here (not just in the search handler) so submitForm()
    // is safe to call from ANYWHERE — delete, status-change, pagination —
    // without the caller having to remember to sync fields first.
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const searchEl = document.getElementById('txtSearchInput');

    if (sessionEl) document.getElementById('hdnSessionID').value = sessionEl.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;
    if (searchEl) document.getElementById('hdnSearch').value = searchEl.value.trim();

    const form = document.getElementById('frmSearch');
    if (!form) {
        console.warn('submitForm: #frmSearch not found, skipping reload.');
        return;
    }
    const params = new URLSearchParams(new FormData(form)).toString();

    loadRoomOccupancyTypePartial(params);
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
            text: sessionEl.options[sessionEl.selectedIndex]?.text || sessionEl.value,
            value: sessionEl.value
        };
    } else delete appliedFilters['ddlFilterSessions'];

    // Company
    if (companyEl?.value && companyEl.value !== '') {
        appliedFilters['ddlFilterCompany'] = {
            label: 'Company',
            text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value,
            value: companyEl.value
        };
    } else delete appliedFilters['ddlFilterCompany'];

    document.getElementById('hdnPageIndex').value = 1;

    saveAppliedFilters();
    renderFilterBadges();   // update badges immediately
    submitForm();           // applyFilters() is fully self-contained — caller
    //never has to remember to call submitForm() too.
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
    if (filterId === 'ddlFilterSessions' || filterId === 'ddlFilterCompany') {
        const el = document.getElementById(filterId);
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
    renderFilterBadges();   // reflect removal immediately
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
    document.getElementById('hdnPageIndex').value = 1;
    renderFilterBadges();   // clear badges visually right away

    // ── Force-close the filter dropdown ─────────────────────────
    const toggleEl = document.getElementById('btnFilterToggle');
    if (toggleEl && window.bootstrap) {
        const dd = bootstrap.Dropdown.getInstance(toggleEl) || new bootstrap.Dropdown(toggleEl);
        dd.hide();
    }

    submitForm();
}

// ========================================
// DOMContentLoaded — init DataTable + UI (single init point)
// ========================================
document.addEventListener('DOMContentLoaded', () => {

    // ── Clear stale filters on every full page load / redirect back ────
    clearAppliedFilters();
    renderFilterBadges();

    Object.keys(roomTypeFieldMap).forEach(fieldId => {
        const el = document.getElementById(fieldId);
        const errEl = document.getElementById(roomTypeFieldMap[fieldId]);
        if (!el || !errEl) return;

        const clearError = () => {
            const val = el.value?.toString().trim();
            if (val) {
                el.classList.remove('field-invalid');
                errEl.textContent = '';
                errEl.classList.remove('show-error');
            }
        };

        el.addEventListener('input', clearError);
        el.addEventListener('change', clearError);

        if (window.jQuery) {
            jQuery(el).on('change select2:select', clearError);
        }
    });
    var companyname = localStorage.getItem("comName");
    // ── DataTable (export only) — single init point ────────────────────
    if ($.fn.DataTable.isDataTable('#tblRoomType')) {
        $('#tblRoomType').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    try {
        window.exportTable = $('#tblRoomType').DataTable({
            dom: 'Bfrtip',
            buttons: [
                { extend: 'copy', title: `Room Occupancy Type - ${companyname}`, exportOptions: { columns: [1, 2, 3] } },
                { extend: 'csv', title: `Room Occupancy Type - ${companyname}`, exportOptions: { columns: [1, 2, 3] } },
                { extend: 'excel', title: `Room Occupancy Type - ${companyname}`, exportOptions: { columns: [1, 2, 3] } },
                { extend: 'pdf', title: `Room Occupancy Type - ${companyname}`, exportOptions: { columns: [1, 2, 3] } },
                { extend: 'print', title: `Room Occupancy Type - ${companyname}`, exportOptions: { columns: [1, 2, 3] } }
            ],
            searching: false,
            paging: false,
            info: false,
            ordering: false,
            language: {
                emptyTable: 'No records found.',
                zeroRecords: 'No matching records found.'
            }
        });
    } catch (e) {
        console.warn('DataTable init warning (tblRoomType):', e);
    }

    // ── Select2 ───────────────────────────────────────────────────────
    if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
        jQuery('#ddlFilterSessions, #ddlFilterCompany').select2({
            width: '100%',
            dropdownParent: jQuery('#filter-dropdown'),
            allowClear: true,
            placeholder: function () { return jQuery(this).data('placeholder') || 'Select'; }
        });
    }

    // ── Apply Filters ─────────────────────────────────────────────────
    document.getElementById('btnApplyFilters')?.addEventListener('click', (e) => {
        e.preventDefault(); // button is type="submit" inside #frmSearch — stop native submit racing our ajax call
        applyFilters();     // saves + renders badges + submits on its own
    });

    // ── Reset Filters ─────────────────────────────────────────────────
    document.getElementById('btnResetFilters')?.addEventListener('click', (e) => {
        e.preventDefault();
        resetAllFilters();
    });

    // ── Filter dropdown popper tweak (moved inside DOMContentLoaded — was
    //    previously bound at top-level script scope, which is unsafe if
    //    this script runs/parses before #btnFilterToggle exists in the DOM,
    //    e.g. when the script tag is placed in <head>) ───────────────────
    $('#btnFilterToggle').on('shown.bs.dropdown', function () {
        var dropdownInstance = bootstrap.Dropdown.getInstance(this);
        if (dropdownInstance && dropdownInstance._popper) {
            dropdownInstance._popper.setOptions({
                modifiers: [
                    { name: 'flip', enabled: false },
                    { name: 'preventOverflow', enabled: false }
                ]
            });
        }
    });
});

let selectedId = 0;
const canEdit = window.canEdit;
const canDelete = window.canDelete;
window.selectedRoomTypeId = 0;

function selectItem(id, row) {
    selectedId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    row.classList.add('bg-light');
    window.selectedRoomTypeId = id;
    if (canEdit) document.getElementById('btnEdit').disabled = false;
    if (canDelete) document.getElementById('btnDelete').disabled = false;

    let checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    // Edit sirf 1 record select hone par
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
}

// ========================================
// Text search — keystroke updates hidden field + badge (live) and
// debounce-triggers a reload via submitForm() -> loadRoomOccupancyTypePartial
// ========================================
const searchInput = document.getElementById('txtSearchInput');
if (searchInput) {
    let debounceTimer = null;
    searchInput.addEventListener('input', function () {
        const val = this.value.trim();
        document.getElementById('hdnSearch').value = val;
        if (val) {
            appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        } else {
            delete appliedFilters['txtSearchInput'];
        }
        saveAppliedFilters();
        renderFilterBadges();   // badges update live while typing

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            document.getElementById('hdnPageIndex').value = 1;
            submitForm();        // -> loadRoomOccupancyTypePartial
        }, 300);
    });

    // Enter key — submit immediately without waiting for the debounce
    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(debounceTimer);
            applyFilters();       // -> saves, renders badges, submitForm() -> loadRoomOccupancyTypePartial
        }
    });
}

function editSelected() {
    if (!window.selectedRoomTypeId) return;
    try {
        if (window.selectedRoomTypeId) {
            location.href = `/Hostel/AddRoomType/${window.selectedRoomTypeId}`;
        }
    } catch (err) {
        console.error(err);
    }
}

function validateRoomTypeForm() {
    let isValid = true;

    Object.keys(roomTypeFieldMap).forEach(fieldId => {
        const el = document.getElementById(fieldId);
        const errEl = document.getElementById(roomTypeFieldMap[fieldId]);
        if (!el) return;

        const val = el.value?.toString().trim();
        const invalid = !val;

        if (invalid) {
            isValid = false;
            el.classList.add('field-invalid');
            if (errEl) {
                errEl.textContent = getRequiredMessage(fieldId);
                errEl.classList.add('show-error');
            }
        } else {
            el.classList.remove('field-invalid');
            if (errEl) {
                errEl.textContent = '';
                errEl.classList.remove('show-error');
            }
        }
    });

    return isValid;
}

function getRequiredMessage(fieldId) {
    const messages = {
        ddlACNonAC: 'Room type is required.',
        txtTitle: 'Room occupancy type is required.',
        txtBedCapacity: 'Bed capacity is required.'
    };
    return messages[fieldId] || 'This field is required.';
}

async function saveRecord() {
    if (!validateRoomTypeForm()) {
        return;
    }

    const roomTypeId = parseInt(document.getElementById('txtItemId').value);
    if (roomTypeId === 0 && !window.canAdd) {
        IV.setNotice('classModalNotice', 'You do not have permission to add.');
        return;
    }
    if (roomTypeId > 0 && !window.canEdit) {
        IV.setNotice('classModalNotice', 'You do not have permission to edit.');
        return;
    }

    const isEdit = roomTypeId > 0;
    const bedCapacity = parseInt(document.getElementById('txtBedCapacity').value);

    const data = {
        roomTypeID: roomTypeId || 0,
        roomTypeTitle: document.getElementById('txtTitle').value.trim(),
        displayLabel: document.getElementById('txtDisplayLabel').value.trim() || document.getElementById('txtTitle').value.trim(),
        roomTypeDescription: document.getElementById('txtDescription').value.trim() || null,
        isActive: document.getElementById('chkActive').checked,
        bedCapacity: bedCapacity || 0,
        roomCoolingTypeId: parseInt(document.getElementById('ddlACNonAC').value) || null,
        companyID: document.getElementById('hdnCompanyID').value || null,
        sessionID: document.getElementById('hdnSessionID').value || null
    };

    try {
        const r = await fetch('/Hostel/UpsertRoomType', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const res = await r.json();

        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: isEdit ? 'Updated!' : 'Saved!',
                text: isEdit
                    ? 'Room occupancy type has been updated successfully.'
                    : 'Room occupancy type has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                window.location.href = '/Hostel/RoomType';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save room occupancy type.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }

    } catch (err) {
        console.error(err);
        IV.setNotice('classModalNotice', 'Could not save room occupancy type.');
    }
}

// ========================================
// Delete — refresh via submitForm() -> loadRoomOccupancyTypePartial
// (keeps current filters/page, no full-page reload)
// ========================================
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
        text: "You are about to delete this student record. This action cannot be undone!",
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
                url: '/Hostel/DeleteRoomType',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Room occupancy type record has been deleted.', 'success')
                            .then(() => {
                                selectedId = 0;
                                window.selectedRoomTypeId = 0;
                                submitForm(); // -> loadRoomOccupancyTypePartial, keeps current filters/page
                            });
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete room occupancy type.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}

// ========================================
// Status change — refresh via submitForm() -> loadRoomOccupancyTypePartial
// ========================================

async function toggleStatus(id, isActive, checkboxEl) {
    if (!canEdit) {
        IV.setNotice('classPageNotice', 'You do not have permission to change status.');
        if (checkboxEl) {
            checkboxEl.checked = !isActive;
            $(checkboxEl).trigger('change');
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
                    url: '/Hostel/ToggleRoomTypeStatus',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(request),
                    success: function (res) {
                        if (res.success) {
                            Swal.fire('Updated!', res.message || 'Status updated successfully.', 'success').then(() => location.reload());
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

// ========================================
// Partial reload — the SINGLE reload path used by:
//   - submitForm() for filter/search/apply/reset
//   - deleteSelected() after a successful delete
//   - toggleStatus() after a successful status change
//   - pagination clicks (see click listener below)
// This keeps the page from ever doing a full location.reload().
// ========================================
function loadRoomOccupancyTypePartial(queryString) {
    const container = document.getElementById('roomOccupancyTypeTableContainer');
    if (!container) {
        console.warn('loadRoomOccupancyTypePartial: #roomOccupancyTypeTableContainer not found, skipping reload.');
        return;
    }

    container.style.opacity = '0.5';

    fetch(`/Hostel/GetRoomOccupancyTypePartial?${queryString}`, {
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

            if ($.fn.DataTable.isDataTable('#tblRoomType')) {
                $('#tblRoomType').DataTable().destroy();
            }

            $.fn.dataTable.ext.errMode = 'none';

            try {
                exportTable = $('#tblRoomType').DataTable({
                    dom: 'Bfrtip',
                    buttons: [
                        { extend: 'copy', exportOptions: { columns: [1, 2, 3], rows: ':visible' } },
                        { extend: 'csv', exportOptions: { columns: [1, 2, 3], rows: ':visible' } },
                        { extend: 'excel', exportOptions: { columns: [1, 2, 3], rows: ':visible' } },
                        { extend: 'pdf', exportOptions: { columns: [1, 2, 3], rows: ':visible' } },
                        { extend: 'print', exportOptions: { columns: [1, 2, 3], rows: ':visible' } }
                    ],
                    searching: false,
                    paging: false,
                    info: false,
                    ordering: false,
                    language: {
                        emptyTable: 'No records found.',
                        zeroRecords: 'No matching records found.'
                    }
                });
            } catch (e) {
                console.warn('DataTable init warning (tblRoomType partial):', e);
            }

            if (typeof initStickyTable === 'function') initStickyTable();
            if (typeof stickyHeader === 'function') stickyHeader();

            // Reset selection state after any refresh — the previously
            // selected row's DOM node no longer exists after this reload.
            selectedId = 0;
            window.selectedRoomTypeId = 0;

            // Badges are driven by appliedFilters / sessionStorage, not by
            // the freshly-injected HTML, so re-render them here too —
            // otherwise a reload triggered by delete/status-change/pagination
            // (any caller other than applyFilters/removeFilter) could leave
            // badges out of sync with what's actually on screen.
            renderFilterBadges();

            updateButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// Pagination click interception, scoped to the room type container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#roomOccupancyTypeTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadRoomOccupancyTypePartial(query);
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