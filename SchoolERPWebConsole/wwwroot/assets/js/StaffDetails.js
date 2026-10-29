
const STATUS_LABELS = { 1: 'Present', 2: 'Late', 3: 'Absent', 4: 'HalfDay', 5: 'Holiday' };
const STATUS_ABBR = { 1: 'P', 2: 'L', 3: 'A', 4: 'F', 5: 'H' };
const STATUS_COLOR = {
    1: 'bg-primary',
    2: 'bg-secondary',
    3: 'bg-info',
    4: 'bg-danger',
    5: 'bg-success'
};

const MONTH_COLS = { 1: 'Jan', 2: 'Feb', 3: 'March', 4: 'April', 5: 'May', 6: 'June', 7: 'July', 8: 'Aug', 9: 'Sept', 10: 'Oct', 11: 'Nov', 12: 'Dec' };

let staffId = window.StaffID;
let activeStatusFilter = null;
let attendanceRowsCache = [];
let calCurrentDate = new Date();
$(document).ready(function () {
    loadAttendanceSummary();

    $('#ddlAttendanceYear').on('change', function () {
        loadAttendanceSummary();
    });

    $('.status-filter-btn').on('click', function () {
        const status = $(this).data('status');

        if (activeStatusFilter === status) {
            // toggle off — clicking same button again clears filter
            activeStatusFilter = null;
            $('.status-filter-btn').removeClass('active');
        } else {
            activeStatusFilter = status;
            $('.status-filter-btn').removeClass('active');
            $(this).addClass('active');
        }

        loadAttendanceSummary();
    });

    $('#btnPrevMonth').on('click', function () {
        calCurrentDate.setMonth(calCurrentDate.getMonth() - 1);
        renderCalendar();
    });
    $('#btnNextMonth').on('click', function () {
        calCurrentDate.setMonth(calCurrentDate.getMonth() + 1);
        renderCalendar();
    });
});
function renderBadges(totals) {
    if (!totals) {
        $('#badgeTotalPresent, #badgeTotalLate, #badgeTotalAbsent, #badgeTotalHalfDay, #badgeTotalHoliday').text(0);
        return;
    }
    $('#badgeTotalPresent').text(totals.totalPresent ?? 0);
    $('#badgeTotalLate').text(totals.totalLate ?? 0);
    $('#badgeTotalAbsent').text(totals.totalAbsent ?? 0);
    $('#badgeTotalHalfDay').text(totals.totalHalfDay ?? 0);
    $('#badgeTotalHoliday').text(totals.totalHoliday ?? 0);
}
function renderGrid(rows) {
    const $tbody = $('#attendanceGridBody');
    $tbody.empty();

    if (!rows || rows.length === 0) {
        $tbody.html('<tr><td colspan="13" class="text-center text-danger">No Data Found</td></tr>');
        return;
    }

    // Build lookup: { "day-month": row }
    const lookup = {};
    rows.forEach(r => {
        lookup[`${r.dayNum}-${r.monthNum}`] = r;
    });

    for (let day = 1; day <= 31; day++) {
        let rowHtml = `<tr><td class="fw-medium">${day}</td>`;
        for (let month = 1; month <= 12; month++) {
            const cell = lookup[`${day}-${month}`];
            if (cell) {
                const abbr = STATUS_ABBR[cell.attendanceStatus] || '-';
                const color = STATUS_COLOR[cell.attendanceStatus] || 'bg-light';
                rowHtml += `<td>
                        <span class="badge ${color} rounded-circle attendance-cell"
                              style="width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;"
                              data-date="${cell.attendanceDate}"
                              data-status="${cell.attendanceStatus}"
                              data-status-name="${cell.attendanceStatusName}"
                              title="${cell.attendanceStatusName} - ${cell.attendanceDate}">
                            ${abbr}
                        </span>
                    </td>`;
            } else {
                rowHtml += `<td></td>`;
            }
        }
        rowHtml += `</tr>`;
        $tbody.append(rowHtml);
    }

    // Click on a grid cell -> show detail
    $('.attendance-cell').on('click', function () {
        const date = $(this).data('date');
        const statusName = $(this).data('status-name');
        showAttendanceDetail(date, statusName);
    });
}

