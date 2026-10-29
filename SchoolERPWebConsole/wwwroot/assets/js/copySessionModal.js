// wwwroot/js/copySessionModal.js
//
// Generic "Copy to another Session/Company" modal controller.
// Works for ANY entity (Sections, Classes, Subjects, Students, Hostels, ...)
// as long as:
//   1) The shared partial _CopySessionModal.cshtml is rendered once on the page
//      (e.g. via @await Html.PartialAsync("_CopySessionModal") in _Layout.cshtml).
//   2) Each page calls openCopyModal('EntityKey') from its own "Copy" button,
//      where EntityKey matches a key in ENTITY_COLUMNS below.
//   3) The page does NOT duplicate the modal markup or write page-specific JS
//      for it — this file + the partial are the single shared implementation.
//
// ── CHANGED IN THIS VERSION ──
// Destination ("To") session dropdown now binds company-wise:
//   - fromSession is loaded scoped to fromAccount's company (via
//     loadSessionsForCompany), same as before but now actually filtered.
//   - toSession is loaded scoped to toAccount's company, and is RE-LOADED
//     every time the user changes toAccount (onToAccountChange), instead
//     of being populated once from an unfiltered "all sessions" list.
// Update SESSION_BY_COMPANY_URL below if your controller route differs
// (e.g. '/Session/GetByCompany' vs '/Sessions/GetByCompany').

// ── Endpoint used to load sessions scoped to one company ────────────
const SESSION_BY_COMPANY_URL = '/Sessions/GetByCompany';

