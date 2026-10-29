// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_backDateSetting';
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
    const companyEl = document.getElementById('ddlFilterCompany');
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;

    const form = document.getElementById('frmSearch');
    if (!form) return;
    const params = new URLSearchParams(new FormData(form)).toString();
    loadBackDateSettingPartial(params);
}

function loadBackDateSettingPartial(queryString) {
    const container = document.getElementById('backDateSettingTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/BackDateSetting/GetBackDateSettingPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load list');
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

// ── Pagination click interception, scoped to the list container ──────
document.addEventListener('click', function (e) {
    const link = e.target.closest('#backDateSettingTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    loadBackDateSettingPartial(query);
    history.replaceState(null, '', href);
});

function applyFilters() {
    const companyEl = document.getElementById('ddlFilterCompany');
    const searchEl = document.getElementById('txtSearchInput');

    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

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
    if (filterId === 'ddlFilterCompany') {
        const el = document.getElementById('ddlFilterCompany');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
    } else if (filterId === 'txtSearchInput') {
        const el = document.getElementById('txtSearchInput');
        if (el) el.value = '';
        const hdn = document.getElementById('hdnSearch');
        if (hdn) hdn.value = '';
    }

    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges();
    const hdnPage = document.getElementById('hdnPageIndex');
    if (hdnPage) hdnPage.value = 1;
    submitForm();
}

function resetAllFilters() {
    const searchEl = document.getElementById('txtSearchInput');
    if (searchEl) searchEl.value = '';
    const hdnSearch = document.getElementById('hdnSearch');
    if (hdnSearch) hdnSearch.value = '';

    const companyEl = document.getElementById('ddlFilterCompany');
    if (companyEl) {
        companyEl.value = '';
        if (window.jQuery && jQuery(companyEl).data('select2')) jQuery(companyEl).val('').trigger('change');
    }

    clearAppliedFilters();
    renderFilterBadges();
    const hdnPage = document.getElementById('hdnPageIndex');
    if (hdnPage) hdnPage.value = 1;
    submitForm();
}

// ========================================
// Row selection (list page)
// ========================================
let selectedId = 0;
let selectedStaffid = 0;
let selectedUserid = 0;
function selectItem(id,staffid,userId, row) {
    selectedId = id;
    selectedStaffid = staffid;
    selectedUserid = userId;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light-primary'));
    row.classList.add('bg-light-primary');
    updateButtonStates();
}

function updateButtonStates() {
    const count = $('.student-checkbox:checked').length;
    $('#btnEdit').prop('disabled', count !== 1);
    $('#btnDelete').prop('disabled', count === 0);
}

async function editSelected() {
    if (!window.canEdit) { IV.setNotice('pageNotice', 'You do not have permission to edit.'); return; }
    if (selectedStaffid === 0) return;
    location.href = `/BackDateSetting/Add?id=${selectedId}&staffId=${selectedStaffid}&userid=${selectedUserid}`;
}

async function deleteSelected() {
    if (!window.canDelete) { IV.setNotice('pageNotice', 'You do not have permission to delete.'); return; }

    const selectedIds = [];
    $('.student-checkbox:checked').each(function () { selectedIds.push(parseInt($(this).val())); });
    if (selectedIds.length === 0) { alert('Please select at least one record.'); return; }

    Swal.fire({
        title: 'Are you sure?',
        text: 'You are about to delete this back date setting. This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-secondary' },
        buttonsStyling: false
    }).then(result => {
        if (!result.isConfirmed) return;
        $.ajax({
            url: '/BackDateSetting/DeleteBackDateSetting',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(selectedIds),
            success: res => res.success
                ? Swal.fire('Deleted!', 'Record has been deleted.', 'success')
                    .then(() => loadBackDateSettingPartial(new URLSearchParams(new FormData(document.getElementById('frmSearch'))).toString()))
                : Swal.fire('Error!', res.message || 'Failed to delete record.', 'error'),
            error: () => Swal.fire('Error!', 'An unexpected error occurred.', 'error')
        });
    });
}

// ========================================
// DOMContentLoaded — shared init (list + add/edit pages)
// ========================================
document.addEventListener('DOMContentLoaded', () => {

    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            // Filter dropdown (list page)
            if (document.getElementById('ddlFilterCompany')) {
                jQuery('#ddlFilterCompany').select2({
                    width: '100%',
                    dropdownParent: jQuery('#filter-dropdown'),
                    allowClear: true,
                    placeholder: function () { return jQuery(this).data('placeholder') || 'Select'; }
                });
            }

            // Staff dropdown (add/edit page) — safe to init even when disabled
            if (document.getElementById('ddlStaff')) {
                jQuery('#ddlStaff').select2({
                    width: '100%',
                    allowClear: true,
                    placeholder: function () { return jQuery(this).data('placeholder') || 'Select staff'; }
                });
            }
        }
    } catch (e) {
        console.warn('Select2 init skipped:', e);
    }

    document.getElementById('filter-dropdown')?.addEventListener('click', e => e.stopPropagation());

    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        document.getElementById('hdnPageIndex').value = 1;
        document.getElementById('hdnSearch').value = document.getElementById('txtSearchInput').value;
        applyFilters();
        submitForm();
    });

    document.getElementById('btnResetFilters')?.addEventListener('click', resetAllFilters);

    renderFilterBadges();

    // ── Unlimited toggle disables/clears Back Days Allowed (add/edit page) ──
    const chkUnlimited = document.getElementById('chkIsUnlimited');
    const txtBackDays = document.getElementById('txtBackDaysAllowed');
    if (chkUnlimited && txtBackDays) {
        chkUnlimited.addEventListener('change', function () {
            txtBackDays.disabled = this.checked;
            if (this.checked) txtBackDays.value = 0;
            txtBackDays.classList.remove('is-invalid');
            const err = document.getElementById('errTxtBackDaysAllowed');
            if (err) err.textContent = '';
        });
    }
    var staffId = $("#hdnUserID").val();
    if (staffId > 0)
    {
        loadRoleByStaff(staffId, 'ddlRole');
    }

});

