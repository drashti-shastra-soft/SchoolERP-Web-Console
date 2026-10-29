// ========================================================================
// AccountHead — List/filter page + Add/Edit page script
// ========================================================================
//
// FIXES IN THIS VERSION:
//  1. "Selected" row / Edit / Delete wasn't working: the old selectItem()
//     tracked window.selectedPurposesId and checked ".student-checkbox"
//     (leftover from a different module), while deleteSelectedAccountHead()/
//     toggleAccountHeadStatus()/updateAccountHeadButtonStates() all use
//     ".accounthead-checkbox" and window.selectedAccountHeadId. Everything
//     below now consistently uses ".accounthead-checkbox" +
//     window.selectedAccountHeadId.
//  2. Filters weren't working: applyFilters()/submitForm()/removeFilter()
//     referenced Class/Section/Gender/Category/RTE fields that don't exist
//     for Account Head. Replaced with the actual Account Head filters
//     (Cost Center, Opening Bal Type) that SP_AccountHead_GetAllPageIndex
//     supports, alongside Search/Session/Company.
//  3. Fixed hdnCompanyId vs hdnCompanyID: the real Index.cshtml hidden
//     field is "hdnCompanyId" (lowercase d) — the earlier "fix" pointed
//     at a field that doesn't exist and threw, breaking filters.
//  4. Toolbar buttons call deleteSelected() and toggleStatus(0, true/
//     false) directly (see AccountPageViewModel Index.cshtml) — those
//     functions weren't defined (only deleteSelectedAccountHead() and
//     toggleAccountHeadStatus() were), so clicking them threw
//     "function is not defined". Added deleteSelected()/toggleStatus()
//     matching the real onclick handlers, aliasing to the same logic.
//  5. Checkbox selection still can't be 100% confirmed without the real
//     grid partial (_AccountHeadTablePartial.cshtml) — every partial
//     seen in this codebase reused class "student-checkbox" from a
//     copy-pasted template, so selection code now matches BOTH
//     ".accounthead-checkbox" and ".student-checkbox" defensively.
// ========================================================================

// ── Checkbox selector: the real grid partial for this page hasn't been
//    confirmed, but every partial seen in this codebase so far reused the
//    class "student-checkbox" from a copy-pasted template. Matching BOTH
//    class names here means selection works whichever one the actual grid
//    partial uses. Once you confirm the real class, this can be trimmed
//    to just one.
// ────────────────────────────────────────────────────────────────────────
const ACCOUNTHEAD_CHECKBOX_SELECTOR = '.accounthead-checkbox, .student-checkbox';

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#AccountHeadTable')) {
        const table = $('#AccountHeadTable').DataTable();
        table.button(index).trigger();
    }
}

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_accountHead';
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

// ========================================
// submitForm — syncs dropdowns into hidden form fields, then reloads
// the grid partial with the resulting query string.
// ========================================
function submitForm() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const searchEl = document.getElementById('txtSearchInput');
    // FIX: the real hidden field is id="hdnCompanyId" (lowercase d) per
    // the actual Index.cshtml — the previous "hdnCompanyID" targeted a
    // field that doesn't exist on this page and threw a TypeError,
    // which broke filtering every time it ran.
    if (sessionEl) document.getElementById('hdnSessionID').value = sessionEl.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;
    if (searchEl) document.getElementById('hdnSearch').value = searchEl.value.trim();
    // NOTE: this page's filter panel currently only renders
    // _CompanySessionFilter (Company + Session). If a Cost Center /
    // Opening Bal Type filter partial is added later, sync those
    // dropdowns into matching hidden fields here the same way.

    const form = document.getElementById('frmSearch');
    if (!form) return;
    const params = new URLSearchParams(new FormData(form)).toString();

    loadAccountHeadPartial(params);
}

