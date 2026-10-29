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
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';
    document.getElementById('hdnSearch').value = '';
    clearAppliedFilters();
    renderFilterBadges();
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

/* ════════════════════════════════════════════════════════════════════
   MasterMenu.js  (v3 — expand/collapse bug fixes)

   WHAT CHANGED IN v2:
   The grid now receives ONE ROW PER MAIN MENU per page (see the SP and
   cshtml). Each root <tr data-submenus="..."> carries its FULL descendant
   subtree as a JSON array. Clicking "+" no longer needs an AJAX call —
   it parses that JSON, builds a ParentID -> children map, and inserts
   the nested rows directly under the root. Clicking "+" on any child
   row (that itself has children) works the same way, walking the SAME
   JSON blob that was already loaded with the root.

   WHAT CHANGED IN v3 (fixes "expand child not work"):
   1. Map keys are normalized to STRINGS. Previously the ParentID->children
      Map was keyed with whatever type JSON.parse produced (often a number),
      but toggleNode() looked children up using the numeric `id` argument
      taken straight from the onclick handler. If the JSON's MenuID/ParentID
      ever came back as a string (common with SQL FOR JSON PATH / string
      columns), Map.get() would silently miss because Map comparisons are
      strict (===) — no error, just nothing happens on click. Now every
      key/lookup is coerced to String(...) so the type never matters.
   2. Field readers (MenuID, MenuName, ParentID, DisplayOrder, MenuIcon,
      IsActive, MenuURL, MenuKey, DisplayLabel, DisplayOrder) now fall back
      across common casing variants (PascalCase / camelCase / lowercase),
      the same way ParentID already did. A casing mismatch from the SP's
      JSON output no longer produces blank/undefined cells.
   3. getSubMenuMap() defends against a JSON payload that parses to
      something other than an array (defensive Array.isArray check).
   4. toggleNode() no longer silently no-ops without feedback — if a
      "+" is clicked but there turn out to be no matching children, it
      logs a console.warn so this is diagnosable instead of invisible.
   ════════════════════════════════════════════════════════════════════ */

/* ── Permissions ── */
const permCanAdd = window.canAdd;
const permCanEdit = window.canEdit;
const permCanDelete = window.canDelete;

let selectedId = null;
window.selectedPurposesId = 0;

/* ════════════════════════════════════════
   TREE — expand / collapse (client-side, JSON-driven)
   ════════════════════════════════════════ */

// Cache: rootMenuId(String) -> { byParentId: Map<String(parentId), childRow[]> }
const subMenuCache = new Map();

function getField(item, ...names) {
    for (const name of names) {
        if (item[name] !== undefined && item[name] !== null) {
            return item[name];
        }
    }

    return null;
}

function idKey(value) {
    return String(value ?? '').trim();
}
function valueOf(item, ...names) {
    for (const name of names) {
        if (item[name] !== undefined && item[name] !== null) {
            return item[name];
        }
    }

    return null;
}


function getRootJson(rootId) {
    const rootRow = findTreeRow(rootId);

    if (!rootRow) {
        console.error('Root row not found:', rootId);
        return '[]';
    }

    const encoded = rootRow.dataset.submenusBase64;

    if (!encoded) {
        console.error(
            `data-submenus-base64 is missing for root ${rootId}`
        );

        return '[]';
    }

    try {
        return decodeBase64Utf8(encoded);
    } catch (error) {
        console.error(
            `Could not decode submenu JSON for root ${rootId}`,
            error
        );

        return '[]';
    }
}

