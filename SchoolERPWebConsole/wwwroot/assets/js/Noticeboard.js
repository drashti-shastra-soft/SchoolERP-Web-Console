// ======================================================================
//  NoticeBoard.js  -  ONE script for both pages
//    - Index page  (list, filters, export, edit/delete/status)
//    - Add page    (add / edit form, editor, attachment, save)
//
//  Load this same file in Index.cshtml and Add.cshtml.
//  Each page is detected by its own elements, so nothing runs on the
//  wrong page (no more "null.focus()" errors).
//
//  Fixed vs. the two old files:
//   - duplicate declarations removed ($id, permCanAdd, removeExistingFile)
//     -> they caused "Identifier has already been declared" and broke everything
//   - add-page code no longer runs on the index page (and vice versa)
//   - search / editor / dropzone listeners now attach after DOM is ready
//   - badge text is escaped (XSS fix) before going into innerHTML
//   - row click ignores clicks on links, buttons and the status switch
//   - sanitizer: blocks protocol-relative urls (//evil.com)
//   - null-safe notice containers
// ======================================================================

// ----------------------------------------------------------------------
// Shared helpers
// ----------------------------------------------------------------------
const $id = (id) => document.getElementById(id);

const permCanAdd = window.canAdd;
const permCanEdit = window.canEdit;
const permCanDelete = window.canDelete;

const IV = window.InlineFormValidation || {
    setNotice: (id, msg) => {
        const el = $id(id);
        if (el) el.innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">${escapeHtml(msg)}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    },
    clearNotice: (id) => { const el = $id(id); if (el) el.innerHTML = ''; }
};

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
}

// ======================================================================
//  INDEX PAGE
// ======================================================================
const NOTICE_TABLE_ID = '#NoticeBoardTable';
const FILTER_IDS = ['ddlFilterSessions', 'ddlFilterCompany'];
const FILTER_KEY = 'appliedFilters_noticeBoard';
let appliedFilters = {};
let searchTimer = null;

try {
    const stored = sessionStorage.getItem(FILTER_KEY);
    if (stored) appliedFilters = JSON.parse(stored) || {};
} catch (e) { appliedFilters = {}; }

// ---------- Export (DataTables buttons, hidden) ----------
function triggerExport(index) {
    if (window.jQuery && $.fn.DataTable && $.fn.DataTable.isDataTable(NOTICE_TABLE_ID)) {
        $(NOTICE_TABLE_ID).DataTable().button(index).trigger();
    }
}

function initExportTable() {
    if (!window.jQuery || !$.fn.DataTable) return;

    if ($.fn.DataTable.isDataTable(NOTICE_TABLE_ID)) {
        $(NOTICE_TABLE_ID).DataTable().destroy();
    }
    // "No records found" row has a colspan -> nothing to export
    if ($(`${NOTICE_TABLE_ID} tbody tr.item-row`).length === 0) return;

    const companyname = localStorage.getItem('comName') || '';
    const title = `Notice Board - ${companyname}`;
    const cols = { columns: [1, 2, 3] };               // Title, Notice Date, Publish On

    $.fn.dataTable.ext.errMode = 'none';
    $(NOTICE_TABLE_ID).DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title, exportOptions: cols },
            { extend: 'csv', title, exportOptions: cols },
            { extend: 'excel', title, exportOptions: cols },
            { extend: 'pdf', title, exportOptions: cols },
            { extend: 'print', title, exportOptions: cols }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });
}

// ---------- Filter badges ----------
function saveAppliedFilters() {
    try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(appliedFilters)); }
    catch (e) { console.warn('sessionStorage unavailable'); }
}

function clearAppliedFilters() {
    appliedFilters = {};
    try { sessionStorage.removeItem(FILTER_KEY); } catch (e) { }
}

function setBadge(key, label, text) {
    if (text) appliedFilters[key] = { label, text };
    else delete appliedFilters[key];
}

function selectedText(el) {
    return el?.value ? (el.options[el.selectedIndex]?.text || el.value) : '';
}