function renderEmptyState() {
    renderBadges(null);
    $('#attendanceGridBody').html('<tr><td colspan="13" class="text-center text-danger">No Data Found</td></tr>');
}
// ── Mini calendar (per screenshot 3) ──
function renderCalendar() {
    const year = calCurrentDate.getFullYear();
    const month = calCurrentDate.getMonth();

    $('#calMonthLabel').text(calCurrentDate.toLocaleString('default', { month: 'long', year: 'numeric' }));

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const lookup = {};
    attendanceRowsCache.forEach(r => {
        if (r.monthNum === (month + 1)) {
            lookup[r.dayNum] = r;
        }
    });

    const statusClassMap = { 1: 'status-present', 2: 'status-late', 3: 'status-absent', 4: 'status-halfday', 5: 'status-holiday' };
    const colorMap = { 1: '#4361ee', 2: '#4cc9f0', 3: '#4895ef', 4: '#f72585', 5: '#2ec4b6' };

    let html = '<tr>';
    let dayCounter = 1;

    for (let i = 0; i < firstDay; i++) html += '<td></td>';

    let cellsInRow = firstDay;
    while (dayCounter <= daysInMonth) {
        const cellData = lookup[dayCounter];
        const isToday = (new Date().toDateString() === new Date(year, month, dayCounter).toDateString());

        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (cellData) classes += ' has-record';

        let statusHtml = '';
        let tooltipHtml = '';

        if (cellData) {
            const statusClass = statusClassMap[cellData.attendanceStatus] || '';
            const abbr = STATUS_ABBR[cellData.attendanceStatus] || '?';
            const dotColor = colorMap[cellData.attendanceStatus] || '#ccc';
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayCounter).padStart(2, '0')}`;
            const displayDate = formatDisplayDate(dateStr);

            statusHtml = `<div class="status-indicator ${statusClass}">${abbr}</div>`;
            tooltipHtml = `
                        <div class="day-tooltip">
                            <div class="tooltip-date">${displayDate}</div>
                            <div class="tooltip-status">
                                <span class="tooltip-dot" style="background:${dotColor}"></span>
                                ${cellData.attendanceStatusName}
                            </div>
                        </div>`;
        }

        html += `<td>
                    <div class="${classes}" data-day="${dayCounter}">
                        <div class="day-number">${dayCounter}</div>
                        ${statusHtml}
                        ${tooltipHtml}
                    </div>
                </td>`;

        dayCounter++;
        cellsInRow++;
        if (cellsInRow % 7 === 0 && dayCounter <= daysInMonth) html += '</tr><tr>';
    }
    html += '</tr>';

    $('#calGridBody').html(html);
    // no click handler needed — pure CSS hover now
}

function formatDisplayDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function showAttendanceDetail(date, statusName) {
    // Simple toast/alert — swap for SweetAlert2 (Swal) since you already use it elsewhere
    Swal.fire({
        icon: 'info',
        title: statusName,
        text: `Date: ${date}`,
        confirmButtonText: 'OK'
    });
}

async function loadAttendanceSummary() {
    const year = $('#ddlAttendanceYear').val() || new Date().getFullYear();

    try {
        const res = await fetch(`/HumanResource/GetStaffAttendanceSummary?year=${year}&staffId=${staffId}&status=${activeStatusFilter}`);
        const result = await res.json();

        if (result.success && result.totals) {
            renderBadges(result.totals);
            attendanceRowsCache = result.rows || [];
            renderGrid(attendanceRowsCache);
            renderCalendar();
        } else {
            renderEmptyState();
        }
    } catch (err) {
        console.error('GetStudentAttendanceSummary error:', err);
        renderEmptyState();
    }
}
        let sidebarStaff = [];

        $(document).ready(function () {
            // Fetch staff list when page loads
            fetchSidebarStaff();

            // Fetch payroll data when tab is clicked
            $(document).on('shown.bs.tab', 'a[href="#payroll"]', function (e) {
                console.log("Payroll tab shown");
                fetchStaffPayroll();
            });

            // Fetch leave data when tab is clicked
            $(document).on('shown.bs.tab', 'a[href="#leave"]', function (e) {
                console.log("Leave tab shown");
                fetchStaffLeaves();
            });

            // Fetch attendance data when tab is clicked
            $(document).on('shown.bs.tab', 'a[href="#attendance"]', function (e) {
                console.log("Attendance tab shown");
                // Set current year if not selected
                if (!$('#att_yearSelect').val()) {
                    $('#att_yearSelect').val(new Date().getFullYear());
                }
                fetchStaffAttendance();
            });

            // Fetch timeline data when tab is clicked
            $(document).on('shown.bs.tab', 'a[href="#timeline"]', function (e) {
                console.log("Timeline tab shown");
               // fetchStaffTimeline();
            });

            // Initial check if tab is active on load
            if (window.location.hash === '#payroll') {
                fetchStaffPayroll();
            } else if (window.location.hash === '#leave') {
                fetchStaffLeaves();
            } else if (window.location.hash === '#attendance') {
                fetchStaffAttendance();
            } else if (window.location.hash === '#timeline') {
              //  fetchStaffTimeline();
            }
        });

        function fetchStaffAttendance() {
            const staffId = window.StaffID;
            const year = $('#att_yearSelect').val() || new Date().getFullYear();
            console.log("Fetching attendance for staff:", staffId, "year:", year);
            fetch(`/HumanResource/GetStaffAttendanceHistory/${staffId}/${year}`)
                .then(r => r.json())
                .then(res => {
                    console.log("Attendance API Response:", res);
                    if (res.success) {
                        renderStaffAttendance(res.data);
                    } else {
                        $('#attendanceTableBody').html(`<tr><td colspan="13" class="text-center text-danger">${res.message || 'Failed to load attendance'}</td></tr>`);
                    }
                })
                .catch(err => {
                    console.error("Attendance Fetch Error:", err);
                    $('#attendanceTableBody').html('<tr><td colspan="13" class="text-center text-danger">An error occurred while fetching data.</td></tr>');
                });
        }

        function renderStaffAttendance(data) {
            const tbody = $('#attendanceTableBody');
            tbody.empty();

            // Update Summary
            let totalPresent = 0, totalLate = 0, totalAbsent = 0, totalHalfDay = 0, totalHoliday = 0;
            const summaries = data.summaries || data.Summaries;
            if (summaries) {
                summaries.forEach(s => {
                    totalPresent += (s.present || s.Present || 0);
                    totalLate += (s.late || s.Late || 0);
                    totalAbsent += (s.absent || s.Absent || 0);
                    totalHalfDay += (s.halfDay || s.HalfDay || 0);
                    totalHoliday += (s.holiday || s.Holiday || 0);
                });
            }
            $('#att_present').text(totalPresent);
            $('#att_late').text(totalLate);
            $('#att_absent').text(totalAbsent);
            $('#att_halfDay').text(totalHalfDay);
            $('#att_holiday').text(totalHoliday);

            // Populate Grid
            const statusMap = {};
            const days = data.days || data.Days;
            if (days) {
                days.forEach(d => {
                    const m = d.month || d.Month;
                    const day = d.day || d.Day;
                    const status = d.status || d.Status || '';
                    statusMap[`${m}_${day}`] = status;
                });
            }

            for (let dayNum = 1; dayNum <= 31; dayNum++) {
                let row = `<tr><td>${dayNum}</td>`;
                for (let month = 1; month <= 12; month++) {
                    const status = statusMap[`${month}_${dayNum}`] || '-';
                    let badgeClass = 'text-muted';
                    
                    // Handle both full names and codes
                    let code = '-';
                    if (status && status !== '-') {
                        code = status.trim().substring(0, 1).toUpperCase();
                        if (code === 'P') badgeClass = 'text-success fw-bold';
                        else if (code === 'L') badgeClass = 'text-warning fw-bold';
                        else if (code === 'A') badgeClass = 'text-danger fw-bold';
                        else if (code === 'F') badgeClass = 'text-info fw-bold';
                        else if (code === 'H') badgeClass = 'text-primary fw-bold';
                    }
                    
                    row += `<td class="text-center ${badgeClass}">${code}</td>`;
                }
                row += `</tr>`;
                tbody.append(row);
            }
        }

        // --- Timeline ---
        var selectedTimelineID = 0;

        function toggleTimelineButtons() {
            const disabled = selectedTimelineID === null;
            $('#btnEditTimeline').prop('disabled', disabled);
            $('#btnDeleteTimeline').prop('disabled', disabled);
        }

        function handleEditTimeline() {
            if (selectedTimelineID) editTimeline(selectedTimelineID);
        }
function handleDeleteTimeline(id) {
    // if (!id || !confirm('Are you sure you want to delete this timeline entry?')) return;


    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete this timeline record. This action cannot be undone!",
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
                url: `/HumanResource/DeleteTimeline/${id}`,
                type: 'POST',
                contentType: 'application/json',
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Staff timeline record has been deleted.', 'success')
                            .then(() => location.reload());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete staff timeline.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
    
}


        function selectTimelineItem(id, el) {
            selectedTimelineID = id;
            $('.timeline-card').removeClass('border-primary bg-light-subtle');
            $(el).addClass('border-primary bg-light-subtle');
            $(`#radTimeline_${id}`).prop('checked', true);
            toggleTimelineButtons();
        }

        function fetchStaffTimeline() {
            const staffId = window.StaffID;
            console.log("Fetching timeline for staff:", staffId);
            fetch(`/HumanResource/GetStaffTimeline/${staffId}`)
                .then(r => r.json())
                .then(res => {
                    console.log("Timeline API Response:", res);
                    if (res.success) {
                        renderStaffTimeline(res.data);
                    } else {
                        $('#timelineContainer').html(`<div class="alert alert-danger">${res.message || 'Failed to load timeline'}</div>`);
                    }
                })
                .catch(err => {
                    console.error("Timeline Fetch Error:", err);
                    $('#timelineContainer').html('<div class="alert alert-danger">An error occurred while fetching timeline data.</div>');
                });
        }

        function renderStaffTimeline(data) {
            const container = $('#timelineContainer');
            container.empty();
            selectedTimelineID = null;
            toggleTimelineButtons();

            if (!data || data.length === 0) {
                container.html('<div class="text-center py-5 text-muted">No timeline records found.</div>');
                return;
            }

            let html = '<div class="timeline">';
            data.forEach(item => {
                const date = new Date(item.timelineDate || item.TimelineDate).toLocaleDateString();
                const docName = item.timelineAttachDocName || item.TimelineAttachDocName;
                const id = item.timelineID || item.TimelineID;

                html += `
                <div class="card mb-2 shadow-none border timeline-card" onclick="selectTimelineItem(${id}, this)" style="cursor: pointer;">
                    <div class="card-body p-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="d-flex align-items-center">
                                <input type="radio" name="timelineSelect" id="radTimeline_${id}" class="form-check-input me-3" onclick="event.stopPropagation(); selectTimelineItem(${id}, this.closest('.timeline-card'))">
                                <div>
                                    <h6 class="fw-bold mb-0">${item.timelineTitle || item.TimelineTitle}</h6>
                                    <p class="mb-0 text-muted small text-truncate" style="max-width: 400px;">${item.timelineDescription || item.TimelineDescription || 'No description'}</p>
                                </div>
                            </div>
                            <div class="text-end">
                                <span class="badge bg-light text-dark d-block mb-1">${date}</span>
                                ${docName ? `
                                <a href="/HumanResource/DownloadTimelineDoc/${id}" class="text-primary small" onclick="event.stopPropagation()">
                                    <i class="ti ti-download me-1"></i>Download Document
                                </a>` : '<span class="text-muted small italic">No Doc</span>'}
                            </div>
                        </div>
                    </div>
                </div>`;
            });
            html += '</div>';
            container.html(html);
        }

        function showAddTimelineModal() {
            $('#timelineForm')[0].reset();
            $('#timelineForm').removeClass('was-validated');
            $('#hdnTimelineID').val(0);
            $('#txtTimelineDate').val(new Date().toISOString().split('T')[0]);
            $('#timelineModalTitle').text('Add Timeline');
            $('#timelineModal').modal('show');
        }

        function editTimeline(id) {
            console.log("Editing timeline:", id);
            $('#timelineForm').removeClass('was-validated');
            // In a real app, you'd fetch by ID or get from cached list
            // For now, let's fetch to be safe
            fetch(`/HumanResource/GetStaffTimeline/${window.StaffID}`)
                .then(r => r.json())
                .then(res => {
                    const item = res.data.find(x => (x.timelineID || x.TimelineID) == id);
                    if (item) {
                        $('#hdnTimelineID').val(id);
                        $('#txtTimelineTitle').val(item.timelineTitle || item.TimelineTitle);
                        $('#txtTimelineDate').val((item.timelineDate || item.TimelineDate).split('T')[0]);
                        $('#txtTimelineDescription').val(item.timelineDescription || item.TimelineDescription);
                        $('#chkTimelineVisible').prop('checked', item.timelineVisible || item.TimelineVisible);
                        $('#timelineModalTitle').text('Edit Timeline');
                        $('#timelineModal').modal('show');
                    }
                });
        }

        function saveTimelineold() {
            const form = document.getElementById('timelineForm');
            form.classList.add('was-validated');

            if (!form.checkValidity()) {
                return;
            }

            const fileInput = document.getElementById('fileTimelineDoc');
            const file = fileInput.files[0];
            
            const processSave = (base64 = null, fileName = null, fileType = null) => {
                const data = {
                    TimelineID: parseInt($('#hdnTimelineID').val()),
                    StaffID: window.StaffID,
                    TimelineTitle: $('#txtTimelineTitle').val(),
                    TimelineDate: $('#txtTimelineDate').val(),
                    TimelineDescription: $('#txtTimelineDescription').val(),
                    TimelineVisible: $('#chkTimelineVisible').is(':checked'),
                    AttachDocBase64: base64,
                    AttachDocName: fileName,
                    AttachDocType: fileType
                };

                fetch('/HumanResource/UpsertTimeline', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                })
                .then(r => r.json())
                .then(res => {
                    if (res.success) {
                        $('#timelineModal').modal('hide');
                        fetchStaffTimeline();
                    } else {
                        alert(res.message);
                    }
                });
            };

            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const base64 = e.target.result.split(',')[1];
                    processSave(base64, file.name, file.type);
                };
                reader.readAsDataURL(file);
            } else {
                processSave();
            }
        }
