$(document).ready(function () {
    loadTimetable();
    loadStudents();
    loadHomework();
    loadHWSubmissions();
    loadAttendance();
});

// ── Timetable ──────────────────────────────────────────
function loadTimetable() {
    $.ajax({
        url: '/Dashboard/GetTeacherTimetable', type: 'GET',
        success: function (res) {
            var c = $('#timetable-container'), b = $('#timetable-count');
            if (res.success && res.data && res.data.length > 0) {
                b.text(res.data.length); c.empty();
                $.each(res.data, function (i, item) {
                    c.append(
                        '<div class="d-flex align-items-center gap-3 p-3 border-bottom">' +
                        '<div class="flex-shrink-0 text-center" style="min-width:70px;">' +
                        '<span class="badge bg-primary-subtle text-primary rounded-pill">' + item.startTime + '</span><br>' +
                        '<small class="text-muted">' + item.endTime + '</small>' +
                        '</div>' +
                        '<div class="flex-grow-1">' +
                        '<p class="mb-0 fw-semibold text-dark fs-13">' + (item.subjectName || '-') + '</p>' +
                        '<small class="text-muted">' + (item.className || '') + ' ' + (item.sectionName || '') +
                        (item.roomNo ? ' &bull; Room: ' + item.roomNo : '') + '</small>' +
                        '</div>' +
                        '<span class="badge bg-info-subtle text-info rounded-pill">' + (item.day || '') + '</span>' +
                        '</div>'
                    );
                });
            } else {
                b.text(0); c.html(noData());
            }
        }
    });
}

// ── Students ───────────────────────────────────────────
function loadStudents() {
    $.ajax({
        url: '/Dashboard/GetTeacherStudents', type: 'GET',
        success: function (res) {
            var c = $('#students-container'), b = $('#students-count');
            if (res.success && res.data && res.data.length > 0) {
                b.text(res.data.length); c.empty();
                $.each(res.data, function (i, item) {
                    var initials = item.fullName ? item.fullName.split(' ').map(function (n) { return n[0]; }).join('').substring(0, 2).toUpperCase() : 'S';
                    c.append(
                        '<div class="d-flex align-items-center gap-3 p-3 border-bottom">' +
                        '<span class="rounded-circle bg-success-subtle text-success fw-bold d-flex align-items-center justify-content-center" style="width:36px;height:36px;font-size:11px;">' + initials + '</span>' +
                        '<div class="flex-grow-1">' +
                        '<p class="mb-0 fw-semibold text-dark fs-13">' + (item.fullName || '-') + '</p>' +
                        '<small class="text-muted">Roll: ' + (item.rollNo || '-') + ' &bull; ' + (item.className || '') + ' ' + (item.sectionName || '') + '</small>' +
                        '</div>' +
                        '</div>'
                    );
                });
            } else {
                b.text(0); c.html(noData());
            }
        }
    });
}

