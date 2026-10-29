// Letters-only fields
$('#txtName, #txtDisplayName').on('input', function () {
    this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
});
// ========================================================================
//  FeeHead.js
//  Used by:  /FeeHead/Index  (list, filters, export, delete, status, copy)
//            /FeeHead/Add    (add / edit form)
//  Every DOM lookup is null-guarded, so the same file is safe on both pages.
// ========================================================================

/* ------------------------------ CONFIG ------------------------------ */
const FEEHEAD_URLS = {
    index: '/FeeHead/Index',
    add: '/FeeHead/Add',
    save: '/FeeHead/Save',
    remove: '/FeeHead/Delete',
    toggle: '/FeeHead/ToggleStatus',
    partial: '/FeeHead/GetFeeHeadPartial',
    getAll: '/FeeHead/GetAll',          // used by the Copy modal preview
    copy: '/FeeHead/CopyFeeHead'        // used by the Copy modal
};

// id of the <table> rendered inside _FeeHeadTablePartial (used for export)
const FEEHEAD_TABLE_ID = 'BudgetHeadTable';
// table columns included in Copy / CSV / Excel / PDF / Print (adjust to your partial)
const FEEHEAD_EXPORT_COLUMNS = [1, 2, 3, 4, 5];

const FEEHEAD_NAME_MAX = 500;   // tbl_mst_FeeHead.FeeHeadName
const FEEHEAD_LABEL_MAX = 200;  // tbl_mst_FeeHead.DisplayLabel
// letters (any language), digits, space and  . , & ( ) / ' + -
const FEEHEAD_INVALID_CHARS_G = /[^\p{L}\p{N}\s.,&()\/'+-]/gu;
const FEEHEAD_INVALID_CHARS = /[^\p{L}\p{N}\s.,&()\/'+-]/u;

const permCanAdd = !!window.canAdd;
const permCanEdit = !!window.canEdit;
const permCanDelete = !!window.canDelete;

const IV = window.InlineFormValidation || {
    clearMap: (map) => Object.keys(map).forEach(k => {
        document.getElementById(k)?.classList.remove('is-invalid');
        const err = document.getElementById(map[k]); if (err) err.textContent = '';
    }),
    setFieldError: (id, errId, msg) => {
        document.getElementById(id)?.classList.add('is-invalid');
        const err = document.getElementById(errId); if (err) err.textContent = msg;
    },
    setNotice: (id, msg) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    },
    clearNotice: (id) => { const el = document.getElementById(id); if (el) el.innerHTML = ''; },
    bindAutoClear: (map) => Object.keys(map).forEach(k => document.getElementById(k)?.addEventListener('input', () => {
        document.getElementById(k)?.classList.remove('is-invalid');
        const err = document.getElementById(map[k]); if (err) err.textContent = '';
    }))
};

/* ------------------------------ HELPERS ------------------------------ */
function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function setVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function getTableContainer() {
    // supports either container id so the Index view does not have to be renamed
    return document.getElementById('FeeHeadTableContainer')
        || document.getElementById('FeeCategoryTableContainer');
}

// Page-level notice if the page has #classPageNotice, otherwise a popup.
function showPageNotice(msg) {
    if (document.getElementById('classPageNotice')) IV.setNotice('classPageNotice', msg);
    else if (window.Swal) Swal.fire({ icon: 'error', title: 'Not allowed', text: msg });
    else alert(msg);
}

// Ids of every ticked row checkbox in the list.
function getSelectedIds() {
    return $('.student-checkbox:checked')
        .map(function () { return parseInt($(this).val(), 10); })
        .get()
        .filter(n => n > 0);
}

async function postJson(url, body) {
    const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(`Server returned ${r.status}`);
    return r.json();
}

/* ------------------------------ EXPORT ------------------------------ */
function initExportTable() {
    const sel = '#' + FEEHEAD_TABLE_ID;
    if (!$(sel).length || !$.fn.DataTable) return;

    if ($.fn.DataTable.isDataTable(sel)) $(sel).DataTable().destroy();
    $.fn.dataTable.ext.errMode = 'none';

    const companyName = localStorage.getItem('comName') || '';
    const title = `Fee Head - ${companyName}`;

    window.exportTable = $(sel).DataTable({
        dom: 'Bfrtip',
        buttons: ['copy', 'csv', 'excel', 'pdf', 'print'].map(extend => ({
            extend,
            title,
            exportOptions: { columns: FEEHEAD_EXPORT_COLUMNS }
        })),
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });
}

function triggerExport(index) {
    const sel = '#' + FEEHEAD_TABLE_ID;
    if ($.fn.DataTable && $.fn.DataTable.isDataTable(sel)) {
        $(sel).DataTable().button(index).trigger();
    }
}

/* ------------------- FILTER BADGES (sessionStorage) ------------------- */
const FILTER_KEY = 'appliedFilters_feeHead';
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

function clearFilterSelect(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = '';
    if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
}

function submitForm() {
    // Sync hidden form fields from the filter dropdowns before submit
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    if (sessionEl) setVal('hdnSessionID', sessionEl.value);
    if (companyEl) setVal('hdnCompanyId', companyEl.value);

    const form = document.getElementById('frmSearch');
    if (!form) return;
    loadFeeHeadPartial(new URLSearchParams(new FormData(form)).toString());
}

function applyFilters() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const searchEl = document.getElementById('txtSearchInput');

    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    if (sessionEl?.value) {
        appliedFilters['ddlFilterSessions'] = {
            label: 'Session',
            text: sessionEl.options[sessionEl.selectedIndex]?.text || sessionEl.value
        };
    } else delete appliedFilters['ddlFilterSessions'];

    if (companyEl?.value) {
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

    Object.entries(appliedFilters).forEach(([id, { label, text }]) => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-primary-subtle text-primary border border-primary-subtle d-flex align-items-center gap-1 fw-medium px-2 py-1';
        // textContent (not innerHTML) so a typed search term can never inject markup
        badge.appendChild(document.createTextNode(`${label}: ${text} `));
        const x = document.createElement('i');
        x.className = 'ti ti-x ms-1 cursor-pointer';
        x.style.fontSize = '10px';
        x.addEventListener('click', () => removeFilter(id));
        badge.appendChild(x);
        container.appendChild(badge);
    });

    mainContainer.style.display = Object.keys(appliedFilters).length > 0 ? 'block' : 'none';
}