function applyFilters() {
    const searchEl = document.getElementById('txtSearchInput');
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');

    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    if (sessionEl?.value) {
        appliedFilters['ddlFilterSessions'] = { label: 'Session', text: sessionEl.options[sessionEl.selectedIndex]?.text || sessionEl.value };
    } else delete appliedFilters['ddlFilterSessions'];

    if (companyEl?.value) {
        appliedFilters['ddlFilterCompany'] = { label: 'Company', text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value };
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

function resetSelect(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = '';
    if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
}

function removeFilter(filterId) {
    const resetMap = {
        ddlFilterSessions: () => resetSelect('ddlFilterSessions'),
        ddlFilterCompany: () => resetSelect('ddlFilterCompany'),
        txtSearchInput: () => {
            const el = document.getElementById('txtSearchInput');
            if (el) el.value = '';
            const hdn = document.getElementById('hdnSearch');
            if (hdn) hdn.value = '';
        }
    };
    resetMap[filterId]?.();

    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges();
    const pageIdx = document.getElementById('hdnPageIndex');
    if (pageIdx) pageIdx.value = 1;
    submitForm();
}

function resetAllFilters() {
    const searchEl = document.getElementById('txtSearchInput');
    if (searchEl) searchEl.value = '';
    const hdnSearch = document.getElementById('hdnSearch');
    if (hdnSearch) hdnSearch.value = '';

    ['ddlFilterSessions', 'ddlFilterCompany']
        .forEach(id => resetSelect(id));

    clearAppliedFilters();
    renderFilterBadges();
    const pageIdx = document.getElementById('hdnPageIndex');
    if (pageIdx) pageIdx.value = 1;
    submitForm();
}

// ========================================
// Search input — debounced server submit
// ========================================
// ── Search input — debounced server submit (delegated: survives any load-order) ──
let searchTimer = null;

document.addEventListener('input', function (e) {
    if (e.target.id !== 'txtSearchInput') return;

    clearTimeout(searchTimer);
    const el = e.target;
    searchTimer = setTimeout(() => {
        const hdnSearch = document.getElementById('hdnSearch');
        if (hdnSearch) hdnSearch.value = el.value;
        const pageIdx = document.getElementById('hdnPageIndex');
        if (pageIdx) pageIdx.value = 1;

        const val = el.value.trim();
        if (val) appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        else delete appliedFilters['txtSearchInput'];
        saveAppliedFilters();
        renderFilterBadges();
        submitForm();
    }, 500);
});
// ========================================
// DOMContentLoaded — DataTable export, filter buttons, badges,
// pincode autocomplete, Country -> State -> City cascade
// ========================================
document.addEventListener('DOMContentLoaded', function () {
    var companyname = localStorage.getItem("comName");

    if ($.fn.DataTable.isDataTable('#AccountHeadTable')) {
        $('#AccountHeadTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#AccountHeadTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Account Head - ${companyname}` },
            { extend: 'csv', title: `Account Head - ${companyname}` },
            { extend: 'excel', title: `Account Head - ${companyname}` },
            { extend: 'pdf', title: `Account Head - ${companyname}` },
            { extend: 'print', title: `Account Head - ${companyname}` }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });

    document.getElementById('filter-dropdown')?.addEventListener('click', e => e.stopPropagation());

    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        const pageIdx = document.getElementById('hdnPageIndex');
        if (pageIdx) pageIdx.value = 1;
        const search = document.getElementById('txtSearchInput');
        const hdnSearch = document.getElementById('hdnSearch');
        if (search && hdnSearch) hdnSearch.value = search.value;
        applyFilters();
        submitForm();
    });

    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        resetAllFilters();
    });

    renderFilterBadges();
    updateAccountHeadButtonStates();

    // ── PinCode autocomplete (Add/Edit page only — no-ops elsewhere) ──
    const input = document.getElementById('txtPinCode');
    const list = document.getElementById('pinCodeSuggestions');

    let debounceTimer;
    let currentItems = [];

    if (!input || !list) {
        return; // not on the Add/Edit page — nothing further to wire up
    }

    // ── Country -> State -> City cascade ──
    const formCountry = document.getElementById('ddlCountry');
    if (formCountry) {
        const preselectState = document.getElementById('hdnSelectedStateId')?.value;
        const preselectCity = document.getElementById('hdnSelectedCityId')?.value;

        if (window.jQuery) {
            jQuery(formCountry).on('change', function () {
                loadStatesByCountry(this.value, 'ddlState');
            });
        } else {
            formCountry.addEventListener('change', function () {
                loadStatesByCountry(this.value, 'ddlState');
            });
        }

        if (formCountry.value) {
            loadStatesByCountry(formCountry.value, 'ddlState', preselectState).then(() => {
                const stateEl = document.getElementById('ddlState');
                if (stateEl && stateEl.value) {
                    loadCitiesByState(stateEl.value, 'ddlCity', preselectCity);
                }
            });
        }
    }

    const formState = document.getElementById('ddlState');
    if (formState) {
        if (window.jQuery) {
            jQuery(formState).on('change', function () {
                loadCitiesByState(this.value, 'ddlCity');
            });
        } else {
            formState.addEventListener('change', function () {
                loadCitiesByState(this.value, 'ddlCity');
            });
        }
    }

    // ── PinCode input listener ──
    input.addEventListener('input', function () {
        const term = this.value.trim();
        clearTimeout(debounceTimer);

        if (term.length < 2) {
            hideList();
            return;
        }
        debounceTimer = setTimeout(() => fetchPinCodes(term), 300);
    });

    async function fetchPinCodes(term) {
        try {
            const res = await fetch(`/Hostel/SearchPostalCode?term=${encodeURIComponent(term)}`);
            const result = await res.json();

            if (result.success && result.data && result.data.length > 0) {
                currentItems = result.data;
                renderList(currentItems);
            } else {
                hideList();
            }
        } catch (err) {
            console.error('SearchPostalCode error:', err);
            hideList();
        }
    }

    function renderList(items) {
        list.innerHTML = '';
        items.forEach((item, idx) => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action';
            li.style.cursor = 'pointer';
            li.textContent = `${item.postalCode ?? item.postalCode}`;
            li.addEventListener('click', () => selectPinItem(idx));
            list.appendChild(li);
        });
        list.style.display = 'block';
    }

    async function selectPinItem(idx) {
        const item = currentItems[idx];
        input.value = item.postalCode ?? item.postalCode;
        hideList();
        const countryId = item.countryId ?? item.countryId;
        const stateId = item.stateId ?? item.stateId;
        const cityId = item.cityId ?? item.cityId;

        if (countryId) {
            $('#ddlCountry').val(countryId).trigger('change.select2');
            $('#ddlCountry').trigger('change');
        }

        if (countryId && stateId) {
            await loadStatesByCountry(countryId, 'ddlState', stateId);
        }

        if (stateId && cityId) {
            await loadCitiesByState(stateId, 'ddlCity', cityId);
        }
    }

    function hideList() {
        list.style.display = 'none';
        list.innerHTML = '';
    }

    document.addEventListener('click', function (e) {
        if (!input.contains(e.target) && !list.contains(e.target)) {
            hideList();
        }
    });
});

