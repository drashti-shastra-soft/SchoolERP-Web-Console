let $txtCost = $('#txtCost');
let $txtSecurityAmount = $('#txtSecurityAmount');

let cost = $txtCost.length ? ($txtCost.val() || '').replace(/,/g, '') : '';
let securityAmount = $txtSecurityAmount.length ? ($txtSecurityAmount.val() || '').replace(/,/g, '') : '';

let data = {
    CostPerBed: parseFloat(cost) || 0,
    SecurityAmount: parseFloat(securityAmount) || 0
};

// ========================================
// Indian-style comma formatting for currency inputs
// — allows fully clearing the field (no forced "0")
// — preserves caret position so typing multi-digit numbers
//   (e.g. "10000" -> "10,000") doesn't scramble/drop digits
// ========================================
function formatIndianNumber(value) {
    value = value.replace(/,/g, '');
    value = value.replace(/[^0-9.]/g, '');

    if (value === '') return '';   // let the user fully clear the field

    let parts = value.split('.');
    let integerPart = parts[0];
    let decimalPart = parts[1];

    if (!integerPart) {
        integerPart = '0';   // only reached for ".", ".5", etc.
    }

    if (integerPart.length > 3) {
        let lastThree = integerPart.slice(-3);
        let remaining = integerPart.slice(0, -3);
        remaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
        integerPart = remaining + ',' + lastThree;
    }

    return decimalPart !== undefined
        ? integerPart + '.' + decimalPart
        : integerPart;
}

function handleIndianNumberInput(e) {
    const el = e.target;
    const beforeLen = el.value.length;
    const caretPos = el.selectionStart ?? el.value.length;

    const formatted = formatIndianNumber(el.value);
    el.value = formatted;

    // Shift the caret by however many characters the formatting
    // added/removed (commas), so typing stays "in place" instead
    // of jumping to the end / before the wrong comma.
    const diff = formatted.length - beforeLen;
    let newPos = caretPos + diff;
    if (newPos < 0) newPos = 0;
    if (newPos > formatted.length) newPos = formatted.length;

    el.setSelectionRange(newPos, newPos);
}

$('#txtCost, #txtSecurityAmount').on('input', handleIndianNumberInput);

function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#tblRoom')) {
        const table = $('#tblRoom').DataTable();
        table.button(index).trigger();
    }
}
// Map each required field to its error element
const hostelRoomFieldMap = {
    ddlHostel: 'errHostel',
    ddlRoomType: 'errRoomType',
    ddlRoomOccupancyType: 'errRoomOccupancyType',
    txtRoomTitle: 'errRoomTitle',
    txtBeds: 'errBeds',
    txtCost: 'errCost'
};

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_hotel';
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

// Single, reusable selector string for all filter dropdowns.
const FILTER_DROPDOWN_SELECTOR = '#ddlFilterSessions, #ddlFilterCompany, #ddlFilterRoolType, #ddlFilterHostels';

function initFilterSelect2() {
    if (!(window.jQuery && typeof jQuery.fn.select2 === 'function')) return;
    try {
        jQuery(FILTER_DROPDOWN_SELECTOR).select2({
            width: '100%',
            dropdownParent: jQuery('#filter-dropdown'),
            allowClear: true,
            placeholder: function () { return jQuery(this).data('placeholder') || 'Select'; }
        });
    } catch (e) {
        console.warn('Select2 init skipped:', e);
    }
}

function submitForm() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const roolTypeEl = document.getElementById('ddlFilterRoolType');
    const hostelTypeEl = document.getElementById('ddlFilterHostels');
    const searchEl = document.getElementById('txtSearchInput');

    if (sessionEl) document.getElementById('hdnSessionID').value = sessionEl.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;
    if (roolTypeEl) document.getElementById('hdnRoomTypeID').value = roolTypeEl.value;
    if (hostelTypeEl) document.getElementById('hdnHostelsID').value = hostelTypeEl.value;
    if (searchEl) document.getElementById('hdnSearch').value = searchEl.value.trim();

    const form = document.getElementById('frmSearch');
    if (!form) return;
    const params = new URLSearchParams(new FormData(form)).toString();

    loadHostelRoomPartial(params);
}

