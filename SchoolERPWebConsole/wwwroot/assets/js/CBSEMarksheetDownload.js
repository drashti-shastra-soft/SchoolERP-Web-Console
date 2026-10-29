// ======================================================================
// CbseMarksheetDownload.js
// Screen : CBSE Marksheet Download  ->  Exam MarkSheet Download Permission
// View   : CbseMarksheetDownload.cshtml
//
// Depends on globals from _Layout: jQuery, select2, Swal, bootstrap,
//   showToast(), window.getCompanyId(), window.getSessionId(),
//   window.__companyReadyPromise, window.fetchSessions(), window.initSelect2()
// ======================================================================
(function () {
    'use strict';

    // ---- 1. Endpoint map: change the URLs here if your controller differs ----
    const API = {
        classes: '/StudentInformation/GetClasses',      // GET  -> [{ classId, className }]
        examGroups: '/RemarksFeeding/GetExamList',   // GET  -> [{ examGroupId, examGroupName }]
        list: '/ExamMarksheetDownloadPermission/GetAll',          // GET  ?companyId&sessionId&classId&examGroupId&pageNo&pageSize
        save: '/ExamMarksheetDownloadPermission/Save',            // POST { permissionId, companyId, sessionId, classId, examGroupId, dueMonthNo, maxBalance }
        setAccess: '/ExamMarksheetDownloadPermission/SetAccess',       // POST { ids:"1,2", target:"M"|"S", allow:true|false, companyId }
        remove: '/ExamMarksheetDownloadPermission/Delete',          // POST { ids:"1,2", companyId }
        copyFrom: '/ExamMarksheetDownloadPermission/CopyFrom'         // POST { companyId, fromSessionId, toSessionId }
    };
    // every endpoint answers { success, message, data }

    const PAGE_SIZE = 20;
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    // Due-month dropdown starts at the session start month (April by default)
    const SESSION_START_MONTH = parseInt(window.sessionStartMonthNo || 4, 10);

    const permCanAdd = !!window.canAdd;
    const permCanEdit = !!window.canEdit;
    const permCanDelete = !!window.canDelete;

    const state = { page: 1, total: 0, rows: [], loadedSession: null, suspendFilter: false };

    // ---------------------------------------------------------------
    // small helpers
    // ---------------------------------------------------------------
    const $id = id => document.getElementById(id);
    const hasJq = !!window.jQuery;

    function esc(v) {
        if (v === null || v === undefined) return '';
        return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function pick(o, ...keys) {
        for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
        return '';
    }
    function notify(msg, type) {
        if (typeof window.showToast === 'function') window.showToast(msg, type || 'info');
        else alert(msg);
    }
    function fmtDate(d) {
        if (!d) return '';
        const dt = new Date(d);
        if (isNaN(dt)) return '';
        return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    function fmtMoney(n) {
        const v = Number(n);
        if (isNaN(v)) return '';
        return v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function setSelect(id, value) {
        const el = $id(id);
        if (!el) return;
        if (hasJq) window.jQuery(el).val(value === null || value === undefined ? '' : String(value)).trigger('change');
        else el.value = value ?? '';
    }
    function initSelect(selector, opts) {
        if (hasJq && typeof window.initSelect2 === 'function') window.initSelect2(selector, opts);
    }

    async function ctx() {
        const companyId = await (window.__companyReadyPromise || Promise.resolve(window.getCompanyId()));
        return { companyId: companyId || window.getCompanyId(), sessionId: window.getSessionId() };
    }

    async function getJson(url) {
        const res = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        if (!res.ok) throw new Error('Request failed (' + res.status + ')');
        return res.json();
    }
    async function postJson(url, body) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Request failed (' + res.status + ')');
        return res.json();
    }

    // ---------------------------------------------------------------
    // inline validation
    // ---------------------------------------------------------------
    const FIELD_MAP = {
        ddlClass: 'errClass',
        ddlExamGroup: 'errExamGroup',
        ddlDueMonth: 'errDueMonth',
        txtMaxBalance: 'errMaxBalance'
    };
    function setFieldError(id, msg) {
        $id(id)?.classList.add('is-invalid');
        const err = $id(FIELD_MAP[id]);
        if (err) { err.textContent = msg; err.style.display = 'block'; }
    }
    function clearFieldError(id) {
        $id(id)?.classList.remove('is-invalid');
        const err = $id(FIELD_MAP[id]);
        if (err) { err.textContent = ''; err.style.display = 'none'; }
    }
    function clearAllErrors() { Object.keys(FIELD_MAP).forEach(clearFieldError); }

    // ---------------------------------------------------------------
    // dropdowns
    // ---------------------------------------------------------------
    function fillSelect(id, items, valueKeys, textKeys, firstText) {
        const el = $id(id);
        if (!el) return;
        el.innerHTML = '';
        el.add(new Option(firstText, ''));
        (items || []).forEach(it => el.add(new Option(pick(it, ...textKeys), pick(it, ...valueKeys))));
    }

    function buildDueMonths() {
        const el = $id('ddlDueMonth');
        el.innerHTML = '';
        el.add(new Option('Select', ''));
        for (let i = 0; i < 12; i++) {
            const monthNo = ((SESSION_START_MONTH - 1 + i) % 12) + 1;
            el.add(new Option(MONTH_NAMES[monthNo - 1], String(monthNo)));
        }
    }

    async function loadDropdowns() {
        buildDueMonths();

        try {
            // Only call an endpoint if it is actually defined
            const classUrl = (typeof API !== 'undefined' && API) ? API.classes : null;
            const groupUrl = (typeof API !== 'undefined' && API) ? API.examGroups : null;

            const [cls, grp] = await Promise.all([
                classUrl ? getJson(classUrl) : Promise.resolve(null),
                groupUrl ? getJson(groupUrl) : Promise.resolve(null)
            ]);

            // Always end up with an array, never null/undefined
            const classes = (cls && cls.success && Array.isArray(cls.data)) ? cls.data : [];
            const groups = (grp && grp.success && Array.isArray(grp.data)) ? grp.data : [];

            const classKeys = ['classId', 'classID', 'ClassId'];
            const classText = ['className', 'ClassName'];
            const groupKeys = ['examGroupId', 'examGroupID', 'ExamGroupId'];
            const groupText = ['examGroupName', 'ExamGroupName'];

            fillSelect('ddlClass', classes, classKeys, classText, 'Select');
            fillSelect('ddlFilterClass', classes, classKeys, classText, 'Class');
            fillSelect('ddlExamGroup', groups, groupKeys, groupText, 'Select');
            fillSelect('ddlFilterExamGroup', groups, groupKeys, groupText, 'Exam Group');

        } catch (e) {
            console.error(e);
            notify('Could not load the Class / Exam Group lists.', 'error');
        }

        initSelect('#ddlClass', { allowClear: false });
        initSelect('#ddlExamGroup', { allowClear: false });
        initSelect('#ddlDueMonth', { allowClear: false, minimumResultsForSearch: Infinity });
        initSelect('#ddlFilterClass', { allowClear: true, placeholder: 'Class' });
        initSelect('#ddlFilterExamGroup', { allowClear: true, placeholder: 'Exam Group' });
    }

    // ---------------------------------------------------------------
    // grid
    // ---------------------------------------------------------------
    function statusBadge(on) {
        return on
            ? '<span class="badge bg-success-subtle text-success">Allowed</span>'
            : '<span class="badge bg-danger-subtle text-danger">Blocked</span>';
    }

    function renderRows() {
        const body = $id('tblPermissionBody');
        if (!state.rows.length) {
            body.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-4">' +
                'No permissions set for this session yet. Choose a class, exam group and due month, then click Save.</td></tr>';
            return;
        }
        const editingId = parseInt($id('txtPermissionId').value || '0', 10);
        const start = (state.page - 1) * PAGE_SIZE;

        body.innerHTML = state.rows.map((r, i) => {
            const id = pick(r, 'permissionId', 'PermissionId');
            const canTick = permCanEdit;
            return `<tr data-id="${esc(id)}" class="${id === editingId ? 'row-editing' : ''}">
                <td class="text-center">${start + i + 1}</td>
                <td class="text-center">
                    <label class="perm-check mb-0">
                        <input type="checkbox" class="form-check-input chk-ms" value="${esc(id)}" ${canTick ? '' : 'disabled'}>
                        ${statusBadge(pick(r, 'allowMarksheet', 'AllowMarksheet'))}
                    </label>
                </td>
                <td class="text-center">
                    <label class="perm-check mb-0">
                        <input type="checkbox" class="form-check-input chk-ss" value="${esc(id)}" ${canTick ? '' : 'disabled'}>
                        ${statusBadge(pick(r, 'allowStripsheet', 'AllowStripsheet'))}
                    </label>
                </td>
                <td>${esc(pick(r, 'className', 'ClassName'))}</td>
                <td>${esc(pick(r, 'dueMonthUpTo', 'DueMonthUpTo'))}</td>
                <td class="text-end">${esc(fmtMoney(pick(r, 'maxBalance', 'MaxBalance')))}</td>
                <td>${esc(pick(r, 'examGroupName', 'ExamGroupName'))}</td>
                <td>${esc(fmtDate(pick(r, 'createdDate', 'CreatedDate')))}</td>
                <td class="text-center">
                    ${permCanEdit
                    ? `<button type="button" class="btn btn-sm btn-icon btn-outline-primary btn-row-edit" data-id="${esc(id)}" title="Edit"><i class="ti ti-edit"></i></button>`
                    : ''}
                </td>
                <td class="text-center">
                    ${permCanDelete
                    ? `<button type="button" class="btn btn-sm btn-icon btn-outline-danger btn-row-delete" data-id="${esc(id)}" title="Delete"><i class="ti ti-trash"></i></button>`
                    : ''}
                </td>
            </tr>`;
        }).join('');

        $id('chkAllMarksheet').checked = false;
        $id('chkAllStripsheet').checked = false;
    }

    //function renderPager() {
    //    const totalPages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
    //    const from = state.total === 0 ? 0 : (state.page - 1) * PAGE_SIZE + 1;
    //    const to = Math.min(state.page * PAGE_SIZE, state.total);
    //    $id('pagerInfo').textContent = `Displaying ${from}-${to} of ${state.total} records`;

    //    const item = (label, page, disabled, active) =>
    //        `<li class="page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}">
    //            <a class="page-link" data-page="${page}">${label}</a></li>`;

    //    let html = item('First', 1, state.page === 1) + item('Previous', state.page - 1, state.page === 1);
    //    const first = Math.max(1, state.page - 2);
    //    const last = Math.min(totalPages, first + 4);
    //    for (let p = first; p <= last; p++) html += item(p, p, false, p === state.page);
    //    html += item('Next', state.page + 1, state.page >= totalPages) + item('Last', totalPages, state.page >= totalPages);
    //    $id('pager').innerHTML = html;
    //}


    function renderPager() {
        const totalPages = Math.ceil(state.total / PAGE_SIZE);
        const from = state.total === 0 ? 0 : (state.page - 1) * PAGE_SIZE + 1;
        const to = Math.min(state.page * PAGE_SIZE, state.total);
        const pagerInfo = $id('pagerInfo');
        const pager = $id('pager');
        const pagerNav = pager.closest('nav');
        if (state.total === 0) {
            pagerInfo.style.display = 'none';
            if (pagerNav) { pagerNav.style.display = 'none'; }
            pager.innerHTML = '';
            return;
        }
        pagerInfo.style.display = '';
        pagerInfo.textContent = `Showing ${from}–${to} of ${state.total} records`;
        if (pagerNav) {
            pagerNav.style.display = totalPages > 1 ? '' : 'none';
        }
        if (totalPages <= 1) { pager.innerHTML = ''; return; }
        const item = (icon, page, disabled, active) => `
        <li class="page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}">
            <a class="page-link"href="javascript:void(0)" data-page="${page}" aria-label="${icon}"><i class="ti ti-${icon}"></i>
            </a>
        </li>`;
        let start = Math.max(1, state.page - 2);
        let end = Math.min(totalPages, start + 4);
        start = Math.max(1, end - 4);
        let html = '';
        html += item('chevrons-left', 1, state.page <= 1, false);
        html += item('chevron-left', state.page - 1, state.page <= 1, false);
        for (let pg = start; pg <= end; pg++) {
            html += `
            <li class="page-item ${pg === state.page ? 'active' : ''}">
                <a class="page-link" href="javascript:void(0)" data-page="${pg}"aria-current="${pg === state.page ? 'page' : 'false'}">${pg}
                </a>
            </li>`;
        }
        html += item('chevron-right', state.page + 1, state.page >= totalPages, false);
        html += item('chevrons-right', totalPages, state.page >= totalPages, false);
        pager.innerHTML = html;
    }


    //function renderPager() {
    //    const totalPages = Math.ceil(state.total / PAGE_SIZE);
    //    const from = state.total === 0 ? 0 : (state.page - 1) * PAGE_SIZE + 1;
    //    const to = Math.min(state.page * PAGE_SIZE, state.total);
    //    $id('pagerInfo').textContent = `Showing ${from}–${to} of ${state.total} records`;
    //    const pagerNav = $id('pager').closest('nav');
    //    if (pagerNav) { pagerNav.style.display = totalPages > 1 ? '' : 'none'; }
    //    if (totalPages <= 1) { $id('pager').innerHTML = ''; return; }
    //    const item = (icon, page, disabled, active) => `
    //    <li class="page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}">
    //        <a class="page-link" href="javascript:void(0)" data-page="${page}" aria-label="${icon}">
    //            <i class="ti ti-${icon}"></i>
    //        </a>
    //    </li>`;
    //    let start = Math.max(1, state.page - 2);
    //    let end = Math.min(totalPages, start + 4);
    //    start = Math.max(1, end - 4);
    //    let html = '';
    //    html += item('chevrons-left', 1, state.page <= 1, false );
    //    html += item('chevron-left', state.page - 1, state.page <= 1, false );
    //    for (let pg = start; pg <= end; pg++) {
    //        html += `
    //        <li class="page-item ${pg === state.page ? 'active' : ''}">
    //            <a class="page-link" href="javascript:void(0)" data-page="${pg}" aria-current="${pg === state.page ? 'page' : 'false'}"> ${pg} </a>
    //        </li>`;
    //    }
    //    html += item('chevron-right',state.page + 1,state.page >= totalPages,false);
    //    html += item('chevrons-right', totalPages, state.page >= totalPages, false);
    //    $id('pager').innerHTML = html;
    //}


    async function loadList(page) {
        state.page = page || 1;
        const body = $id('tblPermissionBody');
        body.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-4">Loading...</td></tr>';

        try {
            const c = await ctx();
            if (!c.companyId || !c.sessionId) {
                body.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-4">Select a company and session to see permissions.</td></tr>';
                return;
            }
            state.loadedSession = c.sessionId;

            const q = new URLSearchParams({
                companyId: c.companyId,
                sessionId: c.sessionId,
                classId: $id('ddlFilterClass').value || 0,
                examGroupId: $id('ddlFilterExamGroup').value || 0,
                pageNo: state.page,
                pageSize: PAGE_SIZE
            });
            const res = await getJson(`${API.list}?${q.toString()}`);
            if (!res.success) throw new Error(res.message || 'Could not load permissions.');

            state.rows = Array.isArray(res.data) ? res.data : [];
            state.total = state.rows.length ? Number(pick(state.rows[0], 'totalRecords', 'TotalRecords')) || state.rows.length : 0;
        } catch (e) {
            console.error(e);
            state.rows = [];
            state.total = 0;
            notify(e.message || 'Could not load permissions.', 'error');
        }
        renderRows();
        renderPager();
    }

    // ---------------------------------------------------------------
    // form: add / edit / save / reset
    // ---------------------------------------------------------------
    function enterAddMode() {
        $id('txtPermissionId').value = '0';
        $id('lblFormMode').textContent = 'Add permission';
        $id('badgeEditing').classList.add('d-none');
        $id('tblPermissionBody').querySelectorAll('tr.row-editing').forEach(tr => tr.classList.remove('row-editing'));
    }

    function clearForm() {
        clearAllErrors();
        enterAddMode();
        setSelect('ddlClass', '');
        setSelect('ddlExamGroup', '');
        setSelect('ddlDueMonth', '');
        $id('txtMaxBalance').value = '0';
    }

    function startEdit(id) {
        if (!permCanEdit) return;
        const r = state.rows.find(x => String(pick(x, 'permissionId', 'PermissionId')) === String(id));
        if (!r) return;

        clearAllErrors();
        $id('txtPermissionId').value = String(id);
        setSelect('ddlClass', pick(r, 'classId', 'ClassId'));
        setSelect('ddlExamGroup', pick(r, 'examGroupId', 'ExamGroupId'));
        setSelect('ddlDueMonth', pick(r, 'dueMonthNo', 'DueMonthNo'));
        $id('txtMaxBalance').value = pick(r, 'maxBalance', 'MaxBalance');

        $id('lblFormMode').textContent = 'Edit permission';
        $id('badgeEditing').classList.remove('d-none');
        $id('tblPermissionBody').querySelectorAll('tr').forEach(tr =>
            tr.classList.toggle('row-editing', tr.dataset.id === String(id)));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function validateForm() {
        clearAllErrors();
        let ok = true;
        if (!$id('ddlClass').value) { setFieldError('ddlClass', 'Select a class.'); ok = false; }
        if (!$id('ddlExamGroup').value) { setFieldError('ddlExamGroup', 'Select an exam group.'); ok = false; }
        if (!$id('ddlDueMonth').value) { setFieldError('ddlDueMonth', 'Select the due month.'); ok = false; }

        const raw = $id('txtMaxBalance').value.trim();
        const bal = parseFloat(raw);
        if (raw === '' || isNaN(bal)) { setFieldError('txtMaxBalance', 'Enter the max balance (0 or more).'); ok = false; }
        else if (bal < 0) { setFieldError('txtMaxBalance', 'Max balance cannot be negative.'); ok = false; }
        return ok;
    }

    async function savePermission() {
        const id = parseInt($id('txtPermissionId').value || '0', 10);
        if (id === 0 && !permCanAdd) { notify('You do not have permission to add.', 'warning'); return; }
        if (id > 0 && !permCanEdit) { notify('You do not have permission to edit.', 'warning'); return; }
        if (!validateForm()) return;

        const btn = $id('btnSave');
        const original = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...'; }

        try {
            const c = await ctx();
            if (!c.sessionId) throw new Error('No active session selected.');

            const res = await postJson(API.save, {
                permissionId: id,
                companyId: c.companyId,
                sessionId: c.sessionId,
                classId: parseInt($id('ddlClass').value, 10),
                examGroupId: parseInt($id('ddlExamGroup').value, 10),
                dueMonthNo: parseInt($id('ddlDueMonth').value, 10),
                maxBalance: parseFloat($id('txtMaxBalance').value)
            });

            if (!res.success) { notify(res.message || 'Could not save.', 'error'); return; }
            notify(res.message || 'Saved successfully.', 'success');
            clearForm();
            await loadList(id > 0 ? state.page : 1);
        } catch (e) {
            console.error(e);
            notify(e.message || 'An unexpected error occurred.', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = original; }
        }
    }

    function resetAll() {
        clearForm();
        state.suspendFilter = true;
        setSelect('ddlFilterClass', '');
        setSelect('ddlFilterExamGroup', '');
        state.suspendFilter = false;
        loadList(1);
    }

    // ---------------------------------------------------------------
    // row actions: delete + bulk allow / disallow
    // ---------------------------------------------------------------
    async function confirmBox(title, text, confirmText, danger) {
        if (!window.Swal) return confirm(text);
        const r = await Swal.fire({
            title, text, icon: danger ? 'warning' : 'question',
            showCancelButton: true,
            confirmButtonText: confirmText,
            customClass: {
                confirmButton: danger ? 'btn btn-danger me-2' : 'btn btn-success me-2',
                cancelButton: 'btn btn-secondary'
            },
            buttonsStyling: false
        });
        return r.isConfirmed;
    }

    async function deleteRow(id) {
        if (!permCanDelete) { notify('You do not have permission to delete.', 'warning'); return; }
        const ok = await confirmBox('Delete this permission?',
            'Students in this class will no longer be able to download this exam group\'s marksheet. This cannot be undone.',
            'Yes, delete', true);
        if (!ok) return;

        try {
            const c = await ctx();
            const res = await postJson(API.remove, { ids: [id], companyId: c.companyId });
            if (!res.success) { notify(res.message || 'Could not delete.', 'error'); return; }
            notify(res.message || 'Deleted successfully.', 'success');
            if (parseInt($id('txtPermissionId').value || '0', 10) === id) clearForm();
            // if the last row of a page was removed, step back one page
            const page = (state.rows.length === 1 && state.page > 1) ? state.page - 1 : state.page;
            await loadList(page);
        } catch (e) {
            console.error(e);
            notify(e.message || 'An unexpected error occurred.', 'error');
        }
    }

    async function bulkAccess(target, allow) {
        if (!permCanEdit) { notify('You do not have permission to change access.', 'warning'); return; }

        const label = target === 'M' ? 'MarkSheet' : 'StripSheet';
        const selector = target === 'M' ? '.chk-ms:checked' : '.chk-ss:checked';
        const ids = Array.from($id('tblPermissionBody').querySelectorAll(selector)).map(x => x.value);

        if (!ids.length) {
            notify(`Tick at least one row in the ${label} column first.`, 'warning');
            return;
        }

        const ok = await confirmBox(
            `${allow ? 'Allow' : 'Disallow'} ${label}?`,
            `${allow ? 'Allow' : 'Stop'} ${label} downloads for ${ids.length} selected row(s)?`,
            allow ? 'Yes, allow' : 'Yes, disallow',
            !allow);
        if (!ok) return;

        try {
            const c = await ctx();
            const res = await postJson(API.setAccess, {
                ids: ids.join(','), target: target, allow: allow, companyId: c.companyId
            });
            if (!res.success) { notify(res.message || 'Could not update access.', 'error'); return; }
            notify(res.message || 'Access updated.', 'success');
            await loadList(state.page);
        } catch (e) {
            console.error(e);
            notify(e.message || 'An unexpected error occurred.', 'error');
        }
    }

    // ---------------------------------------------------------------
    // copy from another session
    // ---------------------------------------------------------------
    let copyModal = null;

    async function openCopyFrom() {
        if (!permCanAdd && !permCanEdit) return;
        const ddl = $id('ddlCopyFromSession');
        $id('errCopyFrom').style.display = 'none';
        ddl.classList.remove('is-invalid');
        ddl.innerHTML = '<option value="">Loading...</option>';

        if (!copyModal) copyModal = new bootstrap.Modal($id('copyFromModal'));
        copyModal.show();

        try {
            const c = await ctx();
            const sessions = await window.fetchSessions(c.companyId);
            ddl.innerHTML = '';
            ddl.add(new Option('Select', ''));
            sessions
                .filter(s => String(s.sessionId) !== String(c.sessionId))
                .forEach(s => ddl.add(new Option(s.sessionTitle || ('Session #' + s.sessionId), s.sessionId)));
        } catch (e) {
            console.error(e);
            ddl.innerHTML = '<option value="">Could not load sessions</option>';
        }
    }

    async function confirmCopy() {
        const ddl = $id('ddlCopyFromSession');
        const err = $id('errCopyFrom');
        if (!ddl.value) {
            ddl.classList.add('is-invalid');
            err.textContent = 'Select the session to copy from.';
            err.style.display = 'block';
            return;
        }

        const btn = $id('btnConfirmCopy');
        btn.disabled = true;
        try {
            const c = await ctx();
            const res = await postJson(API.copyFrom, {
                companyId: c.companyId,
                fromSessionId: parseInt(ddl.value, 10),
                toSessionId: c.sessionId
            });
            if (!res.success) { notify(res.message || 'Could not copy.', 'error'); return; }
            notify(res.message || 'Copied successfully.', 'success');
            copyModal.hide();
            await loadList(1);
        } catch (e) {
            console.error(e);
            notify(e.message || 'An unexpected error occurred.', 'error');
        } finally {
            btn.disabled = false;
        }
    }

    // ---------------------------------------------------------------
    // session label (text comes from the session dropdown in _Layout)
    // ---------------------------------------------------------------
    function refreshSessionLabel() {
        const ddl = $id('ddlSessionYear');
        const opt = ddl && ddl.selectedIndex >= 0 ? ddl.options[ddl.selectedIndex] : null;
        $id('txtSession').value = opt && opt.value ? opt.text : '';
    }

    // ---------------------------------------------------------------
    // wiring
    // ---------------------------------------------------------------
    function bindEvents() {
        $id('btnAddNew')?.addEventListener('click', () => {
            clearForm();
            if (hasJq) window.jQuery('#ddlClass').select2('open');
        });
        $id('btnSave')?.addEventListener('click', savePermission);
        $id('btnReset')?.addEventListener('click', resetAll);
        $id('btnCopyFrom')?.addEventListener('click', openCopyFrom);
        $id('btnConfirmCopy')?.addEventListener('click', confirmCopy);

        $id('btnAllowMarksheet')?.addEventListener('click', () => bulkAccess('M', true));
        $id('btnDisallowMarksheet')?.addEventListener('click', () => bulkAccess('M', false));
        $id('btnAllowStripsheet')?.addEventListener('click', () => bulkAccess('S', true));
        $id('btnDisallowStripsheet')?.addEventListener('click', () => bulkAccess('S', false));

        // header "select all" boxes
        $id('chkAllMarksheet').addEventListener('change', function () {
            document.querySelectorAll('#tblPermissionBody .chk-ms:not(:disabled)').forEach(c => { c.checked = this.checked; });
        });
        $id('chkAllStripsheet').addEventListener('change', function () {
            document.querySelectorAll('#tblPermissionBody .chk-ss:not(:disabled)').forEach(c => { c.checked = this.checked; });
        });

        // row buttons + row checkboxes (event delegation - rows are re-rendered)
        $id('tblPermissionBody').addEventListener('click', e => {
            const edit = e.target.closest('.btn-row-edit');
            if (edit) { startEdit(edit.dataset.id); return; }
            const del = e.target.closest('.btn-row-delete');
            if (del) { deleteRow(parseInt(del.dataset.id, 10)); }
        });
        $id('tblPermissionBody').addEventListener('change', e => {
            if (e.target.classList.contains('chk-ms')) {
                const all = document.querySelectorAll('#tblPermissionBody .chk-ms');
                $id('chkAllMarksheet').checked = all.length > 0 && Array.from(all).every(c => c.checked);
            } else if (e.target.classList.contains('chk-ss')) {
                const all = document.querySelectorAll('#tblPermissionBody .chk-ss');
                $id('chkAllStripsheet').checked = all.length > 0 && Array.from(all).every(c => c.checked);
            }
        });

        // pager
        $id('pager').addEventListener('click', e => {
            const a = e.target.closest('a[data-page]');
            if (!a || a.closest('.disabled')) return;
            loadList(parseInt(a.dataset.page, 10));
        });

        // header filters (select2 fires jQuery events, so use .on)
        const onFilter = () => { if (!state.suspendFilter) loadList(1); };
        if (hasJq) {
            window.jQuery('#ddlFilterClass, #ddlFilterExamGroup').on('change', onFilter);
        } else {
            $id('ddlFilterClass').addEventListener('change', onFilter);
            $id('ddlFilterExamGroup').addEventListener('change', onFilter);
        }

        // clear a field's error as soon as the user fixes it
        Object.keys(FIELD_MAP).forEach(id => {
            $id(id)?.addEventListener('input', () => clearFieldError(id));
            if (hasJq) window.jQuery('#' + id).on('change select2:select', () => clearFieldError(id));
        });
        $id('ddlCopyFromSession')?.addEventListener('change', function () {
            this.classList.remove('is-invalid');
            $id('errCopyFrom').style.display = 'none';
        });

        // session finished loading in the top bar (or the user switched session)
        document.addEventListener('sessionReady', () => {
            refreshSessionLabel();
            if (window.getSessionId() !== state.loadedSession) loadList(1);
        });
    }

    async function boot() {
        bindEvents();
        refreshSessionLabel();
        await loadDropdowns();
        await loadList(1);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
function getJSON(url) {
    return fetch(url).then(function (r) { return r.json(); });
}
var $classEl = document.getElementById('ddlClass');
var $examEl = document.getElementById('ddlExamGroup');
var $examFilterEl = document.getElementById('ddlFilterExamGroup');
function onClassChange() {

    $examEl.innerHTML = '<option value="">-- Select --</option>';
    $examFilterEl.innerHTML = '<option value="">-- Select --</option>';
    //resetGridEmpty();

    var classId = $classEl.value;
    if (!classId) return;

    getJSON('/ExamConfig/GetGradePreview?companyId=0&sessionId=0&classId=' + classId)
        .then(function (res) {
            if (res.success) {
                setOptions($examEl, '<option value="">-- Select --</option>', res.data, 'examID',
                    function (s) { return '[' + s.examGroupName + '] ' + s.examName; });
                setOptions($examFilterEl, '<option value="">-- Select --</option>', res.data, 'examID',
                    function (s) { return '[' + s.examGroupName + '] ' + s.examName; });
                //ddlFilterExamGroup
            }
        });
}
function setOptions(selectEl, placeholderHtml, items, valueKey, textFn) {
    selectEl.innerHTML = placeholderHtml;
    items.forEach(function (item) {
        var opt = document.createElement('option');
        opt.value = item[valueKey];
        opt.textContent = textFn(item);
        selectEl.appendChild(opt);
    });
}