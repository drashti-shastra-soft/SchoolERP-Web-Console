// Marks Feeding grid
// Attendance status codes (match MarksFeedingViewModel.AttendanceStatus):
//   1 = Present, 2 = Absent, 3 = ML, 4 = Exempted
// When a row is not Present, the Marks input is disabled and set to the
// legend value shown in the header: -2 = Absent, -1 = ML, -3 = Exempted.

var ATTENDANCE = { PRESENT: 1, ABSENT: 2, ML: 3, EXEMPTED: 4 };
var ATTENDANCE_MARK_VALUE = { 2: -2, 3: -1, 4: -3 };

var lastLoadedRows = [];
var examLookup = {};          // examId -> exam config (theory/practical max/min)
var currentSubjectHasPractical = false;
var isEditMode = false;

var $classEl = document.getElementById('ddlClass');
var $sectionEl = document.getElementById('ddlSection');
var $subjectEl = document.getElementById('ddlSubject');
var $examEl = document.getElementById('ddlExam');
var $body = document.getElementById('tblBody');
var $summary = document.getElementById('mfSummary');
var $thPractical = document.getElementById('thPracticalMarks');
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
    return $classEl.value && $sectionEl.value && $subjectEl.value && $examEl.value;
}

function resetGridEmpty(message) {
    $body.innerHTML = '<tr><td colspan="12" class="text-center text-muted">' +
        (message || 'Select Class, Section, Subject and Exam to load students.') + '</td></tr>';
    $totalStudents.textContent = '0';
    if ($chkSelectAll) $chkSelectAll.checked = false;
}

// --- Cascading Class -> Section -> Subject -> Exam ----------------------

function onClassChange() {
    $sectionEl.innerHTML = '<option value="">-- Select --</option>';
    $subjectEl.innerHTML = '<option value="">-- Select --</option>';
    $examEl.innerHTML = '<option value="">-- Select --</option>';
    $summary.style.display = 'none';
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
}

function onSectionChange() {
    $subjectEl.innerHTML = '<option value="">-- Select --</option>';
    $examEl.innerHTML = '<option value="">-- Select --</option>';
    $summary.style.display = 'none';
    resetGridEmpty();

    var classId = $classEl.value;
    var sectionId = $sectionEl.value;
    if (!classId || !sectionId) return;

    getJSON('/MarksFeeding/GetSubjectByClassandSectionId?classId=' + classId + '&sectionId=' + sectionId)
        .then(function (res) {
            if (res.success) {
                setOptions($subjectEl, '<option value="">-- Select --</option>', res.data, 'id',
                    function (s) { return s.name; });
            }
        });
}

function onSubjectChange() {
    $examEl.innerHTML = '<option value="">-- Select --</option>';
    $summary.style.display = 'none';
    examLookup = {};
    resetGridEmpty();

    var classId = $classEl.value;
    var subjectId = $subjectEl.value;
    if (!classId || !subjectId) return;

    getJSON('/MarksFeeding/GetAllExamBySubjectIdList?classId=' + classId + '&subjectId=' + subjectId)
        .then(function (res) {
            if (!res.success) return;
            (res.data || []).forEach(function (e) { examLookup[e.id] = e; });
            setOptions($examEl, '<option value="">-- Select --</option>', res.data || [], 'id',
                function (e) { return e.name });
        });
}

function onExamChange() {
    var examId = $examEl.value;
    if (!examId || !examLookup[examId]) {
        $summary.style.display = 'none';
        resetGridEmpty();
        return;
    }

    var exam = examLookup[examId];
    currentSubjectHasPractical = (parseFloat(exam.practicalMaxMark) || 0) > 0;
    $thPractical.style.display = currentSubjectHasPractical ? '' : 'none';

    document.getElementById('sumTheoryMax').textContent = exam.theoryMaxMark || 0;
    document.getElementById('sumTheoryMin').textContent = exam.theoryMinMark || 0;
    document.getElementById('sumPracticalMax').textContent = exam.practicalMaxMark || 0;
    document.getElementById('sumPracticalMin').textContent = exam.practicalMinMark || 0;
    $summary.style.display = 'block';

    loadGrid();
}

// --- Grid loading / rendering -------------------------------------------

