
const currentUserId = window.currentUserId;
// ========================================
// Export (DataTable button trigger)
// ========================================
function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#tblDesignation')) {
        $('#tblDesignation').DataTable().button(index).trigger();
    }
}

// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_city';
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
    const companyEl = document.getElementById('ddlFilterCompany');
    const countryEl = document.getElementById('ddlFilterSessions');
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;
    if (countryEl) document.getElementById('hdnSessionId').value = countryEl.value;
    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadDesignationPartial(params);
}

function applyFilters() {
    const companyEl = document.getElementById('ddlFilterCompany');
    const countryEl = document.getElementById('ddlFilterSessions');
    const searchEl = document.getElementById('txtSearchInput');

    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    if (companyEl?.value) {
        appliedFilters['ddlFilterCompany'] = { label: 'Company', text: companyEl.options[companyEl.selectedIndex]?.text || companyEl.value };
    } else delete appliedFilters['ddlFilterCompany'];

    if (countryEl?.value) {
        appliedFilters['ddlFilterSessions'] = { label: 'Country', text: countryEl.options[countryEl.selectedIndex]?.text || countryEl.value };
    } else delete appliedFilters['ddlFilterSessions'];

    
    saveAppliedFilters();
}

function renderFilterBadges() {
    const container = document.getElementById('badgeContainer');
    const mainContainer = document.getElementById('activeFilterBadges');
    if (!container || !mainContainer) return;

    container.innerHTML = '';
    Object.entries(appliedFilters).forEach(([id, { label, text }]) => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-primary-subtle text-primary border border-primary-subtle d-flex align-items-center gap-1 fw-medium px-2 py-1';
        badge.innerHTML = `${label}: ${text} <i class="ti ti-x ms-1 cursor-pointer" onclick="removeFilter('${id}')" style="font-size:10px;"></i>`;
        container.appendChild(badge);
    });
    mainContainer.style.display = Object.keys(appliedFilters).length > 0 ? 'block' : 'none';
}

function resetSelect2(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = '';
    if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
}

function removeFilter(filterId) {
    if (filterId === 'ddlFilterSessions') {
        resetSelect2('ddlFilterSessions');
        resetSelect2('ddlFilterState'); // clearing country clears dependent state too
    } else if (filterId === 'ddlFilterState') {
        resetSelect2('ddlFilterState');
    } else if (filterId === 'ddlFilterCompany') {
        resetSelect2('ddlFilterCompany');
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
    const search = document.getElementById('txtSearchInput');
    if (search) search.value = '';
    document.getElementById('hdnSearch').value = '';

    ['ddlFilterCompany', 'ddlFilterSessions'].forEach(resetSelect2);

    clearAppliedFilters();
    renderFilterBadges();
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}


let selectedId = 0;
const canEdit = window.canEdit;
const canDelete = window.canDelete;


$(document).ready(function () {
    //$('#tblDesignation').DataTable({
    //    dom: 'Bfrtip',
    //    buttons: [
    //        { extend: 'copy', exportOptions: { columns: [1] } },
    //        { extend: 'csv', exportOptions: { columns: [1] } },
    //        { extend: 'excel', exportOptions: { columns: [1] } },
    //        { extend: 'pdf', exportOptions: { columns: [1] } },
    //        { extend: 'print', exportOptions: { columns: [1] } }
    //    ],
    //    searching: false,
    //    paging: false,
    //    info: false
    //});

    $('#tblDesignation').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', exportOptions: { columns: [1] } },
            { extend: 'csv', exportOptions: { columns: [1] } },
            { extend: 'excel', exportOptions: { columns: [1] } },
            { extend: 'pdf', exportOptions: { columns: [1] } },
            { extend: 'print', exportOptions: { columns: [1] } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false,
        language: {
            emptyTable: '@Html.Raw(ViewBag.ErrorMessage != null ? "Error: " + ViewBag.ErrorMessage : "No records found.")'
        }
    });


    $('#txtName').on('input', function () {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
    });

})
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

function selectItem(id, row) {
    selectedId = id;
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    row.classList.add('bg-light');

    let checkedCount = $('.designation-checkbox:checked').length;

    if (canEdit) {
        $('#btnEdit').prop('disabled', checkedCount !== 1);
        $('#btnActive').prop('disabled', checkedCount === 0);
        $('#btnInactive').prop('disabled', checkedCount === 0);
    }
    if (canDelete) {
        $('#btnDelete').prop('disabled', checkedCount === 0);
    }
}  

document.getElementById('txtSearchInput').addEventListener('keyup', function () {
    const q = this.value.toLowerCase();
    document.querySelectorAll('#tblDesignation tbody tr').forEach(row => {
        if (row.classList.contains('item-row')) {
            row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
        }
    });
});

function editSelected() {
    if (!selectedId) return;
    location.href = `/HumanResource/AddDesignation/${selectedId}`;
}


