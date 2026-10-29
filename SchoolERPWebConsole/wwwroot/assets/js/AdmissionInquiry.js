const canEdit = window.canEdit;
const canDelete = window.canDelete;
// jQuery helper to serialize form to JSON object
$.fn.serializeObject = function () {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function () {
        if (o[this.name]) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#inquiryTable')) {
        const table = $('#inquiryTable').DataTable();
        table.button(index).trigger();
    }
}


$(document).ready(function () {
    $('#InqName, #InqNote').on('input', function () {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
    });
    // Modal Select2
    $('#addModal .select2').select2({
        dropdownParent: $('#addModal')
    });
    // if (canEdit) document.getElementById('btnEdit').disabled = true;
    //if (canEdit) document.getElementById('btnFollowUP').disabled = true;
    // Filter Select2


    // Follow Up Form Submission
    // Follow Up Form Submission
    $('#followUpForm').on('submit', function (e) {
        e.preventDefault();

        if (!validateFollowUpForm()) {
            const firstInvalid = this.querySelector('.is-invalid');
            if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        const data = $(this).serializeObject();

        $.ajax({
            url: '/FrontOffice/SaveFollowUp',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function (r) {
                if (r.success) {
                    showToast(r.message, 'success');
                    openFollowUp(data.InquiryID); // Refresh timeline
                } else {
                    showToast(r.message, 'error');
                }
            },
            error: function () {
                showToast('An unexpected error occurred while saving.', 'error');
            }
        });
    });

    // Table Search
    $('#tableSearch').on('keyup', function () {
        const val = $(this).val().toLowerCase();
        $("#inquiryTable tbody tr").filter(function () {
            $(this).toggle($(this).text().toLowerCase().indexOf(val) > -1)
        });
        renderFilterBadges();
    });


    // Prevent dropdown from closing when clicking inside
    $('.filter-dropdown').on('click', function (e) {
        e.stopPropagation();
    });

    // ────────────────────────────────────────────────────────────────
    // Add/Edit Admission Enquiry form — real-time validation
    // Guarded so this is a no-op on pages that don't have this form.
    // ────────────────────────────────────────────────────────────────
    const inquiryFormEl = document.getElementById('inquiryForm');
    if (inquiryFormEl) {
        // Clear the field's error as soon as the user starts typing
        [
            ['InqName', 'errName'],
            ['InqPhone', 'errPhone'],
            ['InqEmail', 'errEmail'],
            ['InqDate', 'errDate']
        ].forEach(([inputId, errId]) => {
            document.getElementById(inputId)?.addEventListener('input', () => {
                clearFieldError(inputId, errId);
            });
        });
    }
});

//async function saveRecord() {
//    //Reset and validate
//    if (!validateInquiryForm()) {
//        const form = document.getElementById('inquiryForm');
//        const firstInvalid = form.querySelector('.is-invalid');
//        if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
//        return;
//    }
//    var id = parseInt(document.getElementById('InquiryID').value) || 0;
//    const isEdit = id > 0;
//    const data = $('#inquiryForm').serializeObject();

//    $.ajax({
//        url: '/FrontOffice/SaveInquiry',
//        type: 'POST',
//        contentType: 'application/json',
//        data: JSON.stringify(data),
//        success: function (r) {
//            if (r.success) {
//                Swal.fire({
//                    icon: 'success',
//                    title: 'Saved!',
//                    text: isEdit
//                        ? 'Inquiry has been updated successfully.'
//                        : 'Inquiry has been added successfully.',
//                    confirmButtonText: 'OK',
//                    customClass: { confirmButton: 'btn btn-success' },
//                    buttonsStyling: false
//                }).then(() => {
//                    window.location.href = '/FrontOffice/AdmissionInquiry';
//                });
//            } else {
//                Swal.fire({
//                    icon: 'error',
//                    title: 'Error',
//                    text: r.message || 'Failed to save inquiry.',
//                    confirmButtonText: 'OK',
//                    customClass: { confirmButton: 'btn btn-danger' },
//                    buttonsStyling: false
//                });
//            }
//        },
//        error: function () {
//            Swal.fire('Error!', 'An unexpected error occurred while saving.', 'error');
//        }
//    });
//}



async function saveRecord() {
    //// Reset and validate
    if (!validateInquiryForm()) {
        const form = document.getElementById('inquiryForm');
        const firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    var id = parseInt(document.getElementById('InquiryID').value) || 0;
    const isEdit = id > 0;
    const data = $('#inquiryForm').serializeObject();
    if (data.NextFollowUpDate === '') data.NextFollowUpDate = null;
    if (data.Date === '') data.Date = null;
    if (data.NoOfChild === '') data.NoOfChild = null;
    if (data.AssignedTo === '') data.AssignedTo = null;
    if (data.ReferenceID === '') data.ReferenceID = null;
    if (data.SourceID === '') data.SourceID = null;
    if (data.ClassID === '') data.ClassID = null;
    data.postalCode = document.getElementById('txtPinCode').value.trim() || null;
    data.countryId = document.getElementById('ddlCountry').value || null;
    data.stateId = document.getElementById('ddlState').value || null;
    data.cityId = document.getElementById('ddlCity').value || null;
    $.ajax({
        url: '/FrontOffice/SaveInquiry',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function (r) {
            if (r.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Saved!',
                    text: isEdit
                        ? 'Inquiry has been updated successfully.'
                        : 'Inquiry has been added successfully.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                }).then(() => {
                    window.location.href = '/FrontOffice/AdmissionInquiry';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: r.message || 'Failed to save inquiry.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-danger' },
                    buttonsStyling: false
                });
            }
        },
        error: function (xhr) {
            let msg = 'An unexpected error occurred while saving.';
            try {
                const resp = JSON.parse(xhr.responseText);
                if (resp?.message) msg = resp.message;
                else if (resp?.errors) msg = Object.values(resp.errors).flat().join(' ');
            } catch (e) { /* response wasn't JSON — keep generic message */ }

            Swal.fire('Error!', msg, 'error');
        }
    });
}

