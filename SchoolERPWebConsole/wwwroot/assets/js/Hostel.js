// Letters-only fields
$('#txtHostelName, #txtDisplayLabel, #txtHostelRules').on('input', function () {
    this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
});
function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#tblHostel')) {
        const table = $('#tblHostel').DataTable();
        table.button(index).trigger();
    }
}
// ========================================
// Permissions / inline validation helpers
// (missing before — caused ReferenceError in saveRecord/validateHostelForm)
// ========================================
const permCanAdd = window.canAdd;
const btnEditEl = document.getElementById('btnEdit');
const btnDeleteEl = document.getElementById('btnDelete');
if (window.canEdit && btnEditEl) btnEditEl.disabled = false;
if (window.canDelete && btnDeleteEl) btnDeleteEl.disabled = false;


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

function submitForm() {
    // Sync hidden form fields from dropdowns before submit
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const roolTypeEl = document.getElementById('ddlFilterRoolType');
    const searchEl = document.getElementById('txtSearchInput');

    if (sessionEl) document.getElementById('hdnSessionID').value = sessionEl.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;
    if (roolTypeEl) document.getElementById('hdnRoomTypeID').value = roolTypeEl.value;
    if (searchEl) document.getElementById('hdnSearch').value = searchEl.value.trim();

    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadHostelPartial(params);
}

function applyFilters() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const roolTypeEl = document.getElementById('ddlFilterRoolType');
    const searchEl = document.getElementById('txtSearchInput');

    // Search
    const searchVal = searchEl?.value.trim() ?? '';
    document.getElementById('hdnSearch').value = searchVal;

    if (searchVal) {
        appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    } else {
        delete appliedFilters['txtSearchInput'];
    }

    // Session
    if (sessionEl?.value && sessionEl.value !== '') {
        appliedFilters['ddlFilterSessions'] = {
            label: 'Session',
            text: sessionEl.options[sessionEl.selectedIndex]?.text || sessionEl.value,
            value: sessionEl.value
        };
    } else delete appliedFilters['ddlFilterSessions'];

    // Company
    if (companyEl?.value && companyEl.value !== '') {
        appliedFilters['ddlFilterCompany'] = {
            label: 'Company',
            text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value,
            value: companyEl.value
        };
    } else delete appliedFilters['ddlFilterCompany'];

    // Room Type
    if (roolTypeEl?.value && roolTypeEl.value !== '') {
        appliedFilters['ddlFilterRoolType'] = {
            label: 'Room Type',
            text: roolTypeEl.options[roolTypeEl.selectedIndex]?.text || roolTypeEl.value,
            value: roolTypeEl.value
        };
    } else delete appliedFilters['ddlFilterRoolType'];

    document.getElementById('hdnPageIndex').value = 1;

    saveAppliedFilters();
    renderFilterBadges();   // ✅ update badges immediately, don't wait on the ajax call
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
    } else if (filterId === 'ddlFilterRoolType') {
        const el = document.getElementById('ddlFilterRoolType');
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
    renderFilterBadges();   //

    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';
    document.getElementById('hdnSearch').value = '';

    // ✅ properly clear each dropdown's value, not just re-run select2() config
    ['ddlFilterSessions', 'ddlFilterCompany', 'ddlFilterRoolType'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = '';
        if (window.jQuery && jQuery(el).data('select2')) {
            jQuery(el).val('').trigger('change');
        }
    });

    clearAppliedFilters();
    document.getElementById('hdnPageIndex').value = 1;
    renderFilterBadges();   // ✅ clear badges visually right away

    // ── Force-close the filter dropdown ─────────────────────────
    const toggleEl = document.getElementById('btnFilterToggle');
    if (toggleEl && window.bootstrap) {
        const dd = bootstrap.Dropdown.getInstance(toggleEl) || new bootstrap.Dropdown(toggleEl);
        dd.hide();
    }

    submitForm();
}