// ========================================
// Search input — debounced server submit (list page)
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
        renderFilterBadges();

        submitForm();
    }, 500);
});

// ========================================
// Add / Edit page — save
// ========================================
//async function saveBackDateSetting() {
//    const settingId = parseInt(document.getElementById('txtSettingId').value) || 0;

//    if (settingId === 0 && !window.canAdd) { IV.setNotice('pageNotice', 'You do not have permission to add.'); return; }
//    if (settingId > 0 && !window.canEdit) { IV.setNotice('pageNotice', 'You do not have permission to edit.'); return; }

//    IV.clearMap({ ddlStaff: 'errDdlStaff', txtBackDaysAllowed: 'errTxtBackDaysAllowed' });

//    // In edit mode the staff dropdown is disabled, so its value won't post —
//    // read the real staff id from the hidden field instead.
//    const hdnStaffEl = document.getElementById('hdnStaffId');
//    const staffEl = document.getElementById('ddlStaff');
//    const staffId = window.isEditMode ? parseInt(hdnStaffEl?.value) : parseInt(staffEl?.value);
    
//    const isUnlimited = document.getElementById('chkIsUnlimited').checked;
//    const backDaysAllowed = isUnlimited ? 0 : (parseInt(document.getElementById('txtBackDaysAllowed').value) || 0);
//    const roleEl = document.getElementById('ddlRole');
//    const roleid = window.isEditMode ? parseInt(roleEl?.value) : parseInt(roleEl?.value);
//    let isValid = true;

//    if (!staffId) {
//        IV.setFieldError('ddlStaff', 'errDdlStaff', 'Please select a staff member.');
//        isValid = false;
//    }
//    if (!isUnlimited && backDaysAllowed <= 0) {
//        IV.setFieldError('txtBackDaysAllowed', 'errTxtBackDaysAllowed', 'Enter a valid number of days, or mark Unlimited.');
//        isValid = false;
//    }

//    if (!isValid) return;

//    const data = {
//        settingID: settingId,
//        staffID: staffId,
//        roleID: roleid,
//        moduleType:'STAFF',
//        backDaysAllowed: backDaysAllowed,
//        isUnlimited: isUnlimited
//    };

//    try {
//        // Note: endpoint name matches the controller as provided (SaveBackDateSetting,
//        // missing the trailing "g") — rename both sides together if you fix the typo.
//        const r = await fetch('/BackDateSetting/SaveBackDateSetting', {
//            method: 'POST',
//            headers: { 'Content-Type': 'application/json' },
//            body: JSON.stringify(data)
//        });
//        const res = await r.json();
//        if (res.success) {
//            Swal.fire({
//                icon: 'success', title: 'Saved!', text: 'Back date setting has been saved successfully.',
//                confirmButtonText: 'OK', customClass: { confirmButton: 'btn btn-success' }, buttonsStyling: false
//            }).then(() => location.href = '/BackDateSetting/Index');
//        } else {
//            Swal.fire({
//                icon: 'error', title: 'Error', text: res.message || 'Failed to save.',
//                confirmButtonText: 'OK', customClass: { confirmButton: 'btn btn-danger' }, buttonsStyling: false
//            });
//        }
//    } catch (err) {
//        console.error(err);
//        IV.setNotice('pageNotice', 'Could not save record.');
//    }
//}

// ========================================
// Small validation helpers (shared)
// ========================================
const IV = {
    clearMap: (map) => Object.keys(map).forEach(k => {
        document.getElementById(k)?.classList.remove('is-invalid');
        const err = document.getElementById(map[k]); if (err) err.textContent = '';
    }),
    setFieldError: (id, errId, msg) => {
        document.getElementById(id)?.classList.add('is-invalid');
        const err = document.getElementById(errId); if (err) err.textContent = msg;
    },
    setNotice: (id, msg, type = 'danger') => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    },
    clearNotice: (id) => { const el = document.getElementById(id); if (el) el.innerHTML = ''; }
};

