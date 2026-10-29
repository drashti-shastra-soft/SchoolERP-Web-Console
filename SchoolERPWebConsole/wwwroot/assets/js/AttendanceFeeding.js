// Attendance Feeding grid
// Each row is Attendance + School Days (both numeric) per student -
// no Subject/Co-Scholastic dimension on this screen (see UI screenshot:
// only Class / Section / Exam filters), and no Grade dropdown - so no
// GetGradeList-style lookup call is needed here.

var lastLoadedRows = [];
var isEditMode = false;

var $classEl = document.getElementById('ddlClass');
var $sectionEl = document.getElementById('ddlSection');
var $examEl = document.getElementById('ddlExam');
var $body = document.getElementById('tblBody');
var $totalStudents = document.getElementById('totalStudents');

var $btnEdit = document.getElementById('btnEdit');
var $btnSave = document.getElementById('btnSave');
var $btnDelete = document.getElementById('btnDelete');
var $btnReset = document.getElementById('btnReset');
var $chkSelectAll = document.getElementById('chkSelectAll');

if ($chkSelectAll) {
    $chkSelectAll.addEventListener('change', function () {
        document.querySelectorAll('#tblBody .rowCheck').forEach(function (cb) {
            cb.checked = $chkSelectAll.checked;
        });
    });
}

function getJSON(url) {
    return fetch(url).then(function (r) { return r.json(); });
}

function setOptions(selectEl, placeholderHtml, items, valueKey, textFn) {
    selectEl.innerHTML = placeholderHtml;
    items.forEach(function (item) {
        var opt = document.createElement('option');
        opt.value = item[valueKey];
        opt.textContent = textFn(item);
        selectEl.appendChild(opt);
    });
}

function filtersSelected() {
    return $classEl.value && $sectionEl.value && $examEl.value;
}

function resetGridEmpty(message) {
    $body.innerHTML = '<tr><td colspan="7" class="text-center text-muted">' +
        (message || 'Select Class, Section and Exam to load students.') + '</td></tr>';
    $totalStudents.textContent = '0';
    if ($chkSelectAll) $chkSelectAll.checked = false;
}

// --- Cascading Class -> Section -> Exam ---------------------------------

function onClassChange() {
    $sectionEl.innerHTML = '<option value="">-- Select --</option>';
    $examEl.innerHTML = '<option value="">-- Select --</option>';
    resetGridEmpty();

    var classId = $classEl.value;
    if (!classId) return;

    getJSON('/Academics/GetSectionsByClass/' + classId)
        .then(function (res) {
            if (res.success) {
                setOptions($sectionEl, '<option value="">-- Select --</option>', res.data, 'sectionID',
                    function (s) { return s.sectionName; });
            }
        });

    getJSON('/ExamConfig/GetGradePreview?companyId=0&sessionId=0&classId=' + classId)
        .then(function (res) {
            if (res.success) {
                setOptions($examEl, '<option value="">-- Select --</option>', res.data, 'examID',
                    function (s) { return '[' + s.examGroupName + '] ' + s.examName; });
            }
        });
}

function onSectionChange() {
    resetGridEmpty();
    if (filtersSelected()) loadGrid();
}

function onExamChange() {
    resetGridEmpty();
    if (filtersSelected()) loadGrid();
}

// --- Grid loading / rendering -------------------------------------------

function loadGrid() {
    if (!filtersSelected()) {
        resetGridEmpty();
        return;
    }

    var url = '/AttendanceFeeding/GetGridData?classId=' + $classEl.value +
        '&sectionId=' + $sectionEl.value + '&examId=' + $examEl.value;

    getJSON(url)
        .then(function (res) {
            if (!res.success) {
                resetGridEmpty('Failed to load students.');
                return;
            }
            lastLoadedRows = res.data || [];
            renderRows(lastLoadedRows);
            setEditMode(false);
        })
        .catch(function () {
            resetGridEmpty('Failed to load students.');
        });
}

function renderRows(rows) {
    if (!rows || rows.length === 0) {
        resetGridEmpty('No students found for this Class, Section and Exam.');
        return;
    }

    $body.innerHTML = '';
    rows.forEach(function (row, idx) {
        var tr = document.createElement('tr');
        tr.dataset.studentId = row.studentID;
        tr.dataset.attendanceFeedingId = row.attendanceFeedingID || 0;

        tr.innerHTML =
            '<td><input type="checkbox" class="rowCheck" /></td>' +
            '<td>' + (row.rollNo != null ? row.rollNo : (idx + 1)) + '</td>' +
            '<td>' + (row.srCode || '') + '</td>' +
            '<td>' + (row.studentID || '') + '</td>' +
            '<td>' + (row.fatherName || '') + '</td>' +
            '<td>' + (row.studentName || '') + '</td>' +
            '<td><input type="number" step="0.01" class="attendanceInput" value="' +
            (row.attendance != null ? row.attendance : '') + '" disabled /></td>' +
            '<td><input type="number" step="0.01" class="schoolDaysInput" value="' +
            (row.schoolDays != null ? row.schoolDays : '') + '" disabled /></td>';

        $body.appendChild(tr);
    });

    $totalStudents.textContent = rows.length;
    if ($chkSelectAll) $chkSelectAll.checked = false;
}

