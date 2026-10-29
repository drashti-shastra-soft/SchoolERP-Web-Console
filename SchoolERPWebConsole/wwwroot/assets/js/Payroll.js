// ========================================
// Payroll page — AJAX load, search, filter badges, generate / pay / payslip
// Config is provided by the view:  window.payrollConfig = { defaultMonth, defaultYear }
// ========================================
const payrollCfg = window.payrollConfig || {};

let payrollTable = null;       // DataTable instance
let searchTimer = null;
let appliedFilters = {};       // { role, month, year, search } -> { label, text, removable }

// ========================================
// Export (DataTable button trigger)
// ========================================
function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#payrollTable')) {
        $('#payrollTable').DataTable().button(index).trigger();
    }
}

// ========================================
// DataTable
// ========================================
function destroyDataTable() {
    if ($.fn.DataTable.isDataTable('#payrollTable')) {
        $('#payrollTable').DataTable().destroy();
    }
    payrollTable = null;
}

function initializeDataTable() {
    if (!document.getElementById('payrollTable')) return;

    try {
        payrollTable = $('#payrollTable').DataTable({
            // no 'f' in dom => built-in search box hidden, but the search() API still works
            dom: 'Brtip',
            buttons: [
                { extend: 'copy', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
                { extend: 'csv', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
                { extend: 'excel', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
                { extend: 'pdf', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } },
                { extend: 'print', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] } }
            ],
            searching: true,
            paging: false,
            info: false,
            ordering: false,
            language: {
                emptyTable: 'No staff records found.',
                zeroRecords: 'No matching staff records found.'
            }
        });

        // re-apply the current search text after every reload
        const q = (document.getElementById('payrollSearch')?.value || '').trim();
        if (q) payrollTable.search(q).draw();
    } catch (e) {
        console.error('DataTable init failed', e);
    }
}

// ========================================
// Load payroll list
// ========================================
function getDropdown() {
    const toggle = document.getElementById('btnFilterToggle');
    return toggle ? bootstrap.Dropdown.getInstance(toggle) : null;
}

function loadPayroll() {
    const roleId = $('#filterRole').val();
    const month = $('#filterMonth').val();
    const year = $('#filterYear').val();

    if (!month || !year) {
        Swal.fire('Error', 'Please select month and year', 'error');
        return;
    }

    getDropdown()?.hide();

    const $wrap = $('#payrollTable').closest('.table-responsive');
    $wrap.css('opacity', '0.5');

    $.ajax({
        url: `/HumanResource/GetAllPayroll?month=${month}&year=${year}&rollId=${roleId || ''}`,
        type: 'GET',
        success: function (res) {
            $wrap.css('opacity', '1');
            if (res && res.success) {
                destroyDataTable();                 // destroy BEFORE touching the tbody
                renderPayrollTable(res.data || []);
                initializeDataTable();
                updateButtonStates();
                syncAppliedFilters();
                renderFilterBadges();
            } else {
                Swal.fire('Error', (res && res.message) || 'Failed to load payroll.', 'error');
            }
        },
        error: function (err) {
            $wrap.css('opacity', '1');
            console.error('Payroll API Error:', err);
        }
    });
}

function renderPayrollTable(data) {
    const body = $('#payrollBody');
    body.empty();

    if (!Array.isArray(data) || data.length === 0) return; // DataTables shows emptyTable text

    data.forEach(item => {
        let statusBadge;
        if (item.payrollID > 0) {
            statusBadge = item.status === 'Paid'
                ? `<span class="badge badge-boxed badge-outline-dark">Paid</span>`
                : `<span class="badge badge-boxed badge-outline-success">Generated</span>`;
        } else {
            statusBadge = `<span class="badge badge-boxed badge-outline-primary">Not Generated</span>`;
        }

        const row = `
            <tr>
                <td>
                    <input type="radio" name="selectedStaff"
                        value="${item.staffID}"
                        data-payrollid="${item.payrollID}"
                        data-status="${item.status || ''}"
                        data-name="${item.staffName}"
                        data-netsalary="${item.netSalary}"
                        data-monthyear="${item.month}-${item.year}"
                        class="form-check-input staff-selector"
                        onchange="updateButtonStates()">
                </td>
                <td>${item.staffCode}</td>
                <td><a href="javascript:void(0)" onclick="viewStaffDetails(${item.staffID})">${item.staffName}</a></td>
                <td>${item.roleName || ''}</td>
                <td>${item.departmentName || ''}</td>
                <td>${item.designationName || ''}</td>
                <td>${item.mobileNo || ''}</td>
                <td>${statusBadge}</td>
            </tr>`;
        body.append(row);
    });
}

