// ========================================
// User / Index — list page behavior
// Extracted from Index.cshtml inline <script>.
//
// FIXES applied vs. the inline version:
//  1. Removed `new bootstrap.Modal(document.getElementById('userModal'))`.
//     Index.cshtml has no #userModal element (Add/Edit now lives on the
//     separate AddUser page) — that line threw on load and silently killed
//     every statement after it in the same top-level script, including the
//     DOMContentLoaded listener. This is why search/filters/DataTable/Select2
//     all appeared broken: none of that setup code ever ran.
//  2. Removed the entire AddUser wizard block that was duplicated here
//     (openAddModal/openEditModal/renderStep2/renderStep3/validateStep1/
//     time-select helpers/etc.) — that logic already lives in user-wizard.js
//     for the AddUser page and doesn't belong on Index. Some of it referenced
//     elements this page doesn't have at all.
//  3. Search box (#txtSearchInput) now debounces into loadUserPartial()
//     instead of calling `frmSearch.submit()` against a nonexistent
//     `input[name="pageIndex"]` (that line threw a TypeError on every
//     keystroke since no such input existed on the page).
//  4. All filters (User Type, Company, Status) + Page Size now build a query
//     string via getFilterQueryString() and reload through loadUserPartial()
//     instead of a full-page form submit / a broken raw $.ajax call that
//     read values from #pageSize / #txtSearch (ids that don't exist —
//     the real ids are #ddlPageSize / #txtSearchInput).
//  5. Pagination link handler now calls loadUserPartial() (was calling an
//     undefined function `loadItemCategoryPartial` and writing to a
//     nonexistent `#hdnPageIndex`).
//  6. #btnActive / #btnInactive call updateUserStatus(0, true|false) instead
//     of updateUserStatus(true) — the old call passed `true` as the `id`
//     parameter, corrupting the bulk-selection fallback logic. (Update the
//     onclick attributes in Index.cshtml to match — see notes below.)
// ========================================

let exportTable;

function triggerExport(type) {
    if (!exportTable) return;
    if (type === 'copy') exportTable.button('.buttons-copy').trigger();
    else if (type === 'csv') exportTable.button('.buttons-csv').trigger();
    else if (type === 'excel') exportTable.button('.buttons-excel').trigger();
    else if (type === 'pdf') exportTable.button('.buttons-pdf').trigger();
    else if (type === 'print') exportTable.button('.buttons-print').trigger();
}

// ========================================
// Filter query string — single source of truth for what gets sent
// to /User/GetUserPartial, used by search, every filter control, and
// pagination link clicks alike.
// ========================================
function getFilterQueryString(pageIndex) {
    const params = new URLSearchParams();
    params.set('pageIndex', pageIndex || 1);
    params.set('pageSize', document.getElementById('ddlPageSize')?.value || 10);

    const search = document.getElementById('txtSearchInput')?.value?.trim() || '';
    if (search) params.set('search', search);

    const userType = document.getElementById('ddlFilterUserType')?.value;
    if (userType && userType !== 'all') params.set('userTypeId', userType);

    const company = document.getElementById('ddlFilterCompany')?.value;
    if (company && company !== 'all') params.set('companyId', company);

    const status = document.getElementById('ddlFilterStatus')?.value;
    if (status && status !== 'all') params.set('isActive', status);

    return params.toString();
}

// ========================================
// Partial reload — the one place that actually talks to the server
// for search / filter / page-size / pagination changes.
// ========================================
function loadUserPartial(queryString) {
    const container = document.getElementById('UserTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/User/GetUserPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load users');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';
            resetSelection();
            renderFilterBadges();
            history.replaceState(null, '', `${window.location.pathname}?${queryString}`);
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.showToast) showToast('Could not refresh the list.', false);
        });
}

