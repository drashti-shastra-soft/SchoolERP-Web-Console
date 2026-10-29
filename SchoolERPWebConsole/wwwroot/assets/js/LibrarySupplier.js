// =====================================================================
// LibrarySupplier.js  (merged)
// Used by: Add/Edit Supplier page, Supplier list (Index) page, Copy modal.
// Every block is guarded, so it is safe to load on any of those pages.
// =====================================================================

// ========================================
// Shared helpers & permissions
// ========================================
const permCanAdd = window.canAdd;
const permCanEdit = window.canEdit;
const permCanDelete = window.canDelete;

let selectedId = 0;
window.selectedId = 0;

const escHtml = v => String(v ?? '-').replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

function showToast(msg, type = 'success') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<div class="toast align-items-center text-bg-${type} border-0 show position-fixed bottom-0 end-0 m-3" role="alert" style="z-index:9999">
            <div class="d-flex"><div class="toast-body">${escHtml(msg)}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div></div>`;
    document.body.appendChild(wrapper);
    setTimeout(() => wrapper.remove(), 3000);
}

// ========================================
// Validation (Add / Edit form)
// ========================================
const VALIDATION_FIELDS = ['txtSupplierName', 'txtPhone', 'txtEmail', 'txtFAX', 'txtWebSite', 'txtMobileNo', 'txtContactPerson'];

// Phone / "Contact Number" (#txtFAX): optional +, digits / spaces / hyphens / parens, 7-13 digits.
const PHONE_REGEX = /^\+?[0-9](?:[0-9\-\s()]{5,17})[0-9]$/;
// Indian mobile: optional +91 or 0, then 10 digits starting 6-9.
const MOBILE_REGEX = /^(?:\+91|0)?[6-9][0-9]{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEBSITE_REGEX = /^(https?:\/\/)?([\w-]+\.)+[a-zA-Z]{2,}([\/\w\-._~:?#[\]@!$&'()*+,;=%]*)?$/;
const NAME_REGEX = /^[A-Za-z\s.'-]{2,50}$/;
const SUPPLIER_NAME_REGEX = /^[A-Za-z0-9\s.,'&-]{2,100}$/;

function countDigits(v) {
    return (v.match(/\d/g) || []).length;
}

function validatePhoneLike(v) {
    if (!v) return null;
    if (!PHONE_REGEX.test(v) || countDigits(v) < 7 || countDigits(v) > 13) {
        return 'Enter a valid contact number (7-13 digits, optional +, spaces, hyphens).';
    }
    return null;
}

// Returns null if valid, or an error message.
const FIELD_VALIDATORS = {
    txtSupplierName: (v) => {
        if (!v) return 'Supplier Name is required.';
        if (!SUPPLIER_NAME_REGEX.test(v)) return 'Enter a valid supplier name (2-100 characters).';
        return null;
    },
    txtPhone: validatePhoneLike,
    txtFAX: validatePhoneLike,
    txtMobileNo: (v) => {
        if (!v) return null;
        if (!MOBILE_REGEX.test(v)) return 'Enter a valid 10-digit mobile number starting with 6-9.';
        return null;
    },
    txtEmail: (v) => {
        if (!v) return null;
        if (!EMAIL_REGEX.test(v)) return 'Enter a valid email address.';
        return null;
    },
    txtWebSite: (v) => {
        if (!v) return null;
        if (!WEBSITE_REGEX.test(v)) return 'Enter a valid website (e.g. https://example.com).';
        return null;
    },
    txtContactPerson: (v) => {
        if (!v) return null;
        if (!NAME_REGEX.test(v)) return 'Enter a valid name (letters only).';
        return null;
    }
};

function showFieldError(id, msg) {
    document.getElementById(id)?.classList.add('is-invalid');
    const errEl = document.getElementById('err' + id);
    if (errEl) errEl.textContent = msg;
}

function clearFieldError(id) {
    document.getElementById(id)?.classList.remove('is-invalid');
    const errEl = document.getElementById('err' + id);
    if (errEl) errEl.textContent = '';
}

function clearAllErrors() {
    VALIDATION_FIELDS.forEach(clearFieldError);
}

function validateField(id) {
    const el = document.getElementById(id);
    if (!el) return true;
    const validator = FIELD_VALIDATORS[id];
    const error = validator ? validator(el.value.trim()) : null;
    if (error) {
        showFieldError(id, error);
        return false;
    }
    clearFieldError(id);
    return true;
}

function validateForm() {
    clearAllErrors();
    let isValid = true;
    VALIDATION_FIELDS.forEach(id => {
        if (!validateField(id)) isValid = false;
    });
    return isValid;
}

// Live validation: re-check on blur, clear red state while typing.
VALIDATION_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', () => validateField(id));
    el.addEventListener('input', () => clearFieldError(id));
});

// Digits-only lock for Mobile No
(function lockMobileNoToDigits() {
    const el = document.getElementById('txtMobileNo');
    if (!el) return;

    el.setAttribute('inputmode', 'numeric');
    el.setAttribute('maxlength', '10');

    el.addEventListener('input', function () {
        const digitsOnly = this.value.replace(/\D/g, '').slice(0, 10);
        if (this.value !== digitsOnly) this.value = digitsOnly;
    });

    el.addEventListener('paste', function (e) {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text');
        const digitsOnly = pasted.replace(/\D/g, '').slice(0, 10);
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = (this.value.slice(0, start) + digitsOnly + this.value.slice(end)).slice(0, 10);
        this.dispatchEvent(new Event('input'));
    });

    el.addEventListener('keydown', function (e) {
        const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
        if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) return;
        if (!/^[0-9]$/.test(e.key)) e.preventDefault();
    });
})();

// ========================================
// PIN CODE -> COUNTRY / STATE / CITY
// (replaces the old loadStatesByCountry / loadCitiesByState + pincode block)
// ========================================
const GeoAddress = (function () {
    const norm = s => String(s ?? '').trim().toLowerCase();
    const pick = (o, ...keys) => {
        if (!o) return null;
        for (const k of keys) {
            const hit = Object.keys(o).find(x => x.toLowerCase() === k.toLowerCase());
            if (hit && o[hit] != null && o[hit] !== '') return o[hit];
        }
        return null;
    };
    // refresh select2 UI without firing our own 'change' handlers
    const refresh = el => {
        if (window.jQuery && jQuery(el).data('select2')) jQuery(el).trigger('change.select2');
    };

    let pinEl, listEl, countryEl, stateEl, cityEl;
    let timer, items = [];

    async function fill(select, url, idKey, nameKey, preId, placeholder, preName) {
        const token = (select._token = (select._token || 0) + 1);
        select.innerHTML = `<option value="">${placeholder}</option>`;
        refresh(select);
        if (!url) return false;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const json = await res.json();
            if (token !== select._token) return false;              // stale response
            (json.data || json.Data || []).forEach(x => {
                const id = pick(x, idKey), name = pick(x, nameKey);
                if (id == null || name == null) return;
                select.add(new Option(name, id));
            });

            let matched = false;
            if (preId != null && preId !== '') {                    // 1) by id
                select.value = String(preId);
                matched = select.value === String(preId);
            }
            if (!matched && preName) {                              // 2) by name
                const opt = [...select.options].find(o => o.value && norm(o.text) === norm(preName));
                if (opt) { select.value = opt.value; matched = true; }
            }
            refresh(select);
            return matched;
        } catch (err) {
            console.error('Failed to load', url, err);
            return false;
        }
    }

    const loadStates = (countryId, preId, preName) => fill(stateEl,
        countryId ? `/PostalCode/GetStatesByCountry?countryID=${countryId}` : null,
        'stateId', 'stateName', preId, '-- Select State --', preName);

    const loadCities = (stateId, preId, preName) => fill(cityEl,
        stateId ? `/PostalCode/GetCitiesByState?stateID=${stateId}` : null,
        'cityId', 'cityName', preId, '-- Select City --', preName);

    function hideList() { listEl.style.display = 'none'; listEl.innerHTML = ''; }

    function renderList() {
        listEl.innerHTML = '';
        items.forEach(it => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action';
            li.style.cursor = 'pointer';
            const city = pick(it, 'cityName');
            li.textContent = pick(it, 'postalCode', 'pinCode') + (city ? ' - ' + city : '');
            li.addEventListener('click', () => selectItem(it));
            listEl.appendChild(li);
        });
        listEl.style.display = 'block';
    }

    async function fetchPins(term) {
        try {
            const res = await fetch(`/Hostel/SearchPostalCode?term=${encodeURIComponent(term)}`);
            const result = await res.json();
            if (pinEl.value.trim() !== term) return;                // user kept typing
            const data = result.data || result.Data;
            if (!(result.success && data && data.length)) return hideList();
            items = data;
            if (term.length === 6 && items.length === 1) return selectItem(items[0]);
            renderList();
        } catch (err) {
            console.error('SearchPostalCode error:', err);
            hideList();
        }
    }

    async function selectItem(it) {
        const countryId = pick(it, 'countryId'), countryName = pick(it, 'countryName');
        const stateId = pick(it, 'stateId'), stateName = pick(it, 'stateName');
        const cityId = pick(it, 'cityId'), cityName = pick(it, 'cityName');

        pinEl.value = pick(it, 'postalCode', 'pinCode') ?? pinEl.value;
        hideList();

        // country: by id -> by name -> India
        if (countryId != null) countryEl.value = String(countryId);
        if (!countryEl.value && countryName) {
            const o = [...countryEl.options].find(o => o.value && norm(o.text) === norm(countryName));
            if (o) countryEl.value = o.value;
        }
        if (!countryEl.value) {
            const o = [...countryEl.options].find(o => o.value && norm(o.text) === 'india');
            if (o) countryEl.value = o.value;
        }
        refresh(countryEl);
        if (!countryEl.value) return;

        await loadStates(countryEl.value, stateId, stateName);
        await loadCities(stateEl.value, cityId, cityName);
    }

    function onChange(el, fn) {
        if (window.jQuery) jQuery(el).on('change', fn);   // catches select2 events
        else el.addEventListener('change', fn);
    }

    function init() {
        pinEl = document.getElementById('txtPinCode');
        listEl = document.getElementById('pinCodeSuggestions');
        countryEl = document.getElementById('ddlCountry');
        stateEl = document.getElementById('ddlState');
        cityEl = document.getElementById('ddlCity');
        if (!pinEl || !listEl || !countryEl || !stateEl || !cityEl) return;   // not the Add/Edit page

        pinEl.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '').slice(0, 6);
            clearTimeout(timer);
            if (this.value.length < 2) return hideList();
            timer = setTimeout(() => fetchPins(this.value), 300);
        });

        document.addEventListener('click', ev => {
            if (!pinEl.contains(ev.target) && !listEl.contains(ev.target)) hideList();
        });

        // Country change -> states ; State change -> cities
        onChange(countryEl, () => { loadStates(countryEl.value); loadCities(null); });
        onChange(stateEl, () => loadCities(stateEl.value));

        // Edit mode: restore saved state / city
        if (countryEl.value) {
            const preState = document.getElementById('hdnSelectedStateId')?.value;
            const preCity = document.getElementById('hdnSelectedCityId')?.value;
            loadStates(countryEl.value, preState).then(() => {
                if (stateEl.value) loadCities(stateEl.value, preCity);
            });
        }
    }

    return { init };
})();

// ========================================
// Filter badges — sessionStorage persistence (list page)
// ========================================
const FILTER_KEY = 'appliedFilters_supplier';
let appliedFilters = {};

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
    const searchEl = document.getElementById('txtSearchInput');

    const hdnCompany = document.getElementById('hdnCompanyId');
    const hdnSearch = document.getElementById('hdnSearch');
    if (companyEl && hdnCompany) hdnCompany.value = companyEl.value;
    if (searchEl && hdnSearch) hdnSearch.value = searchEl.value.trim();

    const form = document.getElementById('frmSearch');
    if (!form) return;
    const params = new URLSearchParams(new FormData(form)).toString();
    loadLibrarySupplierPartial(params);
}

function applyFilters() {
    const companyEl = document.getElementById('ddlFilterCompany');
    const searchEl = document.getElementById('txtSearchInput');

    const searchVal = searchEl?.value.trim() ?? '';
    const hdnSearch = document.getElementById('hdnSearch');
    if (hdnSearch) hdnSearch.value = searchVal;

    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    if (companyEl?.value) {
        appliedFilters['ddlFilterCompany'] = {
            label: 'Company',
            text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value
        };
    } else delete appliedFilters['ddlFilterCompany'];

    saveAppliedFilters();
    renderFilterBadges();
    const hdnPage = document.getElementById('hdnPageIndex');
    if (hdnPage) hdnPage.value = 1;
    submitForm();
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
        badge.innerHTML = `${escHtml(label)}: ${escHtml(text)} <i class="ti ti-x ms-1 cursor-pointer" onclick="removeFilter('${id}')" style="font-size:10px;"></i>`;
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
    const hdnSearchEl = document.getElementById('hdnSearch');
    if (hdnSearchEl) hdnSearchEl.value = '';

    const companyEl = document.getElementById('ddlFilterCompany');
    if (companyEl) {
        companyEl.value = '';
        if (window.jQuery && jQuery(companyEl).data('select2')) jQuery(companyEl).val('').trigger('change');
    }

    clearAppliedFilters();
    renderFilterBadges();
    const hdnPage = document.getElementById('hdnPageIndex');
    if (hdnPage) hdnPage.value = 1;

    // close the filter dropdown
    const toggleEl = document.getElementById('btnFilterToggle');
    if (toggleEl && window.bootstrap) {
        (bootstrap.Dropdown.getInstance(toggleEl) || new bootstrap.Dropdown(toggleEl)).hide();
    }
    submitForm();
}

// ========================================
// List page: DataTable (export only)
// ========================================
function triggerExport(index) {
    if ($.fn.DataTable && $.fn.DataTable.isDataTable('#tblBudget')) {
        $('#tblBudget').DataTable().button(index).trigger();
    }
}

function initSupplierTable(rowsVisibleOnly) {
    if (!$.fn.DataTable || !document.getElementById('tblBudget')) return;
    try {
        if ($.fn.DataTable.isDataTable('#tblBudget')) $('#tblBudget').DataTable().destroy();
        $.fn.dataTable.ext.errMode = 'none';

        const companyname = localStorage.getItem('comName');
        const exportOptions = { columns: [1, 2, 3, 4, 5, 6, 7] };
        if (rowsVisibleOnly) exportOptions.rows = ':visible';

        window.exportTable = $('#tblBudget').DataTable({
            dom: 'Bfrtip',
            buttons: ['copy', 'csv', 'excel', 'pdf', 'print'].map(t => ({
                extend: t, title: `Supplier - ${companyname}`, exportOptions
            })),
            language: { emptyTable: 'No records found.' },
            searching: false,
            paging: false,
            info: false,
            ordering: false
        });
    } catch (e) {
        console.warn('DataTable init warning (tblBudget):', e);
    }
}

// ========================================
// List page: selection / edit / delete / status
// ========================================
function updateButtonStates() {
    const count = $('.student-checkbox:checked').length;
    $('#btnEdit').prop('disabled', count !== 1);
    $('#btnDelete').prop('disabled', count === 0);
    $('#btnActive').prop('disabled', count === 0);
    $('#btnInactive').prop('disabled', count === 0);
}

// Row click helper (kept for partials that call selectItem(id, row))
function selectItem(id, row) {
    selectedId = id;
    window.selectedId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    row?.classList.add('bg-light');

    const count = $('.student-checkbox:checked').length;
    $('#btnEdit').prop('disabled', !(permCanEdit && count === 1));
    $('#btnDelete').prop('disabled', !(permCanDelete && count > 0));
    $('#btnActive').prop('disabled', !(permCanEdit && count > 0));
    $('#btnInactive').prop('disabled', !(permCanEdit && count > 0));
}

$(document).on('change', '.student-checkbox', function () {
    const $checked = $('.student-checkbox:checked');
    const count = $checked.length;

    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    $checked.each(function () { $(this).closest('tr').addClass('bg-light'); });

    // Edit needs exactly one id. (Was stored in selectedClassId, which editSelected never read.)
    selectedId = count === 1 ? parseInt($checked.first().val()) : 0;
    window.selectedId = selectedId;

    $('#btnEdit').prop('disabled', !(permCanEdit && count === 1));
    $('#btnDelete').prop('disabled', !(permCanDelete && count > 0));
    $('#btnActive').prop('disabled', !(permCanEdit && count > 0));
    $('#btnInactive').prop('disabled', !(permCanEdit && count > 0));
});

function editSelected() {
    if (!window.selectedId) return;
    location.href = `/LibrarySupplier/Add/${window.selectedId}`;
}

function deleteSelected() {
    const selectedIds = [];
    $('.student-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        showToast('Please select at least one supplier.', 'warning');
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: 'You are about to delete this supplier record. This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-secondary' },
        buttonsStyling: false
    }).then((result) => {
        if (!result.isConfirmed) return;
        $.ajax({
            url: '/LibrarySupplier/DeleteLibrarySupplier',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(selectedIds),
            success: function (res) {
                if (res.success) {
                    Swal.fire('Deleted!', 'Supplier record has been deleted.', 'success')
                        .then(() => location.reload());
                } else {
                    Swal.fire('Error!', res.message || 'Failed to delete supplier.', 'error');
                }
            },
            error: function () {
                Swal.fire('Error!', 'An unexpected error occurred.', 'error');
            }
        });
    });
}

async function toggleStatus(id, isActive, checkboxEl) {
    if (!permCanEdit) {
        showToast('You do not have permission to change status.', 'danger');
        if (checkboxEl) checkboxEl.checked = !isActive;
        return;
    }

    const ids = [];
    const checkedBoxes = [];
    $('.student-checkbox:checked').each(function () {
        ids.push(parseInt($(this).val()));
        checkedBoxes.push(this);
    });

    // single-row toggle (switch inside the row)
    if (ids.length === 0) {
        if (id != 0) {
            ids.push(parseInt(id));
            if (checkboxEl) checkedBoxes.push(checkboxEl);
        } else {
            showToast('Please select at least one supplier.', 'warning');
            return;
        }
    }

    const request = { ids: ids.join(','), isActive: isActive };

    function revertAll() {
        checkedBoxes.forEach(cb => {
            if (cb.classList.contains('student-checkbox')) cb.checked = false;   // bulk path: deselect row
            else cb.checked = !isActive;                                          // inline switch: restore
        });
        updateButtonStates();
    }

    const config = isActive
        ? { icon: 'question', title: 'Activate Record(s)?', text: 'Activating this record will make it visible and available for use across the system. Do you want to continue?' }
        : { icon: 'warning', title: 'Deactivate Record(s)?', text: 'Deactivating this record will hide it from the system and prevent it from being used. Do you want to continue?' };

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
        if (!result.isConfirmed) {
            revertAll();
            selectedId = 0;
            window.selectedId = 0;
            document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
            return;
        }
        $.ajax({
            url: '/LibrarySupplier/ToggleLibrarySupplier',
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
    });
}

// ========================================
// List page: partial reload + pagination
// ========================================
function loadLibrarySupplierPartial(queryString) {
    const container = document.getElementById('supplierTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/LibrarySupplier/GetLibrarySupplierPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load suppliers');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';
            initSupplierTable(true);
            updateButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
            else showToast('Could not refresh the list.', 'danger');
        });
}

document.addEventListener('click', function (e) {
    const link = e.target.closest('#supplierTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    const qs = new URLSearchParams(query);
    const hdnPage = document.getElementById('hdnPageIndex');
    if (hdnPage) hdnPage.value = qs.get('PageIndex') || qs.get('pageIndex') || 1;
    loadLibrarySupplierPartial(query);
    history.replaceState(null, '', href);
});

// ========================================
// Save (Add / Edit form)
// ========================================
async function saveItem() {
    if (!validateForm()) return;

    const cId = parseInt(document.getElementById('txtItemId').value) || 0;
    const companyID = parseInt(document.getElementById('hdnCompanyID').value) || 0;

    if (cId === 0 && !permCanAdd) {
        showToast('You do not have permission to add.', 'danger');
        return;
    }
    if (cId > 0 && !permCanEdit) {
        showToast('You do not have permission to edit.', 'danger');
        return;
    }

    const getVal = id => document.getElementById(id)?.value?.trim() || null;
    const getId = id => parseInt(document.getElementById(id)?.value) || null;

    const data = {
        supplierId: cId,
        supplierName: document.getElementById('txtSupplierName').value.trim(),
        phone: getVal('txtPhone'),
        email: getVal('txtEmail'),
        address: getVal('txtAddress'),
        postalCode: getVal('txtPinCode'),
        countryId: getId('ddlCountry'),
        stateId: getId('ddlState'),
        cityId: getId('ddlCity'),
        fax: getVal('txtFAX'),
        webSite: getVal('txtWebSite'),
        mobileNo: getVal('txtMobileNo'),
        contactPerson: getVal('txtContactPerson'),
        isActive: document.getElementById('isActive').checked,
        companyID: companyID
    };

    try {
        const r = await fetch('/LibrarySupplier/SaveLibrarySupplier', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const res = await r.json();
        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: cId > 0 ? 'Supplier has been updated successfully.' : 'Supplier has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => { window.location.href = '/LibrarySupplier/Index'; });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save supplier.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
    } catch (err) {
        console.error(err);
        showToast('Could not save supplier.', 'danger');
    }
}

// ========================================
// Page init
// ========================================
$(document).ready(function () {
    // Add / Edit page
    GeoAddress.init();

    // List page
    clearAppliedFilters();          // start clean on every fresh load
    renderFilterBadges();
    initSupplierTable(false);

    document.getElementById('btnApplyFilters')?.addEventListener('click', applyFilters);
    document.getElementById('btnResetFilters')?.addEventListener('click', resetAllFilters);

    // Auto-apply search as the user types (300ms debounce)
    const searchInput = document.getElementById('txtSearchInput');
    if (searchInput) {
        let searchTimer = null;

        searchInput.addEventListener('input', function () {
            const val = this.value.trim();
            const hdnSearch = document.getElementById('hdnSearch');
            if (hdnSearch) hdnSearch.value = val;

            if (val) appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
            else delete appliedFilters['txtSearchInput'];
            saveAppliedFilters();
            renderFilterBadges();

            clearTimeout(searchTimer);
            searchTimer = setTimeout(function () {
                const hdnPage = document.getElementById('hdnPageIndex');
                if (hdnPage) hdnPage.value = 1;
                submitForm();
            }, 300);
        });

        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                clearTimeout(searchTimer);
                applyFilters();      // saves, renders badges, resets page, submits (once)
            }
        });
    }
});

// =====================================================================
// COPY SUPPLIERS TO ANOTHER COMPANY  (modal: #copyBudgetModal)
// Company-only copy — no session dropdowns.
// Include the matching modal partial on the page that calls
// openCopyLibrarySupplierModal().
// =====================================================================
const BUDGET_COLUMNS = {
    headers: ['Supplier Name', 'Address', 'FAX', 'Web Site', 'Mobile No', 'Contact Person', 'Status'],
    // Row has: [checkbox] [#] + the 7 columns above  => 9 cells (colspan = headers.length + 2)
    row: (r, i) => `
        <td><input type="checkbox" class="form-check-input budget-row-check"
                   value="${escHtml(r.supplierId ?? r.supplierID ?? '')}" onchange="updateBudgetCount()"></td>
        <td>${i + 1}</td>
        <td>${escHtml(r.supplierName)}</td>
        <td>${escHtml(r.address)}</td>
        <td>${escHtml(r.fAX ?? r.fax)}</td>
        <td>${escHtml(r.webSite)}</td>
        <td>${escHtml(r.mobileNo)}</td>
        <td>${escHtml(r.contactPerson)}</td>
        <td><span class="badge bg-${r.isActive ? 'success' : 'secondary'}-subtle text-${r.isActive ? 'success' : 'secondary'}">
            ${r.isActive ? 'Active' : 'Inactive'}</span></td>`
};

let lastBudgetFrom = '';   // avoids reloading the table (and losing ticks) when only "To" changes

function openCopyLibrarySupplierModal() {
    lastBudgetFrom = '';
    document.getElementById('tableSectionBudget').classList.add('d-none');
    document.getElementById('validationBoxBudget').classList.add('d-none');
    document.getElementById('btnCopyBudget').disabled = true;
    document.getElementById('budgetTbody').innerHTML = '';

    bootstrap.Modal.getOrCreateInstance(document.getElementById('copyBudgetModal')).show();
    initBudgetCopy();
}

async function fetchCompaniesForBudget() {
    const resp = await fetch('/Company/GetAssignedCompanies', { method: 'GET' });
    const payload = await resp.json();
    if (!payload || payload.success !== true || !Array.isArray(payload.data)) {
        throw new Error(payload?.message || 'Failed to load companies');
    }
    return payload.data;
}

async function initBudgetCopy() {
    try {
        const ddlFrom = document.getElementById('fromAccountBudget');
        const ddlTo = document.getElementById('toAccountBudget');
        if (!ddlFrom || !ddlTo) return;

        ddlFrom.innerHTML = '<option value="">From company</option>';
        ddlTo.innerHTML = '<option value="">To company</option>';

        const companies = await fetchCompaniesForBudget();
        const currentCompanyId = window.getCompanyId ? window.getCompanyId() : null;

        companies.forEach(c => {
            const label = c.schoolName || `Company #${c.companyId}`;

            const optFrom = new Option(label, String(c.companyId));
            if (currentCompanyId && String(currentCompanyId) === String(c.companyId)) optFrom.selected = true;
            ddlFrom.add(optFrom);

            ddlTo.add(new Option(label, String(c.companyId)));   // "To" has no default on purpose
        });

        validateCopyBudget();   // loads the table for the pre-selected "From" and sets button state
    } catch (e) {
        console.error(e);
        showToast('Could not load companies.', 'danger');
    }
}