// ========================================
// Student Timeline — field-level validation helpers
// ========================================
function setTimelineFieldError(inputId, errId, message) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(errId);
    if (input) input.classList.add('is-invalid');
    if (err) {
        err.textContent = message;
        err.style.display = 'block';
    }
}

function clearTimelineFieldError(inputId, errId) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(errId);
    if (input) input.classList.remove('is-invalid');
    if (err) {
        err.textContent = '';
        err.style.display = 'none';
    }
}

function validateTimelineForm() {
    let isValid = true;

    const fieldErrorPairs = [
        ['txtTimelineTitle', 'errTimelineTitle'],
        ['txtTimelineDate', 'errTimelineDate']
    ];
    fieldErrorPairs.forEach(([inputId, errId]) => clearTimelineFieldError(inputId, errId));

    // ── Title ────────────────────────────────────────────────────────
    const title = document.getElementById('txtTimelineTitle')?.value.trim() || '';
    if (!title) {
        setTimelineFieldError('txtTimelineTitle', 'errTimelineTitle', 'Title is required.');
        isValid = false;
    } else if (title.length < 2) {
        setTimelineFieldError('txtTimelineTitle', 'errTimelineTitle', 'Title must be at least 2 characters.');
        isValid = false;
    }

    // ── Date ─────────────────────────────────────────────────────────
    const dateVal = document.getElementById('txtTimelineDate')?.value;
    if (!dateVal) {
        setTimelineFieldError('txtTimelineDate', 'errTimelineDate', 'Date is required.');
        isValid = false;
    } else {
        const selectedDate = new Date(dateVal);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (selectedDate > today) {
            setTimelineFieldError('txtTimelineDate', 'errTimelineDate', 'Date cannot be in the future.');
            isValid = false;
        }
    }

    return isValid;
}