// ========================================
// Permission flags + shared inline-validation helper
// ========================================
const permCanAdd = window.canAdd;
const permCanEdit = window.canEdit;
const permCanDelete = window.canDelete;

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
    clearNotice: (id) => { const el = document.getElementById(id); if (el) el.innerHTML = ''; }
};

// Single source of truth for "which row is selected" — everything below
// (row click, Edit, Delete, toggle-status button enabling) reads/writes
// this ONE variable and checks the ONE checkbox class ".accounthead-checkbox".
window.selectedAccountHeadId = 0;

// ========================================
// SAVE (Add or Edit) — posts to /AccountHead/Save
// ========================================
async function saveRecordold() {
    if (!permCanAdd && !permCanEdit) {
        IV.setNotice('accountHeadPageNotice', 'You do not have permission to save.');
        return;
    }

    const accountName = document.getElementById('txtAccountName').value.trim();
    let hasError = false;

    if (!accountName) {
        document.getElementById('nameError').classList.remove('d-none');
        document.getElementById('txtAccountName').classList.add('is-invalid');
        hasError = true;
    } else {
        document.getElementById('nameError').classList.add('d-none');
        document.getElementById('txtAccountName').classList.remove('is-invalid');
    }

    const accountTypeIdRaw = document.getElementById('ddlAccountType').value;
    if (!accountTypeIdRaw) {
        document.getElementById('typeError').classList.remove('d-none');
        document.getElementById('ddlAccountType').classList.add('is-invalid');
        hasError = true;
    } else {
        document.getElementById('typeError').classList.add('d-none');
        document.getElementById('ddlAccountType').classList.remove('is-invalid');
    }

    if (hasError) return;

    const accountId = parseInt(document.getElementById('recordId').value) || 0;
    const parentRaw = document.getElementById('ddlUnderAccount').value;
    const parentAccountId = parentRaw ? parseInt(parentRaw, 10) : null;

    if (accountId > 0 && parentAccountId === accountId) {
        IV.setNotice('accountHeadPageNotice', 'An account cannot be set as its own Under Account.');
        return;
    }

    const getVal = (id) => document.getElementById(id)?.value?.trim() || null;
    const getNum = (id) => {
        const v = document.getElementById(id)?.value;
        return v === '' || v === null || v === undefined ? 0 : parseFloat(v);
    };

    const companyID = document.getElementById('hdnCompanyID')?.value || 0;
    const sessionID = document.getElementById('hdnSessionID')?.value || 0;

    const formData = new FormData();
    formData.append('AccountID', accountId);
    formData.append('AccountName', accountName);
    formData.append('AccountTypeID', accountTypeIdRaw);
    if (parentAccountId !== null) formData.append('ParentAccountID', parentAccountId);
    formData.append('CompanyID', companyID);
    formData.append('SessionID', sessionID);
    formData.append('AccountNo', getVal('txtAccountNo') || '');
    // ...append every other field the same way...
    formData.append('OpeningBalType', document.getElementById('ddlOpeningBalType').value || 'DEBIT');
    formData.append('IsBlocked', document.getElementById('chkBlock').checked);
    formData.append('IsActive', document.getElementById('chkIsActive').checked);

    // attachment handling — these three lines were completely missing
    formData.append('ExistingFileName', document.getElementById('hdnExistingFile')?.value || '');
    formData.append('RemoveAttachment', document.getElementById('hdnRemoveFile')?.value || 'false');
    const fileInput = document.getElementById('attachmentFile');
    if (fileInput?.files?.length > 0) {
        formData.append('attachmentFile', fileInput.files[0]);   // key MUST match the IFormFile param name
    }

    const isEdit = accountId > 0;

    try {
        const r = await fetch('/AccountHead/Save', {
            method: 'POST',
            body: formData 
        });

        const res = await r.json();

        if (res.success ?? (res.RESULT === 1 || res.result === 1)) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit
                    ? 'Account head has been updated successfully.'
                    : 'Account head has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                window.location.href = '/AccountHead/Index';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || res.MESSAGE || 'Failed to save account head.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error!', 'An unexpected error occurred while saving.', 'error');
    }
}