// ── Entity column config ─────────────────────────────────────────────
const ENTITY_COLUMNS = {
    sections: {
        headers: ['Section Name', 'Section Code', 'Class', 'Status'],
        row: (r, i) => `
            <td>${i + 1}</td>
            <td>${r.sectionName ?? '-'}</td>
            <td>${r.sectionCode ?? '-'}</td>
            <td>${r.className ?? '-'}</td>
            <td><span class="badge bg-${r.isActive ? 'success' : 'secondary'}-subtle
                text-${r.isActive ? 'success' : 'secondary'}">
                ${r.isActive ? 'Active' : 'Inactive'}</span></td>`
    },
    Classs: {
        headers: ['Class Name', 'Sections', 'Status'],
        row: (r, i) => `
            <td>${i + 1}</td>
            <td>${r.className ?? '-'}</td>
            <td>${r.sectionNames ?? '-'}</td>
            <td><span class="badge bg-${r.isActive ? 'success' : 'secondary'}-subtle
                text-${r.isActive ? 'success' : 'secondary'}">
                ${r.isActive ? 'Active' : 'Inactive'}</span></td>`
    },
    Subject: {
        headers: ['Subject Name', 'Subject Code', 'Type', 'Status'],
        row: (r, i) => `
            <td>${i + 1}</td>
            <td>${r.subjectName ?? '-'}</td>
            <td>${r.subjectCode ?? '-'}</td>
            <td>${r.subjectType ?? '-'}</td>
            <td><span class="badge bg-${r.isActive ? 'success' : 'secondary'}-subtle
                text-${r.isActive ? 'success' : 'secondary'}">
                ${r.isActive ? 'Active' : 'Inactive'}</span></td>`
    },
    Students: {
        headers: ['Student Name', 'Admission No', 'Roll No', 'Class', 'Father Name', 'Mobile', 'Status'],
        row: (r, i) => `
            <td>${i + 1}</td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    ${r.studentPhoto
                ? `<img src="data:${r.studentPhotoType};base64,${r.studentPhoto}"
                               class="rounded-circle" style="width:28px;height:28px;object-fit:cover">`
                : `<div class="rounded-circle bg-secondary d-flex align-items-center
                               justify-content-center text-white"
                               style="width:28px;height:28px;font-size:11px">
                               ${(r.fullName?.[0] ?? '-').toUpperCase()}</div>`
            }
                    <span>${r.fullName ?? '-'}</span>
                </div>
            </td>
            <td>${r.admissionNo ?? '-'}</td>
            <td>${r.rollNo ?? '-'}</td>
            <td>${r.className ?? '-'}</td>
            <td>${r.fatherName ?? '-'}</td>
            <td>${r.mobileNo ?? '-'}</td>
            <td><span class="badge bg-${r.isActive ? 'success' : 'secondary'}-subtle
                text-${r.isActive ? 'success' : 'secondary'}">
                ${r.isActive ? 'Active' : 'Inactive'}</span></td>`
    },
    StudentHouse: {
        headers: ['House Name', 'Description', 'Status'],
        row: (r, i) => `
            <td>${i + 1}</td>
            <td>${r.studentHouseName ?? '-'}</td>
            <td>${r.studentHouseDescription ?? '-'}</td>
            <td><span class="badge bg-${r.isActive ? 'success' : 'secondary'}-subtle
                text-${r.isActive ? 'success' : 'secondary'}">
                ${r.isActive ? 'Active' : 'Inactive'}</span></td>`
    },
    RoomTypes: {
        headers: ['Room Type', 'Description', 'Status'],
        row: (r, i) => `
            <td>${i + 1}</td>
            <td>${r.roomTypeTitle ?? '-'}</td>
            <td>${r.roomTypeDescription ?? '-'}</td>
            <td><span class="badge bg-${r.isActive ? 'success' : 'secondary'}-subtle
                text-${r.isActive ? 'success' : 'secondary'}">
                ${r.isActive ? 'Active' : 'Inactive'}</span></td>`
    },
    RoomCoolingType: {
        headers: ['Room Type', 'Description', 'Status'],
        row: (r, i) => `
            <td>${i + 1}</td>
            <td>${r.roomCoolingTypeName ?? '-'}</td>
            <td>${r.description ?? '-'}</td>
            <td><span class="badge bg-${r.isActive ? 'success' : 'secondary'}-subtle
                text-${r.isActive ? 'success' : 'secondary'}">
                ${r.isActive ? 'Active' : 'Inactive'}</span></td>`
    },
    Hostels: {
        headers: ['Hostel Name', 'Room Type', 'Intake', 'Address', 'Status'],
        row: (r, i) => `
            <td>${i + 1}</td>
            <td>${r.hostelName ?? '-'}</td>
            <td>${r.roomTypeTitle ?? '-'}</td>
            <td>${r.hostelIntake ?? '-'}</td>
            <td>${r.hostelAddress ?? '-'}</td>
            <td><span class="badge bg-${r.isActive ? 'success' : 'secondary'}-subtle
                text-${r.isActive ? 'success' : 'secondary'}">
                ${r.isActive ? 'Active' : 'Inactive'}</span></td>`
    },
    HostelType: {
        headers: ['Hostel Type', 'Description', 'Status'],
        row: (r, i) => `
            <td>${i + 1}</td>
            <td>${r.hostelTypeName ?? '-'}</td>
            <td>${r.description ?? '-'}</td>
            <td><span class="badge bg-${r.isActive ? 'success' : 'secondary'}-subtle
                text-${r.isActive ? 'success' : 'secondary'}">
                ${r.isActive ? 'Active' : 'Inactive'}</span></td>`
    },
    HolidayType: {
        headers: ['Holiday Type', 'Color', 'Status'],
        row: (r, i) => `
            <td>${i + 1}</td>
            <td>${r.holidayTypeName ?? '-'}</td>
            <td>${r.colourCode ?? '-'}</td>
            <td><span class="badge bg-${r.isActive ? 'success' : 'secondary'}-subtle
                text-${r.isActive ? 'success' : 'secondary'}">
                ${r.isActive ? 'Active' : 'Inactive'}</span></td>`
    },
    Holidays: {
        headers: ['Holiday Name', 'Holiday Type', 'No Of Holiday', 'Holiday From Date', 'Holiday To Date', 'Status'],
        row: (r, i) => `
            <td>${i + 1}</td>
            <td>${r.holidayName ?? '-'}</td>
            <td>${r.holidayTypeName ?? '-'}</td>
            <td>${r.noOfDays ?? '-'}</td>
            <td>${formatDate(r.fromDate)}</td>
            <td>${formatDate(r.toDate)}</td>
            <td><span class="badge bg-${r.isActive ? 'success' : 'secondary'}-subtle
                text-${r.isActive ? 'success' : 'secondary'}">
                ${r.isActive ? 'Active' : 'Inactive'}</span></td>`
    },
    Countrys: {
        headers: ['Country Name', 'Description', 'Status'],
        row: (r, i) => `
            <td>${i + 1}</td>
            <td>${r.countryName ?? '-'}</td>
            <td>${r.description ?? '-'}</td>
            <td><span class="badge bg-${r.isActive ? 'success' : 'secondary'}-subtle
                text-${r.isActive ? 'success' : 'secondary'}">
                ${r.isActive ? 'Active' : 'Inactive'}</span></td>`
    },
    States: {
        headers: ['State Name', 'Country Name', 'Description', 'Status'],
        row: (r, i) => `
            <td>${i + 1}</td>
            <td>${r.stateName ?? '-'}</td>
            <td>${r.countryName ?? '-'}</td>
            <td>${r.description ?? '-'}</td>
            <td><span class="badge bg-${r.isActive ? 'success' : 'secondary'}-subtle
                text-${r.isActive ? 'success' : 'secondary'}">
                ${r.isActive ? 'Active' : 'Inactive'}</span></td>`
    }
};

