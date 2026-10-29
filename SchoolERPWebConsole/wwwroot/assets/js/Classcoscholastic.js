// ========================================
// Build a nested tree from the flat list returned by GetTree
// ========================================
let treeData = [];
let rowCounter = 0;

function buildTree(flat) {
    const map = {};
    flat.forEach(item => map[item.coScholasticID] = { ...item, children: [] });

    const roots = [];
    flat.forEach(item => {
        if (item.parentID && map[item.parentID]) {
            map[item.parentID].children.push(map[item.coScholasticID]);
        } else {
            roots.push(map[item.coScholasticID]);
        }
    });

    const sortRec = (nodes) => {
        nodes.sort((a, b) => (a.srNo ?? 0) - (b.srNo ?? 0));
        nodes.forEach(n => sortRec(n.children));
    };
    sortRec(roots);
    return roots;
}

// ========================================
// Render
// ========================================
function renderNode(node, depth) {
    rowCounter++;
    const hasChildren = node.children.length > 0;
    const indent = depth * 20;

    const icon = node.isGroup
        ? `<i class="ti ti-folder text-warning me-1"></i>`
        : `<i class="ti ti-file-text text-secondary me-1"></i>`;

    const toggle = hasChildren
        ? `<i class="ti ti-minus toggle-icon" style="cursor:pointer;width:14px;display:inline-block;" data-id="${node.coScholasticID}"></i>`
        : `<span style="display:inline-block;width:14px;"></span>`;

    const row = document.createElement('tr');
    row.className = 'tree-row';
    row.dataset.id = node.coScholasticID;
    row.dataset.parent = node.parentID ?? '';

    row.innerHTML = `
        <td class="text-muted">${rowCounter}</td>
        <td>
            <span style="padding-left:${indent}px; display:inline-flex; align-items:center; gap:4px;">
                ${toggle}
                ${icon}
                <input type="checkbox" class="form-check-input tree-checkbox" data-id="${node.coScholasticID}" ${node.isChecked ? 'checked' : ''}>
                <span class="tree-label ${node.isChecked ? 'fw-bold text-primary' : ''}">${node.title}</span>
            </span>
        </td>
    `;
    return row;
}

function renderTree(nodes, container, depth = 0) {
    nodes.forEach(node => {
        const row = renderNode(node, depth);
        container.appendChild(row);
        if (node.children.length > 0) {
            renderTree(node.children, container, depth + 1);
        }
    });
}

function renderAll() {
    const tbody = document.getElementById('treeBody');
    tbody.innerHTML = '';
    rowCounter = 0;

    const roots = buildTree(treeData);
    renderTree(roots, tbody);
    attachHandlers();
}

// ========================================
// Checkbox + expand/collapse behaviour
// ========================================
function attachHandlers() {
    document.querySelectorAll('.tree-checkbox').forEach(cb => {
        cb.addEventListener('change', function () {
            const label = this.nextElementSibling;
            if (label) {
                label.classList.toggle('fw-bold', this.checked);
                label.classList.toggle('text-primary', this.checked);
            }
        });
    });

    document.querySelectorAll('.toggle-icon').forEach(icon => {
        icon.addEventListener('click', function () {
            const id = this.dataset.id;
            const collapsing = this.classList.contains('ti-minus');
            toggleChildren(id, !collapsing);
            this.classList.toggle('ti-minus', !collapsing);
            this.classList.toggle('ti-plus', collapsing);
        });
    });
}

function toggleChildren(parentId, hide) {
    document.querySelectorAll(`tr[data-parent="${parentId}"]`).forEach(row => {
        row.style.display = hide ? 'none' : '';
        // collapsing a node also hides all its descendants
        if (hide) {
            toggleChildren(row.dataset.id, true);
        }
    });
}

// ========================================
// Load / Save
// ========================================
// Pulls the flat array out of a response regardless of which shape the
// endpoint actually returns it in. Handles:
//   [...]                                (bare array)
//   { data: [...] }  /  { Data: [...] }
//   { data: { data: [...] } }            (paged-style wrapper, PascalCase too)
//   { items: [...] } / { Items: [...] }
function extractTreeArray(json) {
    if (Array.isArray(json)) return json;

    const candidates = [
        json?.data,
        json?.Data,
        json?.data?.data,
        json?.data?.Data,
        json?.Data?.data,
        json?.Data?.Data,
        json?.items,
        json?.Items
    ];

    for (const c of candidates) {
        if (Array.isArray(c)) return c;
    }
    return null;
}

async function loadTree() {
    const classId = document.getElementById('ddlClass').value;
    if (!classId) return;

    try {
        const res = await fetch(`/CoScholastic/GetTree?classId=${classId}`);
        const json = await res.json();

        const success = json.success ?? json.Success ?? true; // plain arrays have no success flag
        if (!success) {
            const msg = json.message || json.Message || 'Could not load tree.';
            if (window.toast) window.toast.error(msg); else console.error(msg);
            return;
        }

        const arr = extractTreeArray(json);
        if (!arr) {
            // Surface the real shape instead of failing deep inside buildTree
            // with a confusing "flat.forEach is not a function" stack trace.
            console.error('GetTree response has no array of tree items. Raw response:', json);
            if (window.toast) window.toast.error('Unexpected data format from server — check console.');
            return;
        }

        treeData = arr;
        renderAll();
    } catch (err) {
        console.error(err);
    }
}

async function saveTree() {
    if (!window.canEdit) return;

    const classId = parseInt(document.getElementById('ddlClass').value);
    const checkedIds = [];
    document.querySelectorAll('.tree-checkbox:checked').forEach(cb => checkedIds.push(parseInt(cb.dataset.id)));

    try {
        const r = await fetch('/CoScholastic/SaveClassCoScholastic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classID: classId, checkedIds: checkedIds })
        });
        const res = await r.json();

        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: res.message || 'Mapping updated successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save mapping.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error!', 'Could not save mapping.', 'error');
    }
}

// ========================================
// Init
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('ddlClass')?.addEventListener('change', loadTree);

    // Always fetch fresh from the server for whatever class is currently
    // selected — including the default/first option on initial page load.
    // Previously this only ran on the dropdown's 'change' event, so if a
    // class was pre-selected (or there was only one class in the list),
    // the tree/checkboxes never loaded until the user manually reselected.
    const ddl = document.getElementById('ddlClass');
    if (ddl && ddl.value) {
        loadTree();
    }
});