// ========================================
// DOMContentLoaded — filter buttons, badges, pincode autocomplete, cascades
// ========================================
document.addEventListener('DOMContentLoaded', function () {
    var companyname = localStorage.getItem("comName");
    // ── DataTable (export only) — single init, no duplicate ───────────
    if ($.fn.DataTable.isDataTable('#tblHostel')) {
        $('#tblHostel').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#tblHostel').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Hostel - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4,5] } },
            { extend: 'csv', title: `Hostel - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'excel', title: `Hostel - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'pdf', title: `Hostel - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'print', title: `Hostel - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });

    // ── Clear stale filters on every full page load / redirect back ────
    clearAppliedFilters();
    renderFilterBadges();

    // ── Wire up Apply / Reset filter buttons (previously missing) ──────
    document.getElementById('btnApplyFilters')?.addEventListener('click', function () {
        applyFilters();
    });

    document.getElementById('btnResetFilters')?.addEventListener('click', function () {
        resetAllFilters();
    });

    const input = document.getElementById('txtPinCode');
    const list = document.getElementById('pinCodeSuggestions');

    let debounceTimer;
    let currentItems = [];

    // ✅ Field validation error-clearing — runs ONCE, independent of pincode
    //const fieldErrorMap = {
    //    'txtHostelName': 'errHostelName',
    //    'ddlHostelType': 'errHostelType',
    //    'txtIntake': 'errIntake'
    //    // add more required fields here as needed
    //};

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

let selectedId = 0;
window.selectedId = 0;



$(document).ready(function () {
    $('#btnFilterToggle').on('shown.bs.dropdown', function () {
        $('#ddlFilterCompany').select2({
            dropdownParent: $('#filter-dropdown'),
            width: '100%'
        });

        $('#ddlFilterSessions').select2({
            dropdownParent: $('#filter-dropdown'),
            width: '100%'
        });

        $('#ddlFilterRoolType').select2({
            dropdownParent: $('#filter-dropdown'),
            width: '100%'
        });
    });
});

// ✅ Auto-apply filter as user types (300ms debounce)
const searchInput = document.getElementById('txtSearchInput');
if (searchInput) {
    let debounceTimer = null;

    searchInput.addEventListener('input', function () {
        const val = this.value.trim();

        // Update hidden field immediately
        document.getElementById('hdnSearch').value = val;

        // Update applied filters badge
        if (val) {
            appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        } else {
            delete appliedFilters['txtSearchInput'];
        }
        saveAppliedFilters();
        renderFilterBadges();   // ✅ badges now update live while typing too

        // Debounce — wait 300ms after user stops typing, then submit
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            document.getElementById('hdnPageIndex').value = 1;
            submitForm();
        }, 300);
    });

    // Enter key — submit immediately without waiting for debounce
    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(debounceTimer);
            applyFilters(); // already saves, renders badges, sets page 1, and submits
        }
    });
}

function selectItem(id, row) {
    selectedId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    window.selectedId = id;
    row.classList.add('bg-light');

    if (window.canEdit) document.getElementById('btnEdit')?.removeAttribute('disabled');
    if (window.canDelete) document.getElementById('btnDelete')?.removeAttribute('disabled');

    let checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    // Edit sirf 1 record select hone par
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
}

function editSelected() {
    if (!window.selectedId) return;
    try {
        if (window.selectedId) {
            location.href = `/Hostel/AddHostel/${window.selectedId}`;
        }
    } catch (err) {
        console.error(err);
    }
}