// Runs on every dropdown change (wired via onchange in the modal partial)
function validateCopyBudget() {
    const fromAcc = document.getElementById('fromAccountBudget').value;
    const toAcc = document.getElementById('toAccountBudget').value;
    const isSame = fromAcc && toAcc && fromAcc === toAcc;

    document.getElementById('validationBoxBudget').classList.toggle('d-none', !isSame);

    if (!fromAcc) {
        lastBudgetFrom = '';
        document.getElementById('tableSectionBudget').classList.add('d-none');
    } else if (fromAcc !== lastBudgetFrom) {
        lastBudgetFrom = fromAcc;
        loadBudgetTableData(fromAcc);
    }

    updateBudgetCount();
}

async function loadBudgetTableData(fromAcc) {
    const theadRow = document.querySelector('#tblBudgetCopy thead tr');
    const tbody = document.getElementById('budgetTbody');
    const colSpan = BUDGET_COLUMNS.headers.length + 2;

    try {
        theadRow.innerHTML = `
            <th style="width:40px"><input type="checkbox" class="form-check-input" id="chkAllBudget" onchange="toggleSelectAllBudget(this)"></th>
            <th style="width:40px">#</th>
            ${BUDGET_COLUMNS.headers.map(h => `<th>${h}</th>`).join('')}`;

        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-3 text-muted">
            <div class="spinner-border spinner-border-sm me-2"></div>Loading...</td></tr>`;
        document.getElementById('tableSectionBudget').classList.remove('d-none');

        const resp = await fetch(`/LibrarySupplier/GetAll?companyId=${encodeURIComponent(fromAcc)}`);
        const res = await resp.json();

        // ignore the response if the user switched "From" meanwhile
        if (document.getElementById('fromAccountBudget').value !== fromAcc) return [];

        if (!res.success || !res.data?.length) {
            tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-3 text-muted">No records found.</td></tr>`;
            updateBudgetCount();
            return [];
        }

        tbody.innerHTML = res.data.map((r, i) => `<tr>${BUDGET_COLUMNS.row(r, i)}</tr>`).join('');
        updateBudgetCount();
        return res.data;
    } catch (err) {
        console.error('loadBudgetTableData error:', err);
        lastBudgetFrom = '';   // allow retry
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-3 text-danger">
            <i class="ti ti-alert-circle me-1"></i>Failed to load data. Please try again.</td></tr>`;
        updateBudgetCount();
        return [];
    }
}

function toggleSelectAllBudget(cb) {
    document.querySelectorAll('.budget-row-check').forEach(c => c.checked = cb.checked);
    updateBudgetCount();
}

function updateBudgetCount() {
    const all = document.querySelectorAll('.budget-row-check');
    const checked = document.querySelectorAll('.budget-row-check:checked').length;

    const selCount = document.getElementById('selCountBudget');
    if (selCount) selCount.textContent = `${checked} selected`;

    const chkAll = document.getElementById('chkAllBudget');
    if (chkAll) chkAll.checked = all.length > 0 && checked === all.length;

    const fromAcc = document.getElementById('fromAccountBudget').value;
    const toAcc = document.getElementById('toAccountBudget').value;
    const isSame = fromAcc && toAcc && fromAcc === toAcc;

    document.getElementById('btnCopyBudget').disabled = !(fromAcc && toAcc && !isSame && checked > 0);
}

async function handleCopyBudget() {
    const fromAcc = document.getElementById('fromAccountBudget').value;
    const toAcc = document.getElementById('toAccountBudget').value;
    const selectedIds = [...document.querySelectorAll('.budget-row-check:checked')]
        .map(c => parseInt(c.value)).filter(n => !isNaN(n));

    if (selectedIds.length === 0) {
        showToast('Select at least one supplier to copy.', 'warning');
        return;
    }

    const payload = {
        fromCompanyId: parseInt(fromAcc),
        toCompanyId: parseInt(toAcc),
        ids: selectedIds
    };

    const btn = document.getElementById('btnCopyBudget');
    btn.disabled = true;

    try {
        const res = await fetch('/LibrarySupplier/CopyLibrarySupplier', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('copyBudgetModal'))?.hide();
            Swal.fire({
                icon: 'success',
                title: 'Copied!',
                text: data.message || 'Supplier(s) copied successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => location.reload());
        } else {
            // keep the modal open so the user can adjust and retry
            Swal.fire({
                icon: 'warning',
                title: 'Copy failed',
                text: data.message || 'Copy failed.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Network error. Please try again.', 'error');
    } finally {
        updateBudgetCount();
    }
}

// Entry points used by the page / modal markup
window.openCopyLibrarySupplierModal = openCopyLibrarySupplierModal;
window.validateCopyBudget = validateCopyBudget;
window.toggleSelectAllBudget = toggleSelectAllBudget;
window.updateBudgetCount = updateBudgetCount;
window.handleCopyBudget = handleCopyBudget;