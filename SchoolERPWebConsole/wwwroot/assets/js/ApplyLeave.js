function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#applyLeaveTable')) {
        const table = $('#applyLeaveTable').DataTable();
        table.button(index).trigger();
    }
}
let selectedId = 0;
const canEdit = window.canEdit;
const canDelete = window.canDelete;
// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_applyLeave';
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
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const sectionEl = document.getElementById('ddlFilterSection');
    if (sessionEl) document.getElementById('hdnSessionID').value = sessionEl.value;
    if (companyEl) document.getElementById('hdnCompanyId').value = companyEl.value;
    if (sectionEl) document.getElementById('hdnSectionID').value = sectionEl.value;

    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadApplyLeavePartial(params);
}

function applyFilters() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const sectionEl = document.getElementById('ddlFilterSection');
    const searchEl = document.getElementById('txtSearchInput');

    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

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

    if (sectionEl?.value && sectionEl.value !== '') {
        appliedFilters['ddlFilterSection'] = {
            label: 'Section',
            text: sectionEl.options[sectionEl.selectedIndex]?.text || sectionEl.value
        };
    } else delete appliedFilters['ddlFilterSection'];

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
    } else if (filterId === 'ddlFilterSection') {
        const el = document.getElementById('ddlFilterSection');
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

    ['ddlFilterSessions', 'ddlFilterCompany', 'ddlFilterSection'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
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
    var companyname = localStorage.getItem("comName");

    if ($.fn.DataTable.isDataTable('#applyLeaveTable')) {
        $('#applyLeaveTable').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#applyLeaveTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Apply Leave - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4,5,6,7] } },
            { extend: 'csv', title: `Apply Leave - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
            { extend: 'excel', title: `Apply Leave - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
            { extend: 'pdf', title: `Apply Leave - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
            { extend: 'print', title: `Apply Leave - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } }
        ],
        searching: false,
        paging: false,
        info: false,
        language: {
            emptyTable: "No leave applications found."
        }
    });

    try {
        if (window.jQuery && typeof jQuery.fn.select2 === 'function') {
            jQuery('#ddlFilterSessions, #ddlFilterCompany, #ddlFilterSection').select2({
                width: '100%',
                dropdownParent: jQuery('#filter-dropdown'),
                allowClear: true,
                placeholder: function () { return jQuery(this).data('placeholder') || 'Select'; }
            });
        }
    } catch (e) {
        console.warn('Select2 init skipped:', e);
    }

    document.getElementById('filter-dropdown')?.addEventListener('click', e => e.stopPropagation());

    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        document.getElementById('hdnPageIndex').value = 1;
        document.getElementById('hdnSearch').value = document.getElementById('txtSearchInput').value;
        applyFilters();
        submitForm();
    });

    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        document.getElementById('txtSearchInput').value = '';
        document.getElementById('hdnSearch').value = '';
        ['ddlFilterSessions', 'ddlFilterCompany', 'ddlFilterSection'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.value = '';
            if (window.jQuery && jQuery(el).data('select2')) jQuery(el).val('').trigger('change');
        });
        clearAppliedFilters();
        renderFilterBadges();
        document.getElementById('hdnPageIndex').value = 1;
        submitForm();
    });

    renderFilterBadges();

    $('.select2').select2({
        width: '100%'
    });

    $('.select2').on('change', function () {
        $(this).next('.select2-container').removeClass('is-invalid');
        if ($(this).val()) {
            $(this).removeClass('is-invalid');
        }
    });

    loadLeaveBalance();

    $('#ddlLeaveType').on('change', loadLeaveBalance);
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

        const val = this.value.trim();
        if (val) appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        else delete appliedFilters['txtSearchInput'];
        saveAppliedFilters();
        renderFilterBadges();
        submitForm();
    }, 500);
});

// ========================================
// Balance / error helpers
// ========================================
window.clearError = function () {
    $('#divError').addClass('d-none');
}