// Small helper so every field read can tolerate PascalCase / camelCase /
// lowercase keys coming back from the JSON, instead of hard-coding one case.
function decodeBase64Utf8(base64) {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));

    return new TextDecoder('utf-8').decode(bytes);
}
function pick(item, ...keys) {
    for (const key of keys) {
        if (item[key] !== undefined && item[key] !== null) {
            return item[key];
        }
    }

    return undefined;
}
function normalId(value) {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    return String(value).trim();
}
function getRootSubmenuJson(rootId, rootRow) {
    const jsonScript = document.getElementById(`submenu-json-${rootId}`);

    if (jsonScript) {
        return jsonScript.textContent.trim();
    }

    if (rootRow) {
        return rootRow.getAttribute('data-submenus') || '[]';
    }

    return '[]';
}
    function getSubMenuMap(rootId) {
        const rootKey = idKey(rootId);

        if (subMenuCache.has(rootKey)) {
            return subMenuCache.get(rootKey);
        }

        const rawJson = getRootJson(rootKey);
        let items = [];

        try {
            const parsed = JSON.parse(rawJson);

            if (Array.isArray(parsed)) {
                items = parsed;
            }
        } catch (error) {
            console.error(
                `Invalid submenu JSON for root ${rootKey}`,
                rawJson,
                error
            );
        }

        const byParentId = new Map();

        items.forEach(item => {
            const parentId = idKey(
                getField(
                    item,
                    'PARENTID',
                    'ParentID',
                    'ParentId',
                    'parentID',
                    'parentId'
                )
            );

            if (!byParentId.has(parentId)) {
                byParentId.set(parentId, []);
            }

            byParentId.get(parentId).push(item);
        });

        byParentId.forEach(list => {
            list.sort((a, b) => {
                const orderA = Number(
                    getField(a, 'DISPLAYORDER', 'DisplayOrder', 'displayOrder') || 0
                );

                const orderB = Number(
                    getField(b, 'DISPLAYORDER', 'DisplayOrder', 'displayOrder') || 0
                );

                return orderA - orderB;
            });
        });

        const result = { byParentId };

        subMenuCache.set(rootKey, result);

        console.log('Menu map:', rootKey, result);

        return result;
    }
    function findTreeRow(id) {
        const wantedId = idKey(id);

        return Array.from(
            document.querySelectorAll('#menusTable tbody tr.tree-row')
        ).find(row => idKey(row.dataset.id) === wantedId);
    }
    function buildChildRowHtml(item, rootId, level) {
        const menuId = idKey(
            getField(item, 'MENUID', 'MenuID', 'menuID', 'menuId')
        );

        const parentId = idKey(
            getField(
                item,
                'PARENTID',
                'ParentID',
                'ParentId',
                'parentID',
                'parentId'
            )
        );

        const menuName =
            getField(item, 'MENUNAME', 'MenuName', 'menuName') || '';

        const displayLabel =
            getField(item, 'DISPLAYLABEL', 'DisplayLabel', 'displayLabel') || '';

        const menuUrl =
            getField(item, 'MENUURL', 'MenuURL', 'menuURL', 'menuUrl') || '';

        const menuKey =
            getField(item, 'MENUKEY', 'MenuKey', 'menuKey') || '';

        const menuIcon =
            getField(item, 'MENUICON', 'MenuIcon', 'menuIcon') || 'ti ti-box';

        const displayOrder =
            getField(item, 'DISPLAYORDER', 'DisplayOrder', 'displayOrder') || '';

        const isActive = Boolean(
            getField(item, 'ISACTIVE', 'IsActive', 'isActive')
        );

        const map = getSubMenuMap(rootId);
        const children = map.byParentId.get(menuId) || [];

        const hasChildren = children.length > 0;
        const padding = Math.max(level - 1, 0) * 20;

        const toggle = hasChildren
            ? `
            <span class="tree-toggle"
                  onclick="toggleNode('${menuId}', event)">
                <i class="fas fa-plus"></i>
            </span>
          `
            : `
            <span class="tree-toggle-spacer"></span>
          `;

        return `
        <tr class="tree-row child-row"
            data-id="${escapeHtml(menuId)}"
            data-parent-id="${escapeHtml(parentId)}"
            data-root-id="${escapeHtml(rootId)}"
            data-level="${level}"
            data-expanded="0"
            onclick="selectRow(${menuId}, this)">

            <td></td>

            <td>
                <input type="checkbox"
                       name="selectedMenu"
                       value="${escapeHtml(menuId)}"
                       class="form-check-input student-checkbox"
                       onclick="event.stopPropagation(); selectItem(${menuId}, this)">
            </td>

            <td>${escapeHtml(menuId)}</td>

            <td>
                <div class="tree-cell d-flex align-items-center"
                     style="padding-left:${padding}px">

                    ${toggle}

                    <i class="${escapeHtml(menuIcon)} tree-icon ms-1"></i>

                    <span class="ms-1">
                        ${escapeHtml(menuName)}
                    </span>
                </div>
            </td>

            <td>${escapeHtml(displayLabel)}</td>
            <td>${escapeHtml(menuUrl)}</td>

            <td>
                ${menuKey
                ? `<span class="badge-key">
                               ${escapeHtml(menuKey)}
                           </span>`
                : '<span class="text-muted small">—</span>'
            }
            </td>

            <td class="display-order-cell">
                ${escapeHtml(displayOrder)}
            </td>

            <td>
                <small class="text-muted">Sub-menu</small>
            </td>

            <td>
                <span class="badge ${isActive ? 'bg-success' : 'bg-secondary'
            }">
                    ${isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
        </tr>
    `;
    }
    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
