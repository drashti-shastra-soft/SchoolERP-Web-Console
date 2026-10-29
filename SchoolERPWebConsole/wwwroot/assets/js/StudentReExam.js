// ======================================================================
// StudentReExam.js
// Class -> Section + Exam filters -> grid (IsReExam checkboxes) -> bulk save.
//
// Endpoints used:
//   GET  /Academics/GetSectionsByClass/{classId}
//   GET  /ExamConfig/GetGradePreview?companyId=0&sessionId=0&classId={classId}
//   POST /StudentReExam/GetBindGrid   (sp_StudentReExam_GetBindGrid)
//   POST /StudentReExam/Save          (sp_StudentReExam_Save)
//
// NOTE: the view must NOT use inline onchange="..." handlers any more.
// All events are bound here, once, in DOMContentLoaded.
// ======================================================================

let reExamGridData = null;   // rows loaded from the server
let isEditMode = false;
let loadToken = 0;           // guards against out-of-order responses

const $id = (id) => document.getElementById(id);

const EMPTY_MSG = "Select Class, Section and Exam to load students.";

document.addEventListener("DOMContentLoaded", () => {
    $id("ddlClass")?.addEventListener("change", onClassChange);
    $id("ddlSection")?.addEventListener("change", onSectionChange);
    $id("ddlExam")?.addEventListener("change", onExamChange);

    $id("btnEdit")?.addEventListener("click", enterEditMode);
    $id("btnSave")?.addEventListener("click", saveGrid);
    $id("btnReset")?.addEventListener("click", resetGrid);

    // Row checkbox changes (event delegation - survives re-render)
    $id("tblBody")?.addEventListener("change", (e) => {
        if (!e.target.classList.contains("reexam-checkbox")) return;
        const idx = parseInt(e.target.dataset.index, 10);
        if (reExamGridData && reExamGridData[idx]) {
            reExamGridData[idx].isReExam = e.target.checked;
        }
        syncSelectAll();
    });

    // Header "select all"
    $id("chkSelectAll")?.addEventListener("change", (e) => {
        if (!isEditMode || !reExamGridData) return;
        const checked = e.target.checked;
        reExamGridData.forEach(r => { r.isReExam = checked; });
        document.querySelectorAll("#tblBody .reexam-checkbox").forEach(cb => { cb.checked = checked; });
    });

    clearGrid();
});

// ── Helpers ─────────────────────────────────────────────────────────
function esc(v) {
    if (v === null || v === undefined) return "";
    return String(v)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function showNotice(message, type) {
    const box = $id("reExamPageNotice");
    if (!box) return;
    box.innerHTML = `<div class="alert alert-${type || "danger"} py-2 px-3 mb-2">${esc(message)}</div>`;
    setTimeout(() => { box.innerHTML = ""; }, 4000);
}

async function fetchJson(url, options) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error("Request failed with status " + res.status);
    return res.json();
}

function resetSelect(select, placeholder, disabled) {
    if (!select) return;
    select.innerHTML = `<option value="">${esc(placeholder)}</option>`;
    select.disabled = !!disabled;
}

function setSaveEnabled(enabled) {
    const btn = $id("btnSave");
    if (btn) btn.disabled = !enabled;
}

function setEditEnabled(enabled) {
    const btn = $id("btnEdit");
    if (btn) btn.disabled = !enabled;
}

function setTotal(n) {
    const el = $id("totalStudents");
    if (el) el.textContent = n;
}

// Reads the current filter selection. Returns null if anything is missing.
function getFilters() {
    const classId = parseInt($id("ddlClass").value, 10);
    const sectionId = parseInt($id("ddlSection").value, 10);
    const ddlExam = $id("ddlExam");
    const examId = parseInt(ddlExam.value, 10);

    if (!classId || !sectionId || !examId) return null;

    // ExamGroupID comes from the selected exam option (if the API returned it)
    const opt = ddlExam.selectedOptions[0];
    const grp = opt && opt.dataset.groupId ? parseInt(opt.dataset.groupId, 10) : null;

    return {
        CompanyID: window.companyId,
        SessionID: window.sessionId,
        ClassID: classId,
        SectionID: sectionId,
        ExamID: examId,
        ExamGroupID: examId
    };
}

// ── Cascading dropdowns ─────────────────────────────────────────────
async function onClassChange() {
    const classId = $id("ddlClass").value;
    const ddlSection = $id("ddlSection");
    const ddlExam = $id("ddlExam");

    resetSelect(ddlSection, "-- Select --", true);
    resetSelect(ddlExam, "-- Select --", true);
    clearGrid();

    if (!classId) return;

    try {
        // Sections and exams are independent - load in parallel
        const [secRes, examRes] = await Promise.all([
            fetchJson(`/Academics/GetSectionsByClass/${classId}`),
            fetchJson(`/ExamConfig/GetGradePreview?companyId=0&sessionId=0&classId=${classId}`)
        ]);

        // Ignore if the user changed class while we were waiting
        if ($id("ddlClass").value !== classId) return;

        if (secRes.success && Array.isArray(secRes.data)) {
            secRes.data.forEach(s => {
                const opt = document.createElement("option");
                opt.value = s.sectionID;
                opt.textContent = s.sectionName;
                ddlSection.appendChild(opt);
            });
            ddlSection.disabled = false;
        }

        if (examRes.success && Array.isArray(examRes.data)) {
            examRes.data.forEach(x => {
                const opt = document.createElement("option");
                opt.value = x.examID;
                opt.textContent = `[${x.examGroupName}] ${x.examName}`;
                const g = x.examGroupID ?? x.examGroupId;
                if (g !== undefined && g !== null) opt.dataset.groupId = g;
                ddlExam.appendChild(opt);
            });
            ddlExam.disabled = false;
        }
    } catch (err) {
        console.error(err);
        showNotice("Could not load Section / Exam list. " + err.message, "danger");
    }
}