function showError(msg) {
    $('#spnErrorMessage').text(msg);
    $('#divError').removeClass('d-none').fadeIn();
}
function selectItem(id, row) {
    selectedId = id;
   
    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    row.classList.add('bg-light');
    //row.querySelector('input[type="radio"]').checked = true;

    if (canEdit) document.getElementById('btnEdit').disabled = false;
    if (canDelete) document.getElementById('btnDelete').disabled = false;
    let checkedCount = $('.student-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    // Edit sirf 1 record select hone par
    $('#btnEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
}  

function loadLeaveBalance() {
    const leaveTypeId = $('#ddlLeaveType').val();
    const staffId = $('#ddlStaff').val();

    if (!leaveTypeId || !staffId) {
        $('#spnBalance, #spnTotalQuota, #spnUsed').text('0');
        $('#divBalance').hide();
        return;
    }

    fetch(`/HumanResource/GetLeaveBalance?leaveTypeId=${leaveTypeId}&staffId=${staffId}`)
        .then(r => r.json())
        .then(res => {
            if (res.success && res.data) {
                $('#spnBalance').text(res.data.remainingBalance);
                $('#spnTotalQuota').text(res.data.totalQuota);
                $('#spnUsed').text(res.data.usedDays);
                $('#divBalance').fadeIn();
            } else {
                $('#spnBalance, #spnTotalQuota, #spnUsed').text('0');
                $('#divBalance').hide();
            }
        })
        .catch(() => {
            $('#spnBalance, #spnTotalQuota, #spnUsed').text('0');
            $('#divBalance').hide();
        });
}
function editSelected() {
    if (!selectedId) return;
    location.href = `/HumanResource/AddApplyLeave/${selectedId}`;
}
async function editLeave(id) {
    try {
        const response = await fetch(`/HumanResource/GetApplyLeaveByID/${id}`);
        const res = await response.json();
        if (res.success) {
            const data = res.data;
            $('#modalTitle').text('Edit Leave Application');
            $('#hdnApplyLeaveID').val(data.applyLeaveID);
            $('#ddlStaff').val(data.staffID).trigger('change');
            $('#ddlLeaveType').val(data.leaveTypeID).trigger('change');
            $('#txtFromDate').val(data.fromDate.split('T')[0]);
            $('#txtToDate').val(data.toDate.split('T')[0]);
            $('#txtReason').val(data.reason);
            $('#ddlStatus').val(data.status);
            $('#txtNote').val(data.note);
            $('#leaveModal').modal('show');
        } else {
            alert(res.message);
        }
    } catch (error) {
        console.error('Error fetching leave details:', error);
    }
}

// ========================================
// Save (Add / Edit) Leave
// ========================================
window.saveLeave = async function () {

    const form = document.getElementById('leaveForm');
    form.classList.add('was-validated');

    if (!form.checkValidity()) {
        if (!$('#ddlStaff').val()) {
            $('#ddlStaff').next('.select2-container').addClass('is-invalid');
        }
        return;
    }
    $('.select2-container').removeClass('is-invalid');

    const staffId = $('#ddlStaff').val();
    const leaveTypeId = $('#ddlLeaveType').val();
    const fromDateStr = $('#txtFromDate').val();
    const toDateStr = $('#txtToDate').val();
    if (!fromDateStr || !toDateStr) return;

    const fromDate = new Date(fromDateStr);
    const toDate = new Date(toDateStr);
    if (toDate < fromDate) {
        showError('To Date cannot be earlier than From Date.');
        return;
    }

    const diffTime = Math.abs(toDate - fromDate);
    const requestedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Fetch fresh balance right now instead of trusting a cached option
    let balance = 0;
    try {
        const res = await fetch(`/HumanResource/GetLeaveBalance?leaveTypeId=${leaveTypeId}&staffId=${staffId}`).then(r => r.json());
        if (res.success && res.data) {
            const data = res.data;
            const match = data && (data.leaveTypeID ?? data.LeaveTypeID) == leaveTypeId;

            balance = match ? (data.remainingBalance ?? 0) : 0;

            if (!match) {
                showError('Could not verify leave balance for this leave type. Please contact HR.');
                return;
            }
        } else {
            showError('Unable to verify leave balance right now. Please try again.');
            return;
        }
    } catch (err) {
        showError('Unable to verify leave balance right now. Please try again.');
        return;
    }

    if (requestedDays > balance) {
        showError(`Insufficient Balance! You are requesting ${requestedDays} days, but only ${balance} days are remaining for this leave type.`);
        return;
    }

    const fileEl = document.getElementById('fileAttachment');
    const file = fileEl.files[0];
    let attachmentBase64 = null;
    let docType = null;
    let docName = null;

    if (file) {
        docType = file.type;
        docName = file.name;
        attachmentBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    }

    const lId = parseInt($('#hdnApplyLeaveID').val()) || 0;
    const isEdit = lId > 0;

    const data = {
        applyLeaveID: lId,
        staffID: parseInt(staffId),
        leaveTypeID: parseInt(leaveTypeId),
        fromDate: fromDateStr,
        toDate: toDateStr,
        reason: $('#txtReason').val(),
        status: $('#ddlStatus').val(),
        attachmentBase64: attachmentBase64,
        attachmentDocType: docType,
        attachmentDocName: docName,
        sessionID: parseInt($('#hdnSessionID').val()) || 0,
        companyID: parseInt($('#hdnCompanyID').val()) || 0
    };

    fetch('/HumanResource/UpsertApplyLeave', {
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
                    text: isEdit
                        ? 'Apply leave has been updated successfully.'
                        : 'Apply leave has been added successfully.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                }).then(() => { window.location.href = '/HumanResource/ApplyLeave'; });
            } else {
                Swal.fire({
                    icon: 'error', title: 'Error', text: res.message || 'Failed to save leave application.',
                    confirmButtonText: 'OK', customClass: { confirmButton: 'btn btn-danger' }, buttonsStyling: false
                });
            }
        })
        .catch(err => {
            console.error('Error saving leave:', err);
            Swal.fire({
                icon: 'error', title: 'Error', text: 'An unexpected error occurred while saving.',
                confirmButtonText: 'OK', customClass: { confirmButton: 'btn btn-danger' }, buttonsStyling: false
            });
        });
}

function deleteSelected() {
    if (!selectedId) return;

    let selectedIds = [];
    $('.student-checkbox:checked').each(function () {
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
                url: '/HumanResource/DeleteApplyLeave',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(selectedIds),
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Apply leave record has been deleted.', 'success')
                            .then(() => location.reload());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete apply leave.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}


// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadApplyLeavePartial(queryString) {
    const container = document.getElementById('applyLeaveTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/HumanResource/GetApplyLeavePartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load leave applications');
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

// Pagination click interception, scoped to the apply leave container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#applyLeaveTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadApplyLeavePartial(query);
    history.replaceState(null, '', href);
});

function updateButtonStates() {
    const count = $('.student-checkbox:checked').length;
    $('#btnEdit').prop('disabled', count !== 1);
    $('#btnDelete').prop('disabled', count === 0);
    $('#btnActive').prop('disabled', count === 0);
    $('#btnInactive').prop('disabled', count === 0);
}

