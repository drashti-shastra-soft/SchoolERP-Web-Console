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

let currentStudentId = $("#hdnStudentId").val();
let activeStatusFilter = null;
let attendanceRowsCache = [];
let calCurrentDate = new Date();
let selectedTimelineID = null;
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

async function loadAttendanceSummary() {
    const year = $('#ddlAttendanceYear').val() || new Date().getFullYear();

    try {
        const res = await fetch(`/StudentInformation/GetStudentAttendanceSummary?year=${year}&studentId=${currentStudentId}&status=${activeStatusFilter}`);
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

$(document).on('click', '.doc-view-btn', function () {
    const title = $(this).data('title');
    const path = $(this).data('path');
    const type = ($(this).data('type') || '').toLowerCase();

    $('#docPreviewTitle').text(title);
    $('#docPreviewDownloadBtn').attr('href', path);

    const ext = type.includes('.') ? type.split('.').pop() : type;
    let bodyHtml = '';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        bodyHtml = `<img src="${path}" class="img-fluid rounded" style="max-height:500px;" alt="${title}">`;
    }
    else if (ext === 'pdf') {
        bodyHtml = `<iframe src="${path}" style="width:100%; height:500px; border:0;"></iframe>`;
    }
    else {
        // Word / Excel / PowerPoint / anything else — no reliable in-browser preview,
        // so just offer a clean download prompt instead of a broken viewer
        const iconMap = {
            doc: 'ti-file-type-doc', docx: 'ti-file-type-doc',
            xls: 'ti-file-type-xls', xlsx: 'ti-file-type-xls',
            ppt: 'ti-file-type-ppt', pptx: 'ti-file-type-ppt'
        };
        const icon = iconMap[ext] || 'ti-file';

        bodyHtml = `
                <div class="d-flex flex-column align-items-center justify-content-center py-5">
                    <i class="ti ${icon} fs-1 text-muted mb-3"></i>
                    <p class="text-muted mb-1">Preview isn't available for this file type.</p>
                    <p class="text-muted small mb-3">${title}</p>
                    <a href="${path}" download class="btn btn-primary btn-sm">
                        <i class="ti ti-download me-1"></i> Download to open
                    </a>
                </div>`;
    }

    $('#docPreviewBody').html(bodyHtml);
    new bootstrap.Modal(document.getElementById('docPreviewModal')).show();
});



function enableStudent(studentId) {
    if (!studentId) {
        alert("Please select a student.");
        return;
    }
    Swal.fire({
        title: 'Are you sure?',
        text: "This student will be re-enabled and their disable details will be cleared.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, enable it!',
        customClass: {
            confirmButton: 'btn btn-success me-2',
            cancelButton: 'btn btn-secondary'
        },
        buttonsStyling: false
    }).then((result) => {
        if (result.isConfirmed) {
            const data = {
                studentID: parseInt(studentId),
                disableReasonID: null,
                disableDate: null,
                disableNote: null
            };
            $.ajax({
                url: '/StudentInformation/UpsertStudentDisable',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: async function (res) {
                    if (res.success) {
                        await Swal.fire({
                            icon: 'success',
                            title: 'Saved!',
                            text: 'Student has been enabled.',
                            confirmButtonText: 'OK',
                            customClass: { confirmButton: 'btn btn-success' },
                            buttonsStyling: false
                        });
                        window.location.href = `/StudentInformation/studentDetails/${studentId}`;
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: res.message || 'Failed to save student disable details.',
                            confirmButtonText: 'OK',
                            customClass: { confirmButton: 'btn btn-danger' },
                            buttonsStyling: false
                        });
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
}
function toggleSelect(id, checkbox) {
    selectedTimelineID = id;
    const card = checkbox.closest(".tl-card");
    if (checkbox.checked) { selected.add(id); card.classList.add("selected"); }
    else { selected.delete(id); card.classList.remove("selected"); }
    const bar = document.getElementById("bulkBar");
    if (selected.size > 0) {
        bar.classList.add("show");
        document.getElementById("bulkCount").textContent = selected.size + " selected";
    } else {
        bar.classList.remove("show");
    }
}
function selectTimelineItem(id, el) {
    selectedTimelineID = id;
    $('.timeline-card').removeClass('border-primary shadow-sm bg-primary-subtle bg-opacity-10').addClass('border');
    $(el).removeClass('border').addClass('border-primary shadow-sm bg-primary-subtle bg-opacity-10');
    $(el).find('input[type="radio"]').prop('checked', true);
    $('#btnEditTimeline, #btnDeleteTimeline').prop('disabled', false);
}



function handleEditTimeline() {
    if (!selectedTimelineID) return;
    
    
    var studentId = $('#hdnStudentId').val();
    if (!selectedTimelineID) return;

    try {

        if (selectedTimelineID) {
            location.href = `/StudentInformation/AddStudentTimeline?id=${selectedTimelineID}&studentId=${studentId}`;
        }

    } catch (err) {
        console.error(err);
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

// ========================================
// Save Timeline — FormData / IFormFile upload (replaces base64)
// ========================================
function saveTimeline() {
    const form = document.getElementById('timelineForm');

    if (!validateTimelineForm()) {
        const firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    var studentID = parseInt(document.getElementById('hdnStudentID').value) || 0;
    const formData = new FormData();
    formData.append('TimelineID', parseInt(document.getElementById('hdnTimelineID').value) || 0);
    formData.append('StudentID', parseInt(document.getElementById('hdnStudentID').value) || 0);
    formData.append('Title', document.getElementById('txtTimelineTitle').value.trim());
    formData.append('TimelineDate', document.getElementById('txtTimelineDate').value);
    formData.append('Description', document.getElementById('txtTimelineDescription').value.trim() || '');
    formData.append('IsVisibleToStudent', document.getElementById('chkTimelineVisible').checked);
    formData.append('ExistingDocumentName', document.getElementById('hdnExistingTimelineFile').value || '');
    formData.append('RemoveAttachment', document.getElementById('hdnRemoveTimelineFile').value);

    const fileInput = document.getElementById('fileTimelineDoc');
    if (fileInput.files[0]) {
        formData.append('attachmentFile', fileInput.files[0]);
    }

    var id = parseInt(document.getElementById('hdnTimelineID').value) || 0;
    const isEdit = id > 0;

    fetch('/StudentInformation/UpsertTimeline', {
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
                        ? 'Student timeline receive has been updated successfully.'
                        : 'Student timeline has been added successfully.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                }).then(() => {
                    window.location.href = `/StudentInformation/studentDetails/${studentID}`;
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
                url: `/StudentInformation/DeleteTimeline/${id}`,
                type: 'POST',
                contentType: 'application/json',
                success: function (res) {
                    if (res.success) {
                        Swal.fire('Deleted!', 'Student timeline record has been deleted.', 'success')
                            .then(() => location.reload());
                    } else {
                        Swal.fire('Error!', res.message || 'Failed to delete student timeline.', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                }
            });
        }
    });
    //fetch(`/StudentInformation/DeleteTimeline/${selectedTimelineID}`, { method: 'POST' })
    //    .then(r => r.json())
    //    .then(res => {
    //        if (res.success) {
    //            fetchStudentTimeline();
    //            showToast(res.message, 'success');
    //        } else {
    //            alert(res.message);
    //        }
    //    });
}

function openDisableModal() {
    // Fetch reasons if not loaded or just load every time for freshness
    fetch('/StudentInformation/GetAllDisableReasons')
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                const ddl = $('#ddlDisableReason');
                ddl.empty().append('<option value="">Select Reason</option>');
                res.data.forEach(item => {
                    ddl.append(`<option value="${item.disableReasonID}">${item.disableReasonTitle}</option>`);
                });
                $('#disableStudentModal').modal('show');
            }
        });
}

function saveChangePassword() {
    const form = document.getElementById('changePasswordForm');
    const newPwd = $('#txtNewPassword').val();
    const confirmPwd = $('#txtConfirmPassword').val();
    const errorDiv = $('#changePasswordError');
    var studentid = $("#hdnStudentId").val();
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
        studentID: studentid,
        password: newPwd
    };

    fetch('/StudentInformation/StudentChangePassword', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Saved!',
                    text: 'Password updated successfully.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                }).then(() => {
                    window.location.href = `/StudentInformation/studentDetails/${studentid}`;
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
        .catch(err => {
            console.error("Change Password Error:", err);
            errorDiv.removeClass('d-none').text('An error occurred while updating the password.');
        });
}

function showChangePasswordModal() {
    $('#txtNewPassword').val('');
    $('#txtConfirmPassword').val('');
    $('#changePasswordForm').removeClass('was-validated');
    $('#txtConfirmPassword').removeClass('is-invalid');
    $('#changePasswordError').addClass('d-none').text('');
    $('#changePasswordModal').modal('show');
}