function formatDate(date) {
    if (!date) return '-';

    const d = new Date(date);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
}

const apiBaseUrl = window.appConfig.apiBaseUrl;

// ── Global config set by each page's Copy button ──────────────────
let currentConfig = {
    entityType: ''   // e.g. 'Students', 'Hostels', 'Subject'
};

// ── NEW: Load sessions for ONE company into ONE <select> ───────────
// Used for both fromSession and toSession, so each is always scoped
// to whatever company its paired "account" dropdown currently has
// selected — that's what makes "Destination session" bind company-wise.
async function loadSessionsForCompany(companyId, selectEl, preselectSessionId) {
    if (!selectEl) return;

    const placeholder = selectEl.id === 'toSession' ? 'Select To session' : 'Select Session';
    selectEl.disabled = true;
    selectEl.innerHTML = `<option value="">Loading...</option>`;

    try {
        const resp = await fetch(`${SESSION_BY_COMPANY_URL}?companyId=${companyId ?? ''}`);
        const payload = await resp.json();
        const sessions = payload && payload.success && Array.isArray(payload.data)
            ? payload.data
            : [];

        selectEl.innerHTML = `<option value="">${placeholder}</option>`;
        sessions.forEach(s => {
            const opt = new Option(s.sessionTitle, s.sessionId);
            if (preselectSessionId && String(preselectSessionId) === String(s.sessionId)) {
                opt.selected = true;
            }
            selectEl.add(opt);
        });
    } catch (e) {
        console.error('Failed to load sessions for company', companyId, e);
        selectEl.innerHTML = `<option value="">Failed to load sessions</option>`;
    } finally {
        selectEl.disabled = false;
    }
}

// ── NEW: wired to fromAccount's onchange in the partial ────────────
async function onFromAccountChange() {
    const fromAcc = document.getElementById('fromAccount').value;
    await loadSessionsForCompany(fromAcc, document.getElementById('fromSession'), null);
    validateCopy();
}

// ── NEW: wired to toAccount's onchange in the partial ───────────────
// This is the actual "Destination session binds company-wise" fix —
// changing the destination company now reloads ONLY that company's
// sessions into toSession, instead of leaving the old unfiltered list.
async function onToAccountChange() {
    const toAcc = document.getElementById('toAccount').value;
    await loadSessionsForCompany(toAcc, document.getElementById('toSession'), null);
    validateCopy();
}

