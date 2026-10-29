// ========================================
// UserType.js  (used by Index.cshtml AND Add.cshtml)
// Index: search, filter badges, AJAX table/paging, status switch, export
// Add  : validation + save
// ========================================
const permCanAdd = window.canAdd;
const permCanEdit = window.canEdit;
const permCanDelete = window.canDelete;
const IV = window.InlineFormValidation;

let appliedFilters = {};     // { txtSearchInput: { label, text } }
let searchTimer = null;
let exportTable = null;

// ========================================
// Export (DataTable button trigger)
// ========================================
function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#typesTable')) {
        $('#typesTable').DataTable().button(index).trigger();
    }
}

// ========================================
// DataTable (export only; search/paging are server-side)
// ========================================
function initDataTable() {
    if (!document.getElementById('typesTable')) return;

    if ($.fn.DataTable.isDataTable('#typesTable')) {
        $('#typesTable').DataTable().destroy();
    }

    try {
        exportTable = $('#typesTable').DataTable({
            dom: 'Bfrtip',
            buttons: [
                { extend: 'copy', title: 'User Types', exportOptions: { columns: [1, 2, 4] } },
                { extend: 'csv', title: 'User Types', exportOptions: { columns: [1, 2, 4] } },
                { extend: 'excel', title: 'User Types', exportOptions: { columns: [1, 2, 4] } },
                { extend: 'pdf', title: 'User Types', exportOptions: { columns: [1, 2, 4] } },
                { extend: 'print', title: 'User Types', exportOptions: { columns: [1, 2, 4] } }
            ],
            searching: false,
            paging: false,
            info: false,
            ordering: false,
            language: { emptyTable: 'No records found.' }
        });
    } catch (e) {
        console.error('DataTable init failed', e);
    }
}

// ========================================
// Filter badges (search only)
// ========================================
function renderFilterBadges() {
    const container = document.getElementById('badgeContainer');
    const mainContainer = document.getElementById('activeFilterBadges');
    if (!container || !mainContainer) return;

    container.innerHTML = '';

    Object.entries(appliedFilters).forEach(([id, { label, text }]) => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-primary-subtle text-primary border border-primary-subtle d-flex align-items-center gap-1 fw-medium px-2 py-1';
        badge.appendChild(document.createTextNode(`${label}: ${text}`));

        const x = document.createElement('i');
        x.className = 'ti ti-x ms-1 cursor-pointer';
        x.style.fontSize = '10px';
        x.addEventListener('click', () => removeFilter(id));
        badge.appendChild(x);

        container.appendChild(badge);
    });

    mainContainer.style.display = Object.keys(appliedFilters).length > 0 ? 'block' : 'none';
}

function syncSearchFilter() {
    const val = (document.getElementById('txtSearchInput')?.value || '').trim();
    if (val) appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
    else delete appliedFilters['txtSearchInput'];
}

function removeFilter(filterId) {
    if (filterId === 'txtSearchInput') {
        const el = document.getElementById('txtSearchInput');
        if (el) el.value = '';
        document.getElementById('hdnSearch').value = '';
    }
    delete appliedFilters[filterId];
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

function resetAllFilters() {
    const search = document.getElementById('txtSearchInput');
    if (search) search.value = '';
    document.getElementById('hdnSearch').value = '';

    appliedFilters = {};
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

// ========================================
// Load list via AJAX
// ========================================
function submitForm() {
    const form = document.getElementById('frmSearch');
    if (!form) return;
    const params = new URLSearchParams(new FormData(form)).toString();
    loadUserTypePartial(params);
}

function loadUserTypePartial(queryString) {
    const container = document.getElementById('userTypeTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/UserType/GetUserTypePartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load user types');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';

            initDataTable();
            updateButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
            else if (window.Swal) Swal.fire('Error', 'Could not refresh the list.', 'error');
        });
}