// ========================================
// Bootstrap page behavior
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    if ($.fn.DataTable.isDataTable('#usersTable')) {
        $('#usersTable').DataTable().destroy();
    }
    exportTable = $('#usersTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', exportOptions: { columns: [1, 2, 3, 4, 5, 7], rows: ':visible' } },
            { extend: 'csv', exportOptions: { columns: [1, 2, 3, 4, 5, 7], rows: ':visible' } },
            { extend: 'excel', exportOptions: { columns: [1, 2, 3, 4, 5, 7], rows: ':visible' } },
            { extend: 'pdf', exportOptions: { columns: [1, 2, 3, 4, 5, 7], rows: ':visible' } },
            { extend: 'print', exportOptions: { columns: [1, 2, 3, 4, 5, 7], rows: ':visible' } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });

    ensureFilterAllOptions();

    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            const $dropdownParent = jQuery('#filter-dropdown');
            jQuery('#ddlFilterUserType,#ddlFilterCompany,#ddlFilterRole,#ddlFilterStatus')
                .select2({
                    width: '100%',
                    dropdownParent: $dropdownParent,
                    allowClear: false,
                    placeholder: function () { return jQuery(this).data('placeholder') || 'Select'; }
                });
        }
    } catch (e) {
        console.warn('Select2 init skipped:', e);
    }

    // Load companies into filter dropdown (API already returns allCompanies)
    loadFilterCompanies();

    // Filters may already be pre-selected server-side (e.g. a bookmarked/
    // shared filtered URL) — reflect that in the badges bar on first paint.
    renderFilterBadges();

    // Keep filter dropdown open while interacting inside it
    const filterMenu = document.getElementById('filter-dropdown');
    filterMenu?.addEventListener('click', (e) => e.stopPropagation());

    // Close button (if present)
    document.getElementById('close-filter')?.addEventListener('click', () => {
        const toggle = document.getElementById('btnFilterToggle');
        if (!toggle) return;
        bootstrap.Dropdown.getOrCreateInstance(toggle).hide();
    });

    // FIX: single Apply Filters handler — reloads via loadUserPartial and
    // closes the dropdown. (Previously there were two competing handlers:
    // one firing a raw $.ajax against wrong element ids, another calling a
    // client-side-only applyFilters() left over from a different page.)
    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        loadUserPartial(getFilterQueryString(1));
        const toggle = document.getElementById('btnFilterToggle');
        if (toggle) bootstrap.Dropdown.getOrCreateInstance(toggle).hide();
    });

    // FIX: Reset clears every control back to defaults, then reloads.
    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        const textInput = document.getElementById('txtSearchInput');
        if (textInput) textInput.value = '';
        ['ddlFilterUserType', 'ddlFilterCompany', 'ddlFilterRole', 'ddlFilterStatus'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.value = 'all';
            if (window.jQuery && jQuery(el).data('select2')) {
                jQuery(el).val('all').trigger('change.select2');
            }
        });
        loadUserPartial(getFilterQueryString(1));
    });

    // FIX: Page size change reloads page 1 through loadUserPartial instead
    // of a full form submit (the inline onchange="this.form.submit()" on
    // #ddlPageSize in the markup should be removed — this listener replaces it).
    document.getElementById('ddlPageSize')?.addEventListener('change', () => {
        loadUserPartial(getFilterQueryString(1));
    });

    // FIX: search box now actually reloads results via loadUserPartial,
    // debounced so it doesn't fire on every keystroke.
    let searchTimer = null;
    document.getElementById('txtSearchInput')?.addEventListener('input', function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            loadUserPartial(getFilterQueryString(1));
        }, 500);
    });
});

async function loadFilterCompanies() {
    const ddl = document.getElementById('ddlFilterCompany');
    if (!ddl) return;

    try {
        const resp = await fetch('/User/GetWizardData?userId=0&roleIds=');
        const result = await resp.json();
        const companies = result?.data?.allCompanies || [];

        const existing = new Set(Array.from(ddl.options).map(opt => String(opt.value)));

        companies.forEach(c => {
            const companyId = String(c.companyId ?? '');
            if (!companyId || existing.has(companyId)) return;
            const opt = document.createElement('option');
            opt.value = companyId;
            opt.textContent = c.schoolName || c.companyName || `Company ${c.companyId}`;
            ddl.appendChild(opt);
            existing.add(companyId);
        });

        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            jQuery('#ddlFilterCompany').trigger('change.select2');
        }
    } catch (err) {
        console.error('Failed to load companies for filter:', err);
    }
}