// ── Bind session + company dropdowns, then re-validate ────────────
async function initCopy() {
    try {
        const ddl = document.getElementById("fromSession");
        const ddlTo = document.getElementById("toSession");
        if (!ddl) return;

        const currentSessionId = window.getSessionId ? window.getSessionId() : null;
        const currentCompanyId = window.getCompanyId ? window.getCompanyId() : null;

        // Populate company dropdowns first (sets fromAccount/toAccount
        // default selections) — see populateCompanies() below.
        const companies = await fetchCompanies();
        populateCompanies(companies);

        // ✅ CHANGED: "From" session list is now scoped to the user's
        // current company (via loadSessionsForCompany) instead of an
        // unfiltered fetchSessions() call, with the current session
        // pre-selected for convenience — same UX as before, now actually
        // company-filtered.
        // fromSession/fromAccount remain a normal, enabled <select> —
        // we only ever set `.selected`/`.value`, never `.disabled = true`
        // beyond the initial markup state.
        await loadSessionsForCompany(currentCompanyId, ddl, currentSessionId);

        // ✅ CHANGED: "To" session list starts scoped to the SAME default
        // company that toAccount defaults to (see populateCompanies), but
        // with NO session pre-selected — the user must actively choose a
        // target session, same as before. The moment toAccount changes,
        // onToAccountChange() re-scopes this list to the new company.
        await loadSessionsForCompany(currentCompanyId, ddlTo, null);

        loadTableData(currentCompanyId, currentSessionId, 0, 0);
        validateCopy();
    }
    catch (e) {
        console.error(e);
    }
}

async function fetchCompanies() {
    const resp = await fetch('/Company/GetAssignedCompanies', { method: 'GET' });
    const payload = await resp.json();
    if (!payload || payload.success !== true || !Array.isArray(payload.data)) {
        throw new Error(payload?.message || 'Failed to load companies');
    }
    return payload.data;
}

function populateCompanies(companies) {
    const ddl = document.getElementById("fromAccount");
    const ddlTo = document.getElementById("toAccount");
    if (!ddl) return;

    ddl.innerHTML = '<option value="">From main account</option>';
    ddlTo.innerHTML = '<option value="">To main account</option>';

    const currentCompanyId = window.getCompanyId ? window.getCompanyId() : null;

    for (const c of companies) {
        const opt = document.createElement('option');
        opt.value = String(c.companyId);
        opt.textContent = c.schoolName || `Company #${c.companyId}`;
        if (currentCompanyId && String(currentCompanyId) === String(c.companyId)) {
            opt.selected = true;
        }
        ddl.appendChild(opt);
    }

    for (const com of companies) {
        const opt = document.createElement('option');
        opt.value = String(com.companyId);
        opt.textContent = com.schoolName || `Company #${com.companyId}`;
        // ✅ toAccount also defaults to the current company (matches the
        // preselect used for toSession in initCopy), while still letting
        // the user freely change it — selecting a different company fires
        // onToAccountChange() and reloads toSession accordingly.
        if (currentCompanyId && String(currentCompanyId) === String(com.companyId)) {
            opt.selected = true;
        }
        ddlTo.appendChild(opt);
    }

    // ddl.disabled = companies.length === 0; // only disabled when truly empty
}

// ── Called by every Copy button — ONLY ARGUMENT CHANGES ───────────
function openCopyModal(entityType) {
    currentConfig = { entityType };

    // Reset modal state
    document.getElementById('tableSection').classList.add('d-none');
    document.getElementById('validationBox').classList.add('d-none');
    document.getElementById('btnCopy').disabled = true;
    document.getElementById('sectionsTbody').innerHTML = '';

    new bootstrap.Modal(document.getElementById('copySessionModal')).show();
    initCopy();
}

// ── Runs whenever any dropdown changes (wired via onchange in the
//    shared partial) AND once from init() after defaults are applied ──
function validateCopy() {
    const fromAcc = document.getElementById('fromAccount').value;
    const fromSess = document.getElementById('fromSession').value;
    const toAcc = document.getElementById('toAccount').value;
    const toSess = document.getElementById('toSession').value;

    const allFilled = fromAcc && fromSess && toAcc && toSess;
    const isSame = fromAcc === toAcc && fromSess === toSess;

    // Show/hide conflict warning
    document.getElementById('validationBox').classList.toggle('d-none', !isSame);

    if (allFilled && !isSame) {
        //loadTableData(fromAcc, fromSess, toAcc, toSess);
        document.getElementById('btnCopy').disabled = false;
    } else {
        //document.getElementById('tableSection').classList.add('d-none');
        document.getElementById('btnCopy').disabled = true;
    }

}

