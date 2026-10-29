// Remarks Feeding grid - Promote to Class
// Each row is a single student with promotion details
// Cascading: Class -> Section -> Target Session -> Load Grid

var lastLoadedRows = [];
var isEditMode = false;
var allClasses = [];
var allSections = [];
var allTargetSessions = [];

var $classEl = document.getElementById('ddlClass');
var $sectionEl = document.getElementById('ddlSection');
var $targetSessionEl = document.getElementById('ddlTargetSession');
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
    return $classEl.value && $sectionEl.value;
}

function resetGridEmpty(message) {
    $body.innerHTML = '<tr><td colspan="8" class="text-center text-muted">' +
        (message || 'Select Class, Section and Target Session to load students.') + '</td></tr>';
    $totalStudents.textContent = '0';
    if ($chkSelectAll) $chkSelectAll.checked = false;
}

// --- Cascading Class -> Section -> Target Session -------------------------

function onClassChange() {
    $sectionEl.innerHTML = '<option value="">-- Select --</option>';
    $targetSessionEl.innerHTML = '<option value="">-- Select --</option>';
    resetGridEmpty();

    var classId = $classEl.value;
    if (!classId) return;

    // Load sections for selected class
    getJSON('/Academics/GetSectionsByClass/' + classId)
        .then(function (res) {
            if (res.success) {
                allSections = res.data || [];
                setOptions($sectionEl, '<option value="">-- Select --</option>', res.data, 'sectionID',
                    function (s) { return s.sectionName; });
            }
        });

    // Load target sessions (you may need to adjust this endpoint)
    getJSON('/Session/GetAllSessions')
        .then(function (res) {
            if (res.success) {
                allTargetSessions = res.data || [];
                setOptions($targetSessionEl, '<option value="">-- Select --</option>', res.data, 'sessionID',
                    function (s) { return s.sessionName; });
            }
        });
}

function onSectionChange() {
    resetGridEmpty();
    if (filtersSelected()) loadGrid();
}

function onTargetSessionChange() {
    resetGridEmpty();
    if (filtersSelected()) loadGrid();
}

// --- Grid loading / rendering -------------------------------------------

function loadGrid() {
    if (!filtersSelected()) {
        resetGridEmpty();
        return;
    }

    var url = '/PromotedClass/GetGridData?classId=' + $classEl.value +
        '&sectionId=' + $sectionEl.value;

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
        resetGridEmpty('No students found for this Class and Section.');
        return;
    }

    $body.innerHTML = '';
    rows.forEach(function (row, idx) {
        var tr = document.createElement('tr');
        tr.dataset.studentId = row.studentID;
        tr.dataset.promotionId = row.promotionID || 0;

        // Build promoted to class options (all classes except current)
        var classOptions = allClasses.filter(function (c) { return c.ClassID != $classEl.value; })
            .map(function (c) {
                var selected = row.promotedToClassID == c.classID ? ' selected' : '';
                return '<option value="' + c.classID + '"' + selected + '>' + c.className + '</option>';
            }).join('');

        // Build promoted to section options
        var sectionOptions = allSections.map(function (s) {
            var selected = row.promotedToSectionID == s.sectionID ? ' selected' : '';
            return '<option value="' + s.sectionID + '"' + selected + '>' + s.sectionName + '</option>';
        }).join('');

        // Result options
        var resultOptions = [
            { value: 'P', text: 'Promoted' },
            { value: 'D', text: 'Detained' },
            { value: 'L', text: 'Left' }
        ].map(function (r) {
            var selected = row.resultStatus == r.value ? ' selected' : '';
            return '<option value="' + r.value + '"' + selected + '>' + r.text + '</option>';
        }).join('');

        tr.innerHTML =
            '<td><input type="checkbox" class="rowCheck" /></td>' +
            '<td>' + (row.rollNo != null ? row.rollNo : (idx + 1)) + '</td>' +
            '<td>' + (row.studentID || '') + '</td>' +
            '<td>' + (row.fatherName || '') + '</td>' +
            '<td>' + (row.studentName || '') + '</td>' +
            '<td><select class="promoteSelect ddlPromoteClass" disabled>' +
            '<option value="">-- Select --</option>' + classOptions + '</select></td>' +
            '<td><select class="promoteSelect ddlPromoteSection" disabled>' +
            '<option value="">-- Select --</option>' + sectionOptions + '</select></td>' +
            '<td><select class="promoteSelect ddlResult" disabled>' +
            '<option value="">-- Select --</option>' + resultOptions + '</select></td>';

        $body.appendChild(tr);
    });

    $totalStudents.textContent = rows.length;
    if ($chkSelectAll) $chkSelectAll.checked = false;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// --- Edit mode toggling ---------------------------------------------------

function setEditMode(on) {
    isEditMode = on;
    $btnSave.disabled = !on;

    document.querySelectorAll('#tblBody .promoteSelect').forEach(function (sel) {
        sel.disabled = !on;
    });
}

if ($btnEdit) {
    $btnEdit.addEventListener('click', function () {
        if (!filtersSelected()) {
            Swal.fire({
                icon: 'warning',
                title: 'Select filters',
                text: 'Please select Class, Section and Target Session first.',
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

            var promoteClassSel = tr.querySelector('.ddlPromoteClass');
            var promoteSectionSel = tr.querySelector('.ddlPromoteSection');
            var resultSel = tr.querySelector('.ddlResult');

            rows.push({
                StudentID: parseInt(tr.dataset.studentId, 10),
                PromotedToClassID: promoteClassSel && promoteClassSel.value ? parseInt(promoteClassSel.value, 10) : null,
                PromotedToSectionID: promoteSectionSel && promoteSectionSel.value ? parseInt(promoteSectionSel.value, 10) : null,
                Result: resultSel && resultSel.value ? resultSel.value : null
            });
        });

        if (rows.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Nothing to save',
                text: 'There are no students loaded to save promotion details for.',
                confirmButtonText: 'OK',
                customClass: { confirmButton: 'btn btn-success' },
                buttonsStyling: false
            });
            return;
        }

        var payload = {
            CompanyID: 0, // Will be set by controller
            SessionID: 0, // Will be set by controller
            ClassID: parseInt($classEl.value, 10),
            SectionID: parseInt($sectionEl.value, 10),
            TargetSessionID: parseInt($targetSessionEl.value, 10),
            Rows: rows,
            UserId: 0, // Will be set by controller
            IPAddress: '' // Will be set by controller
        };

        $btnSave.disabled = true;

        fetch('/PromotedClass/SaveRemarksFeeding', {
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
                        text: result.message || 'Promotion details have been saved successfully.',
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
                        text: result.message || 'Failed to save promotion details.',
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
            var id = parseInt(tr.dataset.promotionId, 10) || 0;
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
                    text: 'The selected student(s) have no saved promotion record yet, so there is nothing to delete.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
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
            text: 'You are about to delete ' + idsToDelete.length + ' selected promotion record(s). This action cannot be undone!',
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

            fetch('/PromotedClass/DeleteRemarksFeeding', {
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
                            text: result.message || 'Selected promotion records have been deleted successfully.',
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
                            text: result.message || 'Failed to delete selected promotion records.',
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

// --- Load all classes for dropdown population (call once on page load) ------

function loadAllClasses() {
    getJSON('/PromotedClass/GetAllClass')
        .then(function (res) {
            if (res.success) {
                allClasses = res.data || [];
            }
        })
        .catch(function () {
            console.error('Failed to load all classes');
        });
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAllClasses);
} else {
    loadAllClasses();
}