// ── Homework ───────────────────────────────────────────
function loadHomework() {
    $.ajax({
        url: '/Dashboard/GetTeacherHomework', type: 'GET',
        success: function (res) {
            var c = $('#hw-container'), b = $('#hw-count');
            if (res.success && res.data && res.data.length > 0) {
                b.text(res.data.length); c.empty();
                $.each(res.data, function (i, item) {
                    var due = new Date(item.submissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                    var overdue = new Date(item.submissionDate) < new Date();
                    c.append(
                        '<div class="d-flex align-items-center gap-3 p-3 border-bottom">' +
                        '<div class="flex-shrink-0">' +
                        '<span class="rounded-circle bg-warning-subtle text-warning fw-bold d-flex align-items-center justify-content-center" style="width:36px;height:36px;font-size:11px;">' +
                        (item.subjectName ? item.subjectName.substring(0, 2).toUpperCase() : 'HW') +
                        '</span>' +
                        '</div>' +
                        '<div class="flex-grow-1">' +
                        '<p class="mb-0 fw-semibold text-dark fs-13">' + (item.description || '-') + '</p>' +
                        '<small class="text-muted">' + (item.subjectName || '') + ' &bull; ' + (item.className || '') + ' ' + (item.sectionName || '') + '</small><br>' +
                        '<small class="text-muted">Due: ' + due + ' &bull; Submissions: ' + item.submittedCount + '/' + item.totalSubmissions + '</small>' +
                        '</div>' +
                        '<span class="badge ' + (overdue ? 'bg-danger' : 'bg-success') + ' rounded-pill">' + (overdue ? 'Overdue' : 'Active') + '</span>' +
                        '</div>'
                    );
                });
            } else {
                b.text(0); c.html(noData());
            }
        }
    });
}

// ── HW Submissions ─────────────────────────────────────
function loadHWSubmissions() {
    $.ajax({
        url: '/Dashboard/GetTeacherHWSubmissions',
        type: 'GET',
        success: function (res) {
            var c = $('#hw-sub-container'), b = $('#hw-sub-count');
            if (res.success && res.data && res.data.length > 0) {
                b.text(res.data.length); c.empty();
                $.each(res.data, function (i, item) {
                    var initials = item.fullName ? item.fullName.split(' ').map(function (n) { return n[0]; }).join('').substring(0, 2).toUpperCase() : '?';
                    var statusClass = item.submissionStatus === 'On Time' ? 'bg-success' : item.submissionStatus === 'Late' ? 'bg-danger' : 'bg-warning';
                    var date = item.submittedOn ? new Date(item.submittedOn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Pending';
                    c.append(
                        '<div class="d-flex align-items-center gap-3 p-3 border-bottom">' +
                        '<span class="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center" style="width:36px;height:36px;font-size:11px;">' + initials + '</span>' +
                        '<div class="flex-grow-1">' +
                        '<p class="mb-0 fw-semibold text-dark fs-13">' + (item.fullName || '-') + '</p>' +
                        '<small class="text-muted">' + (item.homeworkTitle || '-') + '</small>' +
                        '</div>' +
                        '<div class="text-end">' +
                        '<span class="badge ' + statusClass + ' rounded-pill">' + item.submissionStatus + '</span><br>' +
                        '<small class="text-muted">' + date + '</small>' +
                        '</div>' +
                        '</div>'
                    );
                });
            } else {
                b.text(0); c.html(noData());
            }
        }
    });
}

// ── Attendance ─────────────────────────────────────────
function loadAttendance() {
    $.ajax({
        url: '/Dashboard/GetTeacherAttendance', type: 'GET',
        success: function (res) {
            var c = $('#attendance-container'), b = $('#attendance-count');
            if (res.success && res.data && res.data.length > 0) {
                b.text(res.data.length); c.empty();
                $.each(res.data, function (i, item) {
                    var pct = item.totalStudents > 0 ? Math.round((item.presentCount / item.totalStudents) * 100) : 0;
                    var barClass = pct >= 75 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-danger';
                    c.append(
                        '<div class="p-3 border-bottom">' +
                        '<div class="d-flex justify-content-between mb-1">' +
                        '<span class="fw-semibold text-dark fs-13">' + (item.className || '') + ' ' + (item.sectionName || '') + '</span>' +
                        '<small class="text-muted">' + item.presentCount + '/' + item.totalStudents + ' Present</small>' +
                        '</div>' +
                        '<div class="progress rounded-pill" style="height:8px;">' +
                        '<div class="progress-bar ' + barClass + '" style="width:' + pct + '%"></div>' +
                        '</div>' +
                        '<small class="text-muted">' + pct + '% attendance</small>' +
                        '</div>'
                    );
                });
            } else {
                b.text(0); c.html(noData());
            }
        }
    });
}

// ── Helper ─────────────────────────────────────────────
function noData() {
    return '<div class="text-center py-4">' +
        '<img src="https://smart-school.in/ssappresource/images/addnewitem.svg" width="80" class="mb-2" alt="">' +
        '<p class="text-danger mb-0">No Data</p>' +
        '</div>';
}