$(document).ready(function () {
    loadAdminStats();
    loadAdminStaff();
    loadAdminVisitors();
    loadAdminHomeworkSubmissions();
});

// ── Stats Cards ────────────────────────────────────────
function loadAdminStats() {
    $.ajax({
        url: '/Dashboard/GetPresentStudentCount',
        type: 'GET',
        success: function (res) {
            if (res.success && res.data) {
                $('#total-students').text(res.data.totalStudents ?? '--');
                $('#present-today').text(res.data.presentCount ?? '--');
            }
        }
    });

    $.ajax({
        url: '/Dashboard/GetStaffDashboard',
        type: 'GET',
        success: function (res) {
            if (res.success && res.data)
                $('#total-staff').text(res.data.length);
        }
    });

    $.ajax({
        url: '/Dashboard/GetVisitorDashboard',
        type: 'GET',
        success: function (res) {
            if (res.success && res.data)
                $('#total-visitors').text(res.data.length);
        }
    });
}

// ── Staff List ─────────────────────────────────────────
function loadAdminStaff() {
    $.ajax({
        url: '/Dashboard/GetStaffDashboard',
        type: 'GET',
        success: function (response) {
            var container = $('#admin-staff-container');
            var countBadge = $('#admin-staff-count');

            if (response.success && response.data && response.data.length > 0) {
                countBadge.text(response.data.length);
                container.empty();

                $.each(response.data, function (i, item) {
                    var fullName = ((item.firstName || '') + ' ' + (item.lastName || '')).trim();
                    var initials = fullName.split(' ').map(function (n) { return n[0]; }).join('').substring(0, 2).toUpperCase();
                    var isLast = i === response.data.length - 1;

                    container.append(
                        '<div class="d-flex gap-2 ' + (isLast ? 'mb-0' : 'mb-3') + ' align-items-center">' +
                        '<span class="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center" style="width:45px;height:45px;font-size:13px;">' + initials + '</span>' +
                        '<div>' +
                        '<h6 class="mb-0 fs-14">' + fullName + '</h6>' +
                        '<small class="text-muted">(' + (item.mobileNo || '-') + ') - <span class="text-success">' + (item.designationName || 'Staff') + '</span></small>' +
                        '</div>' +
                        '</div>'
                    );
                });
            } else {
                countBadge.text(0);
                container.html('<div class="text-center py-4"><img src="https://smart-school.in/ssappresource/images/addnewitem.svg" width="80" class="mb-2" alt=""><p class="text-danger mb-0">No Data</p></div>');
            }
        }
    });
}

// ── Visitor List ───────────────────────────────────────
function loadAdminVisitors() {
    $.ajax({
        url: '/Dashboard/GetVisitorDashboard',
        type: 'GET',
        success: function (response) {
            var container = $('#admin-visitor-container');
            var countBadge = $('#admin-visitor-count');

            if (response.success && response.data && response.data.length > 0) {
                countBadge.text(response.data.length);
                container.empty();

                $.each(response.data, function (i, item) {
                    var initials = item.name ? item.name.split(' ').map(function (n) { return n[0]; }).join('').substring(0, 2).toUpperCase() : 'V';
                    var visitDate = new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                    var outBadge = item.outTime
                        ? '<span class="badge bg-success rounded-pill">Out: ' + item.outTime + '</span>'
                        : '<span class="badge bg-warning rounded-pill">Inside</span>';

                    container.append(
                        '<div class="d-flex align-items-center gap-3 p-3 border-bottom">' +
                        '<span class="rounded-circle bg-info-subtle text-info fw-bold d-flex align-items-center justify-content-center" style="width:36px;height:36px;font-size:11px;">' + initials + '</span>' +
                        '<div class="flex-grow-1">' +
                        '<p class="mb-0 fw-semibold text-dark fs-13">' + (item.name || '-') + '</p>' +
                        '<small class="text-muted">' + (item.purposeName || '-') + ' &bull; ' + visitDate + '</small>' +
                        '</div>' +
                        '<div class="text-end">' + outBadge + '</div>' +
                        '</div>'
                    );
                });
            } else {
                countBadge.text(0);
                container.html('<div class="text-center py-4"><img src="https://smart-school.in/ssappresource/images/addnewitem.svg" width="80" class="mb-2" alt=""><p class="text-danger mb-0">No Data</p></div>');
            }
        }
    });
}

// ── Homework Submissions ───────────────────────────────
function loadAdminHomeworkSubmissions() {
    $.ajax({
        url: '/Dashboard/GetHomeworkSubmissionDashboard',
        type: 'GET',
        success: function (response) {
            var container = $('#admin-hw-container');
            var countBadge = $('#admin-hw-count');

            if (response.success && response.data && response.data.length > 0) {
                countBadge.text(response.data.length);
                container.empty();

                $.each(response.data, function (i, item) {
                    var initials = item.fullName ? item.fullName.split(' ').map(function (n) { return n[0]; }).join('').substring(0, 2).toUpperCase() : '?';
                    var statusClass = item.submissionStatus === 'On Time' ? 'bg-success' : item.submissionStatus === 'Late' ? 'bg-danger' : 'bg-warning';
                    var submittedOn = item.submittedOn ? new Date(item.submittedOn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending';

                    container.append(
                        '<div class="d-flex align-items-center gap-3 p-3 border-bottom">' +
                        '<span class="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center" style="width:36px;height:36px;font-size:11px;">' + initials + '</span>' +
                        '<div class="flex-grow-1">' +
                        '<p class="mb-0 fw-semibold text-dark fs-13">' + (item.fullName || '-') + '</p>' +
                        '<small class="text-muted">' + (item.homeworkTitle || '-') + '</small>' +
                        '</div>' +
                        '<div class="text-end">' +
                        '<span class="badge ' + statusClass + ' rounded-pill">' + item.submissionStatus + '</span><br>' +
                        '<small class="text-muted">' + submittedOn + '</small>' +
                        '</div>' +
                        '</div>'
                    );
                });
            } else {
                countBadge.text(0);
                container.html('<div class="text-center py-4"><img src="https://smart-school.in/ssappresource/images/addnewitem.svg" width="80" class="mb-2" alt=""><p class="text-danger mb-0">No Data</p></div>');
            }
        }
    });
}