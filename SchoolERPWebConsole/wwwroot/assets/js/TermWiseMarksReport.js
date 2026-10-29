// ======================================================================
// TermWiseMarksReport.js
// Loads Section / Exam Group dropdowns for the selected Class, fetches
// the ExamTermReportCardResponse (camelCase JSON from ExamReportController),
// renders either one printable report-card page per student ("term") or
// a wide Detailed Marksheet grid paginated by rows-per-page ("detailed"),
// and drives a clickable student list that jumps the viewer to the
// right page/student.
// ======================================================================

let reportData = null;   // camelCase ExamTermReportCardResponse
let currentPage = 1;
let totalPages = 0;
let zoomLevel = 0.8;

const DETAILED_ROWS_PER_PAGE = 20; // "Detailed Marksheet" splits students across print pages, not one-per-page

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('input[name="reportCardType"]').forEach(r =>
        r.addEventListener("change", onReportTypeChange)
    );

    if (window.initialReportData && window.initialReportData.students && window.initialReportData.students.length) {
        reportData = window.initialReportData;
        currentPage = 1;
        totalPages = computeTotalPages();
        document.getElementById("lblTotalPages").innerText = totalPages;
        document.getElementById("txtPageNo").value = currentPage;
        setButtonsEnabled(true);
        renderStudentList();
        renderPage(currentPage);
    }
});

function esc(v) {
    if (v === null || v === undefined) return "";
    return String(v)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtDate(d) {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt)) return "";
    return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getSelectedReportType() {
    const el = document.querySelector('input[name="reportCardType"]:checked');
    return el ? el.value : "term";
}

function setButtonsEnabled(enabled) {
    ["btnPrint", "btnSave", "btnFirst", "btnPrev", "txtPageNo", "btnNext", "btnLast"]
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !enabled;
        });
}

function showNotice(message, type) {
    const box = document.getElementById("reportPageNotice");
    if (!box) return;
    box.innerHTML = `<div class="alert alert-${type || "danger"} py-2 px-3 mb-2">${esc(message)}</div>`;
    setTimeout(() => { box.innerHTML = ""; }, 4000);
}

// ── Pagination depends on report type: 1 page/student for "term",
//    N rows/page for "detailed" (matches how each report actually prints) ──
function computeTotalPages() {
    if (!reportData || !reportData.students || reportData.students.length === 0) return 0;
    const type = getSelectedReportType();
    if (type === "detailed") {
        return Math.max(1, Math.ceil(reportData.students.length / DETAILED_ROWS_PER_PAGE));
    }
    if (type === "rank") {
        return 1; // Rank Report is a single continuous listing, not paginated
    }
    return reportData.students.length; // term / not-yet-implemented types: one page per student
}

function onReportTypeChange() {
    if (!reportData) return;
    totalPages = computeTotalPages();
    currentPage = 1;
    document.getElementById("lblTotalPages").innerText = totalPages;
    document.getElementById("txtPageNo").value = currentPage;
    renderPage(currentPage);
    updateStudentListActive(currentPage);
}

// ── Cascading dropdowns ──────────────────────────────────────────────
async function onClassChange() {
    const classId = document.getElementById("ddlClass").value;
    const ddlSection = document.getElementById("ddlSection");
    const ddlExam = document.getElementById("ddlExam");

    ddlSection.innerHTML = `<option value="">Select</option>`;
    ddlExam.innerHTML = `<option value="">Select</option>`;
    ddlSection.disabled = true;
    ddlExam.disabled = true;

    if (!classId) return;

    try {
        const [sectionsRes, examsRes] = await Promise.all([
            fetch(`/Academics/GetSectionsByClass/${classId}`).then(r => r.json()),
            fetch(`/ExamConfig/GetGradePreview??companyId=0&sessionId=0&classId=${classId}`).then(r => r.json())
        ]);

        if (sectionsRes.success && Array.isArray(sectionsRes.data)) {
            sectionsRes.data.forEach(s => {
                const opt = document.createElement("option");
                opt.value = s.sectionID;
                opt.textContent = s.sectionName;
                ddlSection.appendChild(opt);
            });
            ddlSection.disabled = false;
        }

        if (examsRes.success && Array.isArray(examsRes.data)) {
            examsRes.data.forEach(g => {
                const opt = document.createElement("option");
                opt.value = g.examID;
                opt.textContent = '[' + g.examGroupName + '] ' + g.examName;
                ddlExam.appendChild(opt);
            });
            ddlExam.disabled = false;
        }
    } catch (err) {
        console.error(err);
        showNotice("Could not load Section / Exam Group list. " + err.message, "danger");
    }
}