// ========================================
// Active-filter badges bar (#activeFilterBadges)
// FIX: this was never called anywhere after the dead-code cleanup, so the
// bar stayed hidden no matter what filters were applied. It's now invoked
// after every place a filter can change: Apply, Reset, search debounce,
// and page-size change.
// ========================================
function renderFilterBadges() {
    const container = document.getElementById('badgeContainer');
    const mainContainer = document.getElementById('activeFilterBadges');
    if (!container || !mainContainer) return;
    container.innerHTML = '';

    const filters = [
        { id: 'txtSearchInput', label: 'Search', type: 'text' },
        { id: 'ddlFilterUserType', label: 'User Type', type: 'select' },
        { id: 'ddlFilterCompany', label: 'Company', type: 'select' },
        { id: 'ddlFilterRole', label: 'Role', type: 'select' },
        { id: 'ddlFilterStatus', label: 'Status', type: 'select' }
    ];

    let activeCount = 0;

    filters.forEach(f => {
        const el = document.getElementById(f.id);
        if (!el) return;

        const value = el.value;
        let text = '';

        if (f.type === 'text') {
            if (value.trim()) {
                text = value;
                activeCount++;
            }
        } else if (f.type === 'select') {
            if (value && value !== 'all') {
                const selectedOption = el.options[el.selectedIndex];
                text = selectedOption ? selectedOption.text : value;
                activeCount++;
            }
        }

        if (text) {
            const badge = document.createElement('span');
            badge.className = 'badge bg-primary-subtle text-primary border border-primary-subtle d-flex align-items-center gap-1 fw-medium px-2 py-1';
            badge.innerHTML = `${f.label}: ${text} <i class="ti ti-x ms-1 cursor-pointer" data-filter-id="${f.id}" style="font-size: 10px;"></i>`;
            container.appendChild(badge);
        }
    });

    mainContainer.style.display = activeCount > 0 ? 'block' : 'none';
}

// Click on a badge's "x" clears just that filter and reloads.
document.addEventListener('click', function (e) {
    const x = e.target.closest('#badgeContainer i[data-filter-id]');
    if (!x) return;

    const el = document.getElementById(x.dataset.filterId);
    if (!el) return;

    if (el.tagName === 'INPUT') {
        el.value = '';
    } else {
        el.value = 'all';
        if (window.jQuery && jQuery(el).data('select2')) {
            jQuery(el).trigger('change.select2');
        }
    }

    loadUserPartial(getFilterQueryString(1));
});

// FIX: was referenced by #btnResetAllFilters' onclick but never defined —
// clicking "Clear All" threw ReferenceError and did nothing.
function resetAllFilters() {
    const textInput = document.getElementById('txtSearchInput');
    if (textInput) textInput.value = '';
    ['ddlFilterUserType', 'ddlFilterCompany', 'ddlFilterRole', 'ddlFilterStatus'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = 'all';
        if (window.jQuery && jQuery(el).data('select2')) {
            jQuery(el).val('all').trigger('change.select2');
        }
    });
    loadUserPartial(getFilterQueryString(1));
}

function ensureFilterAllOptions() {
    const dropdownIds = ['ddlFilterUserType', 'ddlFilterCompany', 'ddlFilterRole', 'ddlFilterStatus'];

    dropdownIds.forEach(id => {
        const ddl = document.getElementById(id);
        if (!ddl) return;

        const firstOption = ddl.options.length > 0 ? ddl.options[0] : null;
        const hasAllOption = Array.from(ddl.options).some(opt => opt.value === 'all');
        if (!hasAllOption) {
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'All';
            ddl.insertBefore(allOption, ddl.firstChild);
        } else if (firstOption && firstOption.value === 'all' && firstOption.textContent.trim().length === 0) {
            firstOption.textContent = 'All';
        }
    });
}

// ========================================
// Row selection (invoked via inline onclick from the partial's row markup)
// ========================================
function selectUser(id, row, isLocked) {
    selectedUserId = id;
    document.querySelectorAll('.user-row').forEach(r => r.classList.remove('bg-light'));
    row.classList.add('bg-light');
    row.querySelector('input[type="radio"]').checked = true;
    document.getElementById('btnEdit').disabled = false;
    document.getElementById('btnDelete').disabled = false;
    document.getElementById('btnActive').disabled = false;
    document.getElementById('btnInactive').disabled = false;
    const btnUnlock = document.getElementById('btnUnlock');
    if (btnUnlock) btnUnlock.disabled = !isLocked;
}

let selectedUserId = 0;

function editSelected() {
    const checkedUsers = document.querySelectorAll('input[name="selectedUser"]:checked');

    if (checkedUsers.length !== 1) {
        showToast('Please select exactly one user to edit.', false);
        return;
    }
    const userId = checkedUsers[0].value;
    window.location.href = '/User/AddUser?id=' + userId;
}

async function unlockSelected() {
    if (selectedUserId > 0) {
        await unlockUser(selectedUserId);
    }
}

