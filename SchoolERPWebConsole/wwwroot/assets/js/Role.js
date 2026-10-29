const permCanAdd = window.canAdd;
const permCanEdit = window.canEdit;
const permCanDelete = window.canDelete;
let selectedRoleId = 0;
const IV = window.InlineFormValidation;
const roleFieldMap = {
    txtRoleName: 'errTxtRoleName'
};

// Stores the original permission state loaded from the database.
// Used to restore permissions when a parent menu is unchecked during role editing.
let originalPermissions = {};

function clearRoleModalValidation() {
    if (IV) IV.clearMap(roleFieldMap);
}

if (IV) IV.bindAutoClear(roleFieldMap);

/* ─────────────────────────────────────────────────────────
   INDEX PAGE — row selection / list actions
───────────────────────────────────────────────────────── */
function selectItem(id, row) {
    IV.clearNotice('classPageNotice');
    selectedRoleId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    //row.classList.add('bg-light');
    //row.querySelector('input[type="radio"]').checked = true;
    const btnEdit = document.getElementById('btnEditRole');
    const btnDelete = document.getElementById('btnDeleteRole');
    if (btnEdit && permCanEdit) btnEdit.disabled = false;
    if (btnDelete && permCanDelete) btnDelete.disabled = false;
    let checkedCount = $('.role-checkbox:checked').length;
    $('#btnDeleteRole').prop('disabled', checkedCount === 0);
    // Edit sirf 1 record select hone par
    $('#btnEditRole').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
}


function selectRole(roleId, row) {
    selectedRoleId = roleId;
    document.querySelectorAll('#rolesTable tbody .item-row').forEach(r => r.classList.remove('bg-light'));
    row.classList.add('bg-light');

    let checkedCount = $('.role-checkbox:checked').length;
    $('#btnDeleteRole').prop('disabled', !permCanDelete || checkedCount === 0);
    // Edit only when exactly 1 row is selected
    $('#btnEditRole').prop('disabled', !permCanEdit || checkedCount !== 1);
}