// copy filter values into the hidden form, then reload the partial
function submitForm() {
    const form = $id('frmSearch');
    if (!form) return;

    if ($id('ddlFilterSessions')) $id('hdnSessionID').value = $id('ddlFilterSessions').value;
    if ($id('ddlFilterCompany')) $id('hdnCompanyId').value = $id('ddlFilterCompany').value;

    $id('hdnFromDate').value = $id('dtFromDate')?.value || '';
    $id('hdnToDate').value = $id('dtToDate')?.value || '';
    $id('hdnIsActive').value = $id('ddlFilterStatus')?.value || '';
    $id('hdnSearch').value = $id('txtSearchInput')?.value.trim() || '';

    loadNoticeBoardPartial(new URLSearchParams(new FormData(form)).toString());
}

function applyFilters() {
    const statusText = selectedText($id('ddlFilterStatus'));

    setBadge('txtSearchInput', 'Search', $id('txtSearchInput')?.value.trim());
    setBadge('ddlFilterSessions', 'Session', selectedText($id('ddlFilterSessions')));
    setBadge('ddlFilterCompany', 'Company', selectedText($id('ddlFilterCompany')));
    setBadge('dtFromDate', 'From', $id('dtFromDate')?.value);
    setBadge('dtToDate', 'To', $id('dtToDate')?.value);
    setBadge('ddlFilterStatus', 'Status', statusText === 'All' ? '' : statusText);

    saveAppliedFilters();
    renderFilterBadges();
}

function renderFilterBadges() {
    const container = $id('badgeContainer');
    const mainContainer = $id('activeFilterBadges');
    if (!container || !mainContainer) return;

    container.innerHTML = '';
    Object.entries(appliedFilters).forEach(([id, { label, text }]) => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-primary-subtle text-primary border border-primary-subtle d-flex align-items-center gap-1 fw-medium px-2 py-1';

        const txt = document.createElement('span');
        txt.textContent = `${label}: ${text}`;          // textContent -> no XSS

        const x = document.createElement('i');
        x.className = 'ti ti-x ms-1 cursor-pointer';
        x.style.fontSize = '10px';
        x.addEventListener('click', () => removeFilter(id));

        badge.append(txt, x);
        container.appendChild(badge);
    });

    mainContainer.style.display = Object.keys(appliedFilters).length > 0 ? 'block' : 'none';
}

function clearControl(id) {
    const el = $id(id);
    if (!el) return;
    el.value = '';
    if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
}

function removeFilter(filterId) {
    clearControl(filterId);
    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges();
    $id('hdnPageIndex').value = 1;
    submitForm();
}

function resetAllFilters() {
    [...FILTER_IDS, 'txtSearchInput', 'dtFromDate', 'dtToDate', 'ddlFilterStatus'].forEach(clearControl);
    clearAppliedFilters();
    renderFilterBadges();
    $id('hdnPageIndex').value = 1;
    submitForm();
}

// ---------- Row selection ----------
function selectedIds() {
    return $('.notice-checkbox:checked').map(function () { return parseInt($(this).val(), 10); }).get();
}

function rowClick(e, row) {
    // let links / buttons / inputs / labels (checkbox, status switch) behave normally
    if (e.target.closest('a, button, input, label, select, textarea')) {
        IV.clearNotice('noticePageNotice');
        updateButtonStates();
        return;
    }
    const cb = row.querySelector('.notice-checkbox');
    if (cb) cb.checked = !cb.checked;
    IV.clearNotice('noticePageNotice');
    updateButtonStates();
}

function updateButtonStates() {
    const count = $('.notice-checkbox:checked').length;
    $('#btnEdit').prop('disabled', !permCanEdit || count !== 1);
    $('#btnDelete').prop('disabled', !permCanDelete || count === 0);
    $('#btnActive').prop('disabled', !permCanEdit || count === 0);
    $('#btnInactive').prop('disabled', !permCanEdit || count === 0);
}

// ---------- Edit ----------
function editSelected() {
    if (!permCanEdit) {
        IV.setNotice('noticePageNotice', 'You do not have permission to edit.');
        return;
    }
    const ids = selectedIds();
    if (ids.length !== 1) return;
    location.href = `/NoticeBoard/Add/${ids[0]}`;
}