function findMenuRow(id) {
    const wantedId = normalId(id);

    return Array.from(
        document.querySelectorAll('#menusTable tbody tr.tree-row')
    ).find(row => normalId(row.dataset.id) === wantedId);
}

    function toggleNode(id, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const row = findTreeRow(id);

        if (!row) {
            console.error('Row not found for menu ID:', id);
            return;
        }

        const icon = row.querySelector('.tree-toggle i');
        const isExpanded = row.dataset.expanded === '1';

        if (isExpanded) {
            collapseNode(row, icon);
            return;
        }

        const rootId = row.classList.contains('root-row')
            ? row.dataset.id
            : row.dataset.rootId;

        const map = getSubMenuMap(rootId);
        const children = map.byParentId.get(idKey(id)) || [];

        console.log({
            clickedId: id,
            rootId: rootId,
            children: children,
            parentKeys: Array.from(map.byParentId.keys())
        });

        if (children.length === 0) {
            console.warn(
                `No children found for menu ID ${id}.`
            );

            return;
        }

        const level = Number(row.dataset.level || 1);

        const html = children
            .map(item => buildChildRowHtml(item, rootId, level + 1))
            .join('');

        row.insertAdjacentHTML('afterend', html);

        row.dataset.expanded = '1';

        if (icon) {
            icon.className =
                'fas fa-minus';
        }
    }
    function collapseNode(row, icon) {
        const currentLevel = Number(row.dataset.level || 1);
        let next = row.nextElementSibling;

        while (next) {
            const nextLevel = Number(next.dataset.level || 1);

            if (nextLevel <= currentLevel) {
                break;
            }

            const rowToRemove = next;
            next = next.nextElementSibling;
            rowToRemove.remove();
        }

        row.dataset.expanded = '0';

        if (icon) {
            icon.className =
                'fas fa-plus';
        }
    }
/* ════════════════════════════════════════
   ROW / ITEM SELECTION
   ════════════════════════════════════════ */
function selectRow(id, row) {
    //IV.clearNotice('menuPageNotice');
    selectedId = id;
    document.querySelectorAll('.tree-row').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');

    const checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
}

function selectItem(id, checkboxEl) {

    window.selectedPurposesId = id;

    const checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
}

/* ════════════════════════════════════════
   ADD / EDIT / DELETE
   ════════════════════════════════════════ */
function clearModal() {
    IV.clearMap(menuFieldMap);
    IV.clearNotice('menuModalNotice');
}

async function editSelected() {
    if (!permCanEdit) {
        IV.setNotice('menuPageNotice', 'You do not have permission to edit.');
        return;
    }
    if (!window.selectedPurposesId) return;
    try {
        location.href = `/MasterMenu/AddMenus/${window.selectedPurposesId}`;
    } catch (err) {
        console.error(err);
    }
}

async function deleteSelected() {
    if (!permCanDelete) { IV.setNotice('menuPageNotice', 'You do not have permission to delete.'); return; }

    const selectedIds = [];
    $('.student-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val(), 10));
    });
    if (selectedIds.length === 0) {
        alert('Please select at least one menu.');
        return;
    }

    //IV.clearNotice('menuPageNotice');

    Swal.fire({
        title: 'Are you sure?',
        text: 'You are about to delete this menu record. This action cannot be undone!',
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
        if (!result.isConfirmed) return;
        $.ajax({
            url: '/MasterMenu/Delete',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(selectedIds),
            success: function (res) {
                if (res.success) {
                    Swal.fire('Deleted!', 'Menu record(s) have been deleted.', 'success')
                        .then(() => location.reload());
                } else {
                    Swal.fire('Error!', res.message || 'Failed to delete menu.', 'error');
                }
            },
            error: function () {
                Swal.fire('Error!', 'An unexpected error occurred.', 'error');
            }
        });
    });
}