// ========================================
// Top-button state
// ========================================
function updateButtonStates() {
    const selected = $('input[name="selectedStaff"]:checked');
    if (selected.length === 0) {
        $('#btnGenerate, #btnPay, #btnView').prop('disabled', true);
        return;
    }

    const payrollId = parseInt(selected.data('payrollid')) || 0;
    const status = selected.data('status');

    $('#btnGenerate').prop('disabled', payrollId > 0);                       // only if no payroll yet
    $('#btnPay').prop('disabled', !(payrollId > 0 && status !== 'Paid'));    // generated, not paid
    $('#btnView').prop('disabled', payrollId === 0);                         // payroll exists
}

function handleGenerate() {
    const selected = $('input[name="selectedStaff"]:checked');
    if (selected.length === 0) return;
    const staffId = selected.val();
    const month = $('#filterMonth').val();
    const year = $('#filterYear').val();
    window.location.href = `/HumanResource/GeneratePayroll?id=${staffId}&month=${month}&year=${year}`;
}

function handlePay() {
    const selected = $('input[name="selectedStaff"]:checked');
    if (selected.length === 0) return;
    openPaymentModal(
        selected.data('payrollid'),
        selected.data('name'),
        selected.data('netsalary'),
        selected.data('monthyear')
    );
}

function handleView() {
    const selected = $('input[name="selectedStaff"]:checked');
    if (selected.length === 0) return;
    viewPayslip(selected.data('payrollid'));
}

function viewStaffDetails(staffId) {
    window.location.href = `/HumanResource/StaffDetails/${staffId}`;
}

// ========================================
// Payslip
// ========================================
function viewPayslip(id) {
    $.ajax({
        url: `/HumanResource/GetPayrollDetails/${id}`,
        type: 'GET',
        success: function (res) {
            if (res.success) renderPayslip(res.data);
            else Swal.fire('Error', res.message, 'error');
        },
        error: function (err) {
            console.error('Payslip API Error:', err);
            Swal.fire('Error', 'Failed to fetch payslip details', 'error');
        }
    });
}

function renderPayslip(data) {
    if (!data || !data.summary) {
        Swal.fire('Error', 'Invalid payslip data received.', 'error');
        return;
    }
    const summary = data.summary;
    const details = data.details || [];

    $('#slip_staffName').text(summary.staffName);
    $('#slip_staffCode').text(summary.staffCode);
    $('#slip_monthYear').text(`${getMonthName(summary.month)} ${summary.year}`);
    $('#slip_designation').text(summary.designationName || '-');
    $('#slip_department').text(summary.departmentName || '-');
    $('#slip_basic').text(Number(summary.basicSalary).toFixed(2));
    $('#slip_attendance').text(summary.attendanceDays);
    $('#slip_net').text(Number(summary.netSalary).toFixed(2));
    $('#slip_status').text(summary.status);

    const earningsBody = $('#slip_earningsBody').empty();
    const deductionsBody = $('#slip_deductionsBody').empty();

    let totalEarnings = 0;
    let totalDeductions = 0;

    details.forEach(item => {
        const row = `<tr><td>${item.componentName}</td><td class="text-end">${Number(item.amount).toFixed(2)}</td></tr>`;
        if (item.componentType === 'Earning') {
            earningsBody.append(row);
            totalEarnings += item.amount;
        } else {
            deductionsBody.append(row);
            totalDeductions += item.amount;
        }
    });

    $('#slip_totalEarnings').text(totalEarnings.toFixed(2));
    $('#slip_totalDeductions').text(totalDeductions.toFixed(2));

    $('#payslipModal').modal('show');
}

function getMonthName(month) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
}

function printPayslip() {
    const printContent = document.getElementById('payslipPrintArea').innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
}