// Real-time error clearing while typing
document.addEventListener('DOMContentLoaded', () => {
    const timelineFormEl = document.getElementById('timelineForm');
    if (timelineFormEl) {
        [['txtTimelineTitle', 'errTimelineTitle'], ['txtTimelineDate', 'errTimelineDate']].forEach(([id, errId]) => {
            document.getElementById(id)?.addEventListener('input', () => clearTimelineFieldError(id, errId));
        });
    }
});

// ========================================
// Attachment size check (mirrors Postal Receive)
// ========================================
const maxTimelineFileSizeMB = 2;
const maxTimelineFileSizeBytes = maxTimelineFileSizeMB * 1024 * 1024;

document.getElementById('fileTimelineDoc')?.addEventListener('change', function () {
    const fileInfo = document.getElementById('fileTimelineInfo');
    const file = this.files[0];

    if (!file) {
        fileInfo.textContent = 'Max size 2MB (PDF, JPG, PNG)';
        return;
    }

    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

    if (file.size > maxTimelineFileSizeBytes) {
        fileInfo.textContent = `File is ${sizeMB} MB. Max allowed size is ${maxTimelineFileSizeMB} MB.`;
        fileInfo.classList.remove('text-muted');
        fileInfo.classList.add('text-danger');
        this.value = '';
    } else {
        fileInfo.textContent = `Selected file size: ${sizeMB} MB`;
        fileInfo.classList.remove('text-danger');
        fileInfo.classList.add('text-muted');

        document.getElementById('hdnRemoveTimelineFile').value = 'false';
        document.getElementById('existingTimelineFileInfo')?.remove();
    }
});