// ── Loads rows for the current entity type ─────────────────────────
async function loadTableData(fromAcc, fromSess, toAcc, toSess) {
    const config = ENTITY_COLUMNS[currentConfig.entityType];
    if (!config) {
        console.error('Unknown entity type:', currentConfig.entityType);
        return [];
    }

    const thead = document.querySelector('#tblSections thead tr');
    const tbody = document.getElementById('sectionsTbody');
    const selCount = document.getElementById('selCount');

    try {
        // ── Build dynamic headers ────────────────────────────────
        thead.innerHTML = `
        <th style="width:40px">#</th>
        ${config.headers.map(h => `<th>${h}</th>`).join('')}`;

        // ── Loading state ─────────────────────────────────────────
        tbody.innerHTML = `<tr>
            <td colspan="${config.headers.length + 2}" class="text-center py-3 text-muted">
                <div class="spinner-border spinner-border-sm me-2"></div>Loading...
            </td>
        </tr>`;

        const resp = await fetch(`/CopySession/${currentConfig.entityType}?sessionId=${fromSess}&companyId=${fromAcc}`);
        const res = await resp.json();

        if (!res.success || !res.data?.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${config.headers.length + 2}"
                        class="text-center py-3 text-muted">
                        No records found.
                    </td>
                </tr>`;
            document.getElementById('tableSection').classList.remove('d-none');
            document.getElementById('btnCopy').disabled = true;
            return [];
        }

        // ── Render rows ───────────────────────────────────────────
        tbody.innerHTML = res.data.map((r, i) =>
            `<tr>${config.row(r, i)}</tr>`
        ).join('');

        document.getElementById('tableSection').classList.remove('d-none');
        //if (selCount) selCount.textContent = '0 selected';
        //document.getElementById('chkSelectAll').checked = false;
        const selCount = document.getElementById('selCount');
        updateCount();

        return res.data;
    } catch (err) {
        console.error('loadTableData error:', err);
        tbody.innerHTML = `
            <tr>
                <td colspan="${config.headers.length + 2}"
                    class="text-center py-3 text-danger">
                    <i class="ti ti-alert-circle me-1"></i>
                    Failed to load data. Please try again.
                </td>
            </tr>`;
        document.getElementById('tableSection').classList.remove('d-none');
        document.getElementById('btnCopy').disabled = true;
        return [];
    }
}

// ── Select all / count ────────────────────────────────────────────
function toggleSelectAll(cb) {
    document.querySelectorAll('.row-check').forEach(c => c.checked = cb.checked);
    updateCount();
}

function updateCount() {
    const checked = document.querySelectorAll('.row-check:checked').length;
    document.getElementById('btnCopy').disabled = checked === 0;
}

// ── The Copy button click — same for ALL entity types ──────────────
async function handleCopy() {
    const fromAcc = document.getElementById('fromAccount').value;
    const fromSess = document.getElementById('fromSession').value;
    const toAcc = document.getElementById('toAccount').value;
    const toSess = document.getElementById('toSession').value;

    const selectedIds = [...document.querySelectorAll('.row-check:checked')]
        .map(c => c.value);

    const payload = {
        fromCompanyId: fromAcc,
        fromSessionId: fromSess,
        toCompanyId: toAcc,
        toSessionId: toSess,
        ids: selectedIds
    };

    const action = `Copy${currentConfig.entityType}`;
    if (!currentConfig.entityType) {
        console.error('Unknown entity type:', currentConfig.entityType);
        return;
    }

    document.getElementById('btnCopy').disabled = true;

    try {
        const res = await fetch(`/CopySession/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            bootstrap.Modal.getInstance(
                document.getElementById('copySessionModal')).hide();
            showToast(`${data.message}`, 'success');
        } else {
            showToast(data.message || 'Copy failed.', 'danger');
        }
    } catch {
        showToast('Network error. Please try again.', 'danger');
    } finally {
        document.getElementById('btnCopy').disabled = false;
    }
}

function showToast(msg, type) {
    alert(msg);
}

// Expose the entry points pages / the shared partial need.
window.openCopyModal = openCopyModal;
window.onFromAccountChange = onFromAccountChange;
window.onToAccountChange = onToAccountChange;