// ========================================
// Admission Enquiry form — field-level validation helpers
// ========================================

/**
 * Shows an inline error message below a field and marks the field as invalid.
 */
function setFieldError(inputId, errId, message) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(errId);

    if (input) input.classList.add('is-invalid');
    if (err) {
        err.textContent = message;
        err.style.display = 'block';
    }
}

/**
 * Clears an inline error message and invalid state for a field.
 */
function clearFieldError(inputId, errId) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(errId);

    if (input) input.classList.remove('is-invalid');
    if (err) {
        err.textContent = '';
        err.style.display = 'none';
    }
}

/**
 * Validates the Add/Edit Admission Enquiry form.
 * Returns true if the form is valid, false otherwise (and displays inline errors).
 */
function validateInquiryForm() {

    let isValid = true;

    const fieldErrorPairs = [
        ['InqName', 'errName'],
        ['InqPhone', 'errPhone'],
        ['InqEmail', 'errEmail'],
        ['InqDate', 'errDate']
    ];
    fieldErrorPairs.forEach(([inputId, errId]) => clearFieldError(inputId, errId));

    // ── Name ─────────────────────────────────────────────────────────
    const name = document.getElementById('InqName')?.value.trim() || '';
    if (!name) {
        setFieldError('InqName', 'errName', 'Name is required.');
        isValid = false;
    } else if (!/^[A-Za-z\s.'-]{2,100}$/.test(name)) {
        setFieldError('InqName', 'errName', 'Enter a valid name (letters only, min 2 characters).');
        isValid = false;
    }

    // ── Phone (required) ────────────────────────────────────────────
    const phoneVal = document.getElementById('InqPhone')?.value.trim() || '';
    if (!phoneVal) {
        setFieldError('InqPhone', 'errPhone', 'Phone number is required.');
        isValid = false;
    } else if (!/^[6-9]\d{9}$/.test(phoneVal)) {
        setFieldError('InqPhone', 'errPhone', 'Enter a valid 10-digit phone number.');
        isValid = false;
    }

    // ── Email (optional, validated when entered) ──────────────────
    const emailVal = document.getElementById('InqEmail')?.value.trim() || '';
    if (!emailVal) {
        setFieldError('InqEmail', 'errEmail', 'Email is required.');
        isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailVal)) {
        setFieldError('InqEmail', 'errEmail', 'Enter a valid email address.');
        isValid = false;
    }

    // ── Date ─────────────────────────────────────────────────────────
    const dateVal = document.getElementById('InqDate')?.value;
    if (!dateVal) {
        setFieldError('InqDate', 'errDate', 'Date is required.');
        isValid = false;
    } else {
        const selectedDate = new Date(dateVal);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (selectedDate > today) {
            setFieldError('InqDate', 'errDate', 'Enquiry date cannot be in the future.');
            isValid = false;
        }
    }

    return isValid;
}

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_inquiry';
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
    // Sync hidden form fields from filter controls before submit
    const searchEl = document.getElementById('txtSearchInput');
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const classEl = document.getElementById('filterClass');
    const sourceEl = document.getElementById('filterSource');
    const fromDateEl = document.getElementById('filterFromDate');
    const toDateEl = document.getElementById('filterToDate');
    const statusEl = document.getElementById('filterStatus');

    if (searchEl) document.getElementById('hdnSearch').value = searchEl.value.trim();
    if (sessionEl) document.getElementById('hdnSessionID').value = sessionEl.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;
    if (classEl) document.getElementById('hdnclassId').value = classEl.value;
    if (sourceEl) document.getElementById('hdnsourceId').value = sourceEl.value;
    if (fromDateEl) document.getElementById('hdnfromDate').value = fromDateEl.value;
    if (toDateEl) document.getElementById('hdntoDate').value = toDateEl.value;
    if (statusEl) document.getElementById('hdnstatus').value = statusEl.value;
    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadAdmissionInquiryPartial(params);

}

