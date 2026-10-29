// ======================================================================
// ChangeExam.js  -  "Change/Update Exam" screen (student-wise, like Student Re-Exam)
//
// Flow
//   Class    -> loads Section, Exam (old) and New Exam dropdowns
//   Mark Type + Class + Section + Exam -> grid of students that have entries
//   Tick the students to move (header checkbox = select all)
//   New Exam chosen + at least one student ticked -> SAVE enabled
//   SAVE     -> moves the ticked students' entries Exam -> New Exam (one transaction)
//   RESET    -> clears everything
//   Students who ALREADY have entries in the New Exam are greyed out and
//   cannot be ticked (the grid is reloaded when the New Exam changes).
//
// Endpoints (JSON, { success, data, message } wrapper)
//   GET  /Academics/GetSectionsByClass/{classId}
//   GET  /ExamConfig/GetGradePreview?companyId=0&sessionId=0&classId={classId}
//   GET  /ChangeExam/GetNewExams?classId={classId}
//   POST /ChangeExam/GetBindGrid   { CompanyID, SessionID, MarkTypeID, ClassID, SectionID, ExamID, NewExamID? }
//   POST /ChangeExam/Save          { ..., OldExamID, NewExamID, StudentIDs: ["..."] }
// Globals expected: window.companyId, window.sessionId
// ======================================================================

let gridRows = [];       // each row = server row + { selected: bool }
let loadToken = 0;

const $id = (id) => document.getElementById(id);
const EMPTY_MSG = "Select Mark Type, Class, Section and Exam to load students.";

