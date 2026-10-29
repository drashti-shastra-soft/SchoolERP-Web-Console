
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

    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadPurposePartial(params);
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

var exportTable;

function triggerExport(type) {
    if (!exportTable) return;
    if (type === 'copy') exportTable.button('.buttons-copy').trigger();
    else if (type === 'csv') exportTable.button('.buttons-csv').trigger();
    else if (type === 'excel') exportTable.button('.buttons-excel').trigger();
    else if (type === 'pdf') exportTable.button('.buttons-pdf').trigger();
    else if (type === 'print') exportTable.button('.buttons-print').trigger();
}


$(document).ready(function () {
    if ($('#companyTable tbody tr.item-row').length > 0) {
        window.exportTable = $('#companyTable').DataTable({
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'copy',
                    title: `Company`,
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5],
                        rows: ':visible',
                        format: {
                            body: function (data, row, column, node) {
                                if (column === 1) {
                                    const span = node.querySelector('.text-dark');
                                    if (span) {
                                        const levelDiv = node.querySelector('div');
                                        let level = 0;
                                        if (levelDiv && levelDiv.style.marginLeft) {
                                            const ml = parseFloat(levelDiv.style.marginLeft);
                                            if (!isNaN(ml)) {
                                                level = Math.round(ml / 2.5);
                                            }
                                        }
                                        const indent = '    '.repeat(level);
                                        return indent + span.textContent.trim();
                                    }
                                }
                                if (column === 4) {
                                    return node ? node.textContent.replace(/\s+/g, ' ').trim() : data.replace(/\s+/g, ' ').trim();
                                }
                                return node ? node.textContent.replace(/\s+/g, ' ').trim() : data;
                            }
                        }
                    }
                },
                {
                    extend: 'csv',
                    title: `Company`,
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5],
                        rows: ':visible',
                        format: {
                            body: function (data, row, column, node) {
                                if (column === 1) {
                                    const span = node.querySelector('.text-dark');
                                    if (span) {
                                        const levelDiv = node.querySelector('div');
                                        let level = 0;
                                        if (levelDiv && levelDiv.style.marginLeft) {
                                            const ml = parseFloat(levelDiv.style.marginLeft);
                                            if (!isNaN(ml)) {
                                                level = Math.round(ml / 2.5);
                                            }
                                        }
                                        const indent = '    '.repeat(level);
                                        return indent + span.textContent.trim();
                                    }
                                }
                                if (column === 4) {
                                    return node ? node.textContent.replace(/\s+/g, ' ').trim() : data.replace(/\s+/g, ' ').trim();
                                }
                                return node ? node.textContent.replace(/\s+/g, ' ').trim() : data;
                            }
                        }
                    }
                },
                {
                    extend: 'excel',
                    title: `Company`,
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5],
                        rows: ':visible',
                        format: {
                            body: function (data, row, column, node) {
                                if (column === 1) {
                                    const span = node.querySelector('.text-dark');
                                    if (span) {
                                        const levelDiv = node.querySelector('div');
                                        let level = 0;
                                        if (levelDiv && levelDiv.style.marginLeft) {
                                            const ml = parseFloat(levelDiv.style.marginLeft);
                                            if (!isNaN(ml)) {
                                                level = Math.round(ml / 2.5);
                                            }
                                        }
                                        const indent = '    '.repeat(level);
                                        return indent + span.textContent.trim();
                                    }
                                }
                                if (column === 4) {
                                    return node ? node.textContent.replace(/\s+/g, ' ').trim() : data.replace(/\s+/g, ' ').trim();
                                }
                                return node ? node.textContent.replace(/\s+/g, ' ').trim() : data;
                            }
                        }
                    }
                },
                {
                    extend: 'pdf',
                    title: `Company`,
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5],
                        rows: ':visible',
                        format: {
                            body: function (data, row, column, node) {
                                if (column === 1) {
                                    const span = node.querySelector('.text-dark');
                                    if (span) {
                                        const levelDiv = node.querySelector('div');
                                        let level = 0;
                                        if (levelDiv && levelDiv.style.marginLeft) {
                                            const ml = parseFloat(levelDiv.style.marginLeft);
                                            if (!isNaN(ml)) {
                                                level = Math.round(ml / 2.5);
                                            }
                                        }
                                        const indent = '    '.repeat(level);
                                        return indent + span.textContent.trim();
                                    }
                                }
                                if (column === 4) {
                                    return node ? node.textContent.replace(/\s+/g, ' ').trim() : data.replace(/\s+/g, ' ').trim();
                                }
                                return node ? node.textContent.replace(/\s+/g, ' ').trim() : data;
                            }
                        }
                    }
                },
                {
                    extend: 'print',
                    title: `Company`,
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5],
                        rows: ':visible',
                        format: {
                            body: function (data, row, column, node) {
                                if (column === 1) {
                                    const span = node.querySelector('.text-dark');
                                    if (span) {
                                        const levelDiv = node.querySelector('div');
                                        let level = 0;
                                        if (levelDiv && levelDiv.style.marginLeft) {
                                            const ml = parseFloat(levelDiv.style.marginLeft);
                                            if (!isNaN(ml)) {
                                                level = Math.round(ml / 2.5);
                                            }
                                        }
                                        const indent = '    '.repeat(level);
                                        return indent + span.textContent.trim();
                                    }
                                }
                                if (column === 4) {
                                    return node ? node.textContent.replace(/\s+/g, ' ').trim() : data.replace(/\s+/g, ' ').trim();
                                }
                                return node ? node.textContent.replace(/\s+/g, ' ').trim() : data;
                            }
                        }
                    }
                }
            ],
            searching: false,
            paging: false,
            info: false,
            ordering: false,
            language: { emptyTable: 'No records found.' }
        });
    }
});