// ---------- Delete (soft delete, one or many) ----------
function deleteSelected() {
    if (!permCanDelete) {
        IV.setNotice('noticePageNotice', 'You do not have permission to delete.');
        return;
    }

    const ids = selectedIds();
    if (ids.length === 0) {
        Swal.fire('Select a notice', 'Please select at least one notice.', 'info');
        return;
    }

    $('#btnActive, #btnInactive, #btnDelete, #btnEdit').prop('disabled', true);

    Swal.fire({
        title: 'Are you sure?',
        text: 'You are about to delete the selected notice(s). This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-secondary' },
        buttonsStyling: false
    }).then((result) => {
        if (!result.isConfirmed) {
            updateButtonStates();
            return;
        }
        $.ajax({
            url: '/NoticeBoard/Delete',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(ids),
            success: function (res) {
                if (res.success) {
                    Swal.fire('Deleted!', res.message || 'Notice has been deleted.', 'success')
                        .then(() => submitForm());
                } else {
                    updateButtonStates();
                    Swal.fire('Error!', res.message || 'Failed to delete notice.', 'error');
                }
            },
            error: function () {
                updateButtonStates();
                Swal.fire('Error!', 'An unexpected error occurred.', 'error');
            }
        });
    });
}

// ---------- Active / Inactive ----------
//   toggleStatus(id, isActive, switchEl) -> single row switch
//   toggleStatus(0,  isActive)           -> every ticked row (top buttons)
function toggleStatus(id, isActive, switchEl) {
    if (!permCanEdit) {
        IV.setNotice('noticePageNotice', 'You do not have permission to change status.');
        if (switchEl) switchEl.checked = !isActive;
        return;
    }

    const isSingleRow = !!switchEl;
    const ids = isSingleRow ? [parseInt(id, 10)] : selectedIds();

    if (ids.length === 0) {
        Swal.fire('Select a notice', 'Please select at least one notice.', 'info');
        return;
    }

    const revert = () => { if (isSingleRow) switchEl.checked = !isActive; };

    $('#btnActive, #btnInactive, #btnDelete, #btnEdit').prop('disabled', true);

    const config = isActive
        ? { icon: 'question', title: 'Activate Notice(s)?', text: 'Active notices are visible to the selected roles once the publish date arrives. Do you want to continue?', confirmBtnClass: 'btn btn-success me-2' }
        : { icon: 'warning', title: 'Deactivate Notice(s)?', text: 'Inactive notices are hidden from all users except admins. Do you want to continue?', confirmBtnClass: 'btn btn-danger me-2' };

    Swal.fire({
        icon: config.icon,
        title: config.title,
        text: config.text,
        showCancelButton: true,
        confirmButtonText: 'Yes, proceed!',
        customClass: { confirmButton: config.confirmBtnClass, cancelButton: 'btn btn-secondary' },
        buttonsStyling: false
    }).then((result) => {
        if (!result.isConfirmed) {
            revert();
            updateButtonStates();
            return;
        }
        $.ajax({
            url: '/NoticeBoard/ToggleStatus',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ ids: ids.join(','), isActive: isActive }),
            success: function (res) {
                if (res.success) {
                    Swal.fire('Updated!', res.message || 'Status updated successfully.', 'success')
                        .then(() => submitForm());
                } else {
                    revert();
                    updateButtonStates();
                    Swal.fire('Error!', res.message || 'Failed to update status.', 'error');
                }
            },
            error: function (xhr) {
                revert();
                updateButtonStates();
                console.error('Status update error:', xhr.status, xhr.responseText);
                Swal.fire('Error!', 'An unexpected error occurred.', 'error');
            }
        });
    });
}

// ---------- Partial reload (filter / search / pagination) ----------
function loadNoticeBoardPartial(queryString) {
    const container = $id('NoticeBoardTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/NoticeBoard/GetNoticeBoardPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load notices');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';
            initExportTable();          // table was replaced -> rebuild export
            updateButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            IV.setNotice('noticePageNotice', 'Could not refresh the list.');
        });
}

