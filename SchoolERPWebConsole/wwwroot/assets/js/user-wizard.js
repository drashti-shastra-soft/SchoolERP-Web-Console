// ========================================
// Add/Edit User Wizard
// Extracted from AddUser.cshtml inline <script>.
//
// FIXES applied vs. the previous version:
//  1. Step 1 (Identity) fields are now rendered directly from Model.EditUser
//     in AddUser.cshtml, so they are correct on first paint. openEditModal()
//     no longer calls userWizardForm.reset() (that was wiping out the
//     server-rendered values before the AJAX call even ran) and no longer
//     re-populates Step 1 text inputs from the /User/GetUser response —
//     it only syncs the hidden time inputs from the pre-selected dropdowns
//     and fetches the data that truly can't be server-rendered: roles,
//     assigned companies, and permission overrides.
//  2. Company tree — companyId / parentCompanyId / selected IDs are now
//     normalized to Number before every comparison. Previously a
//     string/number mismatch between the "selected company ids" coming from
//     the user record and the "companyId" coming from the wizard-data
//     endpoint could silently leave checkboxes unchecked and branches
//     collapsed for a user's real assigned companies.
//  3. Company tree — children now start collapsed/expanded based on whether
//     the branch contains a selected company (so an edited user's checked
//     companies are never hidden inside a collapsed branch), and the
//     chevron icon / inline style are set consistently at render time.
// ========================================

let selectedUserId = 0;