// ========================================
// DOMContentLoaded — filter buttons, badges, pincode autocomplete, cascades
// ========================================
document.addEventListener('DOMContentLoaded', function () {  

    const input = document.getElementById('txtPinCode');
    const list = document.getElementById('pinCodeSuggestions');

    let debounceTimer;
    let currentItems = [];

    // ✅ Field validation error-clearing — runs ONCE, independent of pincode
    const fieldErrorMap = {
        'txtHostelName': 'errHostelName',
        'ddlHostelType': 'errHostelType',
        'txtIntake': 'errIntake'
        // add more required fields here as needed
    };

    Object.keys(fieldErrorMap).forEach(fieldId => {
        const el = document.getElementById(fieldId);
        const errEl = document.getElementById(fieldErrorMap[fieldId]);
        if (!el || !errEl) return;

        const clearError = () => {
            const val = el.value?.toString().trim();
            if (val) {
                el.classList.remove('field-invalid');
                errEl.classList.add('d-none');
            }
        };

        el.addEventListener('input', clearError);
        el.addEventListener('change', clearError);

        if (window.jQuery) {
            jQuery(el).on('change select2:select', clearError);
        }
    });

    // ── PinCode autocomplete (unrelated — separate guard) ──
    if (!input || !list) {
        console.warn('PinCode autocomplete: input or list element not found');
        return;
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

    // ── PinCode input listener (clean, no validation code inside) ──
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
    clearNotice: (id) => { const el = document.getElementById(id); if (el) el.innerHTML = ''; },
    isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    bindAutoClear: (map) => Object.keys(map).forEach(k => {
        const clear = () => {
            document.getElementById(k)?.classList.remove('is-invalid');
            const err = document.getElementById(map[k]); if (err) err.textContent = '';
        };
        document.getElementById(k)?.addEventListener('input', clear);
        document.getElementById(k)?.addEventListener('change', clear);
        // select2 fires its own events on top of the underlying <select>'s change
        if (window.jQuery && jQuery(`#${k}`).length) {
            jQuery(`#${k}`).on('change select2:select select2:clear', clear);
        }
    })
};
const companyFieldMap = {
    txtSchoolName: 'errSchoolName',
    txtSchoolCode: 'errSchoolCode',
    ddlCurrency: 'errCurrency',
    txtPhone: 'errPhone',
    txtEmail: 'errEmail'
};
const pendingLogos = {};

function logoNotify(message, type) {
    if (typeof showToast === 'function') showToast(message, type);
    else alert(message);
}
const logoInputs = {
    txtPrintLogo: { key: 'printLogo', preview: '#previewPrintLogo', label: 'Print Logo', maxMB: 2 },
    txtAdminLogo: { key: 'adminLogo', preview: '#previewAdminLogo', label: 'Admin Logo', maxMB: 2 },
    txtAdminSmallLogo: { key: 'adminSmallLogo', preview: '#previewAdminSmallLogo', label: 'Admin Small Logo', maxMB: 1 },
    txtWaterMark: { key: 'waterMark', preview: '#previewWaterMark', label: 'Water Mark', maxMB: 2 },
    'input-file': { key: 'loginBackground', preview: '#previewLoginBg', label: 'Login Background', maxMB: 5 }
};


$(document).on('change', Object.keys(logoInputs).map(id => '#' + id).join(','), function () {
    const cfg = logoInputs[this.id];
    const file = this.files && this.files[0];
    if (!cfg || !file) return;

    if (!file.type || !file.type.startsWith('image/')) {
        logoNotify(cfg.label + ': please choose an image file.', 'warning');
        this.value = '';
        return;
    }
    if (file.size > cfg.maxMB * 1024 * 1024) {
        logoNotify(cfg.label + ': file is too large (max ' + cfg.maxMB + ' MB).', 'warning');
        this.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        pendingLogos[cfg.key] = { base64: e.target.result, name: file.name };
        $(cfg.preview).attr('src', e.target.result).show();
    };
    reader.onerror = function () {
        logoNotify(cfg.label + ': could not read the file.', 'error');
    };
    reader.readAsDataURL(file);
});

// Returns e.g. { printLogoBase64, printLogoName, adminLogoBase64, ... }
// Images the user did not pick are null, so the server / SP keeps the old ones.
function getLogoPayload() {
    const payload = {};
    Object.values(logoInputs).forEach(cfg => {
        const item = pendingLogos[cfg.key];
        payload[cfg.key + 'Base64'] = item ? item.base64 : null;
        payload[cfg.key + 'Name'] = item ? item.name : null;
    });
    return payload;
}



function clearCompanyModalValidation() {
    IV.clearMap(companyFieldMap);
    IV.clearNotice('companyModalNotice');
}
IV.bindAutoClear(companyFieldMap);

function toggleHierarchy(parentId, event) {
    event.stopPropagation();
    const toggle = event.currentTarget;
    const isCollapsed = toggle.classList.toggle('collapsed');
    const icon = toggle.querySelector('i');

    if (isCollapsed) {
        icon.classList.replace('ti-minus', 'ti-plus');
        hideChildren(parentId);
    } else {
        icon.classList.replace('ti-plus', 'ti-minus');
        showChildren(parentId);
    }
}

function hideChildren(parentId) {
    document.querySelectorAll(`tr[data-parent="${parentId}"]`).forEach(row => {
        row.classList.add('hidden');
        const id = row.getAttribute('data-id');
        const toggle = row.querySelector('.tree-toggle');
        if (toggle) {
            toggle.classList.add('collapsed');
            toggle.querySelector('i').classList.replace('ti-minus', 'ti-plus');
        }
        hideChildren(id);
    });
}

function showChildren(parentId) {
    document.querySelectorAll(`tr[data-parent="${parentId}"]`).forEach(row => {
        row.classList.remove('hidden');
        // We only show direct children, they might be collapsed themselves
        // but the user can then expand them. 
        // If we want to keep their previous state, we'd need more logic.
        // For now, let's just show direct children.
    });
}

function selectItem(id, row) {
    IV.clearNotice('classPageNotice');
    window.selectedPurposesId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    //row.classList.add('bg-light');
    //row.querySelector('input[type="radio"]').checked = true;
    const btnEdit = document.getElementById('btnEdit');
    const btnDelete = document.getElementById('btnDelete');
    if (btnEdit && permCanEdit) btnEdit.disabled = false;
    if (btnDelete && permCanDelete) btnDelete.disabled = false;
    let checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    // Edit sirf 1 record select hone par
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
}

async function editSelected() {
    if (!permCanEdit) {
        IV.setNotice('languagePageNotice', 'You do not have permission to edit.');
        return;
    }

    if (window.selectedPurposesId === 0) return;
    IV.clearNotice('classPageNotice');
    try {

        if (window.selectedPurposesId) {
            location.href = `/Settings/AddCompanies/${window.selectedPurposesId}`;
        }

    } catch (err) {
        console.error(err);
    }
}

async function deleteSelected() {
    if (!permCanDelete) {
        IV.setNotice('languagePageNotice', 'You do not have permission to delete.');
        return;
    }

    let selectedIds = [];
    $('.student-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        alert("Please select at least one student.");
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this company record. This action cannot be undone!",
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
                url: '/Settings/DeleteCompany',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Company record has been deleted.', 'success')
                            .then(() => location.reload());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete company.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}

function validateLanguageForm() {
    clearLanguageModalValidation();
    let ok = true;
    const title = document.getElementById('txtLanguageTitle').value.trim();
    const code = document.getElementById('txtLanguageCode').value.trim();
    if (!title) { IV.setFieldError('txtLanguageTitle', 'errTxtLanguageTitle', 'Title is required.'); ok = false; }
    if (!code) { IV.setFieldError('txtLanguageCode', 'errTxtLanguageCode', 'Code is required.'); ok = false; }
    return ok;
}

async function saveCompany() {
    const cid = parseInt($('#txtCompanyId').val());
    if (cid === 0 && !permCanAdd) {
        showToast('You do not have permission to add.', 'warning');
        return;
    }
    if (cid > 0 && !permCanEdit) {
        IV.setNotice('companyModalNotice', 'You do not have permission to edit.');
        return;
    }
    clearCompanyModalValidation();

    const schoolNameEl = document.getElementById('txtSchoolName');
    const schoolCodeEl = document.getElementById('txtSchoolCode');
    const currencyEl = document.getElementById('ddlCurrency');
    const phoneEl = document.getElementById('txtPhone');
    const emailEl = document.getElementById('txtEmail');

    const schoolName = schoolNameEl.value.trim();
    const schoolCode = schoolCodeEl.value.trim();
    const currencyId = parseInt(currencyEl.value);
    const phone = phoneEl.value.trim();
    const email = emailEl.value.trim();

    let hasError = false;
    let firstInvalidEl = null;

    // ── Required: School Name ──────────────────────────────────────
    if (!schoolName) {
        IV.setFieldError('txtSchoolName', 'errSchoolName', 'School name is required.');
        hasError = true;
        firstInvalidEl = firstInvalidEl || schoolNameEl;
    }

    // ── Required: School Code ──────────────────────────────────────
    if (!schoolCode) {
        IV.setFieldError('txtSchoolCode', 'errSchoolCode', 'School code is required.');
        hasError = true;
        firstInvalidEl = firstInvalidEl || schoolCodeEl;
    }

    // ── Required: Default Currency ─────────────────────────────────
    if (isNaN(currencyId) || currencyId <= 0) {
        IV.setFieldError('ddlCurrency', 'errCurrency', 'Default currency is required.');
        hasError = true;
        firstInvalidEl = firstInvalidEl || currencyEl;
    }
    // ── Required: School Code ──────────────────────────────────────
    if (!email) {
        IV.setFieldError('txtEmail', 'errEmail', 'Email is required.');
        hasError = true;
        firstInvalidEl = firstInvalidEl || schoolCodeEl;
    }
    // ── Optional but validated: Email ──────────────────────────────
    if (email && !IV.isValidEmail(email)) {
        IV.setFieldError('txtEmail', 'errEmail', 'Please enter a valid email address (e.g. name@example.com).');
        hasError = true;
        firstInvalidEl = firstInvalidEl || emailEl;
    }
    // ── Required: School Code ──────────────────────────────────────
    if (!phone) {
        IV.setFieldError('txtPhone', 'errPhone', 'Phone is required.');
        hasError = true;
        firstInvalidEl = firstInvalidEl || schoolCodeEl;
    }
    // ── Optional but validated: Phone (comma-separated 10-digit numbers) ──
    if (phone) {
        const parts = phone.split(',').map(p => p.trim()).filter(p => p !== '');
        if (parts.length === 0) {
            IV.setFieldError('txtPhone', 'errPhone', 'Please enter a valid phone number.');
            hasError = true;
            firstInvalidEl = firstInvalidEl || phoneEl;
        } else {
            for (const p of parts) {
                if (!/^\d{10}$/.test(p)) {
                    IV.setFieldError('txtPhone', 'errPhone', 'Each phone number must be exactly 10 digits (comma-separate multiple numbers).');
                    hasError = true;
                    firstInvalidEl = firstInvalidEl || phoneEl;
                    break;
                }
            }
        }
    }

    if (hasError) {
        firstInvalidEl?.focus();
        return;
    }
    const formData = {
        companyId: cid,
        schoolName: schoolName,
        schoolCode: schoolCode,
        parentCompanyId: $('#ddlParentCompany').val() ? parseInt($('#ddlParentCompany').val()) : null,
        address: $('#txtAddress').val().trim(),
        phone: phone,
        email: email,
        sessionId: 0,
        currencyId: currencyId,
        sessionStartMonth: $('#ddlStartMonth').val(),
        dateFormat: $('#ddlDateFormat').val(),
        timezone: $('#ddlTimezone').val(),
        startDayOfWeek: $('#ddlStartDay').val(),
        currencyFormat: $('#ddlCurrencyFormat').val(),
        isActive: $('#chkIsActive').is(':checked'),
        postalCode: document.getElementById('txtPinCode').value.trim() || null,
        countryId: document.getElementById('ddlCountry').value || null,
        stateId: document.getElementById('ddlState').value || null,
        cityId: document.getElementById('ddlCity').value || null,
        headOfficeAddress: document.getElementById('txtHeadOfficeAddress').value.trim() || null,
        admissionNo: document.getElementById('txtAdmissionNo').value.trim() || null,
        boardName: document.getElementById('txtBoardName').value.trim() || null,
        schoolStatus: document.getElementById('ddlSchoolStatus').value || null,
        lateFinePerDay: document.getElementById('txtLateFinePerDay').value.trim() || null,
        libraryFinePerDay: document.getElementById('txtLibraryFinePerDay').value.trim() || null,
        lateFineMaxPerBook: document.getElementById('txtLateFineMaxPerBook').value.trim() || null,
        ...getLogoPayload()
    };

    const btn = document.getElementById('btnSave');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving…';
    }

    try {
        const response = await fetch('/Settings/SaveCompany', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const isEdit = cid > 0;
        const res = await response.json();
        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit
                    ? 'Company has been updated successfully.'
                    : 'Company has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                window.location.href = '/Settings/Companies';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save company.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
    } catch (error) {
        console.error('Error:', error);
        IV.setNotice('companyModalNotice', 'An unexpected error occurred. Please try again.');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-cloud me-1"></i> Save'; }
    }
}


//upload Images save call
// Map input id -> preview element + form field name expected by server
//const logoInputs = {
//    txtPrintLogo: { field: 'PrintLogo', preview: '#previewPrintLogo' },
//    txtAdminLogo: { field: 'AdminLogo', preview: '#previewAdminLogo' },
//    txtAdminSmallLogo: { field: 'AdminSmallLogo', preview: '#previewAdminSmallLogo' },
//    txtWaterMark: { field: 'WaterMark', preview: '#previewWaterMark' },
//    'input-file': { field: 'LoginBackground', preview: '#previewLoginBg' }
//};

//$(document).on('change', Object.keys(logoInputs).map(id => `#${id}`).join(','), function () {
//    const inputId = this.id;
//    const config = logoInputs[inputId];
//    const file = this.files[0];
//    if (!file) return;

//    const companyId = parseInt($('#txtCompanyId').val());
//    if (!companyId) {
//        showToast('Please save the company details first before uploading images.', 'warning');
//        this.value = '';
//        return;
//    }

//    // Optional: quick client-side preview before upload finishes
//    const reader = new FileReader();
//    reader.onload = e => $(config.preview).attr('src', e.target.result).show();
//    reader.readAsDataURL(file);

//    uploadCompanyImage(companyId, config.field, file, config.preview);
//});

function uploadCompanyImage(companyId, imageType, file, previewSelector) {
    const formData = new FormData();
    formData.append('companyId', companyId);
    formData.append('imageType', imageType);   // tells server which column/field to update
    formData.append('file', file);

    $.ajax({
        url: '/Settings/UploadCompanyImage',
        type: 'POST',
        data: formData,
        processData: false,   // required for FormData
        contentType: false,   // required for FormData
        beforeSend: function () {
            showToast(`Uploading ${imageType}…`, 'info');
        },
        success: function (res) {
            if (res.success) {
                showToast(`${imageType} uploaded successfully.`, 'success');
                if (res.imageUrl) {
                    $(previewSelector).attr('src', res.imageUrl);
                }
            } else {
                showToast(res.message || 'Upload failed.', 'error');
            }
        },
        error: function () {
            showToast('An error occurred while uploading the image.', 'error');
        }
    });
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
                    url: '/Settings/ToggleCompanyStatus',
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




// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadPurposePartial(queryString) {
    const container = document.getElementById('companiesTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/Settings/GetCompaniesPartial?${queryString}`, {
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
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// ✅ Pagination click interception, scoped to the hostel type container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#companiesTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadPurposePartial(query);
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

// ======================================================================
// CompanyLogos.js  -  REPLACES the "//upload Images save call" block in Companies.js
//   (everything from `const logoInputs = {` down to the end of
//    `function uploadCompanyImage(...) { ... }`).
//
// New behaviour
//   - Picking a file only previews it and keeps it in memory (no upload yet).
//     This also works on the ADD page, where there is no CompanyId yet.
//   - saveCompany() adds getLogoPayload() to its formData, so the logos travel
//     with the company and the server uploads them right after the company is saved.
//   - On EDIT, only images the user picked are sent; the rest stay unchanged.
// ======================================================================



// key -> { base64: "data:image/png;base64,....", name: "logo.png" }