function removeFilter(filterId) {
    if (filterId === 'txtSearchInput') {
        setVal('txtSearchInput', '');
        setVal('hdnSearch', '');
    } else {
        clearFilterSelect(filterId);
    }
    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges();
    setVal('hdnPageIndex', 1);
    submitForm();
}

function resetAllFilters() {
    setVal('txtSearchInput', '');
    setVal('hdnSearch', '');
    ['ddlFilterSessions', 'ddlFilterCompany'].forEach(clearFilterSelect);
    clearAppliedFilters();
    renderFilterBadges();
    setVal('hdnPageIndex', 1);
    submitForm();
}

/* ------------------------------ PAGE INIT ------------------------------ */
let searchTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    // ── Index page bits ───────────────────────────────────────────────
    initExportTable();

    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function' && jQuery('#filter-dropdown').length) {
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

    // Keep the filter dropdown open while interacting inside it
    document.getElementById('filter-dropdown')?.addEventListener('click', e => e.stopPropagation());

    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        setVal('hdnPageIndex', 1);
        setVal('hdnSearch', document.getElementById('txtSearchInput')?.value || '');
        applyFilters();
        submitForm();
    });

    document.getElementById('btnResetFilters')?.addEventListener('click', resetAllFilters);

    // Search box — debounced server submit
    document.getElementById('txtSearchInput')?.addEventListener('input', function () {
        const input = this;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            setVal('hdnSearch', input.value);
            setVal('hdnPageIndex', 1);
            const val = input.value.trim();
            if (val) appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
            else delete appliedFilters['txtSearchInput'];
            saveAppliedFilters();
            renderFilterBadges();
            submitForm();
        }, 500);
    });

    renderFilterBadges();

    // ── Add / Edit page ───────────────────────────────────────────────
    initAddPage();
});