function applyFilters() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const searchEl = document.getElementById('txtSearchInput');
    const classEl = document.getElementById('filterClass');
    const sourceEl = document.getElementById('filterSource');
    const fromDateEl = document.getElementById('filterFromDate');
    const toDateEl = document.getElementById('filterToDate');
    const statusEl = document.getElementById('filterStatus');

    // Search
    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    // Session
    if (sessionEl?.value && sessionEl.value !== '') {
        appliedFilters['ddlFilterSessions'] = {
            label: 'Session',
            text: sessionEl.options[sessionEl.selectedIndex]?.text || sessionEl.value
        };
    } else delete appliedFilters['ddlFilterSessions'];

    // Company
    if (companyEl?.value && companyEl.value !== '') {
        appliedFilters['ddlFilterCompany'] = {
            label: 'Company',
            text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value
        };
    } else delete appliedFilters['ddlFilterCompany'];

    // Class
    if (classEl?.value && classEl.value !== '0' && classEl.value !== '') {
        appliedFilters['filterClass'] = {
            label: 'Class',
            text: classEl.options[classEl.selectedIndex]?.text || classEl.value
        };
    } else delete appliedFilters['filterClass'];

    // Source
    if (sourceEl?.value && sourceEl.value !== '0' && sourceEl.value !== '') {
        appliedFilters['filterSource'] = {
            label: 'Source',
            text: sourceEl.options[sourceEl.selectedIndex]?.text || sourceEl.value
        };
    } else delete appliedFilters['filterSource'];

    // Enquiry From Date
    if (fromDateEl?.value) {
        appliedFilters['filterFromDate'] = { label: 'From', text: fromDateEl.value };
    } else delete appliedFilters['filterFromDate'];

    // Enquiry To Date
    if (toDateEl?.value) {
        appliedFilters['filterToDate'] = { label: 'To', text: toDateEl.value };
    } else delete appliedFilters['filterToDate'];

    // Status
    if (statusEl?.value && statusEl.value !== '') {
        appliedFilters['filterStatus'] = {
            label: 'Status',
            text: statusEl.options[statusEl.selectedIndex]?.text || statusEl.value
        };
    } else delete appliedFilters['filterStatus'];

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