// Pagination links -> AJAX instead of full navigation
document.addEventListener('click', function (e) {
    const link = e.target.closest('#userTypeTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('pageIndex') || 1;
    loadUserTypePartial(query);
    history.replaceState(null, '', href);
});

// ========================================
// Row selection (checkboxes) / buttons
// ========================================
function getSelectedIds() {
    return $('.usertype-checkbox:checked').map(function () { return parseInt($(this).val()); }).get();
}

function syncSelection() {
    document.querySelectorAll('#typesTable tbody .item-row').forEach(r => {
        const cb = r.querySelector('.usertype-checkbox');
        r.classList.toggle('bg-light', !!(cb && cb.checked));
    });
    updateButtonStates();
}

// Click anywhere on the row toggles its checkbox (switch / checkbox clicks are left alone)
document.addEventListener('click', function (e) {
    const row = e.target.closest('#typesTable tbody tr.item-row');
    if (!row) return;
    if (e.target.closest('.status-cell') || e.target.closest('.usertype-checkbox')) return;

    const cb = row.querySelector('.usertype-checkbox');
    if (cb) { cb.checked = !cb.checked; syncSelection(); }
});

document.addEventListener('change', function (e) {
    if (e.target.matches && e.target.matches('.usertype-checkbox')) syncSelection();
});

function updateButtonStates() {
    const count = getSelectedIds().length;
    const any = count > 0;

    $('#btnEdit').prop('disabled', !(permCanEdit && count === 1));
    $('#btnDelete').prop('disabled', !(permCanDelete && any));
    $('#btnActive').prop('disabled', !(permCanEdit && any));
    $('#btnInactive').prop('disabled', !(permCanEdit && any));
}

function editSelected() {
    if (!permCanEdit) {
        Swal.fire('Notice', 'You do not have permission to edit.', 'info');
        return;
    }
    const ids = getSelectedIds();
    if (ids.length !== 1) return;
    location.href = `/UserType/Add/${ids[0]}`;
}

// Reload the current page of the list (keeps search + page number)
function reloadList() {
    submitForm();
}

// ========================================
// Activate / Deactivate  (row switch  OR  top Active / Inactive buttons)
// toggleStatus(id, isActive, switchEl)  -> id > 0 : that row only
//                                          id = 0 : all ticked rows
// ========================================
async function toggleStatus(id, isActive, switchEl) {
    const revert = () => { if (switchEl) switchEl.checked = !isActive; };

    if (!permCanEdit) {
        revert();
        Swal.fire('Notice', 'You do not have permission to change status.', 'info');
        return;
    }

    const ids = (id && id !== 0) ? [parseInt(id)] : getSelectedIds();
    if (ids.length === 0) {
        Swal.fire('Notice', 'Please select at least one user type.', 'info');
        return;
    }

    const cfg = isActive
        ? {
            icon: 'question',
            title: 'Activate Record(s)?',
            text: 'Activating will make the selected user type(s) available for use across the system. Continue?',
            confirmText: 'Yes, Activate',
            confirmClass: 'btn btn-success me-2'
        }
        : {
            icon: 'warning',
            title: 'Deactivate Record(s)?',
            text: 'Deactivating will prevent the selected user type(s) from being used. Continue?',
            confirmText: 'Yes, Deactivate',
            confirmClass: 'btn btn-danger me-2'
        };

    const result = await Swal.fire({
        icon: cfg.icon,
        title: cfg.title,
        text: cfg.text,
        showCancelButton: true,
        confirmButtonText: cfg.confirmText,
        cancelButtonText: 'Cancel',
        customClass: { confirmButton: cfg.confirmClass, cancelButton: 'btn btn-secondary' },
        buttonsStyling: false
    });

    if (!result.isConfirmed) { revert(); return; }

    $.ajax({
        url: '/UserType/ToggleStatus',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ ids: ids.join(','), isActive: isActive }),
        success: function (res) {
            if (res.success) {
                Swal.fire('Updated!', res.message || 'Status updated successfully.', 'success')
                    .then(() => reloadList());
            } else {
                // e.g. "users are linked to this user type"
                revert();
                Swal.fire('Error!', res.message || 'Failed to update status.', 'error');
            }
        },
        error: function (xhr) {
            revert();
            console.error('Status update error:', xhr.status, xhr.responseText);
            Swal.fire('Error!', 'An unexpected error occurred.', 'error');
        }
    });
}