/* ==================================================================== */
/*  LIST ACTIONS (Index page): select / edit / delete / toggle status   */
/* ==================================================================== */
function updateButtonStates() {
    const count = $('.student-checkbox:checked').length;
    $('#btnEdit').prop('disabled', !permCanEdit || count !== 1);
    $('#btnDelete').prop('disabled', !permCanDelete || count === 0);
    $('#btnActive').prop('disabled', !permCanEdit || count === 0);
    $('#btnInactive').prop('disabled', !permCanEdit || count === 0);
}

// Called by each row checkbox (kept with the same signature)
function selectItem(id, row) {
    IV.clearNotice('classPageNotice');
    updateButtonStates();
}

function editSelected() {
    if (!permCanEdit) {
        showPageNotice('You do not have permission to edit.');
        return;
    }
    // Always read the ticked checkbox itself — never a "last clicked" id,
    // which goes stale when several rows were ticked and then unticked.
    const ids = getSelectedIds();
    if (ids.length !== 1) return;
    IV.clearNotice('classPageNotice');
    location.href = `${FEEHEAD_URLS.add}/${ids[0]}`;
}

async function deleteSelected() {
    if (!permCanDelete) {
        showPageNotice('You do not have permission to delete.');
        return;
    }

    const ids = getSelectedIds();
    if (ids.length === 0) {
        Swal.fire({ icon: 'info', title: 'No selection', text: 'Please select at least one fee head.' });
        return;
    }

    // Lock the action buttons while the confirmation is open so the same
    // (or another) action cannot be fired twice.
    $('#btnActive, #btnInactive, #btnDelete').prop('disabled', true);

    const result = await Swal.fire({
        title: 'Are you sure?',
        text: `You are about to delete ${ids.length} fee head record${ids.length > 1 ? 's' : ''}. This action cannot be undone!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel',
        customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-secondary' },
        buttonsStyling: false
    });

    if (!result.isConfirmed) {
        updateButtonStates();
        return;
    }

    try {
        const res = await postJson(FEEHEAD_URLS.remove, ids);
        if (res.success) {
            await Swal.fire('Deleted!', res.message || 'Fee head record has been deleted.', 'success');
            submitForm();
        } else {
            updateButtonStates();
            Swal.fire('Error!', res.message || 'Failed to delete fee head.', 'error');
        }
    } catch (err) {
        console.error('Delete error:', err);
        updateButtonStates();
        Swal.fire('Error!', 'An unexpected error occurred.', 'error');
    }
}

// id > 0  → the row's own status switch was flipped (only that row changes)
// id == 0 → the bulk Active / Inactive buttons (all ticked rows change)
async function toggleStatus(id, isActive, checkboxEl) {
    isActive = (isActive === true || isActive === 'true' || isActive === 1 || isActive === '1');

    // Put the row switch back to its previous state (bulk buttons have none)
    const revert = () => { if (checkboxEl) checkboxEl.checked = !isActive; };

    if (!permCanEdit) {
        showPageNotice('You do not have permission to change status.');
        revert();
        return;
    }

    const rowId = parseInt(id, 10) || 0;
    const ids = rowId > 0 ? [rowId] : getSelectedIds();

    if (ids.length === 0) {
        revert();
        Swal.fire({ icon: 'info', title: 'No selection', text: 'Please select at least one fee head.' });
        return;
    }

    $('#btnActive, #btnInactive, #btnDelete').prop('disabled', true);

    const cfg = isActive
        ? {
            icon: 'question',
            title: 'Activate Record(s)?',
            text: 'Activating this record will make it visible and available for use across the system. Do you want to continue?',
            confirmText: 'Yes, Activate',
            confirmClass: 'btn btn-success me-2',
            successText: 'The selected record(s) have been activated and are now available for use.'
        }
        : {
            icon: 'warning',
            title: 'Deactivate Record(s)?',
            text: 'Deactivating this record will hide it from the system and prevent it from being used. Do you want to continue?',
            confirmText: 'Yes, Deactivate',
            confirmClass: 'btn btn-danger me-2',
            successText: 'The selected record(s) have been deactivated and are no longer available for use.'
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

    if (!result.isConfirmed) {
        revert();
        updateButtonStates();
        return;
    }

    try {
        const res = await postJson(FEEHEAD_URLS.toggle, { ids: ids.join(','), isActive: isActive });
        if (res.success) {
            await Swal.fire('Updated!', res.message || cfg.successText, 'success');
            submitForm();
        } else {
            revert();
            updateButtonStates();
            Swal.fire('Error!', res.message || 'Failed to update status.', 'error');
        }
    } catch (err) {
        console.error('Status update error:', err);
        revert();
        updateButtonStates();
        Swal.fire('Error!', 'An unexpected error occurred.', 'error');
    }
}

/* ------------------- Partial reload (filter / search / paging) ------------------- */
function loadFeeHeadPartial(queryString) {
    const container = getTableContainer();
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`${FEEHEAD_URLS.partial}?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load fee heads');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';
            initExportTable();      // the old DataTable was replaced with the HTML
            updateButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// Pagination click interception, scoped to the table container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#FeeHeadTableContainer .page-link, #FeeCategoryTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    setVal('hdnPageIndex', new URLSearchParams(query).get('PageIndex') || 1);
    loadFeeHeadPartial(query);
    history.replaceState(null, '', href);
});

function toggleDescription(link) {
    const wrapper = link.closest('.desc-cell');
    if (!wrapper) return;
    const shortEl = wrapper.querySelector('.desc-short');
    const fullEl = wrapper.querySelector('.desc-full');
    const isExpanded = !fullEl.classList.contains('d-none');

    if (isExpanded) {
        fullEl.classList.add('d-none');
        shortEl.classList.remove('d-none');
        link.textContent = 'View more';
    } else {
        shortEl.classList.add('d-none');
        fullEl.classList.remove('d-none');
        link.textContent = 'View less';
    }
}

/* ==================================================================== */
/*  ADD / EDIT PAGE: validation + save                                  */
/* ==================================================================== */
let isSaving = false;

function initAddPage() {
    const form = document.getElementById('callLogForm');
    if (!form) return;      // not the Add page

    // Select2 on the two dropdowns (skipped if the layout already did it)
    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            ['#ddlFeeType', '#ddlAccountType'].forEach(sel => {
                const $el = jQuery(sel);
                if ($el.length && !$el.data('select2')) $el.select2({ width: '100%' });
            });
        }
    } catch (e) { console.warn('Select2 init skipped:', e); }

    // Fee head name: strip disallowed characters while typing (keeps caret position)
    const nameEl = document.getElementById('txtName');
    nameEl?.addEventListener('input', function () {
        const before = this.value;
        const cleaned = before.replace(FEEHEAD_INVALID_CHARS_G, '');
        if (cleaned !== before) {
            const pos = Math.max(0, (this.selectionStart ?? cleaned.length) - (before.length - cleaned.length));
            this.value = cleaned;
            this.setSelectionRange(pos, pos);
        }
        setFieldError('txtName', 'nameError', null);
    });

    document.getElementById('txtDisplayName')?.addEventListener('input', () =>
        setFieldError('txtDisplayName', 'displayNameError', null));

    // select2 raises jQuery "change" events, so bind through jQuery
    $('#ddlFeeType').on('change', () => setFieldError('ddlFeeType', 'ErrorddlFeeType', null));
    $('#ddlAccountType').on('change', () => setFieldError('ddlAccountType', 'ErrorddlAccountType', null));

    // Enter key must never do a native form submit / page reload
    form.addEventListener('submit', e => { e.preventDefault(); saveRecord(); });
}