// --- Edit mode toggling ---------------------------------------------------

function setEditMode(on) {
    isEditMode = on;
    $btnSave.disabled = !on;

    document.querySelectorAll('#tblBody .attendanceInput, #tblBody .schoolDaysInput').forEach(function (inp) {
        inp.disabled = !on;
    });
}

if ($btnEdit) {
    $btnEdit.addEventListener('click', function () {
        if (!filtersSelected()) {
            Swal.fire({
                icon: 'warning',
                title: 'Select filters',
                text: 'Please select Class, Section and Exam first.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            });
            return;
        }
        setEditMode(true);
    });
}

// --- Save ------------------------------------------------------------------

if ($btnSave) {
    $btnSave.addEventListener('click', function () {
        if (!filtersSelected()) return;

        var rows = [];
        document.querySelectorAll('#tblBody tr').forEach(function (tr) {
            if (!tr.dataset.studentId) return;
            var attInput = tr.querySelector('.attendanceInput');
            var daysInput = tr.querySelector('.schoolDaysInput');

            rows.push({
                StudentID: parseInt(tr.dataset.studentId, 10),
                Attendance: (attInput && attInput.value !== '') ? parseFloat(attInput.value) : null,
                SchoolDays: (daysInput && daysInput.value !== '') ? parseFloat(daysInput.value) : null
            });
        });

        if (rows.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Nothing to save',
                text: 'There are no students loaded to save attendance for.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            });
            return;
        }

        var payload = {
            ClassID: parseInt($classEl.value, 10),
            SectionID: parseInt($sectionEl.value, 10),
            ExamID: parseInt($examEl.value, 10),
            Rows: rows
        };

        $btnSave.disabled = true;

        fetch('/AttendanceFeeding/SaveAttendanceFeeding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(function (r) { return r.json(); })
            .then(function (result) {
                if (result.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Saved!',
                        text: result.message || 'Attendance has been saved successfully.',
                        confirmButtonText: 'OK',
                        customClass: { confirmButton: 'btn btn-success' },
                        buttonsStyling: false
                    }).then(function () {
                        loadGrid();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: result.message || 'Failed to save attendance.',
                        confirmButtonText: 'OK',
                        customClass: { confirmButton: 'btn btn-danger' },
                        buttonsStyling: false
                    });
                }
            })
            .catch(function () {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'An error occurred while saving.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-danger' },
                    buttonsStyling: false
                });
            })
            .finally(function () {
                $btnSave.disabled = !isEditMode;
            });
    });
}

// --- Delete (checked rows only) ---------------------------------------------

if ($btnDelete) {
    $btnDelete.addEventListener('click', function () {
        var idsToDelete = [];
        var hasUnsavedSelection = false;

        document.querySelectorAll('#tblBody .rowCheck:checked').forEach(function (cb) {
            var tr = cb.closest('tr');
            var id = parseInt(tr.dataset.attendanceFeedingId, 10) || 0;
            if (id > 0) {
                idsToDelete.push(id);
            } else {
                hasUnsavedSelection = true;
            }
        });

        if (idsToDelete.length === 0) {
            if (hasUnsavedSelection) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Nothing to delete',
                    text: 'The selected student(s) have no saved attendance yet, so there is nothing to delete.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                }).then(function () {
                    loadGrid();
                });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Select rows',
                    text: 'Please select at least one row to delete.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                });
            }
            return;
        }

        $btnDelete.disabled = true;

        Swal.fire({
            title: 'Are you sure?',
            text: 'You are about to delete ' + idsToDelete.length + ' selected attendance row(s). This action cannot be undone!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-secondary' },
            buttonsStyling: false
        }).then(function (result) {
            if (!result.isConfirmed) {
                $btnDelete.disabled = false;
                return;
            }

            fetch('/AttendanceFeeding/DeleteAttendanceFeeding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(idsToDelete)
            })
                .then(function (r) { return r.json(); })
                .then(function (result) {
                    if (result.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: result.message || 'Selected attendance rows have been deleted successfully.',
                            confirmButtonText: 'OK',
                            customClass: { confirmButton: 'btn btn-success' },
                            buttonsStyling: false
                        }).then(function () {
                            loadGrid();
                        });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: result.message || 'Failed to delete selected attendance rows.',
                            confirmButtonText: 'OK',
                            customClass: { confirmButton: 'btn btn-danger' },
                            buttonsStyling: false
                        });
                    }
                })
                .catch(function () {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'An error occurred while deleting.',
                        confirmButtonText: 'OK',
                        customClass: { confirmButton: 'btn btn-danger' },
                        buttonsStyling: false
                    });
                })
                .finally(function () {
                    $btnDelete.disabled = false;
                });
        });
    });
}

// --- Reset (discard unsaved edits / reload grid) -----------------------------

if ($btnReset) {
    $btnReset.addEventListener('click', function () {
        if (!filtersSelected()) {
            resetGridEmpty();
            return;
        }
        loadGrid();
    });
}