// ========================================
// Filter dropdown (searchable role list)
// ========================================
document.addEventListener('DOMContentLoaded', function () {
    const roleSearchInput = document.getElementById('txtRoleSearch');
    if (!roleSearchInput) return;

    roleSearchInput.addEventListener('input', function (e) {
        const q = e.target.value.trim().toLowerCase();
        const cards = document.querySelectorAll('#roleSelectorList .role-item-card');
        let visibleCount = 0;

        cards.forEach(card => {
            const name = (card.dataset.roleName || card.textContent || '').toLowerCase();
            const isMatch = !q || name.includes(q);
            card.style.display = isMatch ? 'flex' : 'none';
            if (isMatch) visibleCount++;
        });

        let noResults = document.getElementById('noRolesMessage');
        if (visibleCount === 0) {
            if (!noResults) {
                noResults = document.createElement('div');
                noResults.id = 'noRolesMessage';
                noResults.className = 'text-center text-muted small py-3';
                noResults.textContent = 'No roles match your search.';
                document.getElementById('roleSelectorList').appendChild(noResults);
            }
        } else if (noResults) {
            noResults.remove();
        }
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

function selectUser(id, row, isLocked) {
    selectedUserId = id;
    document.querySelectorAll('.user-row').forEach(r => r.classList.remove('bg-light'));
    row.classList.add('bg-light');
    row.querySelector('input[type="radio"]').checked = true;
    document.getElementById('btnEdit').disabled = false;
    document.getElementById('btnDelete').disabled = false;
    const btnUnlock = document.getElementById('btnUnlock');
    if (btnUnlock) btnUnlock.disabled = !isLocked;
}

// ========================================
// EDIT MODE — populate the wizard for an existing user
// FIX: Step 1 (Identity) is already rendered server-side from Model.EditUser,
// so this no longer resets the form or re-populates text inputs. It only
// syncs derived state (hidden time fields) and loads data that can't be
// server-rendered: roles, assigned companies, permission overrides.
// ========================================
async function openEditModal(userId) {
    currentStep = 1;
    document.getElementById('txtUserId').value = userId;
    resetWizardUI();
    wizardData.selectedCompanyIDs = [];

    // Step 1 fields are already correct from Model.EditUser (server-rendered).
    // Just sync the hidden time inputs from the pre-selected HH/MM/AM-PM dropdowns.
    syncTimeHidden('Start');
    syncTimeHidden('End');
    updatePhoneNoIndicator();

    try {
        const response = await fetch(`/User/GetUser?userId=${userId}`);
        const result = await response.json();
        if (result.success) {
            const u = result.user;

            // Roles come from a separate mapping endpoint — fetch and pre-check now
            // so Step 1 -> Step 3 validation/preview has correct state immediately.
            const roleResp = await fetch(`/User/GetUserRoles?userId=${userId}`);
            const roleData = await roleResp.json();
            if (roleData.success) {
                roleData.data.forEach(rid => {
                    const cb = document.getElementById(`role_${rid}`);
                    if (cb) cb.checked = true;
                });
                if (typeof updateRoleCardsUI === 'function') updateRoleCardsUI();
            }

            wizardData = {
                ...wizardData, // preserve allRoles / allCompanies once loaded
                selectedCompanyIDs: u.companyIDs || [],
                permissionOverrides: u.permissionOverrides || []
            };

            // Pull Step 2 (companies) / Step 3 (permissions) now so the
            // tree/company list is correct the instant the wizard loads in edit mode.
            refreshWizardSteps();
        } else {
            showToast(result.message || 'Failed to load user.', false);
        }
    } catch (err) {
        console.error(err);
        showToast('Error loading user details.', false);
    }
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
    document.getElementById('btnEdit').disabled = true;
    document.getElementById('btnDelete').disabled = true;
    const btnUnlock = document.getElementById('btnUnlock');
    if (btnUnlock) btnUnlock.disabled = true;
}

// ========================================
// Password toggle
// ========================================
const btnTogglePwd = document.getElementById('btnTogglePassword');
if (btnTogglePwd) {
    btnTogglePwd.addEventListener('click', function () {
        const pwd = document.getElementById('txtPassword');
        const icon = this.querySelector('i');
        if (pwd.type === 'password') {
            pwd.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            pwd.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
}

const btnTogglePwd2 = document.getElementById('btnTogglePassword2');
if (btnTogglePwd2) {
    btnTogglePwd2.addEventListener('click', function () {
        const pwd2 = document.getElementById('txtConfirmPassword');
        const icon = this.querySelector('i');
        if (pwd2.type === 'password') {
            pwd2.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            pwd2.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
}

// ========================================
// Search & Multi-Criteria Filtering (list page)
// ========================================
const filterControls = [
    'txtSearchInput', 'ddlStatusFilter',
    'ddlFilterUserType', 'ddlFilterCompany',
    'ddlFilterRole', 'ddlFilterStatus'
];

filterControls.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        const event = el.tagName === 'INPUT' ? 'input' : 'change';
        el.addEventListener(event, applyFilters);
    }
});

document.getElementById('ddlStatusFilter')?.addEventListener('change', function () {
    const val = this.value;
    const filterStatus = document.getElementById('ddlFilterStatus');
    if (filterStatus) filterStatus.value = val || 'all';
    if (filterStatus && $(filterStatus).data('select2')) $(filterStatus).val(filterStatus.value).trigger('change.select2');
});

document.getElementById('ddlFilterStatus')?.addEventListener('change', function () {
    const val = this.value || 'all';
    const statusFilter = document.getElementById('ddlStatusFilter');
    if (statusFilter) statusFilter.value = val;
});

document.getElementById('btnApplyFilters')?.addEventListener('click', function () {
    applyFilters();
    document.getElementById('close-filter')?.click();
});

document.getElementById('btnResetFilters')?.addEventListener('click', function () {
    document.getElementById('txtSearchInput').value = '';
    const topStatusFilter = document.getElementById('ddlStatusFilter');
    if (topStatusFilter) topStatusFilter.value = 'all';
    document.getElementById('ddlFilterUserType').value = 'all';
    document.getElementById('ddlFilterCompany').value = 'all';
    document.getElementById('ddlFilterRole').value = 'all';
    document.getElementById('ddlFilterStatus').value = 'all';

    $('#ddlFilterUserType,#ddlFilterCompany,#ddlFilterRole,#ddlFilterStatus').val('all').trigger('change.select2');

    applyFilters();
});

function applyFilters() {
    const search = document.getElementById('txtSearchInput').value.toLowerCase();
    const statusEl = document.getElementById('ddlStatusFilter');
    const status = statusEl ? statusEl.value : (document.getElementById('ddlFilterStatus')?.value || 'all');
    const userType = document.getElementById('ddlFilterUserType').value;
    const company = document.getElementById('ddlFilterCompany').value;
    const role = document.getElementById('ddlFilterRole').value;

    const rows = document.querySelectorAll('.user-row');
    let visibleCount = 0;

    rows.forEach(row => {
        const rowText = row.textContent.toLowerCase();
        const rowStatus = row.dataset.status;
        const rowUserType = row.dataset.userTypeId;
        const rowRoles = (row.dataset.roleIds || '').split(',');
        const rowCompanies = (row.dataset.companyIds || '').split(',');

        const matchSearch = !search || rowText.includes(search);
        const matchStatus = status === 'all' || rowStatus === status;
        const matchUserType = userType === 'all' || !userType || rowUserType === userType;
        const matchCompany = company === 'all' || !company || rowCompanies.includes(company);
        const matchRole = role === 'all' || !role || rowRoles.includes(role);

        if (matchSearch && matchStatus && matchUserType && matchCompany && matchRole) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    const noResults = document.getElementById('noResultsMessage');
    if (visibleCount === 0) {
        if (!noResults) {
            const msg = document.createElement('div');
            msg.id = 'noResultsMessage';
            msg.className = 'text-center py-5';
            msg.innerHTML = '<i class="fas fa-search text-muted mb-3" style="font-size: 2rem; opacity: 0.3;"></i><p class="text-muted">No users match your filters.</p>';
            document.querySelector('#usersTable').parentNode.appendChild(msg);
        }
    } else if (noResults) {
        noResults.remove();
    }

    renderFilterBadges();
    resetSelection();
}

function renderFilterBadges() {
    const container = document.getElementById('badgeContainer');
    const mainContainer = document.getElementById('activeFilterBadges');
    if (!container) return;
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

        let value = el.value;
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
            badge.innerHTML = `${f.label}: ${text} <i class="ti ti-x ms-1 cursor-pointer" onclick="removeFilter('${f.id}')" style="font-size: 10px;"></i>`;
            container.appendChild(badge);
        }
    });

    if (activeCount > 0) {
        mainContainer.style.display = 'block';
    } else {
        mainContainer.style.display = 'none';
    }
}

function removeFilter(filterId) {
    const el = document.getElementById(filterId);
    if (!el) return;

    if (el.tagName === 'INPUT') {
        el.value = '';
    } else {
        el.value = 'all';
    }

    if (window.jQuery && jQuery(el).data('select2')) {
        jQuery(el).trigger('change.select2');
    } else {
        el.dispatchEvent(new Event('change'));
    }

    applyFilters();
}

function resetAllFilters() {
    const filters = ['txtSearchInput', 'ddlFilterUserType', 'ddlFilterCompany', 'ddlFilterRole', 'ddlFilterStatus'];
    filters.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'INPUT') el.value = '';
        else el.value = 'all';

        if (window.jQuery && jQuery(el).data('select2')) {
            jQuery(el).trigger('change.select2');
        }
    });
    applyFilters();
}

// ========================================
// Wizard State & Navigation
// ========================================
let wizardData = {
    user: { userID: 0 },
    allRoles: [],
    allCompanies: [],
    permissionMatrix: [],
    selectedCompanyIDs: []
};
let currentStep = 1;

async function checkUsernameUnique(username, userId) {
    try {
        const response = await fetch(`/User/CheckUsername?username=${encodeURIComponent(username)}&userId=${userId}`);
        const result = await response.json();
        return (result.success && result.data === true);
    } catch (e) {
        console.error(e);
        return true;
    }
}

function toggleListExpansion(el, event) {
    event.stopPropagation();
    const shortView = el.querySelector('.short-view');
    const fullView = el.querySelector('.full-view');
    if (shortView.classList.contains('d-none')) {
        shortView.classList.remove('d-none');
        fullView.classList.add('d-none');
        fullView.classList.remove('d-flex');
    } else {
        shortView.classList.add('d-none');
        fullView.classList.remove('d-none');
        fullView.classList.add('d-flex');
    }
}

async function moveWizard(delta) {
    const nextStep = currentStep + delta;
    await goToWizardStep(nextStep);
}

async function goToWizardStep(nextStep) {
    if (nextStep < 1 || nextStep > 3 || nextStep === currentStep) return;

    const userId = parseInt(document.getElementById('txtUserId').value) || 0;
    const isEdit = userId > 0;

    if (nextStep > currentStep && currentStep === 1) {
        if (!validateStep1()) return;

        const username = document.getElementById('txtUsername').value.trim();

        const btnNext = document.getElementById('btnWizardNext');
        const originalHtml = btnNext.innerHTML;
        btnNext.disabled = true;
        btnNext.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        const isUnique = await checkUsernameUnique(username, userId);

        btnNext.disabled = false;
        btnNext.innerHTML = originalHtml;

        if (!isUnique) {
            setFieldError('txtUsername', 'Username is already taken.');
            return;
        }
    }

    if (currentStep === 2) {
        wizardData.selectedCompanyIDs = Array.from(
            document.querySelectorAll('.company-checkbox:checked')
        ).map(cb => parseInt(cb.value));
    }

    document.querySelector(`.wizard-pane[id="step${currentStep}"]`).classList.remove('active');
    document.querySelector(`.nav-link[data-step="${currentStep}"]`).classList.remove('active');

    if (nextStep > currentStep) {
        document.querySelector(`.nav-link[data-step="${currentStep}"]`).classList.add('completed');
    }

    currentStep = nextStep;

    document.querySelector(`.wizard-pane[id="step${currentStep}"]`).classList.add('active');
    document.querySelector(`.nav-link[data-step="${currentStep}"]`).classList.add('active');

    document.getElementById('btnWizardPrev').classList.toggle('d-none', currentStep === 1);
    document.getElementById('btnWizardNext').classList.toggle('d-none', currentStep === 3);
    document.getElementById('btnBack').classList.toggle('d-none', currentStep != 1);

    const btnFinish = document.getElementById('btnWizardFinish');
    if (isEdit) {
        btnFinish.classList.remove('d-none');
        btnFinish.innerHTML = '<i class="ti ti-cloud me-1"></i> Save';
    } else {
        btnFinish.classList.toggle('d-none', currentStep !== 3);
        btnFinish.innerHTML = '<i class="ti ti-cloud me-1"></i> Save';
    }

    if (currentStep === 2 || currentStep === 3) {
        refreshWizardSteps();
    }
}

async function fetchWizardData(userId = 0, previewRoleId = 0) {
    let roleIds = Array.from(document.querySelectorAll('.role-checkbox:checked')).map(cb => cb.value).join(',');
    let queryIds = previewRoleId > 0 ? previewRoleId : roleIds;

    try {
        const response = await fetch(`/User/GetWizardData?userId=${userId}&roleIds=${queryIds}`);
        const result = await response.json();
        if (result.success) {
            wizardData = {
                ...wizardData,
                ...result.data
            };
            renderStep2();
            renderStep3(previewRoleId > 0);
        }
    } catch (err) {
        console.error('Error fetching wizard data:', err);
        showToast('Failed to load access details.', false);
    }
}

function getSelectedCompanyIDs_Edit() {
    let companyIDs = [];
    $('.company-checkbox:checked').each(function () {
        companyIDs.push($(this).val());
    });
    return companyIDs;
}

function getPermissionOverride_Edit() {
    let permissions = [];
    $('.perm-grid-checkbox:checked').each(function () {
        permissions.push({
            menuId: $(this).data('menu'),
            permissionId: $(this).data('perm')
        });
    });
    return permissions;
}

// ========================================
// STEP 2 — Company tree
// FIX: companyId / parentCompanyId / selected IDs are normalized to Number
// before every comparison, so a string/number mismatch between the user's
// saved companyIDs and the wizard-data companyId values can no longer leave
// checkboxes unchecked or branches collapsed for a real assignment.
// Branches are expanded/collapsed based on whether they contain a selected
// company (important for edit mode, so a checked company nested a few
// levels deep is never hidden by default), and the chevron icon + inline
// display style are set explicitly and consistently so the first click
// always behaves correctly.
// ========================================
function renderStep2() {
    const container = document.getElementById('companyAssignmentList');
    if (!wizardData.allCompanies || wizardData.allCompanies.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-3">No companies found.</div>';
        return;
    }

    const rawSelected = (wizardData.selectedCompanyIDs && wizardData.selectedCompanyIDs.length > 0)
        ? wizardData.selectedCompanyIDs
        : (wizardData.user?.companyIDs || []);

    // FIX: normalize to a Set<number> so string/number mismatches never break checked state.
    const selected = new Set(rawSelected.map(id => Number(id)));

    const compMap = {};
    wizardData.allCompanies.forEach(c => {
        const id = Number(c.companyId);
        compMap[id] = { ...c, companyId: id, children: [] };
    });

    const rootComps = [];
    Object.values(compMap).forEach(c => {
        const parentId = (c.parentCompanyId !== null && c.parentCompanyId !== undefined && c.parentCompanyId !== '')
            ? Number(c.parentCompanyId)
            : null;
        if (parentId && compMap[parentId]) {
            compMap[parentId].children.push(c);
        } else {
            rootComps.push(c);
        }
    });

    // Returns true if this company or any descendant is in the selected list.
    const subtreeHasSelected = (c) => {
        if (selected.has(c.companyId)) return true;
        return (c.children || []).some(child => subtreeHasSelected(child));
    };

    const buildTreeHtml = (comps, depth) => {
        if (comps.length === 0) return '';
        let html = '';
        comps.forEach(c => {
            const isSelected = selected.has(c.companyId);
            const hasChildren = c.children && c.children.length > 0;
            // FIX: expand by default only if this branch actually contains a
            // selected company; otherwise start collapsed so large trees don't
            // dump everything open, but nothing selected ever ends up hidden.
            const expandByDefault = hasChildren && subtreeHasSelected(c);

            html += `
                        <div class="company-item" style="padding-left: ${depth * 25}px; padding-top: 5px; padding-bottom: 5px;">
                            <div class="d-flex align-items-center">`;

            if (hasChildren) {
                const chevronClass = expandByDefault ? 'fa-chevron-down' : 'fa-chevron-right';
                html += `<i class="fas ${chevronClass} me-2 text-muted" style="cursor: pointer; width: 15px;" onclick="toggleCompChildren(this, ${c.companyId})"></i>`;
            } else {
                html += `<span style="width: 15px; display: inline-block;" class="me-2"></span>`;
            }

            html += `   <div class="form-check mb-0">
                                    <input class="form-check-input company-checkbox" type="checkbox"
                                           id="comp_${c.companyId}" value="${c.companyId}"
                                           ${isSelected ? 'checked' : ''}
                                           onchange="handleCompCheck(this, ${c.companyId})">
                                    <label class="form-check-label text-sm fw-semibold mb-0" for="comp_${c.companyId}">
                                        ${c.schoolName} <small class="text-muted">(${c.schoolCode || 'N/A'})</small>
                                    </label>
                                </div>
                            </div>
                        </div>`;

            if (hasChildren) {
                // FIX: explicit inline display set at render time (not left blank),
                // so toggleCompChildren's style.display === 'none' check is reliable
                // starting from the very first click.
                const displayStyle = expandByDefault ? 'block' : 'none';
                html += `<div id="comp_children_${c.companyId}" class="comp-children-container" style="display: ${displayStyle};">`;
                html += buildTreeHtml(c.children, depth + 1);
                html += `</div>`;
            }
        });
        return html;
    };

    container.innerHTML = buildTreeHtml(rootComps, 0);
}

function handleCompCheck(cb, compId) {
    // Manual selection only — parent selection does not auto-check children.
    // To cascade parent -> children selection instead, uncomment:
    // document.querySelectorAll(`#comp_children_${compId} .company-checkbox`)
    //     .forEach(child => child.checked = cb.checked);
}

function toggleCompChildren(icon, compId) {
    const container = document.getElementById(`comp_children_${compId}`);
    if (container) {
        if (container.style.display === 'none') {
            container.style.display = 'block';
            icon.classList.replace('fa-chevron-right', 'fa-chevron-down');
        } else {
            container.style.display = 'none';
            icon.classList.replace('fa-chevron-down', 'fa-chevron-right');
        }
    }
}

// ========================================
// STEP 3 — Permission tree
// ========================================
function renderStep3(isPreview = false) {
    const body = document.getElementById('userTreeGridBody');
    const header = document.getElementById('userTreeHeaderRow');

    const titleEl = document.getElementById('permissionViewTitle');
    const descEl = document.getElementById('permissionViewDesc');

    if (!isPreview) {
        titleEl.textContent = 'Effective Permissions';
        descEl.textContent = 'Showing combined result of all selected roles.';
    }

    if (!wizardData.permissionMatrix || wizardData.permissionMatrix.length === 0) {
        body.innerHTML = '<tr><td colspan="10" class="text-center py-5 text-muted"><i class="fas fa-info-circle me-2"></i>No permissions available. Select a role to preview.</td></tr>';
        return;
    }

    const uniquePerms = [];
    const permIdsSeen = new Set();
    wizardData.permissionMatrix.forEach(p => {
        if (!permIdsSeen.has(p.permissionID)) {
            permIdsSeen.add(p.permissionID);
            uniquePerms.push({ id: p.permissionID, name: p.permissionName, label: p.displayLabel });
        }
    });

    uniquePerms.sort((a, b) => {
        if (a.name === 'View') return -1;
        if (b.name === 'View') return 1;
        return a.id - b.id;
    });

    header.innerHTML = '<th class="id-column">ID</th><th>Menu Name</th>';
    uniquePerms.forEach(p => {
        header.innerHTML += `<th class="matrix-col w-s-nowrap">
                                        <p class="mb-1">${p.label}</p>
                                                <input type="checkbox"
                                                       class="form-check-input mt-0 column-master-check"
                                                       data-perm="${p.id}"
                                                       onchange="togglePermissionColumn(this)">
                                     </th>`;
    });

    const menus = {};
    wizardData.permissionMatrix.forEach(p => {
        if (!menus[p.menuID]) {
            menus[p.menuID] = {
                id: p.menuID,
                name: p.menuName,
                icon: p.menuIcon,
                parentId: p.parentID,
                permissions: {}
            };
        }
        menus[p.menuID].permissions[p.permissionID] = {
            roleAccess: p.roleAccess,
            userOverride: p.userOverride,
            hasAccess: p.hasAccess
        };
    });

    const menuArray = Object.values(menus);

    let rootMenus = menuArray.filter(menu => {
        if (menu.parentId) return false;

        const selfAccess = Object.values(menu.permissions).some(p => p.hasAccess);

        const childAccess = menuArray.some(child =>
            child.parentId === menu.id &&
            Object.values(child.permissions).some(p => p.hasAccess)
        );

        return selfAccess || childAccess;
    });

    body.innerHTML = '';

    const buildGridRows = (list, depth = 0) => {
        list.forEach((m, index) => {
            let children = menuArray.filter(child =>
                child.parentId === m.id &&
                Object.values(child.permissions || {}).some(p => p.hasAccess === true)
            );

            const isParent = children.length > 0;
            const isLast = index === list.length - 1;

            const tr = document.createElement('tr');
            tr.className = `tree-row depth-${depth} ${isParent ? 'parent-node collapsed' : 'leaf-node'}`;
            tr.dataset.id = m.id;
            if (m.parentId) tr.dataset.parentId = m.parentId;

            let html = `<td class="id-column">${m.id}</td>`;

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

            html += `<input type="checkbox" class="row-master-check me-2" onchange="toggleGridRow(this, ${m.id})">`;

            if (isParent) {
                html += `<span class="tree-toggle" onclick="toggleTreeNode(${m.id}, event)"><i class="fas fa-plus"></i></span>`;
            } else {
                html += `<span style="width:0px;display:inline-block;"></span>`;
            }

            html += `<i class="fas ${m.icon} tree-icon"></i>`;
            html += `<span class="tree-label">${m.name}</span></td>`;

            uniquePerms.forEach(p => {
                const perm = m.permissions[p.id];
                if (perm) {
                    html += `<td class="matrix-col">
                                        <input type="checkbox" class="form-check-input perm-grid-checkbox"
                                               data-menu="${m.id}" data-perm="${p.id}"
                                               data-perm-name="${p.name}"
                                               data-role-access="${perm.roleAccess}"
                                               data-has-access="${perm.hasAccess}"
                                               ${perm.hasAccess ? 'checked' : ''}
                                               onchange="handlePermissionToggle(this)"
                                               title="Role Default: ${perm.roleAccess ? 'Allowed' : 'Denied'}">
                                     </td>`;
                } else {
                    html += `<td class="matrix-col">-</td>`;
                }
            });

            tr.innerHTML = html;
            body.appendChild(tr);

            if (isParent) buildGridRows(children, depth + 1);
        });
    };

    buildGridRows(rootMenus);
    syncAllGridStates();
}

// --- Role selection helpers ---
function updateRoleCardsUI() {
    document.querySelectorAll('.role-item-card').forEach(card => {
        const cb = card.querySelector('.role-checkbox');
        if (cb && cb.checked) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

function highlightRole(el, roleId) {
    const checkbox = document.getElementById('role_' + roleId);
    checkbox.checked = !checkbox.checked;
    showEffectivePermissions();
}

function showEffectivePermissions() {
    updateRoleCardsUI();
    document.getElementById('btnEffectiveView').classList.add('bg-primary', 'text-white', 'border-primary');
    document.getElementById('iconEffectiveActive').classList.remove('d-none');

    document.getElementById('permissionViewTitle').textContent = 'Effective Permissions';
    document.getElementById('permissionViewDesc').textContent = 'Showing combined result of all selected roles.';

    refreshWizardSteps();
}

function toggleRoleCheck(roleId) {
    showEffectivePermissions();
}

document.getElementById('txtRoleSearch')?.addEventListener('input', function (e) {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.role-item-card').forEach(card => {
        const name = card.querySelector('span').textContent.toLowerCase();
        card.style.display = name.includes(q) ? 'flex' : 'none';
    });
});

function toggleTreeNode(menuId, event) {
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
            hideTreeDescendants(d.dataset.id);
            d.style.display = 'none';
        } else {
            d.style.display = 'table-row';
        }
    });
}

function hideTreeDescendants(parentId) {
    document.querySelectorAll(`.tree-row[data-parent-id="${parentId}"]`).forEach(d => {
        d.style.display = 'none';
        hideTreeDescendants(d.dataset.id);
    });
}

function getTreeRow(menuId) {
    return document.querySelector(`.tree-row[data-id="${menuId}"]`);
}

function getRowMasterCheckbox(menuId) {
    return getTreeRow(menuId)?.querySelector('.row-master-check');
}

function getDirectChildRows(menuId) {
    return Array.from(document.querySelectorAll(`.tree-row[data-parent-id="${menuId}"]`));
}

function getRowPermissionCheckboxes(menuId) {
    return Array.from(document.querySelectorAll(`#userPermissionTable .perm-grid-checkbox[data-menu="${menuId}"]`));
}

function rowHasCheckedPermissions(menuId) {
    return getRowPermissionCheckboxes(menuId).some(cb => cb.checked);
}

function rowHasAnyActiveDescendant(menuId) {
    return getDirectChildRows(menuId).some(childRow => isMenuActive(childRow.dataset.id));
}

function isMenuActive(menuId) {
    const rowPermissions = getRowPermissionCheckboxes(menuId);
    const childRows = getDirectChildRows(menuId);

    if (rowPermissions.length === 0 && childRows.length === 0) {
        return !!getRowMasterCheckbox(menuId)?.checked;
    }

    return rowHasCheckedPermissions(menuId) || rowHasAnyActiveDescendant(menuId);
}

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

function syncDescendantRowStates(menuId) {
    getDirectChildRows(menuId).forEach(childRow => {
        syncRowMasterCheckbox(childRow.dataset.id);
        syncDescendantRowStates(childRow.dataset.id);
    });
}

function syncAllGridStates() {
    const allRows = Array.from(document.querySelectorAll('#userPermissionTable .tree-row'));

    allRows
        .sort((a, b) => {
            const depthA = parseInt((a.className.match(/depth-(\d+)/)?.[1] || '0'), 10);
            const depthB = parseInt((b.className.match(/depth-(\d+)/)?.[1] || '0'), 10);
            return depthB - depthA;
        })
        .forEach(row => syncRowMasterCheckbox(row.dataset.id));

    document.querySelectorAll('#userPermissionTable .column-master-check')
        .forEach(headerCheckbox => syncPermissionColumnHeader(headerCheckbox.dataset.perm));
}

function setMenuBranchState(menuId, isChecked) {
    const row = getTreeRow(menuId);
    if (!row) return;

    const rowMaster = row.querySelector('.row-master-check');
    if (rowMaster) rowMaster.checked = isChecked;

    getRowPermissionCheckboxes(menuId).forEach(pcb => {
        const hasAccess = pcb.dataset.hasAccess === "true";
        const roleAccess = pcb.dataset.roleAccess === "true";
        if (hasAccess) {
            pcb.checked = true;
        } else if (roleAccess) {
            pcb.checked = isChecked;
        }
    });

    getDirectChildRows(menuId).forEach(childRow => {
        setMenuBranchState(childRow.dataset.id, isChecked);
    });
}

function toggleGridRow(cb, menuId) {
    setMenuBranchState(menuId, cb.checked);
    syncAncestors(menuId);

    document.querySelectorAll('#userPermissionTable .column-master-check')
        .forEach(headerCheckbox => syncPermissionColumnHeader(headerCheckbox.dataset.perm));
}

function togglePermissionColumn(headerCheckbox) {
    const permissionId = headerCheckbox.dataset.perm;
    const isChecked = headerCheckbox.checked;

    document.querySelectorAll(`#userPermissionTable .perm-grid-checkbox[data-perm="${permissionId}"]`)
        .forEach(cb => {
            cb.checked = isChecked;
            syncRowMasterCheckbox(cb.dataset.menu);
            syncAncestors(cb.dataset.menu);
        });
}

function handlePermissionToggle(permissionCheckbox) {
    autoCheckViewPermission(permissionCheckbox);
    autoUncheckOtherPermissions(permissionCheckbox);
    const menuId = permissionCheckbox.dataset.menu;
    syncRowMasterCheckbox(menuId);
    syncDescendantRowStates(menuId);
    syncAncestors(menuId);
    syncPermissionColumnHeader(permissionCheckbox.dataset.perm);
}

function syncPermissionColumnHeader(permissionId) {
    const columnCheckboxes = document.querySelectorAll(
        `#userPermissionTable .perm-grid-checkbox[data-perm="${permissionId}"]`
    );
    const headerCheckbox = document.querySelector(
        `#userPermissionTable .column-master-check[data-perm="${permissionId}"]`
    );

    if (!headerCheckbox || columnCheckboxes.length === 0) return;

    headerCheckbox.checked = Array.from(columnCheckboxes).every(cb => cb.checked);
}

function toggleGridChecks(checked) {
    document.querySelectorAll('.perm-grid-checkbox, .row-master-check').forEach(cb => cb.checked = checked);
}

function toggleAllCompanies(checked) {
    document.querySelectorAll('.company-checkbox').forEach(cb => cb.checked = checked);
}

function refreshWizardSteps() {
    fetchWizardData(parseInt(document.getElementById('txtUserId').value));
}

// ========================================
// STEP 1 VALIDATION
// ========================================
const step1FieldMap = {
    txtUsername: 'errTxtUsername',
    txtPassword: 'errTxtPassword',
    txtConfirmPassword: 'errTxtConfirmPassword',
    txtFullName: 'errTxtFullName',
    txtEmail: 'errTxtEmail',
    ddlUserTypeID: 'errDdlUserTypeID',
    txtPhoneNo: 'errTxtPhoneNo',
    txtBackDaysAllow: 'errTxtBackDaysAllow',
    txtStartDate: 'errTxtStartDate',
    txtEndDate: 'errTxtEndDate',
    txtStartTime: 'errTxtStartTime',
    txtEndTime: 'errTxtEndTime'
};

const IV = window.InlineFormValidation;

function setFieldError(inputId, message) {
    IV.setFieldError(inputId, step1FieldMap[inputId], message);
}

function clearFieldError(inputId) {
    IV.clearFieldError(inputId, step1FieldMap[inputId]);
}

function clearAllStep1Errors() {
    Object.keys(step1FieldMap).forEach(clearFieldError);
}

function markTimeSelectInvalid(which) {
    ['Hour', 'Minute', 'AmPm'].forEach(part => {
        const el = document.getElementById(`ddl${which}${part}`);
        if (el) el.classList.add('is-invalid');
    });
}

function clearTimeSelectInvalid(which) {
    ['Hour', 'Minute', 'AmPm'].forEach(part => {
        const el = document.getElementById(`ddl${which}${part}`);
        if (el) el.classList.remove('is-invalid');
    });
}

function syncTimeHidden(which) {
    const hh = document.getElementById(`ddl${which}Hour`)?.value || '';
    const mm = document.getElementById(`ddl${which}Minute`)?.value || '';
    const ap = document.getElementById(`ddl${which}AmPm`)?.value || '';
    const hidden = document.getElementById(`txt${which}Time`);

    if (!hh && !mm && !ap) {
        if (hidden) hidden.value = '';
        clearFieldError(`txt${which}Time`);
        clearTimeSelectInvalid(which);
        return;
    }

    if (hidden) hidden.value = (hh && mm && ap) ? `${hh}:${mm} ${ap}` : '';
    clearFieldError(`txt${which}Time`);
    clearTimeSelectInvalid(which);
}

function setTimeSelects(which, timeSpan) {
    const hhSel = document.getElementById(`ddl${which}Hour`);
    const mmSel = document.getElementById(`ddl${which}Minute`);
    const apSel = document.getElementById(`ddl${which}AmPm`);
    const hidden = document.getElementById(`txt${which}Time`);

    if (!hhSel || !mmSel || !apSel || !hidden) return;

    const raw = String(timeSpan || '').trim();
    if (!raw) {
        hhSel.value = '';
        mmSel.value = '';
        apSel.value = '';
        hidden.value = '';
        return;
    }

    const m = raw.match(/^(\d{1,2})\s*:\s*([0-5]\d)/);
    if (!m) return;

    const hh24 = parseInt(m[1], 10);
    const mm = m[2];
    const ap = hh24 >= 12 ? 'PM' : 'AM';
    let hh12 = hh24 % 12;
    if (hh12 === 0) hh12 = 12;

    hhSel.value = String(hh12);
    mmSel.value = String(mm);
    apSel.value = ap;
    syncTimeHidden(which);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
}

function normalizePhoneDigits(val) {
    return String(val || '').replace(/\D/g, '');
}

function parse12HourToTimeSpan(val) {
    const raw = String(val || '').trim();
    if (!raw) return null;

    const m = raw.match(/^(\d{1,2})\s*:\s*([0-5]\d)(?:\s*:\s*([0-5]\d))?\s*(AM|PM)$/i);
    if (!m) return { ok: false, value: null };

    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const sec = m[3] ? parseInt(m[3], 10) : 0;
    const ap = m[4].toUpperCase();

    if (h < 1 || h > 12) return { ok: false, value: null };
    if (ap === 'AM') {
        if (h === 12) h = 0;
    } else {
        if (h !== 12) h = h + 12;
    }

    const HH = String(h).padStart(2, '0');
    const MM = String(min).padStart(2, '0');
    const SS = String(sec).padStart(2, '0');
    return { ok: true, value: `${HH}:${MM}:${SS}` };
}

function formatTimeTo12Hour(val) {
    const raw = String(val || '').trim();
    if (!raw) return '';
    const m = raw.match(/^(\d{1,2})\s*:\s*([0-5]\d)(?:\s*:\s*([0-5]\d))?$/);
    if (!m) return raw;

    let hh = parseInt(m[1], 10);
    const mm = m[2];
    const ap = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12;
    if (hh === 0) hh = 12;
    return `${hh}:${mm} ${ap}`;
}

function validateStep1() {
    clearAllStep1Errors();
    let ok = true;

    const userId = parseInt(document.getElementById('txtUserId').value) || 0;
    const username = document.getElementById('txtUsername').value.trim();
    const password = document.getElementById('txtPassword').value;
    const confirmPassword = document.getElementById('txtConfirmPassword').value;
    const fullName = document.getElementById('txtFullName').value.trim();
    const email = document.getElementById('txtEmail').value.trim();
    const userType = document.getElementById('ddlUserTypeID').value;
    const phoneRaw = document.getElementById('txtPhoneNo').value;
    const phoneDigits = normalizePhoneDigits(phoneRaw);
    const backDaysVal = document.getElementById('txtBackDaysAllow').value;
    const backDays = backDaysVal === '' ? 0 : Number(backDaysVal);
    const startDate = document.getElementById('txtStartDate').value;
    const endDate = document.getElementById('txtEndDate').value;
    const startTimeRaw = document.getElementById('txtStartTime').value.trim();
    const endTimeRaw = document.getElementById('txtEndTime').value.trim();
    let startParsed = null;
    let endParsed = null;
    const startSel = {
        h: document.getElementById('ddlStartHour')?.value || '',
        m: document.getElementById('ddlStartMinute')?.value || '',
        ap: document.getElementById('ddlStartAmPm')?.value || ''
    };
    const endSel = {
        h: document.getElementById('ddlEndHour')?.value || '',
        m: document.getElementById('ddlEndMinute')?.value || '',
        ap: document.getElementById('ddlEndAmPm')?.value || ''
    };

    if (!username) { setFieldError('txtUsername', 'User Name is required.'); ok = false; }
    if (!fullName) { setFieldError('txtFullName', 'Full Name is required.'); ok = false; }
    if (!userType) { setFieldError('ddlUserTypeID', 'User Type is required.'); ok = false; }

    const isNew = userId === 0;
    if (isNew) {
        if (!password) { setFieldError('txtPassword', 'Password is required.'); ok = false; }
        if (!confirmPassword) { setFieldError('txtConfirmPassword', 'Confirm Password is required.'); ok = false; }
        if (password && confirmPassword && password !== confirmPassword) {
            setFieldError('txtConfirmPassword', 'Passwords do not match.');
            ok = false;
        }
    }

    if (email && !isValidEmail(email)) {
        setFieldError('txtEmail', 'Please enter a valid email address.');
        ok = false;
    }

    const isOTPEnabled = document.getElementById('chkIsOTPEnabled').checked;
    if (isOTPEnabled && !phoneDigits) {
        setFieldError('txtPhoneNo', 'Phone number is required when Login with OTP is enabled.');
        ok = false;
    } else if (phoneDigits && phoneDigits.length !== 10) {
        setFieldError('txtPhoneNo', 'Phone number must be exactly 10 digits.');
        ok = false;
    }

    if (Number.isNaN(backDays) || backDays < 0) {
        setFieldError('txtBackDaysAllow', 'Back days must be 0 or greater.');
        ok = false;
    }

    if (startDate && endDate) {
        const sd = new Date(startDate);
        const ed = new Date(endDate);
        if (!(ed >= sd)) {
            setFieldError('txtEndDate', 'End date must be greater than or equal to start date.');
            ok = false;
        }
    }

    if (startTimeRaw) {
        startParsed = parse12HourToTimeSpan(startTimeRaw);
        if (!startParsed || startParsed.ok === false) {
            setFieldError('txtStartTime', 'Please select a valid time.');
            markTimeSelectInvalid('Start');
            ok = false;
        }
    }
    if (!startTimeRaw && (startSel.h || startSel.m || startSel.ap)) {
        setFieldError('txtStartTime', 'Please select Hour, Minute and AM/PM.');
        markTimeSelectInvalid('Start');
        ok = false;
    }
    if (endTimeRaw) {
        endParsed = parse12HourToTimeSpan(endTimeRaw);
        if (!endParsed || endParsed.ok === false) {
            setFieldError('txtEndTime', 'Please select a valid time.');
            markTimeSelectInvalid('End');
            ok = false;
        }
    }
    if (!endTimeRaw && (endSel.h || endSel.m || endSel.ap)) {
        setFieldError('txtEndTime', 'Please select Hour, Minute and AM/PM.');
        markTimeSelectInvalid('End');
        ok = false;
    }

    if (startParsed && startParsed.ok && endParsed && endParsed.ok) {
        const start = new Date(`1970-01-01T${startParsed.value}`);
        const end = new Date(`1970-01-01T${endParsed.value}`);

        if (end <= start) {
            setFieldError('txtEndTime', 'End time must be greater than start time.');
            markTimeSelectInvalid('End');
            ok = false;
        }
    }

    return ok;
}

document.getElementById('txtPhoneNo')?.addEventListener('input', function (e) {
    const digitsOnly = normalizePhoneDigits(e.target.value).slice(0, 10);
    if (e.target.value !== digitsOnly) e.target.value = digitsOnly;
    clearFieldError('txtPhoneNo');
});

IV.bindAutoClear(step1FieldMap);

function resetWizardUI() {
    const userId = parseInt(document.getElementById('txtUserId').value) || 0;
    const isEdit = userId > 0;

    document.querySelectorAll('.wizard-pane').forEach(p => p.classList.remove('active'));
    document.getElementById('step1').classList.add('active');
    document.querySelectorAll('.nav-link').forEach(s => {
        s.classList.remove('active', 'completed');
        if (s.dataset.step == "1") s.classList.add('active');
    });
    document.getElementById('btnWizardPrev').classList.add('d-none');
    document.getElementById('btnWizardNext').classList.remove('d-none');

    const btnFinish = document.getElementById('btnWizardFinish');
    if (isEdit) {
        btnFinish.classList.remove('d-none');
        btnFinish.innerHTML = '<i class="ti ti-cloud me-1"></i> Save';
    } else {
        btnFinish.classList.add('d-none');
        btnFinish.innerHTML = '<i class="ti ti-cloud me-1"></i> Save';
    }

    document.getElementById('companyAssignmentList').innerHTML = '<div class="text-center py-4"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';
    document.getElementById('userTreeGridBody').innerHTML = '<tr><td colspan="10" class="text-center py-5 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Loading details...</td></tr>';
    if (typeof updateRoleCardsUI === 'function') updateRoleCardsUI();
}

// ========================================
// Final Save
// ========================================
async function finishWizard() {
    const btn = document.getElementById('btnWizardFinish');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';

    const userId = parseInt(document.getElementById('txtUserId').value) || 0;
    const password = document.getElementById('txtPassword').value;

    if (!validateStep1()) {
        goToWizardStep(1);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Save User';
        return;
    }

    const startTimeInput = document.getElementById('txtStartTime').value.trim();
    const endTimeInput = document.getElementById('txtEndTime').value.trim();
    const startTimeParsed = startTimeInput ? parse12HourToTimeSpan(startTimeInput) : null;
    const endTimeParsed = endTimeInput ? parse12HourToTimeSpan(endTimeInput) : null;

    const request = {
        userID: userId,
        op: userId == 0 ? "I" : "U",
        username: document.getElementById('txtUsername').value.trim(),
        fullName: document.getElementById('txtFullName').value.trim(),
        email: document.getElementById('txtEmail').value.trim(),
        phoneNo: normalizePhoneDigits(document.getElementById('txtPhoneNo').value),
        password: userId == 0 ? password : "",
        userTypeID: parseInt(document.getElementById('ddlUserTypeID').value) || 0,
        startDate: document.getElementById('txtStartDate').value || null,
        endDate: document.getElementById('txtEndDate').value || null,
        startTime: startTimeParsed?.ok ? startTimeParsed.value : null,
        endTime: endTimeParsed?.ok ? endTimeParsed.value : null,
        backDaysAllow: parseInt(document.getElementById('txtBackDaysAllow').value) || 0,
        isOTPEnabled: document.getElementById('chkIsOTPEnabled').checked,
        roleIDs: Array.from(document.querySelectorAll('.role-checkbox:checked')).map(cb => parseInt(cb.value)),
        companyIDs: userId == 0 ? wizardData.selectedCompanyIDs || [] : getSelectedCompanyIDs_Edit(),
        permissionOverrides:
            Array.from(document.querySelectorAll('.perm-grid-checkbox'))
                .filter(pcb => {
                    const roleAccess = pcb.dataset.roleAccess === 'true';
                    return pcb.checked !== roleAccess;
                })
                .map(pcb => ({
                    menuID: parseInt(pcb.dataset.menu),
                    permissionID: parseInt(pcb.dataset.perm),
                    isAllowed: pcb.checked
                }))
    };

    try {
        const response = await fetch('/User/SaveWizard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        });
        const result = await response.json();

        if (result.success) {
            showToast(result.message || 'User saved successfully.', true);
            if (userId == 0) {
                setTimeout(() => location.reload(), 1000);
            }
        } else {
            showToast(result.message || 'Save failed. Please check all fields.', false);
        }
    } catch (err) {
        console.error('finishWizard error:', err);
        showToast('Error saving user data. Please try again.', false);
    } finally {
        btn.disabled = false;
        btn.innerHTML = userId > 0 ? '<i class="ti ti-cloud me-1"></i> Save' : '<i class="ti ti-cloud me-1"></i> Save';
    }
}

// ========================================
// Toggle Status
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
        } else {
            showToast(result.message, false);
            location.reload();
        }
    } catch (err) {
        console.error(err);
        showToast('Error updating status', false);
        location.reload();
    }
}