// ── Show Report ──────────────────────────────────────────────────────
async function showReport() {
    const classId = document.getElementById("ddlClass").value;
    const sectionId = document.getElementById("ddlSection").value;
    const examGroupId = document.getElementById("ddlExam").value;

    if (!classId || !examGroupId) {
        showNotice("Please select Class and Exam Group before showing the report.", "warning");
        return;
    }

    const request = {
        CompanyID: window.companyId,
        SessionID: window.sessionId,
        ClassID: parseInt(classId, 10),
        SectionID: sectionId ? parseInt(sectionId, 10) : 0,
        ExamGroupID: parseInt(examGroupId, 10),
        StudentID: null,
        UseWeightage: false,
        ShowPromotion: true
    };

    const btn = document.getElementById("btnShowReport");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Loading...`;

    try {
        const res = await fetch("/ExamReport/GetReportCard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request)
        });

        if (!res.ok) throw new Error("Request failed with status " + res.status);

        const wrapper = await res.json();   // { success, data, message }
        if (!wrapper.success) throw new Error(wrapper.message || "Report could not be generated.");

        const data = wrapper.data;
        if (!data || !data.students || data.students.length === 0) {
            showNotice("No students found for the selected Class / Section / Exam Group.", "warning");
            reportData = null;
            totalPages = 0;
            document.getElementById("studentListCard").style.display = "none";
            renderPlaceholder("No records to display.");
            setButtonsEnabled(false);
            return;
        }

        reportData = data;
        currentPage = 1;
        totalPages = computeTotalPages();
        document.getElementById("lblTotalPages").innerText = totalPages;
        document.getElementById("txtPageNo").value = currentPage;
        setButtonsEnabled(true);
        renderStudentList();
        renderPage(currentPage);
    } catch (err) {
        console.error(err);
        showNotice("Could not load the report. " + err.message, "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "Show Report";
    }
}

function renderPlaceholder(message) {
    document.getElementById("reportViewerArea").innerHTML =
        `<div class="text-muted text-center py-5">
            <i class="ti ti-file-report" style="font-size:2rem;"></i>
            <div class="mt-2">${esc(message)}</div>
        </div>`;
}

// ── Student list (click a row -> jump viewer to that student / page) ─
function renderStudentList() {
    const card = document.getElementById("studentListCard");
    const container = document.getElementById("studentListContainer");
    const badge = document.getElementById("studentCountBadge");

    if (!reportData || !reportData.students || reportData.students.length === 0) {
        card.style.display = "none";
        return;
    }

    badge.textContent = reportData.students.length;
    container.innerHTML = reportData.students.map((s, idx) => `
        <div class="student-list-item" data-index="${idx + 1}" onclick="jumpToStudent(${idx})">
            <span>${esc(s.rollNo || "-")}. ${esc(s.studentName)}</span>
            <i class="ti ti-chevron-right text-muted"></i>
        </div>
    `).join("");

    card.style.display = "block";
    updateStudentListActive(currentPage);
}

// term/rank/summarised: one page per student -> jump straight to it.
// detailed: rows are grouped by page, so jump to the page that contains this student.
function jumpToStudent(idx) {
    const type = getSelectedReportType();
    if (type === "detailed") {
        gotoPage(Math.floor(idx / DETAILED_ROWS_PER_PAGE) + 1);
    } else {
        gotoPage(idx + 1);
    }
}

function updateStudentListActive(pageIndex) {
    const type = getSelectedReportType();
    document.querySelectorAll(".student-list-item").forEach(el => {
        const idx = parseInt(el.dataset.index, 10) - 1; // 0-based student index
        let active;
        if (type === "detailed") {
            const start = (pageIndex - 1) * DETAILED_ROWS_PER_PAGE;
            const end = start + DETAILED_ROWS_PER_PAGE - 1;
            active = idx >= start && idx <= end;
        } else {
            active = (idx + 1) === pageIndex;
        }
        el.classList.toggle("active", active);
    });
}
// Returns a centered, faded watermark <img> when the school has a WaterMark logo.
// The parent element must have position:relative.
function watermarkHtml(h) {
    const src = h && (h.waterMarkLogo || h.WaterMarkLogo);
    if (!src) return "";
    return `<img src="${esc(src)}" class="report-watermark" alt="" onerror="this.style.display='none'">`;
}
// ── Pagination / zoom ─────────────────────────────────────────────────
function gotoPage(page) {
    if (!reportData || totalPages === 0) return;
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentPage = page;
    document.getElementById("txtPageNo").value = currentPage;
    renderPage(currentPage);
    updateStudentListActive(currentPage);
}

function setZoom(value) {
    zoomLevel = parseFloat(value);
    const page = document.querySelector(".report-page");
    if (page) page.style.transform = `scale(${zoomLevel})`;
}

function fitOnePage() {
    const scroll = document.getElementById("reportViewerScroll");
    const page = document.querySelector(".report-page");
    if (!scroll || !page) return;
    const contentWidth = page.scrollWidth / zoomLevel || 794;
    const targetWidth = scroll.clientWidth - 48;
    const scale = Math.min(1.5, Math.max(0.3, targetWidth / contentWidth));
    zoomLevel = scale;
    document.getElementById("ddlZoom").value = "";
    page.style.transform = `scale(${zoomLevel})`;
}

function renderPage(pageIndex) {
    const type = getSelectedReportType();

    let html;
    if (type === "term") {
        const student = reportData.students[pageIndex - 1];
        html = buildTermReportCardHtml(student);
    } else if (type === "detailed") {
        html = buildDetailedMarksheetHtml(pageIndex);
    } else if (type === "summarised") {
        html = buildSummarisedMarksheetHtml(pageIndex);
    } else if (type === "rank") {
        html = buildRankReportHtml();
    } 
    else {
        html = `<div class="report-page p-5 text-center text-muted" style="width:794px; background:#fff;">
                    <p class="mt-5">"${esc(type)}" report layout is not implemented in this view yet.<br>
                    Extend <code>renderPage()</code> in TermWiseMarksReport.js the same way as
                    <code>buildTermReportCardHtml()</code> / <code>buildDetailedMarksheetHtml()</code>.</p>
                </div>`;
    }

    const area = document.getElementById("reportViewerArea");
    area.innerHTML = `<div class="report-page shadow" style="transform-origin:top center; transform:scale(${zoomLevel});">${html}</div>`;
}

// ── Term Report card (one A4 page per student) ────────────────────────
function buildTermReportCardHtml(student) {
    const h = reportData.header || {};
    const exams = reportData.exams || [];
    const marks = (reportData.marks || []).filter(m => m.studentID === student.studentID);
    const totals = (reportData.subjectTotals || []).filter(t => t.studentID === student.studentID);
    const coScholastic = (reportData.coScholastic || []).filter(c => c.studentID === student.studentID);
    const attendance = (reportData.attendance || []).find(a => a.studentID === student.studentID);
    const remark = (reportData.remarks || []).find(r => r.studentID === student.studentID);
    const promotion = (reportData.promotion || []).find(pr => pr.studentID === student.studentID);

    const subjectRows = totals.map(t => {
        const examCells = exams.map(e => {
            const mark = marks.find(m => m.subjectID === t.subjectID && m.examID === e.examId);
            const val = mark ? (mark.isAbsent ? "Ab" : (mark.score ?? "")) : "";
            return `<td class="text-center">${esc(val)}</td>`;
        }).join("");

        return `<tr>
                    <td class="subject-name-cell">${esc(t.subjectName)}</td>
                    ${examCells}
                    <td class="text-center fw-bold">${esc(t.totalObtained ?? "")}</td>
                    <td class="text-center fw-bold">${esc(t.grade ?? "")}</td>
                </tr>`;
    }).join("");

    const examHeaderCells = exams.map(e =>
        `<th class="text-center">${esc((e.examName || "").toUpperCase())}${e.maxMark != null ? `<br>(${esc(e.maxMark)})` : ""}</th>`
    ).join("");

    const maxTotal = exams.reduce((sum, e) => sum + (e.maxMark || 0), 0);

    const coScholasticRows = coScholastic.length
        ? `<table class="tr-table mt-3">
             <thead><tr><th>Co-Scholastic Areas</th><th>Grade</th></tr></thead>
             <tbody>
               ${coScholastic.map(c => `<tr><td>${esc(c.parentTitle ? c.parentTitle + " - " : "")}${esc(c.title)}</td><td class="text-center">${esc(c.grade)}</td></tr>`).join("")}
             </tbody>
           </table>`
        : "";

    const attendanceRow = attendance
        ? `<div class="mt-3 small"><strong>Attendance:</strong> ${esc(attendance.attendance ?? "-")} / ${esc(attendance.schoolDays ?? "-")} days</div>`
        : "";

    const remarkRow = remark
        ? `<div class="mt-2 small"><strong>Remarks:</strong> ${esc(remark.remark)}</div>`
        : "";

    const promotionRow = promotion
        ? `<div class="mt-2 small"><strong>Result:</strong> ${esc(promotion.result)}
             ${promotion.promotedToClass ? ` &nbsp;|&nbsp; <strong>Promoted To:</strong> ${esc(promotion.promotedToClass)} - ${esc(promotion.promotedToSection)}` : ""}
           </div>`
        : "";

    const photoSrc = student.photoFile ? student.photoFile : "/assets/images/no-photo.png";

    return `
    <div style="width:794px; min-height:1123px; background:#fff; padding:32px 40px; font-family:'Times New Roman', serif; color:#000; box-sizing:border-box;">
     ${watermarkHtml(h)}
    <div class="d-flex justify-content-between small">
            <div>School Code : ${esc(h.schoolCode)}</div>
            <div>Affiliation No : ${esc(h.affiliationNo || "")}</div>
        </div>

        <div class="d-flex align-items-center justify-content-center gap-3 mt-1">
            <img src="${esc(h.printLogo)}" style="height:70px;width:70px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.style.visibility='hidden'">
            <div class="text-center">
                <div style="font-size:26px; font-weight:700; color:#1a237e; font-family:'Times New Roman', serif;">${esc(h.companyName)}</div>
                <div class="fw-bold" style="font-size:14px;">English Medium/Co-Educational/Day Cum Residential School</div>
                <div class="small" style="color:#0d7a6e;">
                    ${h.website ? `Website :- ${esc(h.website)}` : ""}${h.email ? `, E-Mail :- ${esc(h.email)}` : ""}
                </div>
                <div class="small">${esc(h.address || "")}</div>
            </div>
            <img src="${esc(h.printLogo)}" style="height:70px;width:70px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.style.visibility='hidden'">
        </div>

        <div class="text-center fw-bold mt-2">Academic Session : ${esc(h.sessionName)}</div>
        <div class="text-center fw-bold">Report Card For ${esc(h.examGroupName)} Examination</div>

        <table class="student-info-table mt-3">
            <tbody>
                <tr>
                    <td rowspan="4" style="width:100px; vertical-align:top;">
                        <img src="${esc(photoSrc)}" style="width:85px;height:95px;object-fit:cover;border:1px solid #999;" onerror="this.src='/assets/images/no-photo.png'">
                    </td>
                    <td style="width:115px;">Roll No.</td><td>: ${esc(student.rollNo)}</td>
                    <td style="width:95px;">SR Code</td><td>: ${esc(student.srCode)}</td>
                </tr>
                <tr>
                    <td>Student's Name</td><td>: ${esc((student.studentName || "").toUpperCase())}</td>
                    <td>Date of Birth</td><td>: ${fmtDate(student.dob)}</td>
                </tr>
                <tr>
                    <td>Father's Name</td><td>: ${esc(student.fatherName)}</td>
                    <td rowspan="2">Address</td><td rowspan="2">: ${esc(student.address)}</td>
                </tr>
                <tr>
                    <td>Mother's Name</td><td>: ${esc(student.motherName)}</td>
                </tr>
                <tr>
                    <td>Class/Section</td><td colspan="3">: ${esc(h.className)} - ${esc(h.sectionName)}</td>
                </tr>
                <tr>
                    <td>Class Teacher</td><td>: ${esc(h.classTeacher)}</td>
                    <td>Ph. No.</td><td>: ${esc(student.phone)}</td>
                </tr>
            </tbody>
        </table>

        <table class="tr-table mt-3">
            <thead>
                <tr>
                    <th style="width:170px; text-align:left;">Scholastic Areas</th>
                    <th colspan="${exams.length + 2}" class="text-center">${esc(h.examGroupName)}</th>
                </tr>
                <tr>
                    <th style="text-align:left;">Subject</th>
                    ${examHeaderCells}
                    <th class="text-center">Marks Obtained${maxTotal ? `<br>(${maxTotal})` : ""}</th>
                    <th class="text-center">Gr</th>
                </tr>
            </thead>
            <tbody>
                ${subjectRows || `<tr><td colspan="${exams.length + 3}" class="text-center text-muted">No marks recorded</td></tr>`}
            </tbody>
        </table>

        ${coScholasticRows}
        ${attendanceRow}
        ${remarkRow}
        ${promotionRow}

        <div class="d-flex justify-content-between mt-5 pt-5 small">
            <div>${esc(h.signOfTeacher)}</div>
            <div>${esc(h.signOfParents)}</div>
            <div>${esc(h.signOfPrincipal)}</div>
        </div>
    </div>`;
}

// ── Detailed Marksheet (one wide grid, paginated by rows) ─────────────
function buildDetailedMarksheetHtml(pageIndex) {
    const h = reportData.header || {};
    const allStudents = reportData.students || [];
    const exams = reportData.exams || [];
    const marks = reportData.marks || [];
    const subjectTotals = reportData.subjectTotals || [];

    const startIdx = (pageIndex - 1) * DETAILED_ROWS_PER_PAGE;
    const pageStudents = allStudents.slice(startIdx, startIdx + DETAILED_ROWS_PER_PAGE);

    // Subjects, in the order they first appear in the data (left-to-right column blocks)
    const subjects = [];
    const seen = new Set();
    subjectTotals.forEach(t => {
        if (!seen.has(t.subjectID)) {
            seen.add(t.subjectID);
            subjects.push({ subjectID: t.subjectID, subjectName: t.subjectName });
        }
    });

    // Row 1: subject name, spanning that subject's exam columns + Total + Gr
    const subjectHeaderRow = subjects.map(s =>
        `<th colspan="${exams.length + 2}" class="text-center">${esc(s.subjectName)}</th>`
    ).join("");

    // Row 2: exam name per column, then Total / Gr
    const examLabelRow = subjects.map(() =>
        exams.map(e => `<th class="text-center">${esc((e.examName || "").toUpperCase())}</th>`).join("")
        + `<th class="text-center">Total</th><th class="text-center">Gr</th>`
    ).join("");

    // Row 3: max mark per subject+exam ("MO(30)"), and subject total max, blank under Gr
    const maxMarkRow = subjects.map(s => {
        const examMaxCells = exams.map(e => {
            const m = marks.find(mm => mm.subjectID === s.subjectID && mm.examID === e.examId);
            return `<th class="text-center small fw-normal">MO(${esc(m && m.maxMark != null ? m.maxMark : "-")})</th>`;
        }).join("");
        const anyTotal = subjectTotals.find(t => t.subjectID === s.subjectID);
        return examMaxCells
            + `<th class="text-center small fw-normal">MO(${esc(anyTotal && anyTotal.totalMax != null ? anyTotal.totalMax : "-")})</th><th></th>`;
    }).join("");

    // Body: one row per student in this page
    const bodyRows = pageStudents.map(stu => {
        const stuMarks = marks.filter(m => m.studentID === stu.studentID);
        const stuTotals = subjectTotals.filter(t => t.studentID === stu.studentID);

        const subjectCells = subjects.map(s => {
            const examCells = exams.map(e => {
                const m = stuMarks.find(mm => mm.subjectID === s.subjectID && mm.examID === e.examId);
                const val = m ? (m.isAbsent ? "Ab" : (m.score ?? "")) : "";
                return `<td class="text-center">${esc(val)}</td>`;
            }).join("");
            const tot = stuTotals.find(t => t.subjectID === s.subjectID);
            return examCells
                + `<td class="text-center fw-bold">${esc(tot && tot.totalObtained != null ? tot.totalObtained : "")}</td>`
                + `<td class="text-center fw-bold">${esc(tot ? tot.grade : "")}</td>`;
        }).join("");

        return `<tr>
                    <td class="text-center">${esc(stu.rollNo)}</td>
                    <td>${esc(stu.srCode)}</td>
                    <td>${esc((stu.studentName || "").toUpperCase())}</td>
                    ${subjectCells}
                </tr>`;
    }).join("");

    const colCount = 3 + subjects.length * (exams.length + 2);
    // rough page width so the browser doesn't squeeze a wide grid down to A4 width
    const pageWidth = Math.max(1050, 260 + subjects.length * (exams.length + 2) * 62);

    return `
    <div style="width:${pageWidth}px; background:#fff; padding:20px 28px; font-family:'Times New Roman', serif; color:#000; box-sizing:border-box;">
     ${watermarkHtml(h)}
        <div class="text-center">
            <div style="font-size:20px; font-weight:700;">${esc(h.companyName)}</div>
            <div class="fw-semibold">${esc(h.className)} [${esc(h.sectionName)}] ${esc(h.examGroupName)} ( ${esc(h.sessionName)} )</div>
        </div>

        <table class="tr-table mt-3" style="font-size:12px;">
            <thead>
                <tr>
                    <th rowspan="3" style="width:55px;">Roll No</th>
                    <th rowspan="3" style="width:110px;">SR Code</th>
                    <th rowspan="3" style="width:170px; text-align:left;">Name</th>
                    ${subjectHeaderRow}
                </tr>
                <tr>${examLabelRow}</tr>
                <tr>${maxMarkRow}</tr>
            </thead>
            <tbody>
                ${bodyRows || `<tr><td colspan="${colCount}" class="text-center text-muted">No records</td></tr>`}
            </tbody>
        </table>
    </div>`;
}

// ── Summarised Marksheet (wide grid, one column-block per subject:
//    raw marks + weighted score + grade, then a grand Total block) ────
function buildSummarisedMarksheetHtml(pageIndex) {
    const h = reportData.header || {};
    const allStudents = reportData.students || [];
    const subjectTotals = reportData.subjectTotals || [];

    const startIdx = (pageIndex - 1) * DETAILED_ROWS_PER_PAGE;
    const pageStudents = allStudents.slice(startIdx, startIdx + DETAILED_ROWS_PER_PAGE);

    // Subjects, in first-seen order (left-to-right column blocks)
    const subjects = [];
    const seen = new Set();
    subjectTotals.forEach(t => {
        if (!seen.has(t.subjectID)) {
            seen.add(t.subjectID);
            subjects.push({ subjectID: t.subjectID, subjectName: t.subjectName });
        }
    });

    // obtained -> weighted score for a subject total row.
    // Prefers a backend-supplied weightage (t.weightage) if present;
    // falls back to the 40-pt scale observed in the legacy report.
    function weighted(t) {
        if (!t || t.totalMax == null || t.totalObtained == null) return null;
        const w = t.weightage != null ? t.weightage : 40;
        return (t.totalObtained / t.totalMax) * w;
    }

    function fmt2(n) {
        if (n === null || n === undefined || isNaN(n)) return "";
        const s = n.toFixed(2);
        const [intPart, decPart] = s.split(".");
        return intPart.padStart(2, "0") + "." + decPart;
    }

    // Row 1: subject name spanning MO / weighted / Gr; plus the Total block
    const subjectHeaderRow = subjects.map(s =>
        `<th colspan="3" class="text-center">${esc(s.subjectName)}</th>`
    ).join("") + `<th colspan="2" class="text-center">Total</th>`;

    // Row 2: MO(max) / weighted-scale header / Gr per subject; MO(grandMax) / % for total
    const grandMax = subjects.reduce((sum, s) => {
        const t = subjectTotals.find(st => st.subjectID === s.subjectID);
        return sum + (t && t.totalMax != null ? t.totalMax : 0);
    }, 0);

    const subHeaderRow = subjects.map(s => {
        const t = subjectTotals.find(st => st.subjectID === s.subjectID);
        const w = t && t.weightage != null ? t.weightage : 40;
        return `<th class="text-center">MO(${esc(t && t.totalMax != null ? t.totalMax : "-")})</th>
                <th class="text-center">${esc(w)}</th>
                <th class="text-center">GR</th>`;
    }).join("") + `<th class="text-center">MO(${esc(grandMax)})</th><th class="text-center">%</th>`;

    // Body: one row per student
    const bodyRows = pageStudents.map(stu => {
        const stuTotals = subjectTotals.filter(t => t.studentID === stu.studentID);

        let grandObtained = 0, grandWeighted = 0;
        const subjectCells = subjects.map(s => {
            const t = stuTotals.find(st => st.subjectID === s.subjectID);
            const w = weighted(t);
            if (t && t.totalObtained != null) grandObtained += t.totalObtained;
            if (w != null) grandWeighted += w;
            return `<td class="text-center">${esc(t && t.totalObtained != null ? fmt2(t.totalObtained) : "")}</td>
                    <td class="text-center">${esc(w != null ? fmt2(w) : "")}</td>
                    <td class="text-center">${esc(t ? t.grade : "")}</td>`;
        }).join("");

        const pct = grandMax ? (grandObtained / grandMax) * 100 : null;

        return `<tr>
                    <td class="text-center">${esc(stu.rollNo)}</td>
                    <td>${esc((stu.studentName || "").toUpperCase())}</td>
                    ${subjectCells}
                    <td class="text-center fw-bold">${fmt2(grandWeighted)}</td>
                    <td class="text-center fw-bold">${pct != null ? fmt2(pct) : ""}</td>
                </tr>`;
    }).join("");

    const colCount = 2 + subjects.length * 3 + 2;
    const pageWidth = Math.max(900, 200 + subjects.length * 3 * 55);

    return `
    <div style="width:${pageWidth}px; background:#fff; padding:20px 28px; font-family:'Times New Roman', serif; color:#000; box-sizing:border-box;">
     ${watermarkHtml(h)}    
    <div class="text-center">
            <div style="font-size:20px; font-weight:700;">${esc(h.companyName)}</div>
            <div class="fw-semibold">${esc(h.className)} [${esc(h.sectionName)}] ${esc(h.examGroupName)} ( ${esc(h.sessionName)} )</div>
        </div>
        <table class="tr-table mt-3" style="font-size:12px;">
            <thead>
                <tr>
                    <th rowspan="2" style="width:40px;">Roll</th>
                    <th rowspan="2" style="width:170px; text-align:left;">Name</th>
                    ${subjectHeaderRow}
                </tr>
                <tr>${subHeaderRow}</tr>
            </thead>
            <tbody>
                ${bodyRows || `<tr><td colspan="${colCount}" class="text-center text-muted">No records</td></tr>`}
            </tbody>
        </table>
    </div>`;
}

// ── Rank Report (single page, all students sorted by total marks) ────
function buildRankReportHtml() {
    const h = reportData.header || {};
    const allStudents = reportData.students || [];
    const subjectTotals = reportData.subjectTotals || [];

    // Prefer a backend-supplied ranking list if the API sends one
    // (reportData.rankings: [{studentID, maxMark, obtained, percentage, grade, rank, position}]).
    // Otherwise compute totals client-side from subjectTotals, same as the
    // grand-total logic in buildSummarisedMarksheetHtml.
    const hasServerRanking = Array.isArray(reportData.rankings) && reportData.rankings.length > 0;

    function computedTotalsFor(stu) {
        const stuTotals = subjectTotals.filter(t => t.studentID === stu.studentID);
        let obtained = 0, max = 0;
        stuTotals.forEach(t => {
            if (t.totalObtained != null) obtained += t.totalObtained;
            if (t.totalMax != null) max += t.totalMax;
        });
        return { obtained, max, percentage: max ? (obtained / max) * 100 : 0 };
    }

    // grade fallback if neither server ranking nor subjectTotals carry one —
    // mirrors the "E" band seen in the legacy screenshot; swap in your real
    // grade-band table (reportData.gradeBands) if the API exposes one.
    function fallbackGrade(pct) {
        if (pct >= 90) return "A+";
        if (pct >= 75) return "A";
        if (pct >= 60) return "B";
        if (pct >= 45) return "C";
        if (pct >= 33) return "D";
        return "E";
    }

    let rows = allStudents.map(stu => {
        if (hasServerRanking) {
            const r = reportData.rankings.find(x => x.studentID === stu.studentID);
            if (r) {
                return {
                    stu, maxMark: r.maxMark, obtained: r.obtained,
                    percentage: r.percentage, grade: r.grade,
                    rank: r.rank, position: r.position
                };
            }
        }
        const t = computedTotalsFor(stu);
        const stuTotals = subjectTotals.filter(x => x.studentID === stu.studentID);
        // if per-subject grades exist, take the worst-appearing one's letter as
        // a placeholder overall grade is unreliable — use percentage band instead
        return {
            stu, maxMark: t.max, obtained: t.obtained,
            percentage: t.percentage, grade: fallbackGrade(t.percentage),
            rank: null, position: null
        };
    });

    // Sort by obtained marks (desc); assign competition ranking (ties share
    // a rank, next rank skips by tie-count) only when the server didn't
    // already supply rank/position.
    if (!hasServerRanking) {
        rows.sort((a, b) => b.obtained - a.obtained);
        let rank = 1;
        for (let i = 0; i < rows.length; i++) {
            if (i > 0 && rows[i].obtained === rows[i - 1].obtained) {
                rows[i].rank = rows[i - 1].rank;
            } else {
                rows[i].rank = i + 1;
            }
            rows[i].position = rows[i].rank;
        }
    } else {
        rows.sort((a, b) => (a.rank ?? 999999) - (b.rank ?? 999999));
    }

    const bodyRows = rows.map((r, i) => `
        <tr data-student-id="${esc(r.stu.studentID)}">
            <td class="text-center">${i + 1}</td>
            <td class="text-center">${esc(r.stu.rollNo)}</td>
            <td>${esc(r.stu.srCode)}</td>
            <td>${esc((r.stu.studentName || "").toUpperCase())}</td>
            <td class="text-center">${esc(r.maxMark)}</td>
            <td class="text-center">${esc(r.obtained)}</td>
            <td class="text-center">${esc(r.percentage != null ? r.percentage.toFixed(1) : "")}</td>
            <td class="text-center">${esc(r.grade)}</td>
            <td class="text-center">${esc(r.rank)}</td>
            <td class="text-center">${esc(r.position)}</td>
        </tr>`).join("");

    return `
    <div style="width:794px; min-height:1123px; background:#fff; padding:32px 40px; font-family:'Times New Roman', serif; color:#000; box-sizing:border-box;">
     ${watermarkHtml(h)}
        <div class="d-flex justify-content-between small">
            <div>School Code : ${esc(h.schoolCode)}</div>
            <div>Affiliation No : ${esc(h.affiliationNo || "")}</div>
        </div>

        <div class="d-flex align-items-center justify-content-center gap-3 mt-1">
            <img src="${esc(h.printLogo)}" style="height:70px;width:70px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.style.visibility='hidden'">
            <div class="text-center">
                <div style="font-size:26px; font-weight:700; color:#1a237e; font-family:'Times New Roman', serif;">${esc(h.companyName)}</div>
                <div class="small" style="color:#0d7a6e;">
                    ${h.website ? `Website :- ${esc(h.website)}` : ""}${h.email ? `, E-Mail :- ${esc(h.email)}` : ""}
                </div>
                <div class="small">${esc(h.address || "")}</div>
            </div>
            <img src="${esc(h.printLogo)}" style="height:70px;width:70px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.style.visibility='hidden'">
        </div>

        <div class="text-center fw-bold mt-2">Academic Session ${esc(h.className)} [ ${esc(h.sectionName)} ] ${esc(h.examGroupName)} ( ${esc(h.sessionName)} )</div>
        <div class="text-center fw-bold">Rank Report For ${esc(h.className)} - ${esc(h.sectionName)}</div>

        <table class="tr-table mt-3">
            <thead>
                <tr>
                    <th class="text-center">#</th>
                    <th class="text-center">Roll No</th>
                    <th>SR Code</th>
                    <th style="text-align:left;">Name</th>
                    <th class="text-center">Max Mark</th>
                    <th class="text-center">Obtained</th>
                    <th class="text-center">Percentage</th>
                    <th class="text-center">Grade</th>
                    <th class="text-center">Rank</th>
                    <th class="text-center">Position</th>
                </tr>
            </thead>
            <tbody>
                ${bodyRows || `<tr><td colspan="10" class="text-center text-muted">No records</td></tr>`}
            </tbody>
        </table>
    </div>`;
}
function printReport() {
    window.print();
}

function saveReportPdf() {
    // Browser "Save as PDF" via the print dialog covers this for now.
    window.print();
}