function deleteSelectedRole() {
    if (!permCanDelete) return;

    let selectedIds = [];
    $('.role-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        showToast('Please select at least one role.', 'warning');
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete the selected role(s). This action cannot be undone!",
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
                url: '/Role/Delete',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Role(s) have been deleted.', 'success')
                            .then(() => loadRolesTable());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete role(s).', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}

function editSelectedRole() {
    if (!permCanEdit || selectedRoleId <= 0) return;
    goToRoleForm(selectedRoleId);
}

/* ─────────────────────────────────────────────────────────
   Navigate to Add / Edit page (replaces modal open)
───────────────────────────────────────────────────────── */
function goToRoleForm(id) {
    if (id === 0 && !permCanAdd) {
        showToast('You do not have permission to add roles.', 'warning');
        return;
    }
    if (id > 0 && !permCanEdit) {
        showToast('You do not have permission to edit roles.', 'warning');
        return;
    }
    window.location.href = id > 0 ? `/Role/Add/${id}` : '/Role/Add';
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
                    url: '/Role/ToggleStatus',
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



/* ─────────────────────────────────────────────────────────
   Index page: search + pagination (partial-refresh, same
   pattern as Language)
───────────────────────────────────────────────────────── */
let roleSearchDebounce;

function loadRolesTable(pageIndex) {
    const container = document.getElementById('roleTableContainer');
    if (!container) return; // not on the index page

    const search = document.getElementById('txtSearchInput')?.value || '';
    const pgIndex = pageIndex || parseInt(document.getElementById('hdnPageIndex')?.value || '1', 10);
    const pgSize = document.getElementById('hdnPageSize')?.value || 10;

    const params = new URLSearchParams({
        search: search,
        pageIndex: pgIndex,
        pageSize: pgSize
    });

    fetch(`/Role/GetRolePartial?${params.toString()}`)
        .then(r => r.text())
        .then(html => {
            container.innerHTML = html;
            document.getElementById('hdnPageIndex').value = pgIndex;
        })
        .catch(() => showToast('Failed to load roles.', 'error'));
}

function goToRolePage(pageIndex) {
    loadRolesTable(pageIndex);
}


/* ─────────────────────────────────────────────────────────
   ADD / EDIT PAGE — role details + permission tree
───────────────────────────────────────────────────────── */
function validateRoleForm() {
    clearRoleModalValidation();
    let ok = true;
    const roleName = document.getElementById('txtRoleName').value.trim();
    if (!roleName) {
        if (IV) IV.setFieldError('txtRoleName', 'errTxtRoleName', 'Role Name is required.');
        ok = false;
    }
    return ok;
}

async function initRoleForm() {
    const id = parseInt(document.getElementById('txtRoleId').value || '0', 10);

    hideStatus();
    clearRoleModalValidation();

    // Render permission tree (use roleId=0 for brand new role → all unchecked)
    loadPermissions(id);

    if (id > 0) {
        const resp = await fetch(`/Role/GetRole?roleId=${id}`);
        const res = await resp.json();
        if (res.success) {
            document.getElementById('txtRoleName').value = res.role.roleName;
            document.getElementById('txtRoleDesc').value = res.role.roleDesc || '';
            document.getElementById('chkIsActive').checked = res.role.isActive;
        }
    }
}

/* ─────────────────────────────────────────────────────────
   Save Role → then save Permissions (single click)
───────────────────────────────────────────────────────── */
async function saveAll() {
    if (!validateRoleForm()) return;
    const roleName = document.getElementById('txtRoleName').value.trim();

    const ridBefore = parseInt(document.getElementById('txtRoleId').value);
    if (ridBefore === 0 && !permCanAdd) {
        showToast('You do not have permission to add roles.', 'warning');
        return;
    }
    if (ridBefore > 0 && !permCanEdit) {
        showToast('You do not have permission to edit roles.', 'warning');
        return;
    }

    const btn = document.getElementById('btnSaveAll');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';

    try {
        // ── Step 1: Save Role ──────────────────────────────
        const roleData = {
            roleID: parseInt(document.getElementById('txtRoleId').value),
            roleName: roleName,
            roleDesc: document.getElementById('txtRoleDesc').value.trim(),
            isActive: document.getElementById('chkIsActive').checked
        };

        const roleResp = await fetch('/Role/Save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(roleData)
        });
        const roleRes = await roleResp.json();

        if (!roleRes.success) {
            showError('role', roleRes.message);
            return;
        }

        const savedRoleId = roleRes.roleId || parseInt(document.getElementById('txtRoleId').value);
        document.getElementById('txtRoleId').value = savedRoleId;
        showOk('role', roleRes.message || 'Role saved successfully.');

        if (!permCanEdit) {
            setTimeout(() => { window.location.href = '/Role/Index'; }, 900);
            return;
        }

        // ── Step 2: Save Permissions ───────────────────────
        const selected = [];
        document.querySelectorAll('.perm-checkbox:checked').forEach(cb => {
            selected.push({
                menuID: parseInt(cb.dataset.menu),
                permissionID: parseInt(cb.dataset.perm)
            });
        });
        const isEdit = savedRoleId > 0;
        const permResp = await fetch('/Role/SavePermissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roleID: savedRoleId, selectedPermissions: selected })
        });
        const permRes = await permResp.json();
        if (permRes.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit
                    ? 'Role has been updated successfully.'
                    : 'Role has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                window.location.href = '/Role/Index';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: permRes.message || 'Failed to save role.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }

        //showOk('perm', 'Permissions saved successfully.');
       // setTimeout(() => { window.location.href = '/Role/Index'; }, 900);

    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save me-2"></i>Save Changes';
    }
}

/* ─────────────────────────────────────────────────────────
   Load & render permission tree
───────────────────────────────────────────────────────── */
async function loadPermissions(roleId) {
    const body = document.getElementById('treeGridBody');
    body.innerHTML = `<tr><td colspan="10" class="text-center py-5 text-muted">
                <i class="fas fa-spinner fa-spin fa-lg me-2"></i>Loading permissions...</td></tr>`;

    try {
        const resp = await fetch(`/Role/GetPermissions?roleId=${roleId}`);
        if (!resp.ok) throw new Error(`Server returned ${resp.status}: ${resp.statusText}`);

        const res = await resp.json();
        if (res.success) {
            renderTree(res.data);
        } else {
            body.innerHTML = `<tr><td colspan="10" class="text-center py-5 text-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>Error: ${res.message || 'Failed to load permissions'}</td></tr>`;
        }
    } catch (err) {
        console.error('LoadPermissions Error:', err);
        body.innerHTML = `<tr><td colspan="10" class="text-center py-5 text-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>Network or Script Error: ${err.message}</td></tr>`;
    }
}

function renderTree(matrix) {
    const body = document.getElementById('treeGridBody');
    body.innerHTML = '';

    if (!matrix || !Array.isArray(matrix) || matrix.length === 0) {
        const currentRoleId = parseInt(document.getElementById('txtRoleId')?.value || '0', 10);
        const emptyMessage = currentRoleId > 0
            ? 'No menu permissions found in the system. Check if menus and permissions are seeded.'
            : 'Save role details first to load the permission matrix.';
        body.innerHTML = `<tr><td colspan="10" class="text-center py-5 text-muted">
                    <i class="fas fa-info-circle me-2"></i>${emptyMessage}</td></tr>`;
        return;
    }

    const menus = {};
    const uniquePerms = [];
    const permIdsSeen = new Set();

    matrix.forEach(item => {
        const mID = item.menuID || item.menuId;
        const mName = item.menuName || item.MenuName;
        const mIcon = item.menuIcon || item.menuIcon;
        const pID = item.parentID || item.parentId;
        const permID = item.permissionID || item.permissionId;
        const permName = item.permissionName || item.PermissionName;
        const lbl = item.displayLabel || item.DisplayLabel || permName;
        const hasAcc = item.hasAccess || item.HasAccess || false;

        if (!menus[mID]) {
            menus[mID] = { id: mID, name: mName, parentID: pID, icon: mIcon, permissions: {} };
        }
        menus[mID].permissions[permID] = hasAcc;

        if (!permIdsSeen.has(permID)) {
            permIdsSeen.add(permID);
            uniquePerms.push({ id: permID, label: lbl, name: permName, icon: mIcon });
        }
    });

    uniquePerms.sort((a, b) => {
        if (a.name === 'View') return -1;
        if (b.name === 'View') return 1;
        return a.id - b.id;
    });

    const headerRow = document.getElementById('treeHeaderRow');
    headerRow.innerHTML = `<th class="id-column">ID</th><th>Menu Name</th>`;
    uniquePerms.forEach(p => {
        headerRow.innerHTML += `<th class="matrix-col w-s-nowrap">
                    <p class="mb-1">${p.label}</p>
                            <input type="checkbox"
                                   class="form-check-input mt-0 me-0 column-master-check"
                                   data-perm="${p.id}"
                                   onchange="togglePermissionColumn(this)"
                                   ${permCanEdit ? '' : 'disabled'}>
                </th>`;
    });

    const menuArray = Object.values(menus);
    const rootMenus = menuArray.filter(m => !m.parentID);

    const buildRows = (list, depth = 0) => {
        list.forEach((m, index) => {
            const children = menuArray.filter(c => c.parentID === m.id);
            const isParent = children.length > 0;
            const isLast = index === list.length - 1;

            const tr = document.createElement('tr');
            tr.className = `tree-row depth-${depth} ${isParent ? 'parent-node collapsed depth-0' : 'leaf-node'}`;
            tr.dataset.id = m.id;
            if (m.parentID) tr.dataset.parentId = m.parentID;

            let html = `<td class="id-column">${m.id}</td>`;

            let toggleHtml = isParent
                ? `<span class="tree-toggle" onclick="toggleNode(${m.id}, event)"><i class="fas fa-plus"></i></span>`
                : `<span style="width:0;display:inline-block;"></span>`;

            html += `<td class="tree-cell">`;
            for (let i = 0; i < depth; i++) {
                html += `<span class="tree-indent"><span class="tree-line-v"></span></span>`;
            }
            if (depth > 0) {
                html += `<span class="tree-indent">
                                    <span class="tree-line-v ${isLast ? 'last' : ''}"></span>
                                    <span class="tree-line-h"></span>
                                 </span>`;
            }

            html += `<input type="checkbox" class="row-master-check me-2" onchange="onToggleRow(this, ${m.id})"${permCanEdit ? '' : ' disabled'}>`;
            html += toggleHtml;
            html += `<i class="fas ${m.icon} tree-icon"></i>`;
            html += `<span class="tree-label">${m.name}</span></td>`;

            uniquePerms.forEach(p => {
                const hasPerm = m.permissions[p.id];
                if (!originalPermissions[m.id]) originalPermissions[m.id] = {};
                originalPermissions[m.id][p.id] = hasPerm;

                if (hasPerm !== undefined) {
                    html += `<td class="matrix-col">
                                <input type="checkbox" class="form-check-input perm-checkbox"
                                       data-menu="${m.id}" data-perm="${p.id}" data-perm-name="${p.name}" ${hasPerm ? 'checked' : ''}
                                       onchange="handlePermissionToggle(this)"
                                       ${permCanEdit ? '' : ' disabled'}>
                             </td>`;
                } else {
                    html += `<td class="matrix-col">-</td>`;
                }
            });

            tr.innerHTML = html;
            body.appendChild(tr);

            if (isParent) buildRows(children, depth + 1);
        });
    };

    buildRows(rootMenus);
    syncAllGridStates();
}

function toggleNode(menuId, event) {
    event.stopPropagation();
    const row = document.querySelector(`.tree-row[data-id="${menuId}"]`);
    const isExpanded = row.classList.contains('expanded');
    row.classList.toggle('expanded');
    row.classList.toggle('collapsed');
    const icon = row.querySelector('.tree-toggle i');
    icon.classList.toggle('fa-minus');
    icon.classList.toggle('fa-plus');
    const descendants = document.querySelectorAll(`.tree-row[data-parent-id="${menuId}"]`);
    descendants.forEach(d => {
        if (isExpanded) {
            hideDescendants(d.dataset.id);
            d.style.display = 'none';
        } else {
            d.style.display = 'table-row';
        }
    });
}

function hideDescendants(parentId) {
    document.querySelectorAll(`.tree-row[data-parent-id="${parentId}"]`).forEach(d => {
        d.style.display = 'none';
        hideDescendants(d.dataset.id);
    });
}

function getTreeRow(menuId) { return document.querySelector(`.tree-row[data-id="${menuId}"]`); }
function getDirectChildRows(menuId) { return Array.from(document.querySelectorAll(`.tree-row[data-parent-id="${menuId}"]`)); }
function getRowPermissionCheckboxes(menuId) { return Array.from(document.querySelectorAll(`#treeGridBody .perm-checkbox[data-menu="${menuId}"]`)); }
function getRowMasterCheckbox(menuId) { return getTreeRow(menuId)?.querySelector('.row-master-check'); }
function rowHasCheckedPermissions(menuId) { return getRowPermissionCheckboxes(menuId).some(cb => cb.checked); }
function rowHasAnyActiveDescendant(menuId) {
    return getDirectChildRows(menuId).some(childRow => isMenuActive(childRow.dataset.id));
}
function isMenuActive(menuId) { return rowHasCheckedPermissions(menuId) || rowHasAnyActiveDescendant(menuId); }

function syncRowMasterCheckbox(menuId) {
    const rowMaster = getRowMasterCheckbox(menuId);
    if (!rowMaster) return;
    rowMaster.checked = isMenuActive(menuId);
}

function syncAncestors(menuId) {
    const row = getTreeRow(menuId);
    if (!row || !row.dataset.parentId) return;
    const parentId = row.dataset.parentId;
    syncRowMasterCheckbox(parentId);
    syncAncestors(parentId);
}

function syncPermissionColumnHeader(permissionId) {
    const columnCheckboxes = document.querySelectorAll(`#treeGridBody .perm-checkbox[data-perm="${permissionId}"]`);
    const headerCheckbox = document.querySelector(`#treeHeaderRow .column-master-check[data-perm="${permissionId}"]`);
    if (!headerCheckbox || columnCheckboxes.length === 0) return;
    headerCheckbox.checked = Array.from(columnCheckboxes).every(cb => cb.checked);
}

function syncAllGridStates() {
    const allRows = Array.from(document.querySelectorAll('#treeGridBody .tree-row'));
    allRows
        .sort((a, b) => {
            const depthA = parseInt((a.className.match(/depth-(\d+)/)?.[1] || '0'), 10);
            const depthB = parseInt((b.className.match(/depth-(\d+)/)?.[1] || '0'), 10);
            return depthB - depthA;
        })
        .forEach(row => syncRowMasterCheckbox(row.dataset.id));

    document.querySelectorAll('#treeHeaderRow .column-master-check')
        .forEach(headerCheckbox => syncPermissionColumnHeader(headerCheckbox.dataset.perm));
}

function setMenuBranchState(menuId, isChecked) {
    const row = getTreeRow(menuId);
    if (!row) return;

    const rowMaster = row.querySelector('.row-master-check');
    if (rowMaster) rowMaster.checked = isChecked;

    getRowPermissionCheckboxes(menuId).forEach(cb => {
        if (isChecked) {
            cb.checked = true;
        } else {
            const mId = cb.dataset.menu;
            const permId = cb.dataset.perm;
            cb.checked = originalPermissions[mId] && originalPermissions[mId][permId] === true;
        }
    });

    getDirectChildRows(menuId).forEach(childRow => setMenuBranchState(childRow.dataset.id, isChecked));
}

function onToggleRow(cb, menuId) {
    setMenuBranchState(menuId, cb.checked);
    syncAncestors(menuId);
    document.querySelectorAll('#treeHeaderRow .column-master-check')
        .forEach(headerCheckbox => syncPermissionColumnHeader(headerCheckbox.dataset.perm));
}

function handlePermissionToggle(permissionCheckbox) {
    autoCheckViewPermission(permissionCheckbox);
    autoUncheckOtherPermissions(permissionCheckbox);

    const menuId = permissionCheckbox.dataset.menu;
    syncRowMasterCheckbox(menuId);
    syncAncestors(menuId);
    syncPermissionColumnHeader(permissionCheckbox.dataset.perm);
}

function autoCheckViewPermission(el) {
    var permName = ($(el).attr('data-perm-name') || '').toLowerCase();
    if (permName !== 'view' && $(el).is(':checked')) {
        var viewCheckbox = $(el).closest('tr').find('.perm-checkbox')
            .filter(function () { return ($(this).attr('data-perm-name') || '').toLowerCase() === 'view'; });
        viewCheckbox.prop('checked', true);
    }
}

function togglePermissionColumn(headerCheckbox) {
    const permissionId = headerCheckbox.dataset.perm;
    const isChecked = headerCheckbox.checked;

    document.querySelectorAll(`#treeGridBody .perm-checkbox[data-perm="${permissionId}"]`)
        .forEach(cb => {
            cb.checked = isChecked;
            syncRowMasterCheckbox(cb.dataset.menu);
            syncAncestors(cb.dataset.menu);
        });
}

function toggleAllChecks(check) {
    document.querySelectorAll('.perm-checkbox').forEach(cb => cb.checked = check);
}

function autoUncheckOtherPermissions(el) {
    var $checkbox = $(el);
    var permName = ($checkbox.attr('data-perm-name') || '').toLowerCase();
    var $row = $checkbox.closest('tr');

    if (permName === 'view' && !$checkbox.is(':checked')) {
        var hasOtherChecked = false;
        $row.find('.perm-checkbox').each(function () {
            var currentPerm = ($(this).attr('data-perm-name') || '').toLowerCase();
            if (currentPerm !== 'view' && $(this).is(':checked')) hasOtherChecked = true;
        });

        if (hasOtherChecked) {
            showToast('View permission cannot be removed while Add, Edit, Delete, Print, Import or Export permissions are selected. All related permissions will be removed.', false);
            $checkbox.prop('checked', true);
            return;
        }

        $row.find('.perm-checkbox').each(function () {
            var currentPerm = ($(this).attr('data-perm-name') || '').toLowerCase();
            if (currentPerm !== 'view') $(this).prop('checked', false);
        });
    }
}

/* ─────────────────────────────────────────────────────────
   Status helpers (add/edit page)
───────────────────────────────────────────────────────── */
function hideStatus() {
    document.getElementById('roleSaveStatus')?.classList.add('d-none');
    document.getElementById('roleSaveOk')?.classList.remove('d-none');
    document.getElementById('roleSaveErr')?.classList.add('d-none');
    document.getElementById('permSaveStatus')?.classList.add('d-none');
    document.getElementById('permSaveOk')?.classList.add('d-none');
    document.getElementById('permSaveErr')?.classList.add('d-none');
}

function showOk(target, msg) {
    showToast(msg, 'success');
    if (target === 'role') {
        document.getElementById('roleSaveStatus').classList.remove('d-none');
        document.getElementById('roleSaveOk').classList.remove('d-none');
        document.getElementById('roleSaveErr').classList.add('d-none');
        document.getElementById('roleSaveOkMsg').textContent = msg;
    } else {
        document.getElementById('permSaveStatus').classList.remove('d-none');
        document.getElementById('permSaveOk').classList.remove('d-none');
        document.getElementById('permSaveErr').classList.add('d-none');
    }
}

function showError(target, msg) {
    showToast(msg, 'error');
    if (target === 'role') {
        document.getElementById('roleSaveStatus').classList.remove('d-none');
        document.getElementById('roleSaveOk').classList.add('d-none');
        document.getElementById('roleSaveErr').classList.remove('d-none');
        document.getElementById('roleSaveErrMsg').textContent = msg;
    } else {
        document.getElementById('permSaveStatus').classList.remove('d-none');
        document.getElementById('permSaveOk').classList.add('d-none');
        document.getElementById('permSaveErr').classList.remove('d-none');
        document.getElementById('permSaveErrMsg').textContent = msg;
    }
}

/* ─────────────────────────────────────────────────────────
   Table export (Index page)
───────────────────────────────────────────────────────── */
let exportTable;
function initRolesExport() {
    if ($.fn.DataTable.isDataTable('#rolesTable')) {
        $('#rolesTable').DataTable().destroy();
    }
    exportTable = $('#rolesTable').DataTable({
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
        ordering: false
    });
}

function triggerExport(type) {
    if (!exportTable) return;
    if (type === 'copy') exportTable.button('.buttons-copy').trigger();
    else if (type === 'csv') exportTable.button('.buttons-csv').trigger();
    else if (type === 'excel') exportTable.button('.buttons-excel').trigger();
    else if (type === 'pdf') exportTable.button('.buttons-pdf').trigger();
    else if (type === 'print') exportTable.button('.buttons-print').trigger();
}



// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_language';
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

    
    loadRolesTable(1);
}

function applyFilters() {
    const searchEl = document.getElementById('txtSearchInput');

    // Search
    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    saveAppliedFilters();
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
    if (filterId === 'txtSearchInput') {
        const el = document.getElementById('txtSearchInput');
        if (el) el.value = '';
        document.getElementById('hdnSearch').value = '';
    }
    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges();          // ← ADD THIS
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';
    document.getElementById('hdnSearch').value = '';
    clearAppliedFilters();
    renderFilterBadges();          // ← ADD THIS
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();

}
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
