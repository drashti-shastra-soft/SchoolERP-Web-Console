// =====================================================================
// SMSTemplate.js  -  Index (list/filter/export/delete/status) + Add/Edit page
// =====================================================================

// ---- Config ---------------------------------------------------------
const BASE_URL = '/SMSTemplate';
// Matches the new id, and the old one if the partial/Index still uses it.
const TABLE_SELECTOR = '#SMSTemplateTable, #BudgetHeadTable';
// Columns to export (0 = checkbox). Adjust to your table: Title, Message, Display Label...
const EXPORT_COLUMNS = [1, 2, 3];
const ROW_CHECKBOX = '.student-checkbox';

const permCanAdd = window.canAdd;
const permCanEdit = window.canEdit;
const permCanDelete = window.canDelete;

const $id = (id) => document.getElementById(id);

// ---- Page notice helper (falls back to a Swal popup) -----------------
const IV = window.InlineFormValidation || {
    setNotice: (id, msg) => {
        const el = $id(id);
        if (el) el.innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    },
    clearNotice: (id) => { const el = $id(id); if (el) el.innerHTML = ''; }
};

function notify(msg) {
    if ($id('pageNotice')) IV.setNotice('pageNotice', msg);
    else if (window.Swal) Swal.fire('Notice', msg, 'info');
    else alert(msg);
}

// =====================================================================
// FILTERS (search + company) - badges are always derived from the
// current control values, so they can never go stale.
// =====================================================================
let appliedFilters = {};

function syncAppliedFilters() {
    appliedFilters = {};

    const searchVal = $id('txtSearchInput')?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };

    const companyEl = $id('ddlFilterCompany');
    if (companyEl?.value) {
        appliedFilters['ddlFilterCompany'] = {
            label: 'Company',
            text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value
        };
    }
}

function renderFilterBadges() {
    const container = $id('badgeContainer');
    const mainContainer = $id('activeFilterBadges');
    if (!container || !mainContainer) return;

    container.innerHTML = '';
    Object.entries(appliedFilters).forEach(([id, { label, text }]) => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-primary-subtle text-primary border border-primary-subtle d-flex align-items-center gap-1 fw-medium px-2 py-1';

        const labelNode = document.createTextNode(`${label}: ${text} `);
        const closeIcon = document.createElement('i');
        closeIcon.className = 'ti ti-x ms-1 cursor-pointer';
        closeIcon.style.fontSize = '10px';
        closeIcon.addEventListener('click', () => removeFilter(id));

        badge.appendChild(labelNode);   // text node => no HTML injection from search text
        badge.appendChild(closeIcon);
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

function submitForm() {
    const companyEl = $id('ddlFilterCompany');
    const hdnCompany = $id('hdnCompanyId');
    if (companyEl && hdnCompany) hdnCompany.value = companyEl.value;

    const searchEl = $id('txtSearchInput');
    const hdnSearch = $id('hdnSearch');
    if (searchEl && hdnSearch) hdnSearch.value = searchEl.value.trim();

    const form = $id('frmSearch');
    if (!form) return;

    const params = new URLSearchParams(new FormData(form)).toString();
    loadSMSTemplatePartial(params);
}

function applyFilters() {
    syncAppliedFilters();
    renderFilterBadges();
}

function removeFilter(filterId) {
    clearControl(filterId);
    if (filterId === 'txtSearchInput' && $id('hdnSearch')) $id('hdnSearch').value = '';

    if ($id('hdnPageIndex')) $id('hdnPageIndex').value = 1;
    applyFilters();
    submitForm();
}

function resetAllFilters() {
    clearControl('txtSearchInput');
    clearControl('ddlFilterCompany');
    if ($id('hdnSearch')) $id('hdnSearch').value = '';
    if ($id('hdnPageIndex')) $id('hdnPageIndex').value = 1;

    applyFilters();
    submitForm();
}

// =====================================================================
// EXPORT (DataTables buttons, export only - paging is server side)
// =====================================================================
function exportTitle() {
    return `SMS Template - ${localStorage.getItem('comName') || ''}`.replace(/ - $/, '');
}

function initExportTable() {
    if (!window.jQuery || !$.fn.DataTable) return;
    const tableEl = document.querySelector(TABLE_SELECTOR);
    if (!tableEl) return;

    if ($.fn.DataTable.isDataTable(tableEl)) $(tableEl).DataTable().destroy();
    $.fn.dataTable.ext.errMode = 'none';

    const title = exportTitle();
    const exportOptions = { columns: EXPORT_COLUMNS };

    window.exportTable = $(tableEl).DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title, exportOptions },
            { extend: 'csv', title, exportOptions },
            { extend: 'excel', title, exportOptions },
            { extend: 'pdf', title, exportOptions },
            { extend: 'print', title, exportOptions }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });
}