function applyFilters() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const roolTypeEl = document.getElementById('ddlFilterRoolType');
    const hostelEl = document.getElementById('ddlFilterHostels');
    const searchEl = document.getElementById('txtSearchInput');

    const searchVal = searchEl?.value.trim() ?? '';
    document.getElementById('hdnSearch').value = searchVal;

    if (searchVal) {
        appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    } else {
        delete appliedFilters['txtSearchInput'];
    }

    if (sessionEl?.value && sessionEl.value !== '') {
        appliedFilters['ddlFilterSessions'] = {
            label: 'Session',
            text: sessionEl.options[sessionEl.selectedIndex]?.text || sessionEl.value
        };
    } else delete appliedFilters['ddlFilterSessions'];

    if (companyEl?.value && companyEl.value !== '') {
        appliedFilters['ddlFilterCompany'] = {
            label: 'Company',
            text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value
        };
    } else delete appliedFilters['ddlFilterCompany'];

    if (hostelEl?.value && hostelEl.value !== '') {
        appliedFilters['ddlFilterHostels'] = {
            label: 'Hostel',
            text: hostelEl.options[hostelEl.selectedIndex]?.text || hostelEl.value
        };
    } else delete appliedFilters['ddlFilterHostels'];

    if (roolTypeEl?.value && roolTypeEl.value !== '') {
        appliedFilters['ddlFilterRoolType'] = {
            label: 'Room Type',
            text: roolTypeEl.options[roolTypeEl.selectedIndex]?.text || roolTypeEl.value
        };
    } else delete appliedFilters['ddlFilterRoolType'];

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
    if (['ddlFilterSessions', 'ddlFilterCompany', 'ddlFilterRoolType', 'ddlFilterHostels'].includes(filterId)) {
        const el = document.getElementById(filterId);
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

    [...document.querySelectorAll(FILTER_DROPDOWN_SELECTOR)].forEach(el => {
        el.value = '';
        if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
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
    Object.keys(hostelRoomFieldMap).forEach(fieldId => {
        const el = document.getElementById(fieldId);
        const errEl = document.getElementById(hostelRoomFieldMap[fieldId]);
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
    var companyname = localStorage.getItem("comName");
    if ($.fn.DataTable.isDataTable('#tblRoom')) {
        $('#tblRoom').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#tblRoom').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Hostel Room - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'csv', title: `Hostel Room - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'excel', title: `Hostel Room - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'pdf', title: `Hostel Room - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'print', title: `Hostel Room - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false,
        language: {
            emptyTable: 'No records found.',
            zeroRecords: 'No matching records found.'
        }
    });

    initFilterSelect2();

    document.getElementById('filter-dropdown')?.addEventListener('click', e => e.stopPropagation());

    // ── Apply Filters — single binding only (no inline onclick in markup) ──
    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        document.getElementById('hdnPageIndex').value = 1;
        document.getElementById('hdnSearch').value = document.getElementById('txtSearchInput').value;
        applyFilters();
        submitForm();
    });

    document.getElementById('btnResetFilters')?.addEventListener('click', resetAllFilters);

    var roomType = $("#hdnRoomCoolingTypeId").val();
    if (roomType > 0) {
        bindRoomOccupancyType(roomType);
        $("#ddlRoomCoolingType")
            .val(roomType)
            .trigger("change");
    }
    var allowExtraBed = $("#ddlAllowExtraBed").val();
    if (allowExtraBed === "1") {
        $('#txtMaxExtraBeds').prop('disabled', false);
    } else {
        $('#txtMaxExtraBeds').prop('disabled', true);
        $('#txtMaxExtraBeds').val('');
    }
    renderFilterBadges();

    // ── Live rate preview bindings (consolidated to a single place —
    //    previously bound twice across two separate $(document).ready blocks) ──
    $('#txtBeds, #txtCost, #txtSecurityAmount, #txtMaxExtraBeds, #txtEffectiveFrom')
        .on('input change', updateInvoicePreview);
    $('#ddlAllowExtraBed, #ddlHostel, #ddlRoomType, #ddlRoomOccupancyType').on('change', updateInvoicePreview);
    updateInvoicePreview();

    var roomTypeId = $('#ddlRoomType').val();
    if (roomTypeId) {
        $('#ddlRoomType').trigger('change');
    }
});

let selectedId = 0;
const canEdit = window.canEdit;
const canDelete = window.canDelete;
window.selectedId = 0;

function selectItem(id, checkbox) {
    const $checked = $('.student-checkbox:checked');
    const count = $checked.length;

    $('.item-row').removeClass('bg-light');

    $checked.each(function () {
        $(this).closest('tr').addClass('bg-light');
    });

    window.selectedRoomId = count === 1 ? parseInt($checked.first().val()) : 0;

    $('#btnEdit').prop('disabled', !(window.canEdit && count === 1));
    $('#btnDelete').prop('disabled', !(window.canDelete && count > 0));
    $('#btnActive').prop('disabled', !(window.canEdit && count > 0));
    $('#btnInactive').prop('disabled', !(window.canEdit && count > 0));
}

