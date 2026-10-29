$(document).ready(function () {
    loadSubjectProgress();
    loadHomeworkSubmissions();
    loadHomework();
    loadVisitors();
    loadStaff();
});


function loadSubjectProgress() {
    console.log('Calling URL:', '/Dashboard/GetSubjectListForDashboard');
    $.ajax({
        url: '/Dashboard/GetSubjectListForDashboard',
        type: 'GET',
        success: function (response) {
            console.log('Response:', JSON.stringify(response)); // ← ADD
            if (!response.success || !response.data) {
                console.log('No data - success:', response.success); // ← ADD
                return;
            }

            var subjects = response.data;
            var container = $('#subject-progress-container');

            $('#subject-total-count').text(response.total);

            container.empty();
            var progressValues = [85, 72, 65, 90, 55, 78, 60, 88, 45, 70];

            var colors = [
                { bar: 'text-bg-primary', badge: 'bg-primary' },
                { bar: 'text-bg-success', badge: 'bg-success' },
                { bar: 'text-bg-warning', badge: 'bg-warning' },
                { bar: 'text-bg-info', badge: 'bg-info' },
                { bar: 'text-bg-danger', badge: 'bg-danger' }
            ];

            if (subjects.length === 0) {
                container.html(
                    '<p class="text-muted text-center fs-13 mb-0">No subjects found.</p>'
                );
                return;
            }

            $.each(subjects, function (i, subject) {
                var pct = progressValues[i % progressValues.length];
                var color = colors[i % colors.length];
                var isLast = (i === subjects.length - 1);

                var typeTag = subject.type
                    ? `<span class="badge ${color.badge} bg-opacity-10 
                               text-${color.badge.replace('bg-', '')} 
                               fs-10 ms-1">${subject.type}</span>`
                    : '';

                var row = `
                    <div class="row align-items-center ${isLast ? '' : 'mb-3'}">
                        <div class="col-md-3">
                            <span class="text-dark fw-semibold fs-13"
                                  title="Code: ${subject.code || 'N/A'}">
                                ${subject.name}
                            </span>
                            ${typeTag}
                        </div>
                        <div class="col-md-7">
                            <div class="progress rounded-pill"
                                 style="height: 10px;"
                                 role="progressbar"
                                 aria-valuenow="${pct}"
                                 aria-valuemin="0"
                                 aria-valuemax="100">
                                <div class="progress-bar ${color.bar}"
                                     style="width: ${pct}%; 
                                            border-radius: 50px;">
                                </div>
                            </div>
                        </div>
                        <div class="col-md-2 text-end">
                            <span class="fs-12 fw-semibold text-muted">${pct}%</span>
                        </div>
                    </div>`;

                container.append(row);
            });
        },
        error: function () {
            console.error('AJAX failed:', xhr.status, xhr.responseText, error);
        }
    });
}