function setFieldError(inputSel, errorSel, message, useSelect2 = false) {
    const $input = $(inputSel);
    const $error = $(errorSel);
    $error.text(message || '');

    if (useSelect2) {
        $input.next('.select2').find('.select2-selection')
            .toggleClass('border-danger', !!message);
    } else {
        $input.toggleClass('is-invalid', !!message);
    }
}

function fnValidation() {
    let isValid = true;

    //Department
    const desigantionname = $('#txtName').val();
    if (!desigantionname) {
        setFieldError('#txtName', '#designationError', 'Designation is required!', true);
        isValid = false;
    } else {
        setFieldError('#txtName', '#designationError', '', true);
    }


    return isValid;
}

async function saveRecord() {
    if (!fnValidation()) return;
    const form = document.getElementById('entryForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const data = {
        hrDesignationID: parseInt(document.getElementById('hdnDesignationID').value) || 0,
        designationName: document.getElementById('txtName').value.trim(),
        isActive: document.getElementById('chkActive').checked,
        companyID: parseInt(document.getElementById('hdnCompanyID').value) || 0,
        sessionID: parseInt(document.getElementById('hdnSessionID').value) || 0
    };

    fetch('/UpsertDesignation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(r => r.json())
        .then(res => {            
            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Saved!',
                    text: 'Designation has been saved successfully.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                }).then(() => { window.location.href = '/HumanResource/Designation'; });
            } else {
                Swal.fire({
                    icon: 'error', title: 'Error', text: res.message || 'Failed to save designation.',
                    confirmButtonText: 'OK', customClass: { confirmButton: 'btn btn-danger' }, buttonsStyling: false
                });
            }
        });
}

function deleteSelected() {
    if (!selectedId) return;

    let selectedIds = [];
    $('.designation-checkbox:checked').each(function () {
        selectedIds.push(parseInt($(this).val()));
    });
    if (selectedIds.length === 0) {
        alert("Please select at least one designation.");
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this Designation record. This action cannot be undone!",
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
                url: '/HumanResource/DeleteDesignation',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Designation record has been deleted.', 'success')
                            .then(() => location.reload());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete Designation.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}

function getSelectedDesignationIds() {
    let ids = [];
    $('.designation-checkbox:checked').each(function () {
        ids.push(parseInt($(this).val()));
    });
    return ids;
}

window.toggleStatus = async function (id, isActive) {
    let ids = (id && id !== 0) ? [parseInt(id)] : getSelectedDesignationIds();

    if (ids.length === 0) {
        Swal.fire('Oops!', 'Please select at least one Designation.', 'warning');
        return;
    }

    const request = {
        ids: ids.join(','),
        isActive: isActive,
        doneBy: currentUserId
    };

    const config = isActive
        ? {
            icon: 'question',
            title: 'Activate Record(s)?',
            text: 'Activating will make the selected record(s) visible and available for use across the system. Continue?',
            confirmButtonText: 'Yes, Activate',
            confirmButtonColor: '#198754',
            confirmButtonClass: 'btn btn-success me-2',
            successTitle: 'Activated!',
            successText: 'The selected record(s) have been activated.'
        }
        : {
            icon: 'warning',
            title: 'Deactivate Record(s)?',
            text: 'Deactivating will hide the selected record(s) and prevent them from being used. Continue?',
            confirmButtonText: 'Yes, Deactivate',
            confirmButtonColor: '#d33',
            confirmButtonClass: 'btn btn-danger me-2',
            successTitle: 'Deactivated!',
            successText: 'The selected record(s) have been deactivated.'
        };

    try {
        const result = await Swal.fire({
            icon: config.icon,
            title: config.title,
            text: config.text,
            showCancelButton: true,
            confirmButtonColor: config.confirmButtonColor,
            cancelButtonColor: '#3085d6',
            confirmButtonText: config.confirmButtonText,
            customClass: {
                confirmButton: config.confirmButtonClass,
                cancelButton: 'btn btn-secondary'
            },
            buttonsStyling: false
        });

        if (!result.isConfirmed) {
            // if this was a row-level switch being clicked, revert the visual toggle on cancel
            if (id && id !== 0) location.reload();
            return;
        }

        $.ajax({
            url: '/HumanResource/ToggleDesignationStatus',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(request),
            success: function (res) {
                if (res.success) {
                    Swal.fire(config.successTitle, res.message || config.successText, 'success')
                        .then(() => location.reload());
                } else {
                    Swal.fire('Error!', res.message || 'Failed to update status.', 'error');
                }
            },
            error: function (xhr) {
                console.error('Status update error:', xhr.status, xhr.responseText);
                Swal.fire('Error!', 'An unexpected error occurred.', 'error');
            }
        });
    } catch (err) {
        console.error(err);
        Swal.fire('Error!', 'Could not update status.', 'error');
    }
};

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
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadDesignationPartial(queryString) {
    const container = document.getElementById('designationTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/HumanResource/GetDesignationPartial?${queryString}`, {
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
    const link = e.target.closest('#designationTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadDesignationPartial(query);
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