function loadGrid() {
    if (!filtersSelected()) {
        resetGridEmpty();
        return;
    }

    var url = '/MarksFeeding/GetGridData?classId=' + $classEl.value +
        '&sectionId=' + $sectionEl.value + '&subjectId=' + $subjectEl.value + '&examId=' + $examEl.value;

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
        resetGridEmpty('No students found for this Class, Section, Subject and Exam.');
        return;
    }

    $body.innerHTML = '';
    rows.forEach(function (row, idx) {
        var tr = document.createElement('tr');
        tr.dataset.studentId = row.studentID;
        tr.dataset.marksFeedingId = row.marksFeedingID || 0;

        var status = row.attendanceStatus || ATTENDANCE.PRESENT;
        var name = 'attendance_' + row.studentID;

        var radios = ['PRESENT', 'ABSENT', 'ML', 'EXEMPTED'].map(function (key) {
            var val = ATTENDANCE[key];
            var checked = (status === val) ? 'checked' : '';
            return '<td><input type="radio" name="' + name + '" class="attendanceRadio" value="' + val + '" ' + checked + ' disabled /></td>';
        }).join('');

        var practicalCell = currentSubjectHasPractical
            ? '<td><input type="number" class="practicalMarks" value="' + (row.practicalMarks != null ? row.practicalMarks : '') + '" disabled /></td>'
            : '<td style="display:none;"><input type="number" class="practicalMarks" value="' + (row.practicalMarks != null ? row.practicalMarks : '') + '" disabled /></td>';

        tr.innerHTML =
            '<td><input type="checkbox" class="rowCheck" /></td>' +
            '<td>' + (row.rollNo != null ? row.rollNo : (idx + 1)) + '</td>' +
            '<td>' + (row.srCode || '') + '</td>' +
            '<td>' + (row.studentID || '') + '</td>' +
            '<td>' + (row.fatherName || '') + '</td>' +
            '<td>' + (row.studentName || '') + '</td>' +
            radios +
            practicalCell +
            '<td><input type="number" class="marks" value="' + (row.marks != null ? row.marks : '') + '" disabled /></td>';

        $body.appendChild(tr);
        wireRow(tr, status);
    });

    $totalStudents.textContent = rows.length;
    if ($chkSelectAll) $chkSelectAll.checked = false;
}

function wireRow(tr, initialStatus) {
    var marksInput = tr.querySelector('.marks');
    applyMarksInputState(tr, initialStatus);

    tr.querySelectorAll('.attendanceRadio').forEach(function (radio) {
        radio.addEventListener('change', function () {
            applyMarksInputState(tr, parseInt(radio.value, 10));
        });
    });
}

function applyMarksInputState(tr, status) {
    var marksInput = tr.querySelector('.marks');
    var practicalInput = tr.querySelector('.practicalMarks');

    if (status === ATTENDANCE.PRESENT) {
        marksInput.disabled = !isEditMode;
        if (practicalInput) practicalInput.disabled = !isEditMode || !currentSubjectHasPractical;
    } else {
        marksInput.value = ATTENDANCE_MARK_VALUE[status];
        marksInput.disabled = true;
        if (practicalInput) {
            practicalInput.value = ATTENDANCE_MARK_VALUE[status];
            practicalInput.disabled = true;
        }
    }
}

// --- Edit mode toggling ---------------------------------------------------

function setEditMode(on) {
    isEditMode = on;
    $btnSave.disabled = !on;

    document.querySelectorAll('#tblBody tr').forEach(function (tr) {
        var checkedRadio = tr.querySelector('.attendanceRadio:checked');
        var status = checkedRadio ? parseInt(checkedRadio.value, 10) : ATTENDANCE.PRESENT;

        tr.querySelectorAll('.attendanceRadio').forEach(function (radio) {
            radio.disabled = !on;
        });
        applyMarksInputState(tr, status);
    });
}

if ($btnEdit) {
    $btnEdit.addEventListener('click', function () {
        if (!filtersSelected()) {
            Swal.fire({
                icon: 'warning',
                title: 'Select filters',
                text: 'Please select Class, Section, Subject and Exam first.',
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
            var checkedRadio = tr.querySelector('.attendanceRadio:checked');
            var status = checkedRadio ? parseInt(checkedRadio.value, 10) : ATTENDANCE.PRESENT;
            var marksVal = tr.querySelector('.marks').value;
            var practicalInput = tr.querySelector('.practicalMarks');
            var practicalVal = practicalInput ? practicalInput.value : null;

            rows.push({
                StudentID: parseInt(tr.dataset.studentId, 10),
                AttendanceStatus: status,
                Marks: marksVal === '' ? null : parseFloat(marksVal),
                PracticalMarks: (currentSubjectHasPractical && practicalVal !== '' && practicalVal != null)
                    ? parseFloat(practicalVal) : null
            });
        });

        if (rows.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Nothing to save',
                text: 'There are no students loaded to save marks for.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            });
            return;
        }

        var payload = {
            ClassID: parseInt($classEl.value, 10),
            SectionID: parseInt($sectionEl.value, 10),
            SubjectID: parseInt($subjectEl.value, 10),
            ExamID: parseInt($examEl.value, 10),
            Rows: rows
        };

        $btnSave.disabled = true;

        fetch('/MarksFeeding/SaveMarksFeeding', {
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
                        text: result.message || 'Marks have been saved successfully.',
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
                        text: result.message || 'Failed to save marks.',
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
            var id = parseInt(tr.dataset.marksFeedingId, 10) || 0;
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
                    text: 'The selected student(s) have no saved marks yet, so there is nothing to delete.',
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
            text: 'You are about to delete ' + idsToDelete.length + ' selected mark(s). This action cannot be undone!',
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

            fetch('/MarksFeeding/DeleteMarksFeeding', {
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
                            text: result.message || 'Selected marks have been deleted successfully.',
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
                            text: result.message || 'Failed to delete selected marks.',
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