// ---------- Index page init ----------
function initIndexPage() {
    initExportTable();

    // Select2 for company / session
    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            jQuery('#ddlFilterSessions, #ddlFilterCompany').select2({
                width: '100%',
                dropdownParent: jQuery('#filter-dropdown'),
                allowClear: true,
                placeholder: function () { return jQuery(this).data('placeholder') || 'Select'; }
            });
        }
    } catch (e) {
        console.warn('Select2 init skipped:', e);
    }

    // keep the filter dropdown open while interacting inside
    $id('filter-dropdown')?.addEventListener('click', e => e.stopPropagation());

    $id('btnApplyFilters')?.addEventListener('click', () => {
        $id('hdnPageIndex').value = 1;
        applyFilters();
        submitForm();
    });

    $id('btnResetFilters')?.addEventListener('click', resetAllFilters);

    $id('btnCloseFilter')?.addEventListener('click', () => {
        const toggle = $id('btnFilterToggle');
        if (toggle && window.bootstrap) bootstrap.Dropdown.getOrCreateInstance(toggle).hide();
    });

    // debounced search
    $id('txtSearchInput')?.addEventListener('input', function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            $id('hdnPageIndex').value = 1;
            setBadge('txtSearchInput', 'Search', this.value.trim());
            saveAppliedFilters();
            renderFilterBadges();
            submitForm();
        }, 500);
    });

    // pagination links -> AJAX (delegated, survives partial reload)
    document.addEventListener('click', function (e) {
        const link = e.target.closest('#NoticeBoardTableContainer .page-link');
        if (!link || link.closest('.disabled')) return;

        e.preventDefault();
        const href = link.getAttribute('href');
        if (!href || href === '#') return;

        const query = href.split('?')[1] || '';
        $id('hdnPageIndex').value = new URLSearchParams(query).get('PageNumber') || 1;
        loadNoticeBoardPartial(query);
        history.replaceState(null, '', href);
    });

    renderFilterBadges();
    updateButtonStates();
}

// ======================================================================
//  ADD / EDIT PAGE
// ======================================================================
const MAX_MB = Number(window.maxFileSizeMB) || 5;
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.txt'];
const MAX_EDITOR_IMAGE_BYTES = 1024 * 1024;   // 1 MB (image is embedded in the message)