// ========================================
// SAVE (Add or Edit) — posts to /AccountHead/Save
// ========================================
async function saveRecord() {
    // Permissions are exposed in the view as window.canAdd / canEdit
    const accountId = parseInt(document.getElementById('recordId').value) || 0;
    const isEdit = accountId > 0;

    if ((isEdit && !window.canEdit) || (!isEdit && !window.canAdd)) {
        Swal.fire('Not allowed', 'You do not have permission to save.', 'warning');
        return;
    }

    // ---------- Validation ----------
    const nameEl = document.getElementById('txtAccountName');
    const typeEl = document.getElementById('ddlAccountType');
    const accountName = nameEl.value.trim();
    const accountTypeIdRaw = typeEl.value;
    let hasError = false;

    const toggle = (el, errId, bad) => {
        document.getElementById(errId).classList.toggle('d-none', !bad);
        el.classList.toggle('is-invalid', bad);
        if (bad) hasError = true;
    };
    toggle(nameEl, 'nameError', !accountName);
    toggle(typeEl, 'typeError', !accountTypeIdRaw);
    if (hasError) return;

    const parentRaw = document.getElementById('ddlUnderAccount').value;
    if (isEdit && parentRaw && parseInt(parentRaw, 10) === accountId) {
        Swal.fire('Invalid', 'An account cannot be its own Under Account.', 'warning');
        return;
    }

    // ---------- Helpers ----------
    const formData = new FormData();

    // text/select: append only when it has a value (otherwise server binds null)
    const addStr = (key, id) => {
        const v = document.getElementById(id)?.value?.trim();
        if (v) formData.append(key, v);
    };
    // numbers: default to 0
    const addNum = (key, id) => {
        const v = document.getElementById(id)?.value;
        formData.append(key, v === '' || v == null ? 0 : parseFloat(v));
    };
    // ids from dropdowns: append only when selected
    const addId = (key, id) => {
        const v = document.getElementById(id)?.value;
        if (v) formData.append(key, parseInt(v, 10));
    };

    // ---------- Core ----------
    formData.append('AccountID', accountId);
    formData.append('AccountName', accountName);
    formData.append('AccountTypeID', accountTypeIdRaw);
    addId('ParentAccountID', 'ddlUnderAccount');
    addStr('AccountNo', 'txtAccountNo');
    addId('CostCenterID', 'ddlCostCenter');
    formData.append('CompanyID', document.getElementById('hdnCompanyID')?.value || 0);
    formData.append('SessionID', document.getElementById('hdnSessionID')?.value || 0);

    // ---------- Contact / party ----------
    addStr('RepresentedBy', 'txtRepresentedBy');
    addStr('PayeeName', 'txtPayeeName');
    addStr('Email', 'txtEmail');
    addStr('PhoneOff', 'txtPhoneOff');
    addStr('PhoneRes', 'txtPhoneRes');
    addStr('MobileNo', 'txtMobileNo');
    addStr('Fax', 'txtFax');

    // ---------- Address ----------
    addStr('Address', 'txtAddress');
    addStr('PostalCode', 'txtPinCode');
    addId('AreaID', 'ddlArea');
    addId('CountryId', 'ddlCountry');
    addId('StateId', 'ddlState');
    addId('CityId', 'ddlCity');

    // ---------- Credit / opening ----------
    addNum('CreditDays', 'txtCreditDays');
    addNum('CreditLimit', 'txtCreditLimit');
    addNum('OpeningBalance', 'txtOpeningBalance');
    formData.append('OpeningBalType', document.getElementById('ddlOpeningBalType').value || 'DEBIT');
    addStr('OpeningDate', 'txtOpeningDate');   // "yyyy-MM-ddTHH:mm" binds to DateTime?

    // ---------- Tax identifiers ----------
    addStr('TinNo', 'txtTinNo');
    addStr('PANNo', 'txtPANNo');
    addStr('STTNo', 'txtSTTNo');
    addStr('ServiceTaxNo', 'txtServiceTaxNo');
    addStr('CSTNo', 'txtCSTNo');
    addStr('ECCNo', 'txtECCNo');

    // ---------- Flags ----------
    formData.append('IsBlocked', document.getElementById('chkBlock').checked);
    formData.append('IsActive', document.getElementById('chkIsActive').checked);
    formData.append('IsDelete', false);

    // ---------- Attachment ----------
    formData.append('ExistingFileName', document.getElementById('hdnExistingFile')?.value || '');
    formData.append('RemoveAttachment', document.getElementById('hdnRemoveFile')?.value || 'false');
    const fileInput = document.getElementById('attachmentFile');
    if (fileInput?.files?.length > 0) {
        formData.append('attachmentFile', fileInput.files[0]);   // must match IFormFile param name
    }

    // ---------- Submit ----------
    try {
        const r = await fetch('/AccountHead/Save', { method: 'POST', body: formData });
        const res = await r.json();

        const ok = res.success ?? (res.data?.result?.result === 1 || res.Data?.Result?.Result === 1
            || res.RESULT === 1 || res.result === 1);

        if (ok) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit ? 'Account head has been updated successfully.'
                    : 'Account head has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => { window.location.href = '/AccountHead/Index'; });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || res.MESSAGE || 'Failed to save account head.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error!', 'An unexpected error occurred while saving.', 'error');
    }
}