function triggerExport(index) {
    const tableEl = document.querySelector(TABLE_SELECTOR);
    if (tableEl && $.fn.DataTable.isDataTable(tableEl)) {
        $(tableEl).DataTable().button(index).trigger();
    }
}

// =====================================================================
// LIST: partial reload (filter / search / pagination)
// =====================================================================
function loadSMSTemplatePartial(queryString) {
    const container = $id('SMSTemplateTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`${BASE_URL}/GetSMSTemplatePartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load SMS templates');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';
            initExportTable();       // table node was replaced, so re-init export buttons
            updateButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            notify('Could not refresh the list. Please try again.');
        });
}

// Pagination link interception
document.addEventListener('click', function (e) {
    const link = e.target.closest('#SMSTemplateTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    const pageIdx = new URLSearchParams(query).get('PageIndex') || new URLSearchParams(query).get('pageIndex') || 1;
    if ($id('hdnPageIndex')) $id('hdnPageIndex').value = pageIdx;

    loadSMSTemplatePartial(query);
    history.replaceState(null, '', href);
});

// Debounced search
let searchTimer = null;
$id('txtSearchInput')?.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        if ($id('hdnPageIndex')) $id('hdnPageIndex').value = 1;
        applyFilters();
        submitForm();
    }, 500);
});

// =====================================================================
// LIST: selection / buttons
// =====================================================================
function updateButtonStates() {
    const count = $(ROW_CHECKBOX + ':checked').length;
    $('#btnEdit').prop('disabled', !permCanEdit || count !== 1);
    $('#btnDelete').prop('disabled', !permCanDelete || count === 0);
    $('#btnActive').prop('disabled', !permCanEdit || count === 0);
    $('#btnInactive').prop('disabled', !permCanEdit || count === 0);
}

// Kept for inline onclick compatibility in the partial
function selectItem() {
    IV.clearNotice('pageNotice');
    updateButtonStates();
}

function getSelectedIds() {
    const ids = [];
    $(ROW_CHECKBOX + ':checked').each(function () {
        const v = parseInt($(this).val(), 10);
        if (!isNaN(v)) ids.push(v);
    });
    return ids;
}

function editSelected() {
    if (!permCanEdit) {
        notify('You do not have permission to edit.');
        return;
    }
    const ids = getSelectedIds();
    if (ids.length !== 1) {
        notify('Please select exactly one SMS template to edit.');
        return;
    }
    location.href = `${BASE_URL}/Add/${ids[0]}`;
}

// =====================================================================
// LIST: delete
// =====================================================================
function deleteSelected() {
    if (!permCanDelete) {
        notify('You do not have permission to delete.');
        return;
    }

    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) {
        notify('Please select at least one SMS template.');
        return;
    }

    // Lock action buttons while the confirmation is open
    $('#btnActive, #btnInactive, #btnDelete').prop('disabled', true);

    Swal.fire({
        title: 'Are you sure?',
        text: 'You are about to delete the selected SMS template(s). This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-secondary' },
        buttonsStyling: false
    }).then((result) => {
        if (!result.isConfirmed) {
            updateButtonStates();
            return;
        }

        $.ajax({
            url: `${BASE_URL}/Delete`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(selectedIds),
            success: function (res) {
                if (res.success) {
                    Swal.fire('Deleted!', 'SMS template(s) deleted successfully.', 'success')
                        .then(() => submitForm());
                } else {
                    updateButtonStates();
                    Swal.fire('Error!', res.message || 'Failed to delete SMS template.', 'error');
                }
            },
            error: function () {
                updateButtonStates();
                Swal.fire('Error!', 'An unexpected error occurred.', 'error');
            }
        });
    });
}