/* ════════════════════════════════════════
   STATUS TOGGLE
   ════════════════════════════════════════ */
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
                    url: '/MasterMenu/ToggleStatus',
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

/* ════════════════════════════════════════
   VALIDATION HELPERS
   ════════════════════════════════════════ */
const menuFieldMap = {
    txtMenuName: 'errTxtMenuName',
    txtMenuIcon: 'errTxtMenuIcon',
    txtMenuURL: 'errTxtMenuURL',
    txtDisplayOrder: 'errTxtDisplayOrder'
};

function setFieldError(inputId, errId, message) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(errId);
    if (input) input.classList.add('is-invalid');
    if (err) {
        err.textContent = message;
        err.style.display = 'block';
    }
}

function clearFieldError(inputId, errId) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(errId);
    if (input) input.classList.remove('is-invalid');
    if (err) {
        err.textContent = '';
        err.style.display = 'none';
    }
}

function clearAllFieldErrors() {
    Object.entries(menuFieldMap).forEach(([inputId, errId]) => clearFieldError(inputId, errId));
}

function bindAutoClearOnInput() {
    Object.entries(menuFieldMap).forEach(([inputId, errId]) => {
        const el = document.getElementById(inputId);
        if (!el) return;
        el.addEventListener('input', () => clearFieldError(inputId, errId));
    });
    $('#ddlParentId').on('change', () => clearFieldError('ddlParentId', 'errDdlParentId'));
}

function setPageNotice(message) {
    const notice = document.getElementById('menuPageNotice');
    if (!notice) return;
    notice.textContent = message;
    notice.style.display = message ? 'block' : 'none';
}

function validateMenuForm() {
    clearAllFieldErrors();
    let ok = true;

    const name = document.getElementById('txtMenuName').value.trim();
    const icon = document.getElementById('txtMenuIcon').value.trim();
    const url = document.getElementById('txtMenuURL').value.trim();
    const order = parseInt(document.getElementById('txtDisplayOrder').value, 10);

    if (!name) { setFieldError('txtMenuName', 'errTxtMenuName', 'Menu name is required.'); ok = false; }
    if (!icon) { setFieldError('txtMenuIcon', 'errTxtMenuIcon', 'Menu icon is required.'); ok = false; }
    if (!url) { setFieldError('txtMenuURL', 'errTxtMenuURL', 'Target URL is required.'); ok = false; }
    if (isNaN(order) || order < 0) { setFieldError('txtDisplayOrder', 'errTxtDisplayOrder', 'Enter a valid display order (≥ 0).'); ok = false; }

    return ok;
}

/* ════════════════════════════════════════
   SAVE
   ════════════════════════════════════════ */