// ========================================
// Payment
// ========================================
function openPaymentModal(payrollId, staffName, amount, monthYear) {
    $('#pay_payrollID').val(payrollId);
    $('#pay_staffName').val(staffName);
    $('#pay_amount').val(amount);
    $('#pay_monthYear').val(monthYear);
    $('#paymentModal').modal('show');
}

function savePayment() {
    const data = {
        payrollID: $('#pay_payrollID').val(),
        paymentMode: $('#pay_mode').val(),
        paymentDate: $('#pay_date').val(),
        note: $('#pay_note').val()
    };

    $.ajax({
        url: '/HumanResource/PayPayroll',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function (res) {
            if (res.success) {
                Swal.fire('Success', res.message, 'success').then(() => {
                    $('#paymentModal').modal('hide');
                    loadPayroll();
                });
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        },
        error: function () {
            Swal.fire('Error', 'Failed to record payment', 'error');
        }
    });
}

// ========================================
// Search — debounced, uses the DataTable search API
// (hidden rows are excluded from Print / Export too)
// ========================================
function applySearch() {
    const val = (document.getElementById('payrollSearch')?.value || '').trim();
    if (payrollTable) payrollTable.search(val).draw();

    if (val) appliedFilters.search = { label: 'Search', text: val, removable: true };
    else delete appliedFilters.search;

    renderFilterBadges();
}

// ========================================
// Filter badges (same pattern as Designation)
// ========================================
function optionText(selectId) {
    const el = document.getElementById(selectId);
    if (!el || el.selectedIndex < 0) return '';
    return el.options[el.selectedIndex].text;
}

// Snapshot of the filters that were actually applied by the last load
function syncAppliedFilters() {
    const search = appliedFilters.search;      // keep current search badge
    appliedFilters = {};

    if ($('#filterRole').val()) {
        appliedFilters.role = { label: 'Role', text: optionText('filterRole'), removable: true };
    }
    // Month / Year are mandatory -> shown, but not removable
    appliedFilters.month = { label: 'Month', text: optionText('filterMonth'), removable: false };
    appliedFilters.year = { label: 'Year', text: optionText('filterYear'), removable: false };

    if (search) appliedFilters.search = search;
}

function renderFilterBadges() {
    const container = document.getElementById('badgeContainer');
    const mainContainer = document.getElementById('activeFilterBadges');
    if (!container || !mainContainer) return;

    container.innerHTML = '';

    // Only show the panel when something beyond the default month/year is active
    const hasExtra = !!(appliedFilters.role || appliedFilters.search);

    Object.entries(appliedFilters).forEach(([key, f]) => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-primary-subtle text-primary border border-primary-subtle d-flex align-items-center gap-1 fw-medium px-2 py-1';
        badge.appendChild(document.createTextNode(`${f.label}: ${f.text}`));

        if (f.removable) {
            const x = document.createElement('i');
            x.className = 'ti ti-x ms-1 cursor-pointer';
            x.style.fontSize = '10px';
            x.addEventListener('click', () => removeFilter(key));
            badge.appendChild(x);
        }
        container.appendChild(badge);
    });

    mainContainer.style.display = hasExtra ? 'block' : 'none';
}

function resetSelect2(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = '';
    if (window.jQuery) jQuery(el).val('').trigger('change');
}

function removeFilter(key) {
    if (key === 'search') {
        const el = document.getElementById('payrollSearch');
        if (el) el.value = '';
        delete appliedFilters.search;
        if (payrollTable) payrollTable.search('').draw();
        renderFilterBadges();
    } else if (key === 'role') {
        resetSelect2('filterRole');
        loadPayroll();
    }
}

function resetAllFilters() {
    const search = document.getElementById('payrollSearch');
    if (search) search.value = '';
    delete appliedFilters.search;

    resetSelect2('filterRole');

    // month / year are mandatory -> back to the defaults
    if (payrollCfg.defaultMonth) jQuery('#filterMonth').val(payrollCfg.defaultMonth).trigger('change');
    if (payrollCfg.defaultYear) jQuery('#filterYear').val(payrollCfg.defaultYear).trigger('change');

    loadPayroll();
}

// ========================================
// Init
// ========================================
$(document).ready(function () {
    document.getElementById('payrollSearch')?.addEventListener('input', function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(applySearch, 300);
    });

    loadPayroll();
});