function removeExistingTimelineFile() {
    document.getElementById('existingTimelineFileInfo')?.remove();
    document.getElementById('hdnRemoveTimelineFile').value = 'true';
    document.getElementById('hdnExistingTimelineFile').value = '';
}

function saveTimeline() {
    const form = document.getElementById('timelineForm');

    if (!validateTimelineForm()) {
        const firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    const formData = new FormData();
    formData.append('TimelineID', parseInt(document.getElementById('hdnTimelineID').value) || 0);
    formData.append('StaffID', window.StaffID);
    ////formData.append('CompanyID', parseInt(document.getElementById('hdnCompanyID').value) || 0);
    ////formData.append('SessionID', parseInt(document.getElementById('hdnSessionID').value) || 0);
    formData.append('TimelineTitle', document.getElementById('txtTimelineTitle').value.trim());
    formData.append('TimelineDate', document.getElementById('txtTimelineDate').value);
    formData.append('TimelineDescription', document.getElementById('txtTimelineDescription').value.trim() || '');
    formData.append('TimelineVisible', document.getElementById('chkTimelineVisible').checked);
    formData.append('ExistingDocumentName', document.getElementById('hdnExistingTimelineFile')?.value || '');
    formData.append('RemoveAttachment', document.getElementById('hdnRemoveTimelineFile')?.value === 'true');

    const fileInput = document.getElementById('fileTimelineDoc');
    if (fileInput.files[0]) {
        formData.append('AttachmentFile', fileInput.files[0]); // matches IFormFile property name
    }
    var id = parseInt(document.getElementById('hdnTimelineID').value) || 0;
    const isEdit = id > 0;

    fetch('/HumanResource/UpsertTimeline', {
        method: 'POST',
        body: formData
    })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Saved!',
                    text: isEdit
                        ? 'Staff timeline receive has been updated successfully.'
                        : 'Staff timeline has been added successfully.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                }).then(() => {
                    window.location.href = `/HumanResource/StaffDetails/${window.StaffID}`;
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: res.message || 'Failed to save postal receive.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-danger' },
                    buttonsStyling: false
                });
            }
        })
        .catch(() => {
            if (window.Swal) {
                Swal.fire('Error!', 'An unexpected error occurred while saving.', 'error');
            } else {
                alert('An unexpected error occurred while saving.');
            }
        });
}

        function deleteTimeline(id) {
            if (!confirm('Are you sure you want to delete this timeline?')) return;

            fetch(`/HumanResource/DeleteTimeline/${id}`, { method: 'DELETE' })
                .then(r => r.json())
                .then(res => {
                    if (res.success) fetchStaffTimeline();
                    else alert(res.message);
                });
        }




