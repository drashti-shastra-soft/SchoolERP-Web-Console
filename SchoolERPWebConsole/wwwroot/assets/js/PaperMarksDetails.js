var lastLoadedRows = [];

var $classEl = document.getElementById('ddlClass');
var $sectionEl = document.getElementById('ddlSection');
var $examEl = document.getElementById('ddlExam');
var $body = document.getElementById('tblBody');
var $btnDelete = document.getElementById('btnDelete');
var $btnSave = document.getElementById('btnSave');
var $btnCopy = document.getElementById('btnCopy');

function filtersSelected() {
    return $classEl.value && $sectionEl.value && $examEl.value;
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

// --- Cascading Class -> Section -> Exam (main grid) -----------------

function onClassChange() {
    var classId = $classEl.value;

    $sectionEl.innerHTML = '<option value="">-- Select --</option>';
    $examEl.innerHTML = '<option value="">-- Select --</option>';
    resetGridEmpty();

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

function resetGridEmpty() {
    $body.innerHTML = '<tr><td colspan="9" class="text-center text-muted">Select Class, Section and Exam to load subjects.</td></tr>';
}

// --- Grid rendering (main) -------------------------------------------

function renderRows(rows) {
    $body.innerHTML = '';
    if (!rows || rows.length === 0) {
        $body.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No subjects found.</td></tr>';
        return;
    }
    rows.forEach(function (row, idx) {
        var tr = document.createElement('tr');
        tr.dataset.subjectId = row.id;
        // PaperMarksDetailID of the saved record for this subject, if any
        // (0 / missing means marks haven't been saved yet for this subject,
        // so there's nothing to delete server-side).
        tr.dataset.paperMarksDetailID = row.paperMarksDetailID;
        tr.innerHTML =
            '<td><input type="checkbox" class="rowCheck" /></td>' +
            '<td>' + (idx + 1) + '</td>' +
            '<td>' + row.name + '</td>' +
            '<td><input type="number" class="theoryMax" value="' + (row.theoryMaxMark || 0) + '"  /></td>' +
            '<td><input type="number" class="theoryMin" value="' + (row.theoryMinMark || 0) + '"  /></td>' +
            '<td><input type="number" class="practicalMax" value="' + (row.practicalMaxMark || 0) + '"  /></td>' +
            '<td><input type="number" class="practicalMin" value="' + (row.practicalMinMark || 0) + '"  /></td>' +
            '<td class="totalMax">0</td>' +
            '<td class="totalMin">0</td>';
        $body.appendChild(tr);
        wireRowTotals(tr);
        updateRowTotals(tr);
    });
    var selectAll = document.getElementById('chkSelectAll');
    if (selectAll) selectAll.checked = false;
}

var $chkSelectAll = document.getElementById('chkSelectAll');
if ($chkSelectAll) {
    $chkSelectAll.addEventListener('change', function () {
        document.querySelectorAll('#tblBody .rowCheck').forEach(function (cb) {
            cb.checked = $chkSelectAll.checked;
        });
    });
}

function wireRowTotals(tr) {
    ['theoryMax', 'theoryMin', 'practicalMax', 'practicalMin'].forEach(function (cls) {
        tr.querySelector('.' + cls).addEventListener('input', function () {
            updateRowTotals(tr);
        });
    });
}

function updateRowTotals(tr) {
    var tMax = parseFloat(tr.querySelector('.theoryMax').value) || 0;
    var tMin = parseFloat(tr.querySelector('.theoryMin').value) || 0;
    var pMax = parseFloat(tr.querySelector('.practicalMax').value) || 0;
    var pMin = parseFloat(tr.querySelector('.practicalMin').value) || 0;
    tr.querySelector('.totalMax').textContent = tMax + pMax;
    tr.querySelector('.totalMin').textContent = tMin + pMin;
}

// --- Loading subjects (main grid) -------------------------------------

function loadSubjects() {
    if (!filtersSelected()) {
        resetGridEmpty();
        return;
    }
    var url = '/PaperMarksDetails/GetSubjectByClassandSectionId?classId=' + $classEl.value +
        '&sectionId=' + $sectionEl.value + '&examId=' + $examEl.value;

    getJSON(url)
        .then(function (res) {
            lastLoadedRows = (res && res.data) || [];
            renderRows(lastLoadedRows);
        })
        .catch(function () {
            $body.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Failed to load subjects.</td></tr>';
        });
}

$btnDelete.addEventListener('click', function () {
    var idsToDelete = [];
    var hasUnsavedSelection = false;

    document.querySelectorAll('#tblBody .rowCheck:checked').forEach(function (cb) {
        var tr = cb.closest('tr');
        var id = parseInt(tr.dataset.paperMarksDetailID, 10) || 0;
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
                title: 'Delete!',
                text: 'The selected subject(s) have no saved marks yet, so there is nothing to delete.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                loadSubjects();
            });
        } else {            
            Swal.fire({
                icon: 'warning',
                title: 'Delete!',
                text: 'Please select at least one row to delete.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            }).then(() => {
                loadSubjects();
            });
        }
        return;
    }

   // if (!confirm('Are you sure you want to delete ' + idsToDelete.length + ' selected paper marks record(s)?')) return;

    $btnDelete.disabled = true;

    Swal.fire({
        title: 'Are you sure?',
        text: 'You are about to delete this record. This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-secondary' },
        buttonsStyling: false
    }).then(result => {
        if (!result.isConfirmed) return;
        fetch('/PaperMarksDetails/Delete', {
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
                        text: result.message || 'Selected paper marks have been deleted successfully.',
                        confirmButtonText: 'OK',
                        customClass: { confirmButton: 'btn btn-success' },
                        buttonsStyling: false
                    }).then(function () {
                        loadSubjects();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: result.message || 'Failed to delete selected paper marks.',
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

$btnSave.addEventListener('click', function () {
    if (!filtersSelected()) {        
        Swal.fire({
            icon: 'warning',
            title: 'Delete!',
            text: 'Please select Class, Section and Exam first.',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-success' },
            buttonsStyling: false
        }).then(() => {
            loadSubjects();
        });
        return;
    }
    var rows = [];
    document.querySelectorAll('#tblBody tr').forEach(function (tr) {
        if (!tr.dataset.subjectId) return;
        rows.push({
            SubjectID: parseInt(tr.dataset.subjectId, 10),
            TheoryMaxMark: parseFloat(tr.querySelector('.theoryMax').value) || 0,
            TheoryMinMark: parseFloat(tr.querySelector('.theoryMin').value) || 0,
            PracticalMaxMark: parseFloat(tr.querySelector('.practicalMax').value) || 0,
            PracticalMinMark: parseFloat(tr.querySelector('.practicalMin').value) || 0
        });
    });

    var payload = {
        ClassID: parseInt($classEl.value, 10),
        SectionID: parseInt($sectionEl.value, 10),
        ExamID: parseInt($examEl.value, 10),
        Rows: rows
    };

    fetch('/PaperMarksDetails/SavePaperMarksDetails', {
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
                    text: result.message || 'Paper marks details have been saved successfully.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                }).then(function () {
                    loadSubjects();
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: result.message || 'Failed to save paper marks details.',
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
        });
});

/* =====================================================================
   Copy Paper Marks Details modal
   ---------------------------------------------------------------------
   Assumed endpoints (adjust names/shapes to match your real APIs):
     GET  /Academics/GetSessions
          -> { success, data: [{ sessionID, sessionName, isCurrent }] }
     GET  /Academics/GetSectionsByClass/{classId}
          -> { success, data: [{ sectionID, sectionName }] }
     GET  /ExamConfig/GetGradePreview?companyId=0&sessionId=0&classId={id}
          -> { success, data: [{ examID, examName, examGroupName }] }
     GET  /PaperMarksDetails/GetSubjectByClassandSectionId?classId=&sectionId=&examId=
          -> { success, data: [{ id, name, theoryMaxMark, theoryMinMark,
                                  practicalMaxMark, practicalMinMark }] }
     POST /PaperMarksDetails/CopyPaperMarksDetails
          body: PaperMarksDetailsCopyRequest
   ===================================================================== */

var $copyOverlay = document.getElementById('copyModalOverlay');
var $btnCopyClose = document.getElementById('btnCopyClose');
var $btnCopySave = document.getElementById('btnCopySave');

var $copyFromSession = document.getElementById('copyFromSession');
var $copyFromClass = document.getElementById('copyFromClass');
var $copyFromSection = document.getElementById('copyFromSection');
var $copyFromExam = document.getElementById('copyFromExam');

var $copyToClass = document.getElementById('copyToClass');
var $copyToSection = document.getElementById('copyToSection');
var $copyToExam = document.getElementById('copyToExam');

var $copyPreviewBody = document.getElementById('copyPreviewBody');

function openCopyModal() {
    if (!filtersSelected()) {       
        Swal.fire({
            icon: 'warning',
            title: 'Delete!',
            text: 'Please select Class, Section and Exam on the main screen first.',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-success' },
            buttonsStyling: false
        }).then(() => {
            loadSubjects();
        });
        return;
    }

    resetCopyModal();
    loadSessionsIntoCopyFrom();
    cloneClassOptionsInto($copyFromClass);
    cloneClassOptionsInto($copyToClass);

    // Pre-select "Copy From" with whatever is currently shown on the
    // main grid, since that's the most common thing to copy.
    $copyFromClass.value = $classEl.value;
    onCopyFromClassChange(function () {
        $copyFromSection.value = $sectionEl.value;
        $copyFromSection.disabled = false;
        onCopyFromSectionChange(function () {
            $copyFromExam.value = $examEl.value;
            $copyFromExam.disabled = false;
            loadCopyPreview();
        });
    });

    $copyOverlay.style.display = 'flex';
}

function closeCopyModal() {
    $copyOverlay.style.display = 'none';
}

function resetCopyModal() {
    $copyFromSession.innerHTML = '<option value="">Select</option>';
    $copyFromClass.innerHTML = '<option value="">Select</option>';
    $copyFromSection.innerHTML = '<option value="">Select an Option</option>';
    $copyFromSection.disabled = true;
    $copyFromExam.innerHTML = '<option value="">Select an Option</option>';
    $copyFromExam.disabled = true;

    $copyToClass.innerHTML = '<option value="">Select a Class...</option>';
    $copyToSection.innerHTML = '<option value="">Select a Section...</option>';
    $copyToSection.disabled = true;
    $copyToExam.innerHTML = '<option value="">Select a Exam...</option>';
    $copyToExam.disabled = true;

    $copyPreviewBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Select Copy From Class, Section and Exam to preview subjects.</td></tr>';
}

function cloneClassOptionsInto(targetSelect) {
    var placeholder = targetSelect.options[0].cloneNode(true);
    targetSelect.innerHTML = '';
    targetSelect.appendChild(placeholder);
    Array.prototype.forEach.call($classEl.options, function (opt) {
        if (!opt.value) return; // skip the "-- Select --" placeholder
        var clone = document.createElement('option');
        clone.value = opt.value;
        clone.textContent = opt.text;
        targetSelect.appendChild(clone);
    });
}

function loadSessionsIntoCopyFrom() {
    // Adjust the endpoint/shape to match your real session list API.
    getJSON('/Academics/GetSessions')
        .then(function (res) {
            if (res && res.success) {
                res.data.forEach(function (s) {
                    var opt = document.createElement('option');
                    opt.value = s.sessionID;
                    opt.textContent = s.sessionName;
                    $copyFromSession.appendChild(opt);
                });
                var current = res.data.find(function (s) { return s.isCurrent; });
                if (current) $copyFromSession.value = current.sessionID;
            }
        })
        .catch(function () { /* session list is optional; ignore failures */ });
}

// --- Copy From cascade ------------------------------------------------

function onCopyFromClassChange(afterLoad) {
    var classId = $copyFromClass.value;
    $copyFromSection.innerHTML = '<option value="">Select an Option</option>';
    $copyFromSection.disabled = true;
    $copyFromExam.innerHTML = '<option value="">Select an Option</option>';
    $copyFromExam.disabled = true;
    $copyPreviewBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Select Copy From Class, Section and Exam to preview subjects.</td></tr>';

    if (!classId) {
        if (typeof afterLoad === 'function') afterLoad();
        return;
    }

    getJSON('/Academics/GetSectionsByClass/' + classId)
        .then(function (res) {
            if (res.success) {
                setOptions($copyFromSection, '<option value="">Select an Option</option>', res.data, 'sectionID',
                    function (s) { return s.sectionName; });
                $copyFromSection.disabled = false;
            }
        })
        .finally(function () {
            if (typeof afterLoad === 'function') afterLoad();
        });
}

function onCopyFromSectionChange(afterLoad) {
    var classId = $copyFromClass.value;
    $copyFromExam.innerHTML = '<option value="">Select an Option</option>';
    $copyFromExam.disabled = true;
    $copyPreviewBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Select Copy From Class, Section and Exam to preview subjects.</td></tr>';

    if (!classId) {
        if (typeof afterLoad === 'function') afterLoad();
        return;
    }

    getJSON('/ExamConfig/GetGradePreview?companyId=0&sessionId=0&classId=' + classId)
        .then(function (res) {
            if (res.success) {
                setOptions($copyFromExam, '<option value="">Select an Option</option>', res.data, 'examID',
                    function (s) { return '[' + s.examGroupName + '] ' + s.examName; });
                $copyFromExam.disabled = false;
            }
        })
        .finally(function () {
            if (typeof afterLoad === 'function') afterLoad();
        });
}

$copyFromClass.addEventListener('change', function () { onCopyFromClassChange(); });
$copyFromSection.addEventListener('change', function () { onCopyFromSectionChange(); });
$copyFromExam.addEventListener('change', function () { loadCopyPreview(); });

function loadCopyPreview() {
    var classId = $copyFromClass.value;
    var sectionId = $copyFromSection.value;
    var examId = $copyFromExam.value;

    if (!classId || !sectionId || !examId) {
        $copyPreviewBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Select Copy From Class, Section and Exam to preview subjects.</td></tr>';
        return;
    }

    var url = '/PaperMarksDetails/GetSubjectByClassandSectionId?classId=' + classId +
        '&sectionId=' + sectionId + '&examId=' + examId;

    getJSON(url)
        .then(function (res) {
            var rows = (res && res.data) || [];
            renderCopyPreview(rows);
        })
        .catch(function () {
            $copyPreviewBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Failed to load subjects.</td></tr>';
        });
}

function renderCopyPreview(rows) {
    $copyPreviewBody.innerHTML = '';
    if (!rows || rows.length === 0) {
        $copyPreviewBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No subjects found for this Class, Section and Exam.</td></tr>';
        return;
    }
    rows.forEach(function (row, idx) {
        var maxMark = (parseFloat(row.theoryMaxMark) || 0) + (parseFloat(row.practicalMaxMark) || 0);
        var minMark = (parseFloat(row.theoryMinMark) || 0) + (parseFloat(row.practicalMinMark) || 0);
        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + (idx + 1) + '</td>' +
            '<td>' + row.name + '</td>' +
            '<td>' + maxMark + '</td>' +
            '<td>' + minMark + '</td>';
        $copyPreviewBody.appendChild(tr);
    });
}

// --- Copy To cascade ----------------------------------------------------

$copyToClass.addEventListener('change', function () {
    var classId = $copyToClass.value;
    $copyToSection.innerHTML = '<option value="">Select a Section...</option>';
    $copyToSection.disabled = true;
    $copyToExam.innerHTML = '<option value="">Select a Exam...</option>';
    $copyToExam.disabled = true;

    if (!classId) return;

    getJSON('/Academics/GetSectionsByClass/' + classId)
        .then(function (res) {
            if (res.success) {
                setOptions($copyToSection, '<option value="">Select a Section...</option>', res.data, 'sectionID',
                    function (s) { return s.sectionName; });
                $copyToSection.disabled = false;
            }
        });
});

$copyToSection.addEventListener('change', function () {
    var classId = $copyToClass.value;
    $copyToExam.innerHTML = '<option value="">Select a Exam...</option>';
    $copyToExam.disabled = true;

    if (!classId) return;

    getJSON('/ExamConfig/GetGradePreview?companyId=0&sessionId=0&classId=' + classId)
        .then(function (res) {
            if (res.success) {
                setOptions($copyToExam, '<option value="">Select a Exam...</option>', res.data, 'examID',
                    function (s) { return '[' + s.examGroupName + '] ' + s.examName; });
                $copyToExam.disabled = false;
            }
        });
});

// --- Open / close / save -------------------------------------------------

$btnCopy.addEventListener('click', openCopyModal);
$btnCopyClose.addEventListener('click', closeCopyModal);
$copyOverlay.addEventListener('click', function (e) {
    if (e.target === $copyOverlay) closeCopyModal();
});

$btnCopySave.addEventListener('click', function () {
    var sourceClassId = $copyFromClass.value;
    var sourceSectionId = $copyFromSection.value;
    var sourceExamId = $copyFromExam.value;
    var targetClassId = $copyToClass.value;
    var targetSectionId = $copyToSection.value;
    var targetExamId = $copyToExam.value;

    if (!sourceClassId || !sourceSectionId || !sourceExamId) {        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Please complete the Copy From selection.',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-danger' },
            buttonsStyling: false
        });
        return;
    }
    if (!targetClassId || !targetSectionId || !targetExamId) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Please complete the Copy To selection.',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-danger' },
            buttonsStyling: false
        });
        return;
    }
    if (sourceClassId === targetClassId && sourceSectionId === targetSectionId && sourceExamId === targetExamId) {
        
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Copy From and Copy To cannot be the same Class, Section and Exam.',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-danger' },
            buttonsStyling: false
        });
        return;
    }

    var payload = {
        // CompanyID / SessionID are resolved server-side from the logged-in
        // user in the controller action, so 0 here is fine.
        CompanyID: 0,
        SessionID: 0,
        SourceClassID: parseInt(sourceClassId, 10),
        SourceSectionID: parseInt(sourceSectionId, 10),
        SourceExamID: parseInt(sourceExamId, 10),
        TargetClassID: parseInt(targetClassId, 10),
        TargetSectionID: parseInt(targetSectionId, 10),
        TargetExamID: parseInt(targetExamId, 10)
    };

    $btnCopySave.disabled = true;

    fetch('/PaperMarksDetails/CopyPaperMarksDetails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(function (r) { return r.json(); })
        .then(function (result) {           
            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Copied',
                    text: result.message || (result.success ? 'Copied successfully.' : 'Copy failed.'),
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-danger' },
                    buttonsStyling: false
                });
                closeCopyModal();
                // If the copy target matches what's currently shown on the
                // main grid, refresh it so the copied marks are visible.
                if (parseInt($classEl.value, 10) === payload.TargetClassID &&
                    parseInt($sectionEl.value, 10) === payload.TargetSectionID &&
                    parseInt($examEl.value, 10) === payload.TargetExamID) {
                    loadSubjects();
                }
            }
        })
        .catch(function () {            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An error occurred while copying.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-danger' },
                buttonsStyling: false
            });
        })
        .finally(function () {
            $btnCopySave.disabled = false;
        });
});