// msg = string → show that error, msg = null → clear it
function setFieldError(inputId, errorId, msg) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(errorId);
    const hasError = !!msg;

    if (err) {
        if (hasError) err.textContent = msg;
        err.classList.toggle('d-none', !hasError);
    }
    if (input) {
        input.classList.toggle('is-invalid', hasError);
        if (input.tagName === 'SELECT') {
            $(input).next('.select2-container').find('.select2-selection').toggleClass('border-danger', hasError);
        }
    }
}

function focusField(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'SELECT' && $(el).next('.select2-container').length) {
        $(el).next('.select2-container').find('.select2-selection').trigger('focus');
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else {
        el.focus();
    }
}

// Validates every field at once (all errors shown together) and returns clean values.
function validateFeeHeadForm() {
    const feeTypeId = parseInt(document.getElementById('ddlFeeType')?.value, 10) || 0;
    const accountId = parseInt(document.getElementById('ddlAccountType')?.value, 10) || 0;
    const name = (document.getElementById('txtName')?.value || '').replace(/\s+/g, ' ').trim();
    const displayName = (document.getElementById('txtDisplayName')?.value || '').replace(/\s+/g, ' ').trim();

    let firstInvalid = null;
    const fail = (inputId, errorId, msg) => {
        setFieldError(inputId, errorId, msg);
        if (!firstInvalid) firstInvalid = inputId;
    };

    // Fee Type
    if (feeTypeId <= 0) fail('ddlFeeType', 'ErrorddlFeeType', 'Fee type is required.');
    else setFieldError('ddlFeeType', 'ErrorddlFeeType', null);

    // Account Type
    if (accountId <= 0) fail('ddlAccountType', 'ErrorddlAccountType', 'Account type is required.');
    else setFieldError('ddlAccountType', 'ErrorddlAccountType', null);

    // Fee Head name
    if (!name) {
        fail('txtName', 'nameError', 'Fee head name is required.');
    } else if (!/[\p{L}\p{N}]/u.test(name)) {
        fail('txtName', 'nameError', 'Fee head name must contain at least one letter or number.');
    } else if (FEEHEAD_INVALID_CHARS.test(name)) {
        fail('txtName', 'nameError', "Only letters, numbers, spaces and . , & ( ) / ' + - are allowed.");
    } else if (name.length > FEEHEAD_NAME_MAX) {
        fail('txtName', 'nameError', `Fee head name cannot exceed ${FEEHEAD_NAME_MAX} characters.`);
    } else {
        setFieldError('txtName', 'nameError', null);
    }

    // Display name (optional)
    if (displayName.length > FEEHEAD_LABEL_MAX) {
        fail('txtDisplayName', 'displayNameError', `Display name cannot exceed ${FEEHEAD_LABEL_MAX} characters.`);
    } else {
        setFieldError('txtDisplayName', 'displayNameError', null);
    }

    if (firstInvalid) focusField(firstInvalid);

    return {
        valid: !firstInvalid,
        name,
        displayLabel: displayName || name.substring(0, FEEHEAD_LABEL_MAX),
        feeTypeId,
        accountId
    };
}