function toggleStaffStatus(isActive) {
    if (isActive) {
        // Enable: No date required, ask for confirmation first
        Swal.fire({
            title: 'Are you sure?',
            text: 'You are about to enable this staff member.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, enable it!',
            customClass: {
                confirmButton: 'btn btn-primary me-2',
                cancelButton: 'btn btn-secondary'
            },
            buttonsStyling: false
        }).then((result) => {
            if (result.isConfirmed) {
                executeStatusToggle(true, null);
            }
        });
    } else {
        // Disable: Show modal for date selection
        $('#statusForm').removeClass('was-validated');
        $('#statusModalTitle').text('Disable Staff');
        $('#hdnStatusIsActive').val(false);
        $('#txtStatusDate').val(new Date().toISOString().split('T')[0]);
        $('#statusModal').modal('show');
    }
}

        function confirmStatusToggle() {
            const form = document.getElementById('statusForm');
            form.classList.add('was-validated');
            if (!form.checkValidity()) return;

            const isActive = $('#hdnStatusIsActive').val() === 'true';
            const statusDate = $('#txtStatusDate').val();
            executeStatusToggle(isActive, statusDate);
        }

        function executeStatusToggle(isActive, statusDate) {
            const data = {
                staffId: window.StaffID,
                isActive: isActive,
                statusDate: statusDate
            };

            fetch('/HumanResource/ToggleStaffStatus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    Swal.fire('Updated!', res.message || 'Status updated successfully.', 'success')
                        .then(() => location.reload());
                } else {
                    revertAll();
                    Swal.fire('Error!', res.message || 'Failed to update status.', 'error');
                }
            })
            .catch(err => {
                console.error("Toggle Status Error:", err);
                alert('An error occurred while updating status.');
            });
        }

        function fetchStaffPayroll() {
            const staffId = window.StaffID;
            console.log("Fetching payroll for staff:", staffId);
            fetch(`/HumanResource/GetStaffPayroll/${staffId}`)
                .then(r => r.json())
                .then(res => {
                    console.log("Payroll API Response:", res);
                    if (res.success) {
                        renderStaffPayroll(res.data);
                    } else {
                        $('#payrollTableBody').html(`<tr><td colspan="7" class="text-center text-danger">${res.message || 'Failed to load payroll'}</td></tr>`);
                    }
                })
                .catch(err => {
                    console.error("Payroll Fetch Error:", err);
                    $('#payrollTableBody').html('<tr><td colspan="7" class="text-center text-danger">An error occurred while fetching data.</td></tr>');
                });
        }

        function fetchStaffLeaves() {
            const staffId = window.StaffID;
            console.log("Fetching leaves for staff:", staffId);
            fetch(`/HumanResource/GetStaffLeaves/${staffId}`)
                .then(r => r.json())
                .then(res => {
                    console.log("Leaves API Response:", res);
                    if (res.success) {
                        renderStaffLeaves(res.data);
                    } else {
                        $('#leaveTableBody').html(`<tr><td colspan="7" class="text-center text-danger">${res.message || 'Failed to load leaves'}</td></tr>`);
                    }
                })
                .catch(err => {
                    console.error("Leaves Fetch Error:", err);
                    $('#leaveTableBody').html('<tr><td colspan="7" class="text-center text-danger">An error occurred while fetching data.</td></tr>');
                });
        }

        function renderStaffLeaves(data) {
            const tbody = $('#leaveTableBody');
            tbody.empty();

            if (!data || data.length === 0) {
                tbody.html('<tr><td colspan="7" class="text-center text-danger">No Leave History Found</td></tr>');
                return;
            }

            data.forEach(item => {
                const leaveType = item.leaveTypeName || item.LeaveTypeName || 'N/A';
                const leaveDate = item.leaveDate || item.LeaveDate;
                const applyDate = item.applyDate || item.ApplyDate;
                const days = item.leaveDays || item.LeaveDays || 1;
                const status = item.status || item.Status || 'Pending';
                const id = item.applyLeaveID || item.ApplyLeaveID;

                let statusBadge = 'bg-warning';
                if (status === 'Approved') statusBadge = 'bg-success';
                else if (status === 'Rejected' || status === 'Cancelled') statusBadge = 'bg-danger';

                const row = `
                    <tr>
                        <td>${leaveType}</td>
                        <td>${leaveDate ? new Date(leaveDate).toLocaleDateString() : '-'}</td>
                        <td>${days}</td>
                        <td>${applyDate ? new Date(applyDate).toLocaleDateString() : '-'}</td>
                        <td><span class="badge ${statusBadge}">${status}</span></td>
                        <td class="text-end">
                            <button class="btn btn-icon btn-soft-primary btn-sm" onclick="viewLeave(${id})">
                                <i class="ti ti-eye"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tbody.append(row);
            });
        }

        function viewLeave(id) {
            window.location.href = `/HumanResource/ApplyLeave?id=${id}`;
        }

        function renderStaffPayroll(data) {
            const tbody = $('#payrollTableBody');
            tbody.empty();

            if (!data || data.length === 0) {
                tbody.html('<tr><td colspan="7" class="text-center text-danger">No Payroll Data Found</td></tr>');
                return;
            }

            let totalNet = 0;
            let totalGross = 0;
            let totalEarning = 0;
            let totalDeduction = 0;

            const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            data.forEach(item => {
                const netVal = parseFloat(item.netSalary || item.NetSalary || 0);
                const basicVal = parseFloat(item.basicSalary || item.BasicSalary || 0);
                const earnVal = parseFloat(item.totalEarnings || item.TotalEarnings || 0);
                const deductVal = parseFloat(item.totalDeductions || item.TotalDeductions || 0);
                const pID = item.payrollID || item.PayrollID || 0;
                const mnt = item.month || item.Month || 0;
                const yr = item.year || item.Year || 0;
                const stat = item.status || item.Status || 'Generated';
                const pDate = item.paymentDate || item.PaymentDate;
                const pMode = item.paymentMode || item.PaymentMode;

                totalNet += netVal;
                totalGross += (basicVal + earnVal);
                totalEarning += earnVal;
                totalDeduction += deductVal;

                const statusBadge = stat === 'Paid' ? 'bg-success' : 'bg-warning';
                const row = `
                    <tr>
                        <td>${pID}</td>
                        <td>${months[mnt] || mnt}-${yr}</td>
                        <td>${pDate ? new Date(pDate).toLocaleDateString() : '-'}</td>
                        <td>${pMode || '-'}</td>
                        <td><span class="badge ${statusBadge}">${stat}</span></td>
                        <td class="fw-bold">₹ ${netVal.toFixed(2)}</td>
                        <td class="text-end">
                            <button class="btn btn-icon btn-soft-primary btn-sm" onclick="viewPayslip(${pID})">
                                <i class="ti ti-eye"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tbody.append(row);
            });

            $('#pay_totalNet').text('₹ ' + totalNet.toLocaleString());
            $('#pay_totalGross').text('₹ ' + totalGross.toLocaleString());
            $('#pay_totalEarning').text('₹ ' + totalEarning.toLocaleString());
            $('#pay_totalDeduction').text('₹ ' + totalDeduction.toLocaleString());
        }

        function viewPayslip(id) {
            // You can redirect to the payroll page with a filter or open a modal
            // For now, let's just alert
            window.location.href = `/HumanResource/Payroll?id=${id}`;
        }

        function fetchSidebarStaff() {
            fetch('/HumanResource/GetAllStaff')
                .then(r => r.json())
                .then(res => {
                    if (res.success) {
                        sidebarStaff = res.data || [];
                        renderSidebarStaff(sidebarStaff);
                    } else {
                        $('#sidebarStaffList').html('<div class="p-3 text-center text-danger">Failed to load staff list</div>');
                    }
                })
                .catch(err => {
                    console.error(err);
                    $('#sidebarStaffList').html('<div class="p-3 text-center text-danger">An error occurred</div>');
                });
        }

        function renderSidebarStaff(data) {
            const container = document.getElementById('sidebarStaffList');
            container.innerHTML = '';

            if (data.length === 0) {
                container.innerHTML = '<div class="p-3 text-center text-muted fs-13">No staff found</div>';
                return;
            }

            const currentId = window.StaffID;

            data.forEach(s => {
                const isActive = s.staffID === currentId ? 'bg-soft-primary' : '';
                const item = `
                    <a href="/HumanResource/StaffDetails/${s.staffID}" class="list-group-item list-group-item-action ${isActive} py-2 px-3 border-0">
                        <div class="d-flex align-items-center">
                            <div class="flex-fill">
                                <div class="d-flex align-items-center justify-content-between">
                                    <h6 class="mb-0 fw-semibold fs-13 text-dark">${s.firstName} ${s.lastName || ''}</h6>
                                    <small class="text-muted fs-11">${s.staffCode}</small>
                                </div>
                                <div class="d-flex align-items-center gap-1 mt-1">
                                    <span class="badge bg-light text-dark fs-10 fw-medium">${s.designationName || 'N/A'}</span>
                                    <span class="badge bg-light text-dark fs-10 fw-medium">${s.departmentName || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </a>
                `;
                container.insertAdjacentHTML('beforeend', item);
            });
        }

        function filterSidebarStaff() {
            const search = document.getElementById('txtSidebarSearch').value.toLowerCase();
            const filtered = sidebarStaff.filter(s => 
                (s.firstName + ' ' + (s.lastName || '')).toLowerCase().includes(search) ||
                s.staffCode.toLowerCase().includes(search) ||
                (s.designationName || '').toLowerCase().includes(search) ||
                (s.departmentName || '').toLowerCase().includes(search)
            );
            renderSidebarStaff(filtered);
        }

        function showChangePasswordModal() {
            $('#txtNewPassword').val('');
            $('#txtConfirmPassword').val('');
            $('#changePasswordForm').removeClass('was-validated');
            $('#txtConfirmPassword').removeClass('is-invalid');
            $('#changePasswordError').addClass('d-none').text('');
            $('#changePasswordModal').modal('show');
        }

        function saveChangePassword() {
            const form = document.getElementById('changePasswordForm');
            const newPwd = $('#txtNewPassword').val();
            const confirmPwd = $('#txtConfirmPassword').val();
            const errorDiv = $('#changePasswordError');

            errorDiv.addClass('d-none').text('');

            if (newPwd !== confirmPwd) {
                $('#txtConfirmPassword').addClass('is-invalid');
                errorDiv.removeClass('d-none').text('Passwords do not match.');
                return;
            } else {
                $('#txtConfirmPassword').removeClass('is-invalid');
            }

            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                return;
            }

            const payload = {
                StaffID: window.StaffID,
                NewPassword: newPwd
            };

            fetch('/HumanResource/ChangeStaffPassword', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            .then(r => r.json())
            .then(res => {                
                if (res.success) {
                    Swal.fire('Updated!', 'Password updated successfully', 'success')
                        .then(() => location.reload());
                } else {
                    revertAll();
                    Swal.fire('Error!', res.message || 'Failed to update status.', 'error');
                }
            })
            .catch(err => {
                console.error("Change Password Error:", err);
                errorDiv.removeClass('d-none').text('An error occurred while updating the password.');
            });
        }