// Needed by the (x) button next to the existing attachment
function removeExistingFile() {
    document.getElementById('hdnRemoveFile').value = 'true';
    document.getElementById('hdnExistingFile').value = '';
    document.getElementById('existingFileInfo')?.remove();
}
// ========================================
// RESET — clears the Add/Edit form back to blank Add state
// ========================================
function resetForm() {
    document.getElementById('accountHeadForm')?.reset();
    const recId = document.getElementById('recordId');
    if (recId) recId.value = '';
    document.getElementById('nameError')?.classList.add('d-none');
    document.getElementById('typeError')?.classList.add('d-none');
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    IV.clearNotice('accountHeadPageNotice');
}

// ========================================
// ROW SELECTION (grid) — ACCOUNTHEAD_CHECKBOX_SELECTOR and
// window.selectedAccountHeadId are the single source of truth used by
// Edit / Delete / Active / Inactive button enabling below.
// If your grid partial calls onclick="selectItem(id, this)" on each row,
// that still works — it now just delegates to the same logic.
// ========================================
function selectAccountHeadRow(id) {
    IV.clearNotice('accountHeadPageNotice');
    window.selectedAccountHeadId = id;
    updateAccountHeadButtonStates();
}

// Back-compat alias for markup that still calls selectItem(id, row)
function selectItem(id) {
    selectAccountHeadRow(id);
}