async function saveMenu() {
    const menuId = parseInt(document.getElementById('txtMenuId').value, 10) || 0;

    if (menuId === 0 && !permCanAdd) { setPageNotice('You do not have permission to add.'); return; }
    if (menuId > 0 && !permCanEdit) { setPageNotice('You do not have permission to edit.'); return; }
    if (!validateMenuForm()) return;
    setPageNotice('');

    const data = {
        menuID: menuId,
        menuName: document.getElementById('txtMenuName').value.trim(),
        displayLabel: document.getElementById('txtDisplayLabel').value.trim(),
        menuKey: document.getElementById('txtMenuKey').value.trim(),
        menuIcon: document.getElementById('txtMenuIcon').value.trim(),
        menuURL: document.getElementById('txtMenuURL').value.trim(),
        parentID: document.getElementById('ddlParentId').value
            ? parseInt(document.getElementById('ddlParentId').value, 10) : null,
        displayOrder: parseInt(document.getElementById('txtDisplayOrder').value, 10),
        isActive: document.getElementById('isActive').checked
    };

    const btn = document.querySelector('button[onclick="saveMenu()"]');
    const originalHtml = btn ? btn.innerHTML : null;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving…';
    }
    const isEdit = menuId > 0;
    try {
        const res = await (await fetch('/MasterMenu/Save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })).json();

        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit
                    ? 'Menu has been updated successfully.'
                    : 'Menu has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                window.location.href = '/MasterMenu/Index';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save language.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
    } catch {
        setPageNotice('Could not save menu. Please try again.');
        if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
    }
}

/* ════════════════════════════════════════
   DRAG & DROP  (root-level reordering only —
   every top-level row on the page is a main menu,
   so siblings are always the rows with data-parent-id="")
   ════════════════════════════════════════ */
let sortableInstance = null;

function initSortable() {
    const tbody = document.querySelector('#menusTable tbody');
    if (!tbody || !permCanEdit) return;

    if (typeof Sortable === 'undefined') {
        console.error('SortableJS is not loaded.');
        return;
    }

    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }

    sortableInstance = Sortable.create(tbody, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'sortable-ghost',
        // Only allow dragging rows that actually HAVE a drag handle
        // (root-level rows in your Add/Edit page only render the handle when p.CanEdit)
        filter: function (evt, item) {
            return !item.querySelector('.drag-handle');
        },
        onEnd: function () {
            // Recompute order ONLY among rows at depth/level 1 (top-level menus),
            // regardless of what class name the partial gives them.
            const allRows = Array.from(tbody.querySelectorAll('tr[data-level="1"], tr[data-id]'))
                .filter(row => (row.dataset.level || '1') === '1'); // top-level only

            if (allRows.length === 0) {
                console.warn('No top-level rows found — check data-level attribute on <tr> in _MenusTablePartial.');
                return;
            }

            const orders = allRows.map((row, index) => {
                const newOrder = index + 1;
                const orderCell = row.querySelector('.display-order-cell');
                if (orderCell) orderCell.textContent = newOrder;
                return {
                    menuID: parseInt(row.getAttribute('data-id'), 10),
                    displayOrder: newOrder
                };
            });

            saveOrder(orders);
        }
    });
}

async function saveOrder(orders) {
    try {
        const res = await (await fetch('/MasterMenu/UpdateOrder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orders)
        })).json();

        IV.setNotice('menuPageNotice', res.message || (res.success ? 'Order is updated.' : 'Failed to update order.'));
    } catch {
        IV.setNotice('menuPageNotice', 'Error saving menu order.');
    }
}

/* ════════════════════════════════════════
   EXPORT (DataTables buttons) — export only currently-visible rows,
   so a collapsed root exports without its hidden children, and an
   expanded one includes them.
   ════════════════════════════════════════ */
let exportTable;
$(document).ready(function () {
    if ($.fn.DataTable.isDataTable('#menusTable')) {
        $('#menusTable').DataTable().destroy();
    }
    exportTable = $('#menusTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', exportOptions: { columns: [2, 3, 4, 5, 6, 7], rows: ':visible' } },
            { extend: 'csv', exportOptions: { columns: [2, 3, 4, 5, 6, 7], rows: ':visible' } },
            { extend: 'excel', exportOptions: { columns: [ 2, 3, 4, 5, 6, 7], rows: ':visible' } },
            { extend: 'pdf', exportOptions: { columns: [ 2, 3, 4, 5, 6, 7], rows: ':visible' } },
            { extend: 'print', exportOptions: { columns: [2, 3, 4, 5, 6, 7], rows: ':visible' } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });
    bindAutoClearOnInput();
    initSortable();
});

function triggerExport(type) {
    if (!exportTable) return;
    if (type === 'copy') exportTable.button('.buttons-copy').trigger();
    else if (type === 'csv') exportTable.button('.buttons-csv').trigger();
    else if (type === 'excel') exportTable.button('.buttons-excel').trigger();
    else if (type === 'pdf') exportTable.button('.buttons-pdf').trigger();
    else if (type === 'print') exportTable.button('.buttons-print').trigger();
}


/* ════════════════════════════════════════
   SEARCH (server round-trip — search now also matches child
   menus and returns the owning root, per the updated SP)
   ════════════════════════════════════════ */

function submitForm() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    if (sessionEl) document.getElementById('hdnSessionID').value = sessionEl.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;

    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();
    loadMenuPartial(params);
}


// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadMenuPartial(queryString) {
    const container = document.getElementById('menusTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/MasterMenu/GetMenusPartial?${queryString}`, {
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

            // ── Rebind drag-and-drop to the freshly injected tbody ──
            initSortable();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// ✅ Pagination click interception, scoped to the hostel type container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#menusTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadMenuPartial(query);
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