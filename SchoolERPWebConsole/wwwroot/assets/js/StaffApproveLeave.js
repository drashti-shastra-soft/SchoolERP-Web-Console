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
const FILTER_KEY = 'appliedFilters_leaveType';
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

    loadApproveLeavePartial(params);
}

function applyFilters() {
    const sessionEl = document.getElementById('ddlFilterSessions');
    const companyEl = document.getElementById('ddlFilterCompany');
    const searchEl = document.getElementById('txtSearchInput');

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

    ['ddlFilterSessions', 'ddlFilterCompany'].forEach(id => {
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
function deleteSelected() {
    if (!selectedId) return;

    let selectedIds = [];
    $('.leave-select-checkbox:checked').each(function () {
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
// DOMContentLoaded — init DataTable + UI
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    loadLeaveBalance();
    

    $('.select2').select2({
        width: '100%'
    });

    $('.select2').on('change', function () {
        $(this).next('.select2-container').removeClass('is-invalid');
        if ($(this).val()) {
            $(this).removeClass('is-invalid');
        }
    });

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
        document.getElementById('txtSearchInput').value = '';
        document.getElementById('hdnSearch').value = '';
        ['ddlFilterSessions', 'ddlFilterCompany'].forEach(id => {
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
   
    // ── Render badges on load ─────────────────────────────────────────
    renderFilterBadges();

    

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

        // ── Sync search into appliedFilters before submit ─────────────
        const val = this.value.trim();
        if (val) appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        else delete appliedFilters['txtSearchInput'];
        saveAppliedFilters(); // ← persist before submit
        renderFilterBadges();
        submitForm();
    }, 500);
});
$(document).ready(function () {
    var companyname = localStorage.getItem("comName");
    $('#applyLeaveTable').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Approval Leave - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'csv', title: `Approval Leave - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'excel', title: `Approval Leave - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'pdf', title: `Approval Leave - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'print', title: `Approval Leave - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4, 5] } }
        ],
        language: {
            emptyTable: "No records found.",
            zeroRecords: "No records found."
        },
        searching: false,
        paging: false,
        info: false
    });
})


let selectedApplyLeaveID = null;


function selectItem(id, row) {
    selectedId = id;

    document.querySelectorAll('.item-row').forEach(r => r.classList.remove('bg-light'));
    row.classList.add('bg-light');
    //row.querySelector('input[type="radio"]').checked = true;

    if (canEdit) document.getElementById('btnTopEdit').disabled = false;
    if (canDelete) document.getElementById('btnDelete').disabled = false;
    let checkedCount = $('.leave-select-checkbox:checked').length;
    $('#btnDelete').prop('disabled', checkedCount === 0);
    // Edit sirf 1 record select hone par
    $('#btnTopEdit').prop('disabled', checkedCount !== 1);
    $('#btnActive').prop('disabled', checkedCount === 0);
    $('#btnInactive').prop('disabled', checkedCount === 0);
}  
// --- Leave Management Logic ---
function selectRow(id, checkboxEl) {
    if (checkboxEl.checked) {
        if (!selectedApplyLeaveIDs.includes(id)) {
            selectedApplyLeaveIDs.push(id);
        }
    } else {
        selectedApplyLeaveIDs = selectedApplyLeaveIDs.filter(x => x !== id);
    }

    // Enable Edit only when exactly ONE is selected
    $('#btnTopEdit').prop('disabled', selectedApplyLeaveIDs.length !== 1);

    const total = $('.leave-select-checkbox').length;
    $('#chkSelectAll').prop('checked', selectedApplyLeaveIDs.length === total && total > 0);
}




function toggleModalMode(isEdit) {
    if (isEdit) {
        // Hide inputs, show labels
        $('[id^="div"][id$="Input"]').addClass('d-none');
        $('[id^="lbl"]').removeClass('d-none');
        $('.req-star').addClass('d-none');
        $('#divBalance').hide();
        // Disable validation for hidden inputs
        $('#ddlStaff, #ddlLeaveType, #txtFromDate, #txtToDate').prop('required', false);
    } else {
        // Show inputs, hide labels
        $('[id^="div"][id$="Input"]').removeClass('d-none');
        $('[id^="lbl"]').addClass('d-none');
        $('.req-star').removeClass('d-none');
        // Re-enable validation
        $('#ddlStaff, #ddlLeaveType, #txtFromDate, #txtToDate').prop('required', true);
    }
}



async function handleTopEdit() {
    try {
        if (!selectedId) return;
        location.href = `/HumanResource/AddApproveLeave/${selectedId}`;
        
    } catch (error) {
        console.error('Error fetching leave details:', error);
    }
}

// --- Application Logic ---
function openApplyModal() {
    $('#applyForm')[0].reset();
    $('#applyForm').removeClass('was-validated');
    toggleModalMode(false);
    $('#hdnApplyLeaveID').val(0);
    $('#applyModalTitle').text('Apply Leave (Administrative)');
    $('#ddlStaff').val('').trigger('change');
    $('#ddlLeaveType').empty().append('<option value="">Select Type</option>').trigger('change');
    $('#ddlStatus').val('Pending');
    $('#txtAdminNote').val('');
    $('#divBalance').hide();
    clearError();
    $('#applyModal').modal('show');
}

function showError(msg) {
    $('#spnErrorMessage').text(msg);
    $('#divError').removeClass('d-none').fadeIn();
}

function clearError() {
    $('#divError').addClass('d-none');
}