// ========================================
// Search — keystroke updates hidden field, badge AND (debounced) reload
// ========================================
const searchInput = document.getElementById('txtSearchInput');
if (searchInput) {
    let debounceTimer = null;
    searchInput.addEventListener('input', function () {
        const val = this.value.trim();
        document.getElementById('hdnSearch').value = val;

        if (val) {
            appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        } else {
            delete appliedFilters['txtSearchInput'];
        }
        saveAppliedFilters();
        renderFilterBadges();

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            document.getElementById('hdnPageIndex').value = 1;
            submitForm();
        }, 300);
    });
}

function editSelected() {
    if (!window.selectedRoomId) return;
    try {
        location.href = `/Hostel/AddHostelRoom/${window.selectedRoomId}`;
    } catch (err) {
        console.error(err);
    }
}

async function saveRecord() {
    const form = document.getElementById('roomForm');
    if (!validateHostelRoomForm()) {
        return;
    }

    const allowExtraBedRaw = document.getElementById('ddlAllowExtraBed').value;
    const maxExtraBedsRaw = document.getElementById('txtMaxExtraBeds').value.trim();

    if (allowExtraBedRaw === "1" && maxExtraBedsRaw === "") {
        showToast('Please enter Max Extra Beds.', false);
        document.getElementById('txtMaxExtraBeds').focus();
        return;
    }

    const toIntOrNull = (val) => {
        if (val === null || val === undefined) return null;
        const cleaned = String(val).replace(/,/g, '').trim();
        const n = parseInt(cleaned, 10);
        return isNaN(n) ? null : n;
    };
    const toFloatOrNull = (val) => {
        if (val === null || val === undefined) return null;
        const cleaned = String(val).replace(/,/g, '').trim();
        const n = parseFloat(cleaned);
        return isNaN(n) ? null : n;
    };
    const toBoolOrNull = (val) => {
        if (val === "1" || val === "true" || val === true) return true;
        if (val === "0" || val === "false" || val === false) return false;
        return null;
    };

    const hostelId = toIntOrNull(document.getElementById('ddlHostel').value);
    const roomTypeId = toIntOrNull(document.getElementById('ddlRoomType').value);
    const roomOccupancyType = toIntOrNull(document.getElementById('ddlRoomOccupancyType').value);
    const securityAmount = toIntOrNull(document.getElementById('txtSecurityAmount').value);
    const effectiveFrom = toIntOrNull(document.getElementById('txtEffectiveFrom').value);
    const noOfBed = toIntOrNull(document.getElementById('txtBeds').value);
    const costPerBed = toFloatOrNull(document.getElementById('txtCost').value);
    const companyID = toIntOrNull(document.getElementById('hdnCompanyID').value) || 0;
    const sessionID = toIntOrNull(document.getElementById('hdnSessionID').value) || 0;

    if (hostelId === null) {
        showToast('Please select a hostel.', false);
        return;
    }
    if (roomTypeId === null) {
        showToast('Please select a room type.', false);
        return;
    }
    if (noOfBed === null || noOfBed <= 0) {
        showToast('Please enter a valid number of beds.', false);
        document.getElementById('txtBeds').focus();
        return;
    }
    if (costPerBed === null || costPerBed < 0) {
        showToast('Please enter a valid cost per bed.', false);
        document.getElementById('txtCost').focus();
        return;
    }

    const data = {
        roomId: toIntOrNull(document.getElementById('hdnRoomId').value) || 0,
        hostelID: hostelId,
        roomTypeID: roomTypeId,
        roomTitle: document.getElementById('txtRoomTitle').value.trim(),
        noOfBed: noOfBed,
        costPerBed: costPerBed,
        securityAmount: securityAmount,
        effectiveFrom: document.getElementById('txtEffectiveFrom').value.trim() || null,
        roomCoolingTypeId: roomOccupancyType,
        roomDescription: document.getElementById('txtDescription').value.trim() || null,
        isActive: document.getElementById('chkActive').checked,
        floorNumber: toIntOrNull(document.getElementById('txtFloorNumber').value.trim()),
        allowExtraBed: toBoolOrNull(allowExtraBedRaw),
        maxExtraBeds: toIntOrNull(maxExtraBedsRaw),
        companyID: companyID,
        sessionID: sessionID
    };

    try {
        const r = await fetch('/Hostel/UpsertHostelRoom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!r.ok) {
            console.error('Server returned status:', r.status);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `Server error (${r.status}). Please try again.`,
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
            return;
        }
        var roomId = toIntOrNull(document.getElementById('hdnRoomId').value);
        const res = await r.json();
        const isEdit = roomId > 0;
        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit
                    ? 'Hostel room has been updated successfully.'
                    : 'Hostel room has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                window.location.href = '/Hostel/HostelRoom';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: res.message || 'Failed to save hostel.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        }
    } catch (err) {
        console.error(err);
        IV.setNotice('classModalNotice', 'Could not save hostel.');
    }
}