function removeFilter(filterId) {
    // Clear the matching dropdown/input
    if (filterId === 'ddlFilterSessions') {
        const el = document.getElementById('ddlFilterSessions');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
    } else if (filterId === 'ddlFilterCompany') {
        const el = document.getElementById('ddlFilterCompany');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
    } else if (filterId === 'filterClass') {
        const el = document.getElementById('filterClass');
        if (el) {
            el.value = '0';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('0').trigger('change');
        }
    } else if (filterId === 'filterSource') {
        const el = document.getElementById('filterSource');
        if (el) {
            el.value = '0';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('0').trigger('change');
        }
    } else if (filterId === 'filterFromDate') {
        const el = document.getElementById('filterFromDate');
        if (el) el.value = '';
    } else if (filterId === 'filterToDate') {
        const el = document.getElementById('filterToDate');
        if (el) el.value = '';
    } else if (filterId === 'filterStatus') {
        const el = document.getElementById('filterStatus');
        if (el) {
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        }
    } else if (filterId === 'txtSearchInput') {
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

    ['ddlFilterSessions', 'ddlFilterCompany', 'filterClass', 'filterSource', 'filterStatus'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = (id === 'filterClass' || id === 'filterSource') ? '0' : '';
        if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val(el.value).trigger('change');
    });

    ['filterFromDate', 'filterToDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    clearAppliedFilters();
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

// ========================================
// DOMContentLoaded — init DataTable + UI
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    var companyname = localStorage.getItem("comName");
    // ── DataTable (export only) ───────────────────────────────────────
    if ($.fn.DataTable.isDataTable('#inquiryTable')) {
        $('#inquiryTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#inquiryTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Admission Enquiry - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6] } },
            { extend: 'csv', title: `Admission Enquiry - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6] } },
            { extend: 'excel', title: `Admission Enquiry - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6] } },
            { extend: 'pdf', title: `Admission Enquiry - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6] } },
            { extend: 'print', title: `Admission Enquiry - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6] } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });

    // ── Select2 ───────────────────────────────────────────────────────
    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            jQuery('#ddlFilterSessions, #ddlFilterCompany, #filterClass, #filterSource, #filterStatus').select2({
                width: '100%',
                dropdownParent: jQuery('#filter-dropdown'),
                allowClear: true,
                placeholder: function () { return jQuery(this).data('placeholder') || 'Select'; }
            });
        }
    } catch (e) {
        console.warn('Select2 init skipped:', e);
    }

    // ── Keep filter dropdown open while interacting inside ────────────
    document.getElementById('filter-dropdown')?.addEventListener('click', e => e.stopPropagation());

    // ── Apply Filters ─────────────────────────────────────────────────
    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        document.getElementById('hdnPageIndex').value = 1;
        document.getElementById('hdnSearch').value = document.getElementById('txtSearchInput').value;
        applyFilters();
        renderFilterBadges();
        submitForm();
    });



    document.querySelector('.search-icon-input')?.addEventListener('click', () => {
        document.getElementById('hdnPageIndex').value = 1;
        applyFilters();
        renderFilterBadges();
        submitForm();
    });

    // ── Reset Filters ─────────────────────────────────────────────────
    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        resetAllFilters();
    });

    // ── Render badges on load ─────────────────────────────────────────
    renderFilterBadges();

    const input = document.getElementById('txtPinCode');
    const list = document.getElementById('pinCodeSuggestions');

    let debounceTimer;
    let currentItems = [];


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
// ========================================
// DOMContentLoaded — init DataTable + UI
// ========================================
document.addEventListener('DOMContentLoaded', () => {



    // ── Select2 ───────────────────────────────────────────────────────
    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            jQuery('#ddlFilterSessions, #ddlFilterCompany, #filterClass, #filterSource, #filterStatus').select2({
                width: '100%',
                dropdownParent: jQuery('#filter-dropdown'),
                allowClear: true,
                placeholder: function () { return jQuery(this).data('placeholder') || 'Select'; }
            });
        }
    } catch (e) {
        console.warn('Select2 init skipped:', e);
    }

    // ── Keep filter dropdown open while interacting inside ────────────
    document.getElementById('filter-dropdown')?.addEventListener('click', e => e.stopPropagation());

    // ── Apply Filters ─────────────────────────────────────────────────
    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        document.getElementById('hdnPageIndex').value = 1;
        document.getElementById('hdnSearch').value = document.getElementById('txtSearchInput').value;
        applyFilters();
        renderFilterBadges();
        submitForm();
    });

    // ── Reset Filters ─────────────────────────────────────────────────
    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        resetAllFilters();
        renderFilterBadges();
    });

    // ── Render badges on load ─────────────────────────────────────────
    renderFilterBadges();
});