// ========================================
// Leave tab — partial loader
// ========================================
function loadLeavePartial(extraParams = '') {
    const container = document.getElementById('leaveTableContainer');
    if (!container) return;

    const staffId = window.StaffID;
    if (!staffId) {
        console.warn('loadLeavePartial: window.StaffID not set');
        return;
    }

    // Always include staffId; merge in any extra query params (e.g. search)
    const params = new URLSearchParams();
    params.set('staffId', staffId);
    if (extraParams) {
        new URLSearchParams(extraParams).forEach((v, k) => params.set(k, v));
    }

    container.style.opacity = '0.5';

    fetch(`/HumanResource/GetApproveLeavePartial?${params.toString()}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load leave data');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';
            initLeaveTable(); // re-init DataTable now that #LeaveTable exists fresh in the DOM
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the leave list.');
        });
}

function initLeaveTable() {
    if ($.fn.DataTable.isDataTable('#applyLeaveTable')) {
        $('#applyLeaveTable').DataTable().destroy();
    }
    if (!document.getElementById('applyLeaveTable')) return; // partial returned "No Data" markup without a table

    window.leaveTable = $('#applyLeaveTable').DataTable({
        dom: 'rt',              // no built-in search box / button row — we use our own
        buttons: [
            { extend: 'copy', exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'excel', exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'csv', exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'pdf', exportOptions: { columns: [1, 2, 3, 4, 5] } },
            { extend: 'print', exportOptions: { columns: [1, 2, 3, 4, 5] } }
        ],
        paging: false,
        info: false,
        ordering: false,
        searching: false   // search is server-side via loadLeavePartial, not client-side
    });
}

// ── Custom toolbar buttons trigger the hidden DataTable buttons ──
$(document).on('click', '#btnLeaveCopy', () => window.leaveTable?.button('.buttons-copy').trigger());
$(document).on('click', '#btnLeaveExcel', () => window.leaveTable?.button('.buttons-excel').trigger());
$(document).on('click', '#btnLeaveCsv', () => window.leaveTable?.button('.buttons-csv').trigger());
$(document).on('click', '#btnLeavePdf', () => window.leaveTable?.button('.buttons-pdf').trigger());
$(document).on('click', '#btnLeavePrint', () => window.leaveTable?.button('.buttons-print').trigger());

// ── Search box — debounced, server-side (goes through staffId + search) ──
let leaveSearchDebounce;
$(document).on('keyup', '#leaveSearchInput', function () {
    clearTimeout(leaveSearchDebounce);
    const search = this.value.trim();
    leaveSearchDebounce = setTimeout(() => {
        loadLeavePartial(`search=${encodeURIComponent(search)}`);
    }, 300);
});

// ── Load ONLY when the Leave tab is actually shown, not on every page load ──
$(document).on('shown.bs.tab', 'a[href="#leave"]', function () {
    loadLeavePartial();
});

// If the Leave tab is already active on initial page load (deep link / hash)
if (window.location.hash === '#leave') {
    loadLeavePartial();
}