function setSaving(state) {
    isSaving = state;
    const btn = document.getElementById('btnSave');
    if (!btn) return;
    btn.disabled = state;
    btn.classList.toggle('disabled', state);
}

async function saveRecord() {
    if (isSaving) return;

    const id = parseInt(document.getElementById('recordId')?.value, 10) || 0;
    const isEdit = id > 0;

    if (isEdit ? !permCanEdit : !permCanAdd) {
        showPageNotice(`You do not have permission to ${isEdit ? 'edit' : 'add'} fee heads.`);
        return;
    }

    const v = validateFeeHeadForm();
    if (!v.valid) return;

    // Numbers must be sent as numbers — the API model binds them to int
    const data = {
        feeHeadId: id,
        companyID: parseInt(document.getElementById('hdnCompanyID')?.value, 10) || 0,
        sessionID: parseInt(document.getElementById('hdnSessionID')?.value, 10) || 0,
        feeHeadName: v.name,
        displayLabel: v.displayLabel,
        accountId: v.accountId,
        feeTypeId: v.feeTypeId,
        isRefunded: !!document.getElementById('chkIsRefunded')?.checked,
        isActive: !!document.getElementById('chkIsActive')?.checked
    };

    setSaving(true);
    try {
        const res = await postJson(FEEHEAD_URLS.save, data);

        if (res.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit
                    ? 'Fee head has been updated successfully.'
                    : 'Fee head has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            });
            window.location.href = FEEHEAD_URLS.index;
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save fee head.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
    } catch (err) {
        console.error('Save error:', err);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An unexpected error occurred while saving. Please try again.',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-danger' },
            buttonsStyling: false
        });
    } finally {
        setSaving(false);
    }
}