// ========================================
// Search input — debounced server submit
// ========================================
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

function resetInquiryForm() {
    $('#inquiryForm')[0].reset();
    $('#InquiryID').val(0);
    $('#modalTitle').text('Add Admission Enquiry');
    $('.select2').val('').trigger('change');
    $('#InqDate').val(new Date().toISOString().split('T')[0]);
}

function editSelectedInquiry() {
    const checked = $('.student-checkbox:checked');
    if (checked.length !== 1) {
        showToast('Please select a record to edit', 'warning');
        return;
    }
    try {

        if (checked.val()) {
            location.href = `/FrontOffice/AddAdmissionEnquiry/${checked.val()}`;
        }

    } catch (err) {
        console.error(err);
    }
    //loadInquiry(checked.val());
}

function followUpSelectedInquiry() {
    const checked = $('.student-checkbox:checked');
    if (checked.length !== 1) {
        showToast('Please select a record for follow up', 'warning');
        return;
    }
    openFollowUp(checked.val());
}

function loadInquiry(id) {
    $.get('/FrontOffice/GetInquiry/' + id, function (r) {
        if (r.success) {
            const d = r.data;
            $('#InquiryID').val(d.inquiryID);
            $('#InqName').val(d.name);
            $('#InqPhone').val(d.phone);
            $('#InqEmail').val(d.email);
            $('#InqAddress').val(d.address);
            $('#InqDescription').val(d.description);
            $('#InqNote').val(d.note);
            $('#InqDate').val(d.date ? d.date.split('T')[0] : '');
            $('#InqNextFollowUpDate').val(d.nextFollowUpDate ? d.nextFollowUpDate.split('T')[0] : '');
            $('#InqAssignedTo').val(d.assignedTo).trigger('change');
            $('#InqReferenceID').val(d.referenceID).trigger('change');
            $('#InqSourceID').val(d.sourceID).trigger('change');
            $('#InqClassID').val(d.classID).trigger('change');
            $('#InqNoOfChild').val(d.noOfChild);
            $('#InqStatus').val(d.status).trigger('change');

            $('#modalTitle').text('Edit Admission Enquiry');
            $('#addModal').modal('show');
        }
    });
}