// ========================================
// Delete (multiple)
// ========================================
function deleteSelected() {
    if (!permCanDelete) {
        Swal.fire('Notice', 'You do not have permission to delete.', 'info');
        return;
    }

    const ids = getSelectedIds();
    if (ids.length === 0) {
        Swal.fire('Notice', 'Please select at least one user type.', 'info');
        return;
    }

    Swal.fire({
        title: 'Are you sure?',
        text: 'You are about to delete the selected user type record(s). This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-secondary' },
        buttonsStyling: false
    }).then((result) => {
        if (!result.isConfirmed) return;

        // if every row on this page is being deleted, step back one page
        const rowsOnPage = document.querySelectorAll('#typesTable tbody .item-row').length;
        const pageEl = document.getElementById('hdnPageIndex');
        const page = parseInt(pageEl.value) || 1;

        $.ajax({
            url: '/UserType/Delete',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(ids),
            success: function (res) {
                if (res.success) {
                    if (ids.length >= rowsOnPage && page > 1) pageEl.value = page - 1;
                    Swal.fire('Deleted!', res.message || 'User type record(s) have been deleted.', 'success')
                        .then(() => reloadList());
                } else {
                    Swal.fire('Error!', res.message || 'Failed to delete user type.', 'error');
                }
            },
            error: function () {
                Swal.fire('Error!', 'An unexpected error occurred.', 'error');
            }
        });
    });
}

// ========================================
// ADD / EDIT page
// ========================================
const userTypeFieldMap = { txtTypeCode: 'errTxtTypeCode', txtTypeName: 'errTxtTypeName' };

function clearUserTypeValidation() {
    if (!IV) return;
    IV.clearMap(userTypeFieldMap);
    IV.clearNotice('userTypeModalNotice');
}

function validateUserTypeForm() {
    clearUserTypeValidation();
    let ok = true;
    const code = document.getElementById('txtTypeCode').value.trim();
    const name = document.getElementById('txtTypeName').value.trim();

    if (!code) { IV.setFieldError('txtTypeCode', 'errTxtTypeCode', 'Type code is required.'); ok = false; }
    if (!name) { IV.setFieldError('txtTypeName', 'errTxtTypeName', 'Type name is required.'); ok = false; }
    return ok;
}

async function saveItem() {
    const uid = parseInt(document.getElementById('txtItemId').value) || 0;

    if (uid === 0 && !permCanAdd) {
        Swal.fire('Notice', 'You do not have permission to add.', 'info');
        return;
    }
    if (uid > 0 && !permCanEdit) {
        Swal.fire('Notice', 'You do not have permission to edit.', 'info');
        return;
    }
    if (!validateUserTypeForm()) return;

    const data = {
        userTypeID: uid,
        typeCode: document.getElementById('txtTypeCode').value.trim(),
        typeName: document.getElementById('txtTypeName').value.trim(),
        isActive: document.getElementById('isActive').checked
    };

    const btn = document.getElementById('btnSave');
    const btnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';

    try {
        const resp = await fetch('/UserType/Save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const res = await resp.json();

        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: uid > 0 ? 'User type has been updated successfully.' : 'User type has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => { window.location.href = '/UserType/Index'; });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save user type.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
            btn.disabled = false;
            btn.innerHTML = btnHtml;
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Could not save user type.', 'error');
        btn.disabled = false;
        btn.innerHTML = btnHtml;
    }
}

// ========================================
// Init (safe on both pages)
// ========================================
document.addEventListener('DOMContentLoaded', () => {

    // ---- Index page ----
    if (document.getElementById('userTypeTableContainer')) {
        $.fn.dataTable.ext.errMode = 'none';
        initDataTable();

        // initial search coming from the server-rendered query string
        syncSearchFilter();
        renderFilterBadges();

        document.getElementById('txtSearchInput')?.addEventListener('input', function () {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                document.getElementById('hdnSearch').value = this.value;
                document.getElementById('hdnPageIndex').value = 1;
                syncSearchFilter();
                renderFilterBadges();
                submitForm();
            }, 500);
        });
    }

    // ---- Add / Edit page ----
    if (document.getElementById('itemForm') && IV) {
        IV.bindAutoClear(userTypeFieldMap);
    }
});