function onSectionChange() {
    clearGrid();
    loadGrid();
}

function onExamChange() {
    clearGrid();
    loadGrid();
}

// ── Load grid ───────────────────────────────────────────────────────
async function loadGrid() {
    const request = getFilters();
    if (!request) {           // filters incomplete: just show the empty state
        clearGrid();
        return;
    }

    const myToken = ++loadToken;

    try {
        const wrapper = await fetchJson("/StudentReExam/GetGridData", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request)
        });

        if (myToken !== loadToken) return;   // a newer load superseded this one

        if (!wrapper.success) {
            showNotice(wrapper.message || "No students found for this Class / Section.", "warning");
            clearGrid();
            return;
        }

        reExamGridData = Array.isArray(wrapper.data) ? wrapper.data : [];
        isEditMode = false;
        renderGrid();
        setSaveEnabled(false);
        setEditEnabled(reExamGridData.length > 0);
    } catch (err) {
        if (myToken !== loadToken) return;
        console.error(err);
        showNotice("Could not load the grid. " + err.message, "danger");
        clearGrid();
    }
}

function clearGrid() {
    loadToken++;              // cancel any in-flight load
    reExamGridData = null;
    isEditMode = false;
    setSaveEnabled(false);
    setEditEnabled(false);
    setTotal(0);

    const tbody = $id("tblBody");
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">${EMPTY_MSG}</td></tr>`;
    }
    const chk = $id("chkSelectAll");
    if (chk) { chk.checked = false; chk.indeterminate = false; chk.disabled = true; }
}

// ── Render grid ─────────────────────────────────────────────────────
function renderGrid() {
    const tbody = $id("tblBody");
    if (!tbody) return;

    if (!reExamGridData || reExamGridData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No students found.</td></tr>`;
        setTotal(0);
        const chk = $id("chkSelectAll");
        if (chk) { chk.checked = false; chk.indeterminate = false; chk.disabled = true; }
        return;
    }

    tbody.innerHTML = reExamGridData.map((s, idx) => `
        <tr>
            <td>${esc(s.rollNo ?? idx + 1)}</td>
            <td>${esc(s.studentID)}</td>
            <td>${esc(s.studentName)}</td>
            <td>${esc(s.fatherName)}</td>
            <td>
                <input type="checkbox" class="reexam-checkbox" data-index="${idx}"
                       ${s.isReExam ? "checked" : ""} ${isEditMode ? "" : "disabled"}>
            </td>
        </tr>`).join("");

    setTotal(reExamGridData.length);
    const chk = $id("chkSelectAll");
    if (chk) chk.disabled = !isEditMode;
    syncSelectAll();
}

// Keeps the header checkbox in step with the rows
function syncSelectAll() {
    const chk = $id("chkSelectAll");
    if (!chk || !reExamGridData || reExamGridData.length === 0) return;
    const checkedCount = reExamGridData.filter(r => r.isReExam).length;
    chk.checked = checkedCount === reExamGridData.length;
    chk.indeterminate = checkedCount > 0 && checkedCount < reExamGridData.length;
}

// ── Edit mode ───────────────────────────────────────────────────────
function enterEditMode() {
    if (!reExamGridData || reExamGridData.length === 0) return;
    isEditMode = true;
    renderGrid();
    setSaveEnabled(true);
    setEditEnabled(false);
}

// ── Reset: discard local edits, reload from server, back to view mode ─
//async function resetGrid() {
//    await loadGrid();
//}
function resetGrid() {
    // clear filters
    $id("ddlClass").value = "";
    resetSelect($id("ddlSection"), "-- Select --", true);
    resetSelect($id("ddlExam"), "-- Select --", true);

    // clear grid, buttons, total, select-all
    clearGrid();

    // clear any message
    const box = $id("reExamPageNotice");
    if (box) box.innerHTML = "";
}

// ── Save: bulk-post the whole grid in one call ──────────────────────
async function saveGrid() {
    if (!isEditMode || !reExamGridData || reExamGridData.length === 0) return;

    const filters = getFilters();
    if (!filters) {
        showNotice("Please select Class, Section and Exam.", "warning");
        return;
    }

    const request = {
        ...filters,
        Rows: reExamGridData.map(s => ({
            StudentID: s.studentID,
            RollNo: s.rollNo,
            IsReExam: !!s.isReExam
        }))
    };

    const btn = $id("btnSave");
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Saving...`;

    let saved = false;
    try {
        const wrapper = await fetchJson("/StudentReExam/SaveRemarksFeeding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request)
        });
        if (!wrapper.success) throw new Error(wrapper.message || "Could not save.");

        saved = true;
        showNotice("Student Re-Exam saved successfully.", "success");
        Swal.fire({
            icon: 'success',
            title: 'Saved!',
            text: wrapper.message || 'Student Re-Exam have been saved successfully.',
            confirmButtonText: 'OK',
            customClass: { confirmButton: 'btn btn-success' },
            buttonsStyling: false
        }).then(function () {
            loadGrid();
        });
    } catch (err) {
        console.error(err);
        showNotice("Could not save. " + err.message, "danger");
    } finally {
        btn.innerHTML = originalHtml;   // restore icon + label
    }

    if (saved) {
        await loadGrid();               // back to view mode with fresh server data
    } else {
        setSaveEnabled(isEditMode);     // stay in edit mode so nothing is lost
    }
}