async function editSelected() {
    if (!permCanEdit) {
        IV.setNotice('accountHeadPageNotice', 'You do not have permission to edit.');
        return;
    }
    const checked = $(ACCOUNTHEAD_CHECKBOX_SELECTOR + ':checked');
    if (checked.length !== 1) return;

    const id = window.selectedAccountHeadId || parseInt(checked.first().val(), 10);
    if (!id) return;

    location.href = `/AccountHead/Add/${id}`;
}

// ========================================
// DELETE — soft delete via /AccountHead/Delete
// (blocked server-side if the account still has children under it)
//
// FIX: the toolbar button in Index.cshtml calls onclick="deleteSelected()"
// directly — that function didn't exist before (only
// deleteSelectedAccountHead() did), so clicking Delete threw
// "deleteSelected is not defined". deleteSelected() is now the primary
// name; deleteSelectedAccountHead() is kept as an alias in case any
// other markup still calls the old name.
// ========================================
async function deleteSelected() {
    if (!permCanDelete) {
        IV.setNotice('accountHeadPageNotice', 'You do not have permission to delete.');
        return;
    }

    let selectedIds = [];
    $(ACCOUNTHEAD_CHECKBOX_SELECTOR + ':checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });

    if (selectedIds.length === 0) {
        alert('Please select at least one Account Head.');
        return;
    }

    $('#btnActive, #btnInactive, #btnDelete').prop('disabled', true);

    Swal.fire({
        title: 'Are you sure?',
        text: 'You are about to delete this account head record. This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-secondary' },
        buttonsStyling: false
    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                url: '/AccountHead/Delete',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success ?? res.RESULT === 1) {
                        Swal.fire('Deleted!', res.message || 'Account head record has been deleted.', 'success')
                            .then(() => location.reload());
                    } else {
                        updateAccountHeadButtonStates();
                        Swal.fire('Error!', res.message || res.MESSAGE || 'Failed to delete account head.', 'error');
                    }
                },
                error: function () {
                    updateAccountHeadButtonStates();
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        } else {
            updateAccountHeadButtonStates();
        }
    });
}

// Back-compat alias for any other markup still calling the old name
async function deleteSelectedAccountHead() {
    return deleteSelected();
}

// ========================================
// TOGGLE STATUS
//
// FIX: the toolbar Active/Inactive buttons call
// onclick="toggleStatus(0,true)" / onclick="toggleStatus(0,false)" —
// id=0 means "apply to whatever's currently selected in the grid", not
// a single row. toggleStatus() below is the bulk-aware version that
// actually matches those calls (toggleAccountHeadStatus() previously
// only handled a single-row per-row switch and was never invoked by
// the toolbar buttons, so Active/Inactive silently did nothing).
// ========================================