function resetSelection() {
    selectedUserId = 0;
    document.querySelectorAll('.user-row').forEach(r => r.classList.remove('bg-light'));
    document.querySelectorAll('input[name="selectedUser"]').forEach(r => r.checked = false);
    if (document.getElementById('btnEdit')) document.getElementById('btnEdit').disabled = true;
    if (document.getElementById('btnDelete')) document.getElementById('btnDelete').disabled = true;
    if (document.getElementById('btnActive')) document.getElementById('btnActive').disabled = true;
    if (document.getElementById('btnInactive')) document.getElementById('btnInactive').disabled = true;
    const btnUnlock = document.getElementById('btnUnlock');
    if (btnUnlock) btnUnlock.disabled = true;
}

// ========================================
// Pagination — intercept .page-link clicks inside the partial and
// reload through loadUserPartial instead of a full navigation.
// FIX: previously called an undefined `loadItemCategoryPartial` and wrote
// to a nonexistent `#hdnPageIndex` (leftover from a different page).
// ========================================
document.addEventListener('click', function (e) {
    const link = e.target.closest('#UserTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    loadUserPartial(query);
});

// ========================================
// Status toggle (single row switch)
// ========================================
async function toggleStatus(userId, isActive) {
    if ($('.user-checkbox:checked').length > 0) {
        return;
    }
    try {
        const response = await fetch(`/User/ToggleStatus?userId=${userId}&isActive=${isActive}`, { method: 'POST' });
        const result = await response.json();

        if (result.success) {
            showToast(isActive ? 'User activated' : 'User deactivated', true);
            loadUserPartial(getFilterQueryString(1));
        } else {
            showToast(result.message, false);
            loadUserPartial(getFilterQueryString(1));
        }
    } catch (err) {
        console.error(err);
        showToast('Error updating status', false);
        loadUserPartial(getFilterQueryString(1));
    }
}

async function unlockUser(userId) {
    if (!confirm('Are you sure you want to unlock this user?')) return;

    try {
        const response = await fetch(`/User/Unlock?userId=${userId}`, { method: 'POST' });
        const result = await response.json();

        if (result.success) {
            showToast('User account unlocked', true);
            loadUserPartial(getFilterQueryString(1));
        } else {
            showToast(result.message, false);
        }
    } catch (err) {
        console.error(err);
        showToast('Error unlocking user', false);
    }
}

// ========================================
// Bulk Active / Inactive
// FIX: called as updateUserStatus(0, true) / updateUserStatus(0, false) from
// the markup now — id=0 signals "use whatever's checked in the table"; a
// nonzero id (from a per-row control) is used directly. The old markup
// passed a single boolean, which landed in the `id` parameter and corrupted
// the fallback check below.
// ========================================
async function updateUserStatus(id, isActive) {
    try {
        let userIds = [];
        $('.user-checkbox:checked').each(function () {
            userIds.push($(this).val());
        });

        if (userIds.length === 0) {
            if (id) {
                userIds.push(parseInt(id));
            } else {
                showToast('Please select at least one user', false);
                return;
            }
        }

        const request = {
            userIds: userIds.join(','),
            isActive: isActive
        };

        Swal.fire({
            title: 'Are you sure?',
            text: isActive
                ? "You are about to activate selected user(s)."
                : "You are about to deactivate selected user(s).",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, proceed!',
            customClass: {
                confirmButton: 'btn btn-danger me-2',
                cancelButton: 'btn btn-secondary'
            },
            buttonsStyling: false
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: '/User/BulkToggleStatus',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(request),
                    success: function (res) {
                        if (res.success) {
                            Swal.fire('Updated!', res.message || 'Status updated successfully.', 'success')
                                .then(() => loadUserPartial(getFilterQueryString(1)));
                        } else {
                            Swal.fire('Error!', res.message || 'Failed to update status.', 'error');
                        }
                    },
                    error: function (xhr) {
                        console.error('Status update error:', xhr.status, xhr.responseText);
                        Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                    }
                });
            }
        });
    } catch (err) {
        console.error(err);
        showToast('Error updating status', false);
    }
}

// ========================================
// Bulk Delete
// ========================================
async function deleteSelected() {
    let userIds = [];
    $('.user-checkbox:checked').each(function () {
        userIds.push($(this).val());
    });

    if (userIds.length === 0) {
        showToast('Please select at least one user', false);
        return;
    }

    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this user record. This action cannot be undone!",
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
                url: `/User/DeleteBulkUser?ids=${userIds.join(',')}`,
                type: 'POST',
                contentType: 'application/json',
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'User record has been deleted.', 'success')
                            .then(() => loadUserPartial(getFilterQueryString(1)));
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete user.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}