function showBalanceInfo() {
    clearError();
    const selectedOpt = $('#ddlLeaveType option:selected');
    if (selectedOpt.val()) {
        $('#spnBalance').text(selectedOpt.data('balance') || 0);
        $('#spnTotalQuota').text(selectedOpt.data('total') || 0);
        $('#spnUsed').text(selectedOpt.data('used') || 0);
        $('#divBalance').fadeIn();
    } else {
        $('#divBalance').hide();
    }
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

async function fetchLeaveBalance() {
    const staffId = $('#ddlStaff').val();
    if (!staffId) { $('#divBalance').hide(); return; }
    try {
        const response = await fetch(`/HumanResource/GetStaffAllLeaveBalances?staffId=${staffId}`);
        const res = await response.json();
        const ddl = $('#ddlLeaveType');
        ddl.empty().append('<option value="">Select Type</option>');
        if (res.success && res.data) {
            res.data.forEach(b => {
                ddl.append(`<option value="${b.leaveTypeID}" data-balance="${b.balance}" data-total="${b.totalQuota}" data-used="${b.totalUsed}">${b.leaveTypeName} (Bal: ${b.balance})</option>`);
            });
        }
        showBalanceInfo();
    } catch (error) { console.error(error); }
}

let isSaving = false;
async function saveLeave() {
   
    if (isSaving) return;

    clearError();

    const form = document.getElementById("applyForm");

    if (!form) {
        console.error("applyForm not found");
        return;
    }

    form.classList.add("was-validated");

    if (!form.checkValidity()) {
        return;
    }

    const applyLeaveId = parseInt($("#hdnApplyLeaveID").val()) || 0;

    const isEdit = applyLeaveId > 0;

    // Date validation
    if (!isEdit) {
        const fromDateValue = $("#txtFromDate").val();
        const toDateValue = $("#txtToDate").val();

        if (!fromDateValue || !toDateValue) {
            showError("From Date and To Date are required.");
            return;
        }

        const fromDate = new Date(fromDateValue);
        const toDate = new Date(toDateValue);

        if (toDate < fromDate) {
            showError("To Date cannot be earlier than From Date.");
            return;
        }
    }

    const $saveBtn = $(".top-btn.btn-success");
    const originalHtml = $saveBtn.html();

    isSaving = true;

    $saveBtn.prop("disabled", true).html('<i class="ti ti-loader-2 me-1"></i>Saving...');

    try {
        const fileEl = document.getElementById("fileAttachment");

        let attachmentBase64 = null;
        let attachmentDocType = null;
        let attachmentDocName = null;

        if (fileEl && fileEl.files && fileEl.files.length > 0) {
            const file = fileEl.files[0];

            attachmentDocType = file.type;
            attachmentDocName = file.name;

            attachmentBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.onload = function () {
                    resolve(reader.result);
                };

                reader.onerror = function () {
                    reject(new Error("File read failed."));
                };

                reader.readAsDataURL(file);
            });
        }

        const staffId = parseInt($("#hdnStaffID").val()) || parseInt($("#ddlStaff").val()) || 0;
        const companyID = parseInt($("#hdnCompanyID").val()) || 0;
        const sessionID = parseInt($("#hdnSessionID").val()) || 0;
        const leaveTypeId = parseInt($("#hdnLeaveTypeID").val()) || parseInt($("#ddlLeaveType").val()) || 0;

        const fromDate = $("#txtFromDate").val() || null;
        const toDate = $("#txtToDate").val() || null;
        const reason = $("#txtReason").val() || "";
        const status = $("#ddlStatus").val() || "";
        const note = $("#txtAdminNote").val() || "";
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
        //const data = {
        //    applyLeaveID: applyLeaveId,
        //    staffID: staffId,
        //    leaveTypeID: leaveTypeId,
        //    fromDate: fromDate,
        //    toDate: toDate,
        //    reason: reason,
        //    status: status,
        //    note: note,
        //    attachmentBase64: attachmentBase64,
        //    attachmentDocType: attachmentDocType,
        //    attachmentDocName: attachmentDocName,
        //    companyID: companyID,
        //    sessionID: sessionID
        //};
        const isEdit = applyLeaveId > 0;
        const data = {
            applyLeaveID: applyLeaveId,
            staffID: parseInt(staffId),
            leaveTypeID: parseInt(leaveTypeId),
            fromDate: fromDate,
            toDate: toDate,
            reason: reason,
            status: status,
            note: note,
            attachmentBase64: attachmentBase64,
            attachmentDocType: attachmentDocType,
            attachmentDocName: attachmentDocName,
            sessionID: sessionID,
            companyID: companyID
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
                    }).then(() => { window.location.href = '/HumanResource/ApproveLeave'; });
                } else {
                    Swal.fire({
                        icon: 'error', title: 'Error', text: res.message || 'Failed to save leave application.',
                        confirmButtonText: 'OK', customClass: { confirmButton: 'btn btn-danger' }, buttonsStyling: false
                    });
                }

            
        })

        
    } catch (err) {
        console.error("Save leave failed:", err);
        Swal.fire({
            title: "Error!",
            text: err.message || "Something went wrong while saving. Please try again.",
            icon: "error",
            confirmButtonText: "OK",
            customClass: {
                confirmButton: "btn btn-danger",
            },
            buttonsStyling: false,
        });
    } finally {
        isSaving = false;
        $saveBtn.prop("disabled", false).html(originalHtml);
    }
}


// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadApproveLeavePartial(queryString) {
    const container = document.getElementById('approveLeaveTableContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/HumanResource/GetApproveLeavePartial?${queryString}`, {
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
    const link = e.target.closest('#approveLeaveTableContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadApproveLeavePartial(query);
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