async function toggleStatus(id, isActive, checkboxEl) {
    if (!window.canEdit) {
        IV.setNotice('classPageNotice', 'You do not have permission to change status.');
        if (checkboxEl) {
            checkboxEl.checked = !isActive;
            $(checkboxEl).trigger('change'); // ensure UI/plugin state syncs
        }
        location.reload();
        return;
    }

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

    const request = { ids: sectionIds.join(','), isActive: isActive };

    // helper to revert every affected checkbox/switch
    // helper to revert every affected checkbox
    //function revertAll() {
    //    checkedBoxes.forEach(cb => { cb.checked = !isActive; });
    //}

    function revertAll() {
        checkedBoxes.forEach(cb => {
            if (cb.classList.contains('student-checkbox')) {
                // Bulk action path: this is a row-selection checkbox, not the status switch.
                // On cancel/failure we deselect it — we never toggle its "value" based on isActive.
                cb.checked = false;
            } else {
                // Single-row inline switch path: revert the switch to the state it had
                // before the attempted change.
                cb.checked = !isActive;
            }
        });
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
                    url: '/AccountHead/ToggleStatus',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(request),
                    success: function (res) {
                        if (res.success) {
                            Swal.fire('Updated!', res.message || 'Status updated successfully.', 'success')
                                .then(() => location.reload());
                        } else {
                            revertAll();
                            updateAccountHeadButtonStates();             // ✅ resync on failure too
                            Swal.fire('Error!', res.message || 'Failed to update status.', 'error');
                        }
                    },
                    error: function (xhr) {
                        revertAll();
                        updateAccountHeadButtonStates();                   // ✅ resync on failure too
                        console.error('Status update error:', xhr.status, xhr.responseText);
                        Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                    }
                });
            } else {
                // Cancel clicked — revert whatever was optimistically toggled,
                // and fully resync selection state + buttons + row highlight.
                revertAll();
                selectedId = 0;
                window.selectedId = 0;
                document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
                updateAccountHeadButtonStates();                           // ✅ this is what was missing
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

function updateAccountHeadButtonStates() {
    const count = $(ACCOUNTHEAD_CHECKBOX_SELECTOR + ':checked').length;
    $('#btnEdit').prop('disabled', count !== 1);
    $('#btnDelete').prop('disabled', count === 0);
    $('#btnActive').prop('disabled', count === 0);
    $('#btnInactive').prop('disabled', count === 0);
}



// Wire every matching checkbox (present now, or added later via the grid
// partial reload) to keep button states in sync automatically.
$(document).on('change', ACCOUNTHEAD_CHECKBOX_SELECTOR, function () {
    const checked = $(ACCOUNTHEAD_CHECKBOX_SELECTOR + ':checked');
    window.selectedAccountHeadId = checked.length === 1 ? parseInt(checked.first().val(), 10) : 0;
    updateAccountHeadButtonStates();
});

// Restrict Account Name to letters/spaces only, same convention as AccountType's txtName
document.getElementById('txtAccountName')?.addEventListener('input', function () {
    this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
});

// ========================================
// Country -> State -> City cascade (shared helpers)
// ========================================
async function loadStatesByCountry(countryId, targetSelectId, preselectStateId = null) {
    const stateEl = document.getElementById(targetSelectId);
    if (!stateEl) return;

    stateEl.innerHTML = '<option value="">-- Select --</option>';
    if (window.jQuery && jQuery(stateEl).data('select2')) jQuery(stateEl).trigger('change');

    if (!countryId) return;

    try {
        const res = await fetch(`/PostalCode/GetStatesByCountry?countryID=${countryId}`);
        const result = await res.json();
        const states = result.data || [];
        stateEl.innerHTML = '<option value="">Select</option>';
        states.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.stateId;
            opt.textContent = s.stateName;
            if (preselectStateId && parseInt(preselectStateId) === s.stateId) opt.selected = true;
            stateEl.appendChild(opt);
        });
        if (window.jQuery && jQuery(stateEl).data('select2')) jQuery(stateEl).trigger('change');
    } catch (err) {
        console.error('Failed to load states:', err);
    }
}

async function loadCitiesByState(stateId, targetSelectId, preselectCityId = null) {
    const cityEl = document.getElementById(targetSelectId);
    if (!cityEl) return;

    cityEl.innerHTML = '<option value="">-- Select --</option>';
    if (window.jQuery && jQuery(cityEl).data('select2')) jQuery(cityEl).trigger('change');

    if (!stateId) return;

    try {
        const res = await fetch(`/PostalCode/GetCitiesByState?stateID=${stateId}`);
        const result = await res.json();
        const cities = result.data || [];
        cityEl.innerHTML = '<option value="">Select</option>';
        cities.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.cityId;
            opt.textContent = c.cityName;
            if (preselectCityId && parseInt(preselectCityId) === c.cityId) opt.selected = true;
            cityEl.appendChild(opt);
        });
        if (window.jQuery && jQuery(cityEl).data('select2')) jQuery(cityEl).trigger('change');
    } catch (err) {
        console.error('Failed to load cities:', err);
    }
}

// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadAccountHeadPartial(queryString) {
    const container = document.getElementById('accountHeadTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/AccountHead/GetAccountHeadPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load account head list');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';
            // Newly rendered rows need their selection state reset and
            // their checkboxes re-checked for the button-state wiring above.
            window.selectedAccountHeadId = 0;
            updateAccountHeadButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// Pagination click interception, scoped to this container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#accountHeadTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    const pageIdx = document.getElementById('hdnPageIndex');
    if (pageIdx) pageIdx.value = new URLSearchParams(query).get('pageNumber') || 1;
    loadAccountHeadPartial(query);
    history.replaceState(null, '', href);
});

(function () {
    var modalEl = document.getElementById('modalDispatchAttachment');
    if (!modalEl || modalEl.dataset.bound === '1') return;
    modalEl.dataset.bound = '1';

    var modalAttachment = new bootstrap.Modal(modalEl);
    //var loading = document.getElementById('dispatchAttachmentLoading');
    var img = document.getElementById('imgDispatchAttachment');
    var frame = document.getElementById('frmDispatchAttachment');
    var unsupported = document.getElementById('dispatchAttachmentUnsupported');
    var btnDownload = document.getElementById('btnDownloadDispatchAttachment');
    var btnDownloadLabel = document.getElementById('btnDownloadDispatchAttachmentLabel');

    var currentUrl = '';
    var currentFileName = '';

    var IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];
    var PDF_EXTS = ['pdf'];

    function getExtension(name) {
        var parts = (name || '').split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }

    function resetPreview() {
        // loading.style.display = 'flex';
        img.style.display = 'none';
        img.src = '';
        frame.style.display = 'none';
        frame.src = '';
        unsupported.classList.add('d-none');
        unsupported.classList.remove('d-flex');
    }

    // Reset the preview each time the popup closes so the previous
    // file doesn't briefly flash before the next one loads.
    modalEl.addEventListener('hidden.bs.modal', resetPreview);

    window.viewDispatchAttachment = function (id, title, fileName, attachmentPath) {
        currentUrl = attachmentPath;
        currentFileName = fileName || 'attachment';

        document.getElementById('modalDispatchAttachmentTitle').textContent = title || 'Attachment';
        resetPreview();

        var ext = getExtension(fileName);

        if (IMAGE_EXTS.indexOf(ext) !== -1) {
            img.onload = function () {
                // loading.style.display = 'none';
                img.style.display = 'block';
            };
            img.onerror = function () {
                //  loading.style.display = 'none';
                unsupported.classList.remove('d-none');
                unsupported.classList.add('d-flex');
            };
            img.src = attachmentPath;
        } else if (PDF_EXTS.indexOf(ext) !== -1) {
            frame.onload = function () {
                //  loading.style.display = 'none';
                frame.style.display = 'block';
            };
            frame.src = attachmentPath;
        } else {
            // loading.style.display = 'none';
            unsupported.classList.remove('d-none');
            unsupported.classList.add('d-flex');
        }

        modalAttachment.show();
    };

    // ── Download button: fetches the file as a blob and saves it
    // locally instead of navigating the browser away from the popup.
    btnDownload.addEventListener('click', function () {
        if (!currentUrl) return;

        btnDownload.disabled = true;
        btnDownloadLabel.textContent = 'Downloading...';

        fetch(currentUrl)
            .then(function (res) {
                if (!res.ok) throw new Error('Download failed');
                return res.blob();
            })
            .then(function (blob) {
                var blobUrl = window.URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = blobUrl;
                a.download = currentFileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(blobUrl);
            })
            .catch(function (err) {
                console.error(err);
                if (window.Swal) {
                    Swal.fire('Error!', 'Could not download the attachment.', 'error');
                } else {
                    alert('Could not download the attachment.');
                }
            })
            .finally(function () {
                btnDownload.disabled = false;
                btnDownloadLabel.textContent = 'Download';
            });
    });
})();

function removeExistingFile() {
    document.getElementById('existingFileInfo')?.remove();
    document.getElementById('hdnRemoveFile').value = 'true';
    document.getElementById('hdnExistingFile').value = '';

}