// =====================================================================
// LIST: activate / deactivate
//   toggleStatus(0, true|false)            -> bulk, uses ticked rows
//   toggleStatus(id, true|false, switchEl) -> single row switch
// =====================================================================
function toggleStatus(id, isActive, checkboxEl) {
    if (!permCanEdit) {
        notify('You do not have permission to change status.');
        if (checkboxEl) checkboxEl.checked = !isActive;
        return;
    }

    let ids = [];
    let affectedBoxes = [];
    const isSingleSwitch = id && Number(id) !== 0;

    if (isSingleSwitch) {
        ids.push(parseInt(id, 10));
        if (checkboxEl) affectedBoxes.push(checkboxEl);
    } else {
        $(ROW_CHECKBOX + ':checked').each(function () {
            ids.push(parseInt($(this).val(), 10));
            affectedBoxes.push(this);
        });
    }

    if (ids.length === 0) {
        notify('Please select at least one SMS template.');
        return;
    }

    const revertAll = () => {
        affectedBoxes.forEach(cb => {
            // bulk: un-tick the row checkbox; single: put the switch back
            cb.checked = isSingleSwitch ? !isActive : false;
        });
    };

    $('#btnActive, #btnInactive, #btnDelete').prop('disabled', true);

    const config = isActive
        ? {
            icon: 'question', title: 'Activate SMS Template(s)?',
            text: 'Activated templates become available for use. Do you want to continue?',
            confirmText: 'Yes, Activate', btn: 'btn btn-success me-2'
        }
        : {
            icon: 'warning', title: 'Deactivate SMS Template(s)?',
            text: 'Deactivated templates cannot be used until activated again. Do you want to continue?',
            confirmText: 'Yes, Deactivate', btn: 'btn btn-danger me-2'
        };

    Swal.fire({
        icon: config.icon,
        title: config.title,
        text: config.text,
        showCancelButton: true,
        confirmButtonText: config.confirmText,
        customClass: { confirmButton: config.btn, cancelButton: 'btn btn-secondary' },
        buttonsStyling: false
    }).then((result) => {
        if (!result.isConfirmed) {
            revertAll();
            updateButtonStates();
            return;
        }

        $.ajax({
            url: `${BASE_URL}/ToggleStatus`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ ids: ids.join(','), isActive: isActive }),
            success: function (res) {
                if (res.success) {
                    Swal.fire('Updated!', 'Status updated successfully.', 'success')
                        .then(() => submitForm());
                } else {
                    revertAll();
                    updateButtonStates();
                    Swal.fire('Error!', res.message || 'Failed to update status.', 'error');
                }
            },
            error: function (xhr) {
                revertAll();
                updateButtonStates();
                console.error('Status update error:', xhr.status, xhr.responseText);
                Swal.fire('Error!', 'An unexpected error occurred.', 'error');
            }
        });
    });
}

// =====================================================================
// LIST: expand / collapse long message text
// =====================================================================
function toggleDescription(link) {
    const wrapper = link.closest('.desc-cell');
    if (!wrapper) return;
    const shortEl = wrapper.querySelector('.desc-short');
    const fullEl = wrapper.querySelector('.desc-full');
    if (!shortEl || !fullEl) return;

    const isExpanded = !fullEl.classList.contains('d-none');
    fullEl.classList.toggle('d-none', isExpanded);
    shortEl.classList.toggle('d-none', !isExpanded);
    link.textContent = isExpanded ? 'View more' : 'View less';
}

// =====================================================================
// ADD / EDIT PAGE
// =====================================================================
function setFieldError(inputId, errorId, message) {
    const input = $id(inputId);
    const err = $id(errorId);
    if (input) input.classList.add('is-invalid');
    if (err) {
        if (message) err.textContent = message;
        err.classList.remove('d-none');
    }
}

function clearFieldError(inputId, errorId) {
    $id(inputId)?.classList.remove('is-invalid');
    $id(errorId)?.classList.add('d-none');
}