function deleteSelectedInquiry() {
    const checked = $('.student-checkbox:checked');
    if (checked.length === 0) {
        showToast('Please select a record to delete', 'warning');
        return;
    }


    let selectedIds = [];
    $('.student-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        alert("Please select at least one enquiry.");
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this enquiry record. This action cannot be undone!",
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
                url: '/FrontOffice/DeleteInquiry',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Admission inquiry record has been deleted.', 'success')
                            .then(() => location.reload());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete admission inquiry.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}

function openFollowUp(id) {

    try {

        if (id) {
            location.href = `/FrontOffice/InquiryFollowUp/${id}`;
        }

    } catch (err) {
        console.error(err);
    }
}

function selectItem(id, row) {
    selectedId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    window.selectedId = id;
    row.classList.add('bg-light');
    //row.querySelector('input[type="radio"]').checked = true;

    if (canEdit) document.getElementById('btnEdit').disabled = false;
    if (canDelete) document.getElementById('btnDelete').disabled = false;
    let checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    // Edit sirf 1 record select hone par
    $('#btnFollowUP').prop('disabled', checkedCount !== 1);
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

// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadAdmissionInquiryPartial(queryString) {
    const container = document.getElementById('admissionInquiryTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/FrontOffice/GetAdmissionInquiryPartial?${queryString}`, {
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

            if ($.fn.DataTable.isDataTable('#inquiryTable')) {
                $('#inquiryTable').DataTable().destroy();
            }
            exportTable = $('#inquiryTable').DataTable({
                dom: 'Bfrtip',
                buttons: [
                    { extend: 'copy', exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'csv', exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'excel', exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'pdf', exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } },
                    { extend: 'print', exportOptions: { columns: [1, 2, 3, 4], rows: ':visible' } }
                ],
                searching: false,
                paging: false,
                info: false,
                ordering: false
            });

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
    const link = e.target.closest('#admissionInquiryTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadAdmissionInquiryPartial(query);
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


// ────────────────────────────────────────────────────────────────
// Follow Up dates — keep NextFollowUpDate's min in sync with FollowUpDate
// ────────────────────────────────────────────────────────────────
function syncFollowUpMinDate() {
    const followUpDateEl = document.getElementById('FollowUpDate');
    const nextDateEl = document.getElementById('FollowUpNextDate');
    if (!followUpDateEl || !nextDateEl) return;

    if (followUpDateEl.value) {
        nextDateEl.min = followUpDateEl.value;
        // if the currently selected next date is now before the follow-up date, clear it
        if (nextDateEl.value && nextDateEl.value < followUpDateEl.value) {
            nextDateEl.value = '';
        }
    }
}

document.getElementById('FollowUpDate')?.addEventListener('change', () => {
    syncFollowUpMinDate();
    clearFieldError('FollowUpDate', 'errFollowUpDate');
});
document.getElementById('FollowUpNextDate')?.addEventListener('change', () => {
    clearFieldError('FollowUpNextDate', 'errFollowUpNextDate');
});

// Run once on load, in case FollowUpDate has a pre-filled value
document.addEventListener('DOMContentLoaded', syncFollowUpMinDate);
document.getElementById('FollowUpResponse')?.addEventListener('input', () => {
    clearFieldError('FollowUpResponse', 'errFollowUpResponse');
});
/**
 * Validates the Follow Up form before submit.
 * Returns true if valid, false otherwise (and shows inline errors).
 */
/**
 * Validates the Follow Up form before submit.
 * Returns true if valid, false otherwise (and shows inline errors).
 */
function validateFollowUpForm() {
    let isValid = true;
    clearFieldError('FollowUpDate', 'errFollowUpDate');
    clearFieldError('FollowUpNextDate', 'errFollowUpNextDate');
    clearFieldError('FollowUpResponse', 'errFollowUpResponse');

    const followUpDateVal = document.getElementById('FollowUpDate')?.value;
    const nextDateVal = document.getElementById('FollowUpNextDate')?.value;
    const responseVal = document.getElementById('FollowUpResponse')?.value.trim();

    if (!followUpDateVal) {
        setFieldError('FollowUpDate', 'errFollowUpDate', 'Follow Up Date is required.');
        isValid = false;
    }

    if (!nextDateVal) {
        setFieldError('FollowUpNextDate', 'errFollowUpNextDate', 'Next Follow Up Date is required.');
        isValid = false;
    }

    if (!responseVal) {
        setFieldError('FollowUpResponse', 'errFollowUpResponse', 'Response is required.');
        isValid = false;
    }

    // Core rule: Next Follow Up Date must not be earlier than Follow Up Date
    if (followUpDateVal && nextDateVal && nextDateVal < followUpDateVal) {
        setFieldError('FollowUpNextDate', 'errFollowUpNextDate', 'Next Follow Up Date cannot be earlier than Follow Up Date.');
        isValid = false;
    }

    return isValid;
}