document.addEventListener("DOMContentLoaded", () => {
    $id("ddlMarkType")?.addEventListener("change", onFilterChange);
    $id("ddlClass")?.addEventListener("change", onClassChange);
    $id("ddlSection")?.addEventListener("change", onFilterChange);
    $id("ddlExam")?.addEventListener("change", onFilterChange);
    $id("ddlNewExam")?.addEventListener("change", onNewExamChange);

    $id("btnSave")?.addEventListener("click", saveChange);
    $id("btnReset")?.addEventListener("click", resetAll);

    // Row checkboxes (event delegation - survives re-render)
    $id("tblBody")?.addEventListener("change", (e) => {
        if (!e.target.classList.contains("ce-chk")) return;
        const idx = parseInt(e.target.dataset.index, 10);
        if (gridRows[idx]) gridRows[idx].selected = e.target.checked;
        refreshSelectionState();
    });

    // Header "select all" (only rows that are not blocked)
    $id("chkSelectAll")?.addEventListener("change", (e) => {
        const checked = e.target.checked;
        gridRows.forEach((r, i) => { if (!isBlocked(r)) r.selected = checked; });
        document.querySelectorAll("#tblBody .ce-chk:not(:disabled)").forEach(cb => { cb.checked = checked; });
        refreshSelectionState();
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
    const box = $id("changeExamNotice");
    if (!box) return;
    box.innerHTML = `<div class="alert alert-${type || "danger"} py-2 px-3 mb-2">${esc(message)}</div>`;
    setTimeout(() => { box.innerHTML = ""; }, 6000);
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

function addOption(select, value, text) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = text;
    select.appendChild(opt);
}

// A student who already has entries in the New Exam cannot be moved
function isBlocked(r) {
    return Number(r.newExamRecordCount || 0) > 0;
}

function selectedRows() {
    return gridRows.filter(r => r.selected && !isBlocked(r));
}

// Updates counters, header checkbox and SAVE button
function refreshSelectionState() {
    const selectable = gridRows.filter(r => !isBlocked(r));
    const selCount = selectable.filter(r => r.selected).length;

    const cnt = $id("selectedCount");
    if (cnt) cnt.textContent = selCount;

    const chk = $id("chkSelectAll");
    if (chk) {
        chk.disabled = selectable.length === 0;
        chk.checked = selectable.length > 0 && selCount === selectable.length;
        chk.indeterminate = selCount > 0 && selCount < selectable.length;
    }

    const btn = $id("btnSave");
    if (btn) btn.disabled = !(selCount > 0 && $id("ddlNewExam").value);
}

// Returns the filter payload, or null when anything required is missing.
function getFilters() {
    const markTypeId = parseInt($id("ddlMarkType").value, 10);
    const classId = parseInt($id("ddlClass").value, 10);
    const sectionId = parseInt($id("ddlSection").value, 10);
    const examId = parseInt($id("ddlExam").value, 10);
    if (!markTypeId || !classId || !sectionId || !examId) return null;

    const opt = $id("ddlExam").selectedOptions[0];
    const grp = opt && opt.dataset.groupId ? parseInt(opt.dataset.groupId, 10) : null;

    return {
        CompanyID: window.companyId,
        SessionID: window.sessionId,
        MarkTypeID: markTypeId,
        ClassID: classId,
        SectionID: sectionId,
        ExamID: examId,
        ExamGroupID: grp
    };
}

// ── Cascading dropdowns ─────────────────────────────────────────────
async function onClassChange() {
    const classId = $id("ddlClass").value;
    const ddlSection = $id("ddlSection");
    const ddlExam = $id("ddlExam");
    const ddlNew = $id("ddlNewExam");

    resetSelect(ddlSection, "Choose a Section...", true);
    resetSelect(ddlExam, "Select", true);
    resetSelect(ddlNew, "Select a exam.", true);
    clearGrid();

    if (!classId) return;

    try {
        const [secRes, examRes, newRes] = await Promise.all([
            fetchJson(`/Academics/GetSectionsByClass/${classId}`),
            fetchJson(`/ExamConfig/GetGradePreview?companyId=0&sessionId=0&classId=${classId}`),
            fetchJson(`/ChangeExam/GetNewExams?classId=${classId}`)
        ]);

        if ($id("ddlClass").value !== classId) return;   // class changed meanwhile

        if (secRes.success && Array.isArray(secRes.data)) {
            secRes.data.forEach(s => addOption(ddlSection, s.sectionID, s.sectionName));
            ddlSection.disabled = false;
        }
        if (examRes.success && Array.isArray(examRes.data)) {
            examRes.data.forEach(x => {
                addOption(ddlExam, x.examID, `[${x.examGroupName}] ${x.examName}`);
                const g = x.examGroupID ?? x.examGroupId;   // optional, used to match the Re-Exam flags
                if (g !== undefined && g !== null) ddlExam.lastElementChild.dataset.groupId = g;
            });
            ddlExam.disabled = false;
        }
        if (newRes.success && Array.isArray(newRes.data)) {
            newRes.data.forEach(x => addOption(ddlNew, x.examId, x.examName));
            ddlNew.disabled = false;
        }
    } catch (err) {
        console.error(err);
        showNotice("Could not load Section / Exam lists. " + err.message, "danger");
    }
}

// Mark Type / Section / Exam changed -> fresh grid, selection cleared
function onFilterChange() {
    clearGrid();
    loadGrid(false);
}

// New Exam changed -> reload so blocked students are re-evaluated; keep ticks
function onNewExamChange() {
    if (getFilters()) loadGrid(true);
    else refreshSelectionState();
}

// ── Grid ────────────────────────────────────────────────────────────
async function loadGrid(keepSelection) {
    const filters = getFilters();
    if (!filters) { clearGrid(); return; }

    const keep = new Set(keepSelection ? selectedRows().map(r => String(r.studentID)) : []);
    const newExamId = parseInt($id("ddlNewExam").value, 10);
    const request = { ...filters, NewExamID: newExamId || null };

    const myToken = ++loadToken;

    try {
        const wrapper = await fetchJson("/ChangeExam/GetBindGrid", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request)
        });
        if (myToken !== loadToken) return;   // superseded by a newer request

        if (!wrapper.success) {
            showNotice(wrapper.message || "Could not load students.", "warning");
            clearGrid();
            return;
        }

        const data = Array.isArray(wrapper.data) ? wrapper.data : [];
        gridRows = data.map(r => ({
            ...r,
            selected: keep.has(String(r.studentID)) && Number(r.newExamRecordCount || 0) === 0
        }));
        renderGrid();
    } catch (err) {
        if (myToken !== loadToken) return;
        console.error(err);
        showNotice("Could not load students. " + err.message, "danger");
        clearGrid();
    }
}

function clearGrid() {
    loadToken++;          // cancels any in-flight load
    gridRows = [];
    const tbody = $id("tblBody");
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">${EMPTY_MSG}</td></tr>`;
    }
    const rc = $id("recordCount");
    if (rc) rc.textContent = 0;
    refreshSelectionState();
}