async function unlockUser(userId) {
    if (!confirm('Are you sure you want to unlock this user?')) return;

    try {
        const response = await fetch(`/User/Unlock?userId=${userId}`, { method: 'POST' });
        const result = await response.json();

        if (result.success) {
            showToast('User account unlocked', true);
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast(result.message, false);
        }
    } catch (err) {
        console.error(err);
        showToast('Error unlocking user', false);
    }
}

// ========================================
// Conditional Validation Listeners
// ========================================
document.getElementById('chkIsOTPEnabled')?.addEventListener('change', function () {
    const reqIndicator = document.getElementById('reqPhoneNo');
    if (reqIndicator) {
        reqIndicator.style.display = this.checked ? 'inline' : 'none';
    }
    if (!this.checked) {
        clearFieldError('txtPhoneNo');
    }
});

function updatePhoneNoIndicator() {
    const chk = document.getElementById('chkIsOTPEnabled');
    const reqIndicator = document.getElementById('reqPhoneNo');
    if (chk && reqIndicator) {
        reqIndicator.style.display = chk.checked ? 'inline' : 'none';
    }
}

async function updateUserStatus(isActive) {
    let userIds = [];
    $('.user-checkbox:checked').each(function () {
        userIds.push($(this).val());
    });

    if (userIds.length === 0) {
        showToast('Please select at least one user', false);
        return;
    }

    const request = { userIds: userIds.join(','), isActive: isActive };

    try {
        const response = await fetch('/api/user/bluk-toggle-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        });
        const result = await response.json();

        if (result.success) {
            showToast('User status updated successfully', true);
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast(result.message, false);
        }
    } catch (err) {
        console.error(err);
        showToast('Error updating status', false);
    }
}

function autoCheckViewPermission(el) {
    var permName = ($(el).attr('data-perm-name') || '').toLowerCase();

    if (permName !== 'view' && $(el).is(':checked')) {
        var viewCheckbox = $(el)
            .closest('tr')
            .find('.perm-grid-checkbox')
            .filter(function () {
                return ($(this).attr('data-perm-name') || '').toLowerCase() === 'view';
            });

        viewCheckbox.prop('checked', true);
    }
}

function autoUncheckOtherPermissions(el) {
    var $checkbox = $(el);
    var permName = ($checkbox.attr('data-perm-name') || '').toLowerCase();
    var $row = $checkbox.closest('tr');

    if (permName === 'view' && !$checkbox.is(':checked')) {
        var hasOtherChecked = false;

        $row.find('.perm-grid-checkbox').each(function () {
            var currentPerm = ($(this).attr('data-perm-name') || '').toLowerCase();
            if (currentPerm !== 'view' && $(this).is(':checked')) {
                hasOtherChecked = true;
            }
        });

        if (hasOtherChecked) {
            showToast('View permission cannot be removed while Add, Edit, Delete, Print, Import or Export permissions are selected. All related permissions will be removed.', false);
            $checkbox.prop('checked', true);
            return;
        }

        $row.find('.perm-grid-checkbox').each(function () {
            var currentPerm = ($(this).attr('data-perm-name') || '').toLowerCase();
            if (currentPerm !== 'view') {
                $(this).prop('checked', false);
            }
        });
    }
}

async function deleteSelected() {
    let userIds = [];
    $('.user-checkbox:checked').each(function () {
        userIds.push($(this).val());
    });

    if (userIds.length === 0) {
        showToast('Please select at least one user', false);
        return;
    }

    try {
        const response = await fetch(`/api/user/delete-bulk?ids=${userIds.join(',')}`, { method: 'POST' });
        const result = await response.json();

        if (result.success) {
            showToast(result.message || 'Users deleted successfully', true);
            setTimeout(() => { location.reload(); }, 1000);
        } else {
            showToast(result.message || 'Error deleting users', false);
        }
    } catch (err) {
        console.error(err);
        showToast('Error deleting users', false);
    }
}

// ========================================
// Bootstrap: run edit mode automatically when Model.EditUser is present
// (txtUserId > 0). Add mode still gets a fresh wizard state
// (role/company/permission panels populated via refreshWizardSteps()).
// ========================================
document.addEventListener('DOMContentLoaded', function () {
    const userId = parseInt(document.getElementById('txtUserId')?.value) || 0;
    if (userId > 0) {
        openEditModal(userId);
    } else {
        refreshWizardSteps();
    }
});