async function loadRoleByStaff(staffId, targetId) {
    // targetId kept for compatibility with any other callers still using
    // a plain <select> (e.g. filter dropdowns) — but for the Add/Edit page
    // role-rows table, we don't touch a <select> at all anymore.
    if (!staffId) {
        window.allRoles = [];
        renderRoleRowsForStaff([]);
        return null;
    }

    try {
        const resp = await fetch(`/BackDateSetting/GetUserRole?id=${staffId}`);
        const res = await resp.json();

        window.allRoles = (res.success && res.data) ? res.data : [];

        // Role count drives row count — exactly one row per role returned,
        // no extra/stray rows left over from a previous staff selection.
        renderRoleRowsForStaff(window.allRoles);

        return window.allRoles;
    } catch (err) {
        console.error(err);
        window.allRoles = [];
        renderRoleRowsForStaff([]);
        return [];
    }
}

// Rebuilds the row table from scratch so the row count always matches the
// role count for the currently selected staff — never additive.
function renderRoleRowsForStaff(roles) {
    const tbody = document.getElementById('roleRowsBody');
    tbody.innerHTML = '';
    removedSettingIds = []; // selecting a different staff resets pending deletes

    // Merge in any already-saved settings for this staff (passed from the
    // server as window.existingRoleSettings) so edit mode pre-fills values.
    const existingByRoleId = {};
    (window.existingRoleSettings || []).forEach(s => { existingByRoleId[s.roleID] = s; });

    roles.forEach(role => {
        const existing = existingByRoleId[role.roleID];
        addRoleRow({
            settingID: existing?.settingID ?? null,
            roleID: role.roleID,
            roleName: role.roleName,
            backDaysAllowed: existing?.backDaysAllowed ?? 0,
            isUnlimited: existing?.isUnlimited ?? false
        });
    });
}

// Row's role is now fixed by the staff's actual role assignment — not
// user-picked — so it renders as a label + hidden field instead of a
// free <select>. "Add Role" button can be removed from the markup since
// rows are generated automatically from loadRoleByStaff().
function addRoleRow(row = {}) {
    const tbody = document.getElementById('roleRowsBody');
    const tr = document.createElement('tr');
    tr.dataset.settingId = row.settingID || '';
    tr.dataset.roleId = row.roleID;

    tr.innerHTML = `
        <td>
            ${row.roleName}
            <input type="hidden" class="role-id-input" value="${row.roleID}" />
        </td>
        <td><input type="number" min="0" class="form-control back-days-input"
                    value="${row.backDaysAllowed || 0}" ${row.isUnlimited ? 'disabled' : ''} /></td>
        <td><input type="checkbox" class="form-check-input unlimited-check" ${row.isUnlimited ? 'checked' : ''} /></td>
        `;

    tbody.appendChild(tr);

    const chk = tr.querySelector('.unlimited-check');
    const days = tr.querySelector('.back-days-input');
    chk.addEventListener('change', function () {
        days.disabled = this.checked;
        if (this.checked) days.value = 0;
    });
}
let removedSettingIds = [];

// Existing rows carry their SettingID — removing them queues a soft-delete.
// A brand-new row (never saved) has no SettingID, so it's just discarded.
function removeRoleRow(btn) {
    const tr = btn.closest('tr');
    const settingId = parseInt(tr.dataset.settingId) || 0;
    if (settingId > 0) removedSettingIds.push(settingId);
    tr.remove();
}

function collectRoleRows() {
    const rows = [];
    document.querySelectorAll('#roleRowsBody tr').forEach(tr => {
        const roleId = parseInt(tr.querySelector('.role-id-input').value) || 0;
        if (!roleId) return;
        rows.push({
            SettingID: parseInt(tr.dataset.settingId) || null,
            RoleID: roleId,
            BackDaysAllowed: parseInt(tr.querySelector('.back-days-input').value) || 0,
            IsUnlimited: tr.querySelector('.unlimited-check').checked,
            IsActive: true
        });
    });
    return rows;
}

async function saveBackDateSetting() {
    const staffId = parseInt(document.getElementById('hdnStaffId').value) || 0;
    if (!staffId) { IV.setNotice('pageNotice', 'No staff selected.'); return; }

    const roleSettings = collectRoleRows();
    if (roleSettings.length === 0 && removedSettingIds.length === 0) {
        IV.setNotice('pageNotice', 'Add at least one role before saving.');
        return;
    }

    const data = {
        staffID: staffId,
        moduleType: 'STAFF',
        roleSettingsJson: JSON.stringify(roleSettings),
        deletedSettingIds: removedSettingIds
    };

    try {
        const r = await fetch('/BackDateSetting/SaveBackDateSetting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const res = await r.json();
        if (res.success) {
            Swal.fire({ icon: 'success', title: 'Saved!', text: res.message || 'Saved successfully.' })
                .then(() => location.href = '/BackDateSetting/Index');
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: res.message || 'Failed to save.' });
        }
    } catch (err) {
        console.error(err);
        IV.setNotice('pageNotice', 'Could not save record.');
    }
}