function validateSMSTemplateForm() {
    const title = $id('txtName').value.trim();
    const message = $id('txtMessage').value.trim();
    let valid = true;

    clearFieldError('txtName', 'titleError');
    clearFieldError('txtMessage', 'messageError');

    if (!title) {
        setFieldError('txtName', 'titleError', 'SMS title is required.');
        valid = false;
    }
    if (!message) {
        setFieldError('txtMessage', 'messageError', 'SMS message is required.');
        valid = false;
    }

    if (!valid) {
        // focus the first invalid field
        (!title ? $id('txtName') : $id('txtMessage')).focus();
    }
    return valid;
}

function updateMessageCounter() {
    const el = $id('txtMessage');
    const counter = $id('msgCounter');
    if (!el || !counter) return;
    const len = el.value.length;
    const perSms = len <= 160 ? 160 : 153;                 // GSM-7 single / concatenated part size
    const parts = len === 0 ? 0 : Math.ceil(len / perSms);
    counter.textContent = `${len} characters | ${parts} SMS part(s)`;
}

async function saveRecord() {
    if (!validateSMSTemplateForm()) return;

    const id = parseInt($id('recordId').value, 10) || 0;
    const isEdit = id > 0;

    if (isEdit ? !permCanEdit : !permCanAdd) {
        Swal.fire('Not allowed', 'You do not have permission to save.', 'warning');
        return;
    }

    const title = $id('txtName').value.trim();
    const displayLabel = $id('txtDisplayName').value.trim();
    const message = $id('txtMessage').value.trim();
    const companyID = parseInt($id('hdnCompanyID')?.value, 10) || null;   // server fills in current company when null
    const isActive = $id('chkIsActive').checked;

    const data = {
        smsTemplateId: id,
        title: title,
        message: message,
        displayLabel: displayLabel || title,
        companyID: companyID,
        isActive: isActive
    };

    const btn = $id('btnSave');
    if (btn) btn.disabled = true;      // stop double submit

    try {
        const r = await fetch(`${BASE_URL}/Save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        const res = await r.json();

        if (res.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit ? 'SMS template updated successfully.' : 'SMS template added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            });
            window.location.href = `${BASE_URL}/Index`;
        } else {
            if (btn) btn.disabled = false;
            // Show duplicate-title error right under the field, everything else in a popup
            if (res.message && /title already exists/i.test(res.message)) {
                setFieldError('txtName', 'titleError', 'This SMS title already exists.');
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: res.message || 'Failed to save SMS template.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-danger' },
                    buttonsStyling: false
                });
            }
        }
    } catch (err) {
        console.error(err);
        if (btn) btn.disabled = false;
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An unexpected error occurred while saving.',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-danger' },
            buttonsStyling: false
        });
    }
}

// =====================================================================
// INIT
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {

    // ---- Add/Edit page ----
    $id('txtName')?.addEventListener('input', () => clearFieldError('txtName', 'titleError'));
    $id('txtMessage')?.addEventListener('input', () => {
        clearFieldError('txtMessage', 'messageError');
        updateMessageCounter();
    });
    updateMessageCounter();

    // ---- Index page ----
    initExportTable();

    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function' && $id('ddlFilterCompany')) {
            jQuery('#ddlFilterCompany').select2({
                width: '100%',
                dropdownParent: jQuery('#filter-dropdown'),
                allowClear: true,
                placeholder: function () { return jQuery(this).data('placeholder') || 'Select'; }
            });
        }
    } catch (e) {
        console.warn('Select2 init skipped:', e);
    }

    // keep the filter dropdown open while interacting inside it
    $id('filter-dropdown')?.addEventListener('click', e => e.stopPropagation());

    $id('btnApplyFilters')?.addEventListener('click', () => {
        if ($id('hdnPageIndex')) $id('hdnPageIndex').value = 1;
        applyFilters();
        submitForm();
    });

    $id('btnResetFilters')?.addEventListener('click', resetAllFilters);

    // row checkbox changes
    document.addEventListener('change', (e) => {
        if (e.target.matches?.(ROW_CHECKBOX)) updateButtonStates();
    });

    applyFilters();            // badges reflect the real control values on load
    updateButtonStates();
});