async function saveRecord() {
    const form = document.getElementById('hostelForm');
    // Custom inline validation instead of native tooltip
    if (!validateHostelForm()) {
        return;
    }
    const hostelID = parseInt(document.getElementById('hdnHostelID').value);
    if (hostelID === 0 && !permCanAdd) {
        IV.setNotice('classModalNotice', 'You do not have permission to add.');
        return;
    }

    const isEdit = hostelID > 0;

    const hostelName = document.getElementById('txtHostelName').value.trim();
    const displayLabelInput = document.getElementById('txtDisplayLabel').value.trim();

    const data = {
        hostelID: hostelID || 0,
        hostelName: hostelName,
        displayLabel: displayLabelInput || hostelName,   // fallback to hostelName if empty
        roomTypeID: parseInt(document.getElementById('ddlRoomType').value),
        hostelIntake: parseInt(document.getElementById('txtIntake').value),
        hostelAddress: document.getElementById('txtAddress').value.trim() || null,
        hostelDescription: document.getElementById('txtDescription').value.trim() || null,
        isActive: document.getElementById('chkActive').checked,
        hostelTypeID: document.getElementById('ddlHostelType').value.trim() || null,
        hostelCode: document.getElementById('txtHostelCode').value.trim() || null,
        postalCode: document.getElementById('txtPinCode').value.trim() || null,
        countryId: document.getElementById('ddlCountry').value || null,
        stateId: document.getElementById('ddlState').value || null,
        cityId: document.getElementById('ddlCity').value || null,
        companyID: parseInt(document.getElementById('hdnCompanyID').value) || 0,
        sessionID: parseInt(document.getElementById('hdnSessionID').value) || 0,
        hostelRules: document.getElementById('txtHostelRules').value.trim() || null
    };

    try {
        const r = await fetch('/Hostel/UpsertHostel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        const res = await r.json();
        if (res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: isEdit
                    ? 'Hostel has been updated successfully.'
                    : 'Hostel has been added successfully.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                window.location.href = '/Hostel/Index';
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
    if (!selectedId) return;

    let selectedIds = [];
    $('.student-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        alert("Please select at least one hostel.");
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this hostel record. This action cannot be undone!",
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
                url: '/Hostel/DeleteHostel',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Hostel record has been deleted.', 'success')
                            .then(() => location.reload());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete hostel.', 'error');
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
                    url: '/Hostel/ToggleHostelStatus',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(request),
                    success: function (res) {
                        if (res.success) {
                            Swal.fire('Updated!', res.message || 'Status updated successfully.', 'success')
                                .then(() => location.reload());
                        } else {
                            revertAll();
                            updateButtonStates();             // ✅ resync on failure too
                            Swal.fire('Error!', res.message || 'Failed to update status.', 'error');
                        }
                    },
                    error: function (xhr) {
                        revertAll();
                        updateButtonStates();                   // ✅ resync on failure too
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
                updateButtonStates();                           // ✅ this is what was missing
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

function showToast(msg, type = 'success') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<div class="toast align-items-center text-bg-${type} border-0 show position-fixed bottom-0 end-0 m-3" role="alert" style="z-index:9999">
            <div class="d-flex"><div class="toast-body">${msg}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div></div>`;
    document.body.appendChild(wrapper);
    setTimeout(() => wrapper.remove(), 3000);
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

const fieldErrorMap = {
    'txtHostelName': 'errHostelName',
    'ddlHostelType': 'errHostelType',
    'txtIntake': 'errIntake'
};

function validateHostelForm() {
    let isValid = true;

    Object.keys(fieldErrorMap).forEach(fieldId => {
        const el = document.getElementById(fieldId);
        const errEl = document.getElementById(fieldErrorMap[fieldId]);
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
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadHostelPartial(queryString) {
    const container = document.getElementById('hostelTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/Hostel/GetHostelPartial?${queryString}`, {
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

            if ($.fn.DataTable.isDataTable('#tblHostel')) {
                $('#tblHostel').DataTable().destroy();
            }

            $.fn.dataTable.ext.errMode = 'none'; // ✅ keep suppressed after every reload too
            var companyname = localStorage.getItem("comName");
            try {
                exportTable = $('#tblHostel').DataTable({
                    dom: 'Bfrtip',
                    buttons: [
                        { extend: 'copy', title: `Hostels - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4,5], rows: ':visible' } },
                        { extend: 'csv', title: `Hostels - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5], rows: ':visible' } },
                        { extend: 'excel', title: `Hostels - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5], rows: ':visible' } },
                        { extend: 'pdf', title: `Hostels - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5], rows: ':visible' } },
                        { extend: 'print', title: `Hostels - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5], rows: ':visible' } }
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
                console.warn('DataTable init warning (tblHostel partial):', e);
            }

            // ✅ Safety hook: if your theme has a separate sticky-header JS
            // function (e.g. initStickyTable / stickyHeader / fixedHeader),
            // it only ran once on the original page load and loses its
            // binding whenever this table gets replaced above. Re-run it
            // here every time so it re-attaches to the new table.
            // Safe no-op if that function doesn't exist in your codebase.
            if (typeof initStickyTable === 'function') initStickyTable();
            if (typeof stickyHeader === 'function') stickyHeader();

            updateButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// ✅ Pagination click interception, scoped to the hostel container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#hostelTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadHostelPartial(query);
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