// ---------- HTML sanitiser ----------
function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
    const root = doc.body.firstChild;

    root.querySelectorAll('script,style,iframe,object,embed,link,meta,form,input,button,textarea,select,base,svg,math')
        .forEach(n => n.remove());

    root.querySelectorAll('*').forEach(el => {
        Array.from(el.attributes).forEach(a => {
            const name = a.name.toLowerCase();
            const val = a.value.trim().toLowerCase();
            if (name.startsWith('on')) {
                el.removeAttribute(a.name);
            } else if (name === 'style' && /expression|url\(|javascript:/.test(val)) {
                el.removeAttribute(a.name);
            } else if ((name === 'href' || name === 'src') &&
                !/^(https?:|mailto:|#|\/(?!\/)|data:image\/(png|jpe?g|gif|webp);base64,)/.test(val)) {
                el.removeAttribute(a.name);
            }
        });
        if (el.tagName === 'A') {
            el.setAttribute('target', '_blank');
            el.setAttribute('rel', 'noopener noreferrer');
        }
    });
    return root.innerHTML;
}

// ---------- CKEditor access ----------
let ckEditor = null;

// works whether this script created the editor or the view already did
function getCk() {
    return ckEditor || document.querySelector('.ck-editor__editable')?.ckeditorInstance || null;
}

function getMessageHtml() {
    const ck = getCk();
    return ck ? ck.getData() : ($id('editor')?.value ?? $id('editor')?.innerHTML ?? '');
}

function editorIsEmpty() {
    const html = getMessageHtml();
    if (/<img\b|<figure\b|<iframe\b|<oembed\b|<table\b/i.test(html)) return false;
    const text = new DOMParser().parseFromString(html || '', 'text/html').body.textContent;
    return text.replace(/\u00A0/g, ' ').trim().length === 0;
}

// ---------- Validation helpers ----------
function showFieldError(inputId, errId, show, msg) {
    const input = $id(inputId);
    const err = $id(errId);
    if (input) input.classList.toggle('is-invalid', show);
    if (err) {
        if (msg) err.textContent = msg;
        err.style.display = show ? 'block' : '';
    }
}

function showBlockError(errId, wrapId, show, msg) {
    const err = $id(errId);
    if (err) {
        if (msg) err.textContent = msg;
        err.classList.toggle('d-none', !show);
    }
    if (wrapId) $id(wrapId)?.classList.toggle('is-invalid', show);
}

function clearAllErrors() {
    showFieldError('txtTitle', 'errTitle', false);
    showFieldError('dtNoticeDate', 'errNoticeDate', false);
    showFieldError('dtPublishDate', 'errPublishDate', false);
    showBlockError('errMessage', 'editorWrap', false);
    showBlockError('errRoles', null, false);
    showBlockError('errAttachment', null, false);
    IV.clearNotice('noticeFormNotice');
}

function notice(msg) {
    IV.setNotice('noticeFormNotice', msg);
}

function validate() {
    clearAllErrors();
    let firstBad = null;
    const bad = (el) => { if (!firstBad && el) firstBad = el; };

    if (!$id('txtTitle').value.trim()) {
        showFieldError('txtTitle', 'errTitle', true);
        bad($id('txtTitle'));
    }
    if (!$id('dtNoticeDate').value) {
        showFieldError('dtNoticeDate', 'errNoticeDate', true);
        bad($id('dtNoticeDate'));
    }
    if (!$id('dtPublishDate').value) {
        showFieldError('dtPublishDate', 'errPublishDate', true);
        bad($id('dtPublishDate'));
    }
    if (editorIsEmpty()) {
        showBlockError('errMessage', 'editorWrap', true);
        bad($id('editorWrap') || $id('editor'));
    }
    if (document.querySelectorAll('.role-checkbox:checked').length === 0) {
        showBlockError('errRoles', null, true);
        bad($id('rolesPanel'));
    }
    const file = $id('attachmentFile')?.files[0];
    if (file && !fileIsValid(file)) {
        bad($id('dropZone'));
    }

    if (firstBad) {
        firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (firstBad.focus) firstBad.focus({ preventScroll: true });
        return false;
    }
    return true;
}

// ---------- Attachment ----------
function fileIsValid(file) {
    const ext = ('.' + (file.name.split('.').pop() || '')).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
        showBlockError('errAttachment', null, true, 'This file type is not allowed.');
        return false;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
        showBlockError('errAttachment', null, true, `File size exceeds the ${MAX_MB} MB limit.`);
        return false;
    }
    showBlockError('errAttachment', null, false);
    return true;
}

function hideFileInfo() {
    const info = $id('fileInfo');
    if (!info) return;
    info.classList.add('d-none');
    info.classList.remove('d-flex');
}