function loadHomeworkSubmissions() {
    $.ajax({
        url: '/Dashboard/GetHomeworkSubmissionDashboard',
        type: 'GET',
        success: function (response) {
            var container = $('#hw-submission-container');
            var countBadge = $('#hw-submission-count');

            if (response.success && response.data && response.data.length > 0) {
                var items = response.data;
                countBadge.text(items.length);
                container.empty();

                $.each(items, function (i, item) {
                    var statusClass = 'bg-secondary';
                    if (item.submissionStatus === 'On Time') statusClass = 'bg-success';
                    else if (item.submissionStatus === 'Late') statusClass = 'bg-danger';
                    else if (item.submissionStatus === 'Pending') statusClass = 'bg-warning';

                    var initials = item.fullName
                        ? item.fullName.split(' ').map(function (n) { return n[0]; }).join('').substring(0, 2).toUpperCase()
                        : '?';

                    var submittedOn = item.submittedOn
                        ? new Date(item.submittedOn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Not submitted';

                    var html =
                        '<div class="d-flex align-items-center gap-3 p-3 border-bottom">' +
                        '<div class="flex-shrink-0">' +
                        '<span class="avatar avatar-sm bg-primary-subtle text-primary rounded-circle fw-bold" style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:12px;">' +
                        initials +
                        '</span>' +
                        '</div>' +
                        '<div class="flex-grow-1">' +
                        '<p class="mb-0 fw-semibold text-dark fs-13">' + (item.fullName || '-') + '</p>' +
                        '<small class="text-muted">' + (item.homeworkTitle || '-') + '</small>' +
                        '</div>' +
                        '<div class="text-end">' +
                        '<span class="badge ' + statusClass + ' rounded-pill mb-1">' + item.submissionStatus + '</span>' +
                        '<br><small class="text-muted">' + submittedOn + '</small>' +
                        '</div>' +
                        '</div>';

                    container.append(html);
                });

            } else {
                countBadge.text(0);
                container.html(
                    '<div class="text-center py-4">' +
                    '<img src="https://smart-school.in/ssappresource/images/addnewitem.svg" width="100" class="mb-2" alt="">' +
                    '<p class="text-danger mb-0">No Data</p>' +
                    '</div>'
                );
            }
        },
        error: function () {
            $('#hw-submission-container').html(
                '<div class="text-center py-4">' +
                '<p class="text-danger mb-0">Failed to load submissions.</p>' +
                '</div>'
            );
        }
    });
}

function loadHomework() {
    $.ajax({
        url: '/Dashboard/GetHomeworkDashboard',
        type: 'GET',
        success: function (response) {
            var container = $('#hw-container');
            var countBadge = $('#hw-count');

            if (response.success && response.data && response.data.length > 0) {
                var items = response.data;
                countBadge.text(items.length);
                container.empty();

                $.each(items, function (i, item) {
                    var homeworkDate = new Date(item.homeworkDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                    var submissionDate = new Date(item.submissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

                    var today = new Date();
                    var subDate = new Date(item.submissionDate);
                    var isOverdue = subDate < today;
                    var dueBadge = isOverdue
                        ? '<span class="badge bg-danger rounded-pill">Overdue</span>'
                        : '<span class="badge bg-success rounded-pill">Active</span>';

                    var html =
                        '<div class="d-flex align-items-center gap-3 p-3 border-bottom">' +
                        '<div class="flex-shrink-0">' +
                        '<span class="avatar avatar-sm rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center" style="width:36px;height:36px;font-size:11px;">' +
                        (item.subjectName ? item.subjectName.substring(0, 2).toUpperCase() : 'HW') +
                        '</span>' +
                        '</div>' +
                        '<div class="flex-grow-1">' +
                        '<p class="mb-0 fw-semibold text-dark fs-13">' + (item.description || 'No Title') + '</p>' +
                        '<small class="text-muted">' + (item.subjectName || '') + ' &bull; ' + (item.className || '') + ' ' + (item.sectionName || '') + '</small><br>' +
                        '<small class="text-muted"><i class="ti ti-calendar me-1"></i>Due: ' + submissionDate + '</small>' +
                        '</div>' +
                        '<div class="text-end">' +
                        dueBadge +
                        '</div>' +
                        '</div>';

                    container.append(html);
                });

            } else {
                countBadge.text(0);
                container.html(
                    '<div class="text-center py-4">' +
                    '<img src="https://smart-school.in/ssappresource/images/addnewitem.svg" width="100" class="mb-2" alt="">' +
                    '<p class="text-danger mb-0">No Data</p>' +
                    '</div>'
                );
            }
        },
        error: function () {
            $('#hw-container').html(
                '<div class="text-center py-4">' +
                '<p class="text-danger mb-0">Failed to load homework.</p>' +
                '</div>'
            );
        }
    });
}

function loadVisitors() {
    $.ajax({
        url: '/Dashboard/GetVisitorDashboard',
        type: 'GET',
        success: function (response) {
            var container = $('#visitor-container');
            var countBadge = $('#visitor-count');

            if (response.success && response.data && response.data.length > 0) {
                var items = response.data;
                countBadge.text(items.length);
                container.empty();

                $.each(items, function (i, item) {
                    var visitDate = new Date(item.date).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric'
                    });

                    var initials = item.name
                        ? item.name.split(' ').map(function (n) { return n[0]; }).join('').substring(0, 2).toUpperCase()
                        : 'V';

                    var meetingName = '';
                    if (item.meetingWith === 'Student' && item.studentName)
                        meetingName = 'Meet: ' + item.studentName;
                    else if (item.meetingWith === 'Staff' && item.staffName)
                        meetingName = 'Meet: ' + item.staffName;

                    var outTime = item.outTime
                        ? '<span class="badge bg-success rounded-pill">Out: ' + item.outTime + '</span>'
                        : '<span class="badge bg-warning rounded-pill">Inside</span>';

                    var html =
                        '<div class="d-flex align-items-center gap-3 p-3 border-bottom">' +
                        '<div class="flex-shrink-0">' +
                        '<span class="avatar avatar-sm rounded-circle bg-info-subtle text-info fw-bold d-flex align-items-center justify-content-center" style="width:36px;height:36px;font-size:11px;">' +
                        initials +
                        '</span>' +
                        '</div>' +
                        '<div class="flex-grow-1">' +
                        '<p class="mb-0 fw-semibold text-dark fs-13">' + (item.name || '-') + '</p>' +
                        '<small class="text-muted">' + (item.purposeName || '-') + (meetingName ? ' &bull; ' + meetingName : '') + '</small><br>' +
                        '<small class="text-muted"><i class="ti ti-calendar me-1"></i>' + visitDate + ' &bull; In: ' + (item.inTime || '-') + '</small>' +
                        '</div>' +
                        '<div class="text-end">' +
                        outTime +
                        '<br><small class="text-muted">' + (item.noOfPersons > 1 ? item.noOfPersons + ' persons' : '1 person') + '</small>' +
                        '</div>' +
                        '</div>';

                    container.append(html);
                });

            } else {
                countBadge.text(0);
                container.html(
                    '<div class="text-center py-4">' +
                    '<img src="https://smart-school.in/ssappresource/images/addnewitem.svg" width="100" class="mb-2" alt="">' +
                    '<p class="text-danger mb-0">No Data</p>' +
                    '</div>'
                );
            }
        },
        error: function () {
            $('#visitor-container').html(
                '<div class="text-center py-4">' +
                '<p class="text-danger mb-0">Failed to load visitors.</p>' +
                '</div>'
            );
        }
    });
}

function loadStaff() {
    $.ajax({
        url: '/Dashboard/GetStaffDashboard',
        type: 'GET',
        success: function (response) {
            var container = $('#staff-container');
            var countBadge = $('#staff-count');

            if (response.success && response.data && response.data.length > 0) {
                var items = response.data;
                countBadge.text(items.length);
                container.empty();

                $.each(items, function (i, item) {
                    var fullName = ((item.firstName || '') + ' ' + (item.lastName || '')).trim();

                    var initials = fullName
                        ? fullName.split(' ').map(function (n) { return n[0]; }).join('').substring(0, 2).toUpperCase()
                        : 'ST';

                    var designation = item.designationName || 'Staff';
                    var mobile = item.mobileNo || '-';
                    var isLast = i === items.length - 1;

                    var html =
                        '<div class="d-flex gap-2 ' + (isLast ? 'mb-0' : 'mb-3') + ' align-items-center">' +
                        '<div class="flex-shrink-0">' +
                        '<span class="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center" style="width:50px;height:50px;font-size:14px;">' +
                        initials +
                        '</span>' +
                        '</div>' +
                        '<div>' +
                        '<h6 class="mb-1 fs-14">' + fullName + '</h6>' +
                        '<span>(' + mobile + ') - <small class="text-success">' + designation + '</small></span>' +
                        '</div>' +
                        '</div>';

                    container.append(html);
                });

            } else {
                countBadge.text(0);
                container.html(
                    '<div class="text-center py-4">' +
                    '<img src="https://smart-school.in/ssappresource/images/addnewitem.svg" width="100" class="mb-2" alt="">' +
                    '<p class="text-danger mb-0">No Data</p>' +
                    '</div>'
                );
            }
        },
        error: function () {
            $('#staff-container').html(
                '<div class="text-center py-4">' +
                '<p class="text-danger mb-0">Failed to load staff.</p>' +
                '</div>'
            );
        }
    });
}