function renderGrid() {
    const tbody = $id("tblBody");
    if (!tbody) return;

    const rc = $id("recordCount");
    if (rc) rc.textContent = gridRows.length;

    if (gridRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No students have entries in the selected Exam.</td></tr>`;
        refreshSelectionState();
        return;
    }

    tbody.innerHTML = gridRows.map((r, idx) => {
        const blocked = isBlocked(r);
        return `
        <tr class="${blocked ? "ce-conflict" : ""}"
            ${blocked ? 'title="This student already has entries in the New Exam"' : ""}>
            <td>${esc(r.rollNo)}</td>
            <td>${esc(r.studentID)}</td>
            <td>${esc(r.studentName)}</td>
            <td>${esc(r.fatherName)}</td>
            <td>
                <input type="checkbox" class="ce-chk" data-index="${idx}"
                       ${r.selected ? "checked" : ""} ${blocked ? "disabled" : ""}>
            </td>
        </tr>`;
    }).join("");

    refreshSelectionState();
}

// ── Save ────────────────────────────────────────────────────────────
async function saveChange() {
    const filters = getFilters();
    const newExamId = parseInt($id("ddlNewExam").value, 10);
    const chosen = selectedRows();

    if (!filters) {
        showNotice("Please select Mark Type, Class, Section and Exam.", "warning");
        return;
    }
    if (!newExamId) {
        showNotice("Please select the New Exam.", "warning");
        return;
    }
    if (newExamId === filters.ExamID) {
        showNotice("New Exam must be different from the current Exam.", "warning");
        return;
    }
    if (chosen.length === 0) {
        showNotice("Please tick at least one student.", "warning");
        return;
    }

    const oldText = $id("ddlExam").selectedOptions[0].textContent;
    const newText = $id("ddlNewExam").selectedOptions[0].textContent;
    const ok = confirm(
        `Move ${$id("ddlMarkType").selectedOptions[0].textContent} entries of ` +
        `${chosen.length} student(s)\n\nFROM: ${oldText}\nTO:   ${newText}\n\nContinue?`);
    if (!ok) return;

    const request = {
        CompanyID: filters.CompanyID,
        SessionID: filters.SessionID,
        MarkTypeID: filters.MarkTypeID,
        ClassID: filters.ClassID,
        SectionID: filters.SectionID,
        OldExamID: filters.ExamID,
        NewExamID: newExamId,
        StudentIDsJson: JSON.stringify(chosen.map(r => String(r.studentID)))   // sends "[\"2022002053\", ...]"
    };

    const btn = $id("btnSave");
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Saving...`;

    let saved = false;
    try {
        const wrapper = await fetchJson("/ChangeExam/Save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request)
        });
        if (!wrapper.success) throw new Error(wrapper.message || "Could not save.");

        saved = true;
        showNotice(wrapper.message || "Exam changed successfully.", "success");
    } catch (err) {
        console.error(err);
        showNotice("Could not save. " + err.message, "danger");
    } finally {
        btn.innerHTML = originalHtml;
    }

    if (saved) {
        $id("ddlNewExam").value = "";
        clearGrid();
        await loadGrid(false);     // moved students no longer have entries in the old exam
    } else {
        refreshSelectionState();   // stay as-is so the user's ticks are not lost
    }
}

// ── Reset ───────────────────────────────────────────────────────────
function resetAll() {
    $id("ddlMarkType").value = "";
    $id("ddlClass").value = "";
    resetSelect($id("ddlSection"), "Choose a Section...", true);
    resetSelect($id("ddlExam"), "Select", true);
    resetSelect($id("ddlNewExam"), "Select a exam.", true);
    clearGrid();
    const box = $id("changeExamNotice");
    if (box) box.innerHTML = "";
}