function setChosenFile(file) {
    const input = $id('attachmentFile');
    if (!file || !fileIsValid(file)) {
        if (input) input.value = '';
        hideFileInfo();
        return;
    }
    const info = $id('fileInfo');
    $id('fileInfoName').textContent = `${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
    info.classList.remove('d-none');
    info.classList.add('d-flex');
    // a new file replaces the saved one
    if ($id('hdnRemoveFile')) $id('hdnRemoveFile').value = 'false';
}

// single version (was declared twice before)
function removeExistingFile() {
    $id('existingFileInfo')?.remove();
    if ($id('hdnRemoveFile')) $id('hdnRemoveFile').value = 'true';
    if ($id('hdnExistingFile')) $id('hdnExistingFile').value = '';
    // also clear any newly chosen file so it is not re-uploaded after removal
    if ($id('attachmentFile')) $id('attachmentFile').value = '';
    hideFileInfo();
}

// ---------- Save ----------
async function saveRecord() {
    const id = parseInt($id('recordId').value, 10) || 0;
    const isEdit = id > 0;

    if (isEdit ? !permCanEdit : !permCanAdd) {
        notice('You do not have permission to save.');
        return;
    }
    if (!validate()) return;

    const btn = $id('btnSave');
    if (btn) btn.disabled = true;           // stop double submit

    const fd = new FormData();
    fd.append('NoticeBoardId', id);
    fd.append('Title', $id('txtTitle').value.trim());
    fd.append('NoticeDate', $id('dtNoticeDate').value);
    fd.append('PublishDate', $id('dtPublishDate').value);
    fd.append('NoticeMessage', sanitizeHtml(getMessageHtml()));
    fd.append('IsActive', $id('chkIsActive').checked);
    fd.append('CompanyID', $id('hdnCompanyID').value || 0);
    fd.append('SessionID', $id('hdnSessionId').value || 0);
    fd.append('RemoveAttachment', $id('hdnRemoveFile').value === 'true');
    document.querySelectorAll('.role-checkbox:checked').forEach(cb => fd.append('RoleIds', cb.value));

    const file = $id('attachmentFile').files[0];
    if (file) fd.append('attachmentFile', file);

    try {
        const r = await fetch('/NoticeBoard/Save', { method: 'POST', body: fd });
        const res = await r.json();

        // notice saved even if attachment failed -> next save must UPDATE, not duplicate
        if (res.noticeBoardId > 0) $id('recordId').value = res.noticeBoardId;

        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit ? 'Notice has been updated successfully.' : 'Notice has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => { window.location.href = '/NoticeBoard/Index'; });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save notice.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
            if (btn) btn.disabled = false;
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Could not reach the server. Please try again.', 'error');
        if (btn) btn.disabled = false;
    }
}

// ---------- Add page init ----------
function initAddPage() {
    const dropZone = $id('dropZone');
    const fileInput = $id('attachmentFile');

    // clear a field's error as soon as the user fixes it
    [['txtTitle', 'errTitle'], ['dtNoticeDate', 'errNoticeDate'], ['dtPublishDate', 'errPublishDate']].forEach(([i, e]) => {
        $id(i)?.addEventListener('input', () => showFieldError(i, e, false));
        $id(i)?.addEventListener('change', () => showFieldError(i, e, false));
    });
    document.querySelectorAll('.role-checkbox').forEach(cb =>
        cb.addEventListener('change', () => {
            if (document.querySelectorAll('.role-checkbox:checked').length > 0) showBlockError('errRoles', null, false);
        }));

    // drag & drop attachment
    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
        });
        ['dragenter', 'dragover'].forEach(ev =>
            dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('dragover'); }));
        ['dragleave', 'drop'].forEach(ev =>
            dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove('dragover'); }));
        dropZone.addEventListener('drop', e => {
            const file = e.dataTransfer?.files?.[0];
            if (!file) return;
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
            setChosenFile(file);
        });
        fileInput.addEventListener('change', () => setChosenFile(fileInput.files[0]));
    }
    $id('btnClearFile')?.addEventListener('click', () => setChosenFile(null));

    initCkEditor();
}

function initCkEditor() {
    const saved = $id('hdnMessageHtml')?.value || '';
    const hook = (ck) => {
        ckEditor = ck;
        if (saved.trim()) ck.setData(sanitizeHtml(saved));      // edit mode
        ck.model.document.on('change:data', () => {
            if (!editorIsEmpty()) showBlockError('errMessage', 'editorWrap', false);
        });
    };

    // editor already created by the view -> just use it
    const existing = getCk();
    if (existing) { hook(existing); return; }

    // otherwise create it here
    const el = $id('editor');
    if (window.ClassicEditor && el) {
        ClassicEditor.create(el).then(hook).catch(err => console.error('CKEditor init failed', err));
    } else {
        console.warn('CKEditor not found - load ckeditor.js before NoticeBoard.js');
    }
}

// ======================================================================
//  Boot - run only the code that belongs to the current page
// ======================================================================
onReady(() => {
    if ($id('NoticeBoardTableContainer')) initIndexPage();   // list page
    if ($id('editor') || $id('editorWrap')) initAddPage();                        // add / edit page
});

// used by inline onclick="" attributes in the views
window.removeExistingFile = removeExistingFile;
window.saveRecord = saveRecord;
window.rowClick = rowClick;
window.editSelected = editSelected;
window.deleteSelected = deleteSelected;
window.toggleStatus = toggleStatus;
window.triggerExport = triggerExport;
window.removeFilter = removeFilter;