function deleteSelected() {
    let selectedIds = [];
    $('.student-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });

    if (selectedIds.length === 0) {
        alert("Please select at least one hostel room.");
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this hostel room  record. This action cannot be undone!",
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
                url: '/Hostel/DeleteHostelRoom',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Hostel room record has been deleted.', 'success')
                            .then(() => submitForm());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete hostel room.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}

async function toggleStatus(id, isActive, checkboxEl) {
    if (!window.canEdit) {
        IV.setNotice(
            'classPageNotice',
            'You do not have permission to change status.'
        );
        if (checkboxEl) {
            checkboxEl.checked = !isActive;
            $(checkboxEl).trigger('change');
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

    function revertAll() {
        checkedBoxes.forEach(cb => {
            if (cb.classList.contains('student-checkbox')) {
                cb.checked = false;
            } else {
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
                    url: '/Hostel/ToggleHostelRoomStatus',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(request),
                    success: function (res) {
                        if (res.success) {
                            Swal.fire('Updated!', res.message || 'Status updated successfully.', 'success')
                                .then(() => location.reload());
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
            } else {
                revertAll();
                selectedId = 0;
                window.selectedId = 0;
                document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
                updateButtonStates();
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

async function fachrecordforcust(roomTypeId) {
    if (!roomTypeId) {
        document.getElementById('txtBeds').value = '';
        document.getElementById('txtCost').value = '0';
        document.getElementById('spnRoomType').value = '';
        return;
    }

    try {
        const response = await fetch(`/Hostel/GetRoomTypeByID?id=${roomTypeId}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch room type details');
        }

        const data = await response.json();
        const bedCapacity = data.data.BedCapacity ?? data.data.bedCapacity ?? 1;

        const txtBeds = document.getElementById('txtBeds');
        txtBeds.value = bedCapacity;
    } catch (err) {
        console.error('fachrecordforcust error:', err);
        document.getElementById('txtBeds').removeAttribute('readonly');
    }
}

async function bindRoomOccupancyType(roomTypeId) {
    if (!roomTypeId) {
        return;
    }
    const stateEl = document.getElementById('ddlRoomOccupancyType');
    if (!stateEl) return;
    const preselectStateId = document.getElementById('hdnRoomTypeID').value;
    stateEl.innerHTML = '<option value="">-- Select --</option>';

    try {
        const res = await fetch(`/Hostel/GetAllRoomOccupancy?roomTypeId=${roomTypeId}`);
        const result = await res.json();
        const states = result.data || [];
        stateEl.innerHTML = '<option value="">Select</option>';
        states.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.roomTypeID;
            opt.textContent = s.roomTypeTitle;

            if (parseInt(preselectStateId) === parseInt(s.roomTypeID)) {
                opt.selected = true;
            }

            stateEl.appendChild(opt);
        });
        updateInvoicePreview();
    } catch (err) {
        console.error('Failed to load states:', err);
    }
}

async function loadRoomRates(roomTypeId) {
    if (!roomTypeId) {
        $('#tblRateBody').html('');
        return;
    }

    try {
        const response = await fetch(`/Hostel/GetHostelRoomRateByID/${roomTypeId}`);
        const result = await response.json();

        if (!result.success) {
            alert(result.message);
            document.getElementById('divRate').classList.add('d-none');
            return;
        }

        bindRateTable(result.data);
    } catch (e) {
        console.error(e);
        alert('Unable to load room rates.');
    }
}

function bindRateTable(data) {
    document.getElementById('divRate').classList.remove('d-none');
    let html = '';

    data.forEach(function (item) {
        html += `
            <tr>
                <td>${item.costPerBed}</td>
                <td>${item.securityAmount}</td>
                <td>${formatDate(item.effectiveFrom)}</td>
                <td>${formatDate(item.effectiveTO)}</td>
            </tr>
        `;
    });

    $('#tblRateBody').html(html);
    if (data.length === 1 && data[0].rateID === 0) {
        document.getElementById('divRate').classList.add('d-none');
    }
}

function showAcBadge(flag) {
    let badge = document.getElementById('acBadge');
    if (!badge) {
        badge = document.createElement('span');
        badge.id = 'acBadge';
        badge.className = 'badge ms-2';
        document.querySelector('label[for="roomTypeSelect"]')?.appendChild(badge);
    }
    badge.textContent = flag;
    badge.className = 'badge ms-2 ' + (flag === 'AC' ? 'bg-info' : 'bg-secondary');
}

function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB');
}

function showToast(msg, type = 'success') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<div class="toast align-items-center text-bg-${type} border-0 show position-fixed bottom-0 end-0 m-3" role="alert" style="z-index:9999">
            <div class="d-flex"><div class="toast-body">${msg}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div></div>`;
    document.body.appendChild(wrapper);
    setTimeout(() => wrapper.remove(), 3000);
}

// ================================================================
// LIVE RATE PREVIEW LOGIC
// ================================================================

function formatCurrency(amount) {
    return 'Rs ' + (amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDateForPreview(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function updateEffectiveBadge(effectiveFromStr) {
    const $badge = $('#prevEffectiveBadge');
    $badge.removeClass('bg-secondary bg-success bg-warning bg-opacity-25 text-secondary text-success text-warning');

    if (!effectiveFromStr) {
        $badge.addClass('bg-secondary bg-opacity-25 text-secondary').text('No date set');
        return;
    }

    const effDate = new Date(effectiveFromStr);
    effDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (effDate <= today) {
        $badge.addClass('bg-success bg-opacity-25 text-success').text('Active now');
    } else {
        $badge.addClass('bg-warning bg-opacity-25 text-warning').text('Starts ' + formatDateForPreview(effectiveFromStr));
    }
}

function updateInvoicePreview() {
    const hostelName = $('#ddlHostel option:selected').text().trim();
    const roomTypeName = $('#ddlRoomType option:selected').text().trim();
    const occupancyTypeName = $('#ddlRoomOccupancyType option:selected').text().trim();

    $('#prevHostelName').text(hostelName && hostelName !== '-- Select --' ? hostelName : '-');
    $('#prevRoomType').text(roomTypeName && roomTypeName !== '-- Select --' ? roomTypeName : '-');
    $('#prevOccupancyType').text(occupancyTypeName && occupancyTypeName !== '-- Select --' ? occupancyTypeName : '-');

    const beds = parseFloat($('#txtBeds').val()) || 0;
    const costPerBed = parseFloat(($('#txtCost').val() || '').replace(/,/g, '')) || 0;
    const security = parseFloat(($('#txtSecurityAmount').val() || '').replace(/,/g, '')) || 0;
    const allowExtra = $('#ddlAllowExtraBed').val() === '1';
    const maxExtraBeds = parseFloat($('#txtMaxExtraBeds').val()) || 0;
    const effectiveFrom = $('#txtEffectiveFrom').val();

    const baseRent = costPerBed * beds;
    const extraBedAmount = (allowExtra && maxExtraBeds > 0) ? (maxExtraBeds * costPerBed) : 0;
    const total = baseRent + extraBedAmount + security;

    $('#prevBaseRentDetail').text(`${formatCurrency(costPerBed)} x ${beds} beds`);
    $('#prevBaseRentAmount').text(formatCurrency(baseRent));

    if (allowExtra && maxExtraBeds > 0) {
        $('#rowExtraBed').removeClass('d-none');
        $('#prevExtraBedDetail').text(`${formatCurrency(costPerBed)} x ${maxExtraBeds} beds (if all used)`);
        $('#prevExtraBedAmount').text(formatCurrency(extraBedAmount));
    } else {
        $('#rowExtraBed').addClass('d-none');
    }

    $('#prevSecurityAmount').text(formatCurrency(security));
    $('#prevTotalAmount').text(formatCurrency(total));
    $('#prevEffectiveFrom').text(formatDateForPreview(effectiveFrom));
    updateEffectiveBadge(effectiveFrom);

    var hostelId = $("#ddlHostel").val();
    loadHostelSummary(hostelId);
}

function loadHostelSummary(hostelId) {
    if (!hostelId) {
        $('#divHostelSummary').empty();
        return;
    }

    $.ajax({
        url: '/Hostel/GetHostelSummary',
        type: 'GET',
        data: { hostelId: hostelId },
        success: function (res) {
            if (res.success && res.data) {
                renderHostelSummary(res.data[0]);
            } else {
                $('#divHostelSummary').html('<span class="text-muted small">No summary available</span>');
            }
        },
        error: function () {
            $('#divHostelSummary').html('<span class="text-danger small">Failed to load hostel summary</span>');
        }
    });
}

function renderHostelSummary(data) {
    const badges = [
        { label: 'Type', value: data.hostelType, cls: 'bg-light text-dark border' },
        { label: 'Intake', value: data.intakeCapacity, cls: 'bg-light text-dark border' },
        { label: 'Rooms', value: data.totalRoomsAdded, cls: 'bg-light text-dark border' },
        { label: 'Beds', value: data.totalBedsAdded, cls: 'bg-light text-dark border' },
        { label: 'Extra Beds', value: data.totalExtraBedsAllowed, cls: 'bg-light text-dark border' },
        { label: 'Available', value: data.availableCapacity, cls: 'bg-success bg-opacity-10 text-success border border-success-subtle' },
        { label: 'Avail. w/ Extra', value: data.availableCapacityWithExtraBed, cls: 'bg-light text-dark border' }
    ];

    let html = '';
    badges.forEach(function (b) {
        const val = (b.value === null || b.value === undefined) ? '-' : b.value;
        html += `<span class="badge ${b.cls} fw-normal">${b.label}: ${val}</span>`;
    });

    $('#divHostelSummary').html(html);
}

function validateHostelRoomForm() {
    let isValid = true;

    Object.keys(hostelRoomFieldMap).forEach(fieldId => {
        const el = document.getElementById(fieldId);
        const errEl = document.getElementById(hostelRoomFieldMap[fieldId]);
        if (!el) return;

        const val = el.value?.toString().trim();
        const invalid = !val;

        if (invalid) {
            isValid = false;
            el.classList.add('field-invalid');
            if (errEl) errEl.classList.remove('d-none');
        } else {
            el.classList.remove('field-invalid');
            if (errEl) errEl.classList.add('d-none');
        }
    });

    return isValid;
}

// ========================================
// Partial reload — used by submitForm() for filter/search/pagination,
// and by delete/status-change instead of a full location.reload().
// ========================================
function loadHostelRoomPartial(queryString) {
    const container = document.getElementById('hostelRoomTableContainer');
    if (!container) {
        console.warn('loadHostelRoomPartial: #hostelRoomTableContainer not found, skipping partial reload.');
        return;
    }

    container.style.opacity = '0.5';

    fetch(`/Hostel/GetHostelRoomPartial?${queryString}`, {
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

            if ($.fn.DataTable.isDataTable('#tblRoom')) {
                $('#tblRoom').DataTable().destroy();
            }
            var companyname = localStorage.getItem("comName");
            $.fn.dataTable.ext.errMode = 'none';

            try {
                exportTable = $('#tblRoom').DataTable({
                    dom: 'Bfrtip',
                    buttons: [
                        {
                            extend: 'copy', title: `Hostel Room - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5], rows: ':visible' }
                        },
                        { extend: 'csv', title: `Hostel Room - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5], rows: ':visible' } },
                        { extend: 'excel', title: `Hostel Room - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5], rows: ':visible' } },
                        { extend: 'pdf', title: `Hostel Room - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5], rows: ':visible' } },
                        { extend: 'print', title: `Hostel Room - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5], rows: ':visible' } }
                    ],
                    searching: false,
                    paging: false,
                    info: false,
                    ordering: false,
                    language: {
                        emptyTable: 'No records found.',
                        zeroRecords: 'No matching records found.'
                    }
                });
            } catch (e) {
                console.warn('DataTable init warning (tblRoom partial):', e);
            }

            if (typeof initStickyTable === 'function') initStickyTable();
            if (typeof stickyHeader === 'function') stickyHeader();

            selectedId = 0;
            window.selectedId = 0;
            window.selectedRoomTypeId = 0;

            renderFilterBadges();

            updateButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// Pagination click interception, scoped to the room type container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#hostelRoomTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadHostelRoomPartial(query);
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

function bindAllowbad(value) {
    if (value === "1") {
        $('#txtMaxExtraBeds').prop('disabled', false);
    } else {
        $('#txtMaxExtraBeds').prop('disabled', true);
        $('#txtMaxExtraBeds').val('');
    }
}