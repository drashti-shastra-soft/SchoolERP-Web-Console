/* ======================================================================
   SendSMS.js  -  Communication / SendSMS screen
   Needs: jQuery, Bootstrap 5, SweetAlert2 (Swal)
   Message : plain <textarea id="txtMessage"> (no HTML editor, no attachment)
   Save    : multipart/form-data -> POST /Communication/Save  (same action as Send Email)
             IsEmail=false, IsSMS / IsMobileApp from the "Send Through" boxes,
             DLTTemplateID from the Template ID box.
   BIRTHDAY tab: rendered by Razor (direct bind). Every ticked
             <input class="birthday-checkbox" data-type="STUDENT|STAFF" data-id="..">
             is sent as an INDIVIDUAL recipient.
   ====================================================================== */

// ---------- state ----------
const state = {
    sendToType: 'GROUP',
    individuals: [],            // [{roleId, roleName, referenceId, name}]
    pendingSelection: null,
    saving: false
};

// ---------- helpers ----------
function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(title, text, icon) {
    return Swal.fire(title, text, icon || 'info');
}

// Template text may contain html (or html that is encoded). Return plain text only.
// DOMParser is used because it never runs scripts / loads images.
function toPlainText(s) {
    let t = String(s ?? '');
    for (let i = 0; i < 2; i++) {
        t = new DOMParser().parseFromString(t, 'text/html').body.textContent || '';
        if (!/<\/?[a-z][^>]*>/i.test(t)) break;
    }
    return t.replace(/\u00a0/g, ' ').trim();
}

// ======================================================================
//  CHARACTER / SMS PART COUNTER
//  GSM-7: 160 per sms (153 when more than one part). Any other character -> Unicode: 70 / 67.
// ======================================================================
const GSM_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€";

function smsInfo(text) {
    const chars = [...text];
    if (!chars.length) return { len: 0, parts: 0, unicode: false };

    let unicode = false, len = 0;
    for (const ch of chars) {
        if (GSM_BASIC.includes(ch)) len += 1;
        else if (GSM_EXT.includes(ch)) len += 2;
        else { unicode = true; break; }
    }
    if (unicode) len = chars.length;

    const single = unicode ? 70 : 160, multi = unicode ? 67 : 153;
    return { len, unicode, parts: len <= single ? 1 : Math.ceil(len / multi) };
}

function updateCounter() {
    const i = smsInfo($('#txtMessage').val());
    $('#smsCounter').text(
        i.len + ' characters, ' + i.parts + ' SMS' + (i.unicode ? ' (Unicode)' : ''));
}

// ======================================================================
//  SMS TEMPLATE  ->  fills Title, Message, DLT Template ID
// ======================================================================
function initTemplate() {
    $('#ddlSmsTemplate').on('change', function () {
        const id = $(this).val();
        if (!id) return;

        $.get('/Communication/GetSmsTemplate', { id: id }).done(res => {
            if (!res || !res.success) { toast('Template', (res && res.message) || 'Could not load template.', 'warning'); return; }

            const t = res.data || {};
            $('#txtTitle').val(t.title || '').removeClass('is-invalid');
            $('#errTitle').addClass('d-none');

            $('#txtMessage').val(toPlainText(t.message)).removeClass('is-invalid');
            $('#errMessage').addClass('d-none');
            updateCounter();

            $('#txtDltTemplateId').val(t.dltTemplateId || '').removeClass('is-invalid');
            $('#errDlt').addClass('d-none');
        }).fail(() => toast('Template', 'Failed to load template.', 'error'));
    });
}

// ======================================================================
//  SEND TO  (tabs)
// ======================================================================
function initTabs() {
    $('#sendToTabs').on('click', '.nav-link', function () {
        $('#sendToTabs .nav-link').removeClass('active');
        $(this).addClass('active');
        state.sendToType = $(this).data('type');
        $('.sendto-panel').addClass('d-none');
        $({ GROUP: '#panelGroup', INDIVIDUAL: '#panelIndividual', CLASS: '#panelClass', BIRTHDAY: '#panelBirthday' }[state.sendToType])
            .removeClass('d-none');
    });
}

function initGroup() {
    $('#chkAllRoles').on('change', function () { $('.role-checkbox').prop('checked', this.checked); });
    $(document).on('change', '.role-checkbox', function () {
        $('#chkAllRoles').prop('checked', $('.role-checkbox:not(:checked)').length === 0);
    });
}

function initClass() {
    $('#ddlClass').on('change', function () {
        const classId = $(this).val();
        const $c = $('#sectionContainer');
        $('#allSectionsWrap').addClass('d-none');
        $('#chkAllSections').prop('checked', false);

        if (!classId) { $c.html('<div class="text-muted small">Select a class to load sections</div>'); return; }
        $c.html('<div class="text-muted small">Loading...</div>');

        $.get('/DownloadCenter/GetSections', { classId: classId }).done(sections => {
            if (!sections || !sections.length) { $c.html('<div class="text-muted small">No sections found</div>'); return; }
            $c.empty();
            sections.forEach(s => {
                $c.append(
                    '<div class="form-check mb-1">' +
                    '<input class="form-check-input section-checkbox" type="checkbox" value="' + esc(s.sectionID) + '" id="sec_' + esc(s.sectionID) + '">' +
                    '<label class="form-check-label" for="sec_' + esc(s.sectionID) + '">' + esc(s.sectionName) + '</label></div>');
            });
            $('#allSectionsWrap').removeClass('d-none');
        }).fail(() => $c.html('<div class="text-danger small">Failed to load sections</div>'));
    });

    $('#chkAllSections').on('change', function () { $('.section-checkbox').prop('checked', this.checked); });
    $(document).on('change', '.section-checkbox', function () {
        $('#chkAllSections').prop('checked', $('.section-checkbox:not(:checked)').length === 0);
    });
}

function renderIndividuals() {
    const $list = $('#addedIndividualsList').empty();
    if (!state.individuals.length) {
        $list.append('<div class="text-muted small" id="noIndividuals">No one added yet.</div>');
        return;
    }
    state.individuals.forEach((x, i) => {
        $list.append(
            '<div class="d-flex justify-content-between align-items-center border-bottom py-2" data-idx="' + i + '">' +
            '<span><i class="ti ti-user me-1"></i>' + esc(x.name) + ' <span class="text-muted">(' + esc(x.roleName) + ')</span></span>' +
            '<button type="button" class="btn btn-sm text-danger remove-individual"><i class="ti ti-trash"></i></button></div>');
    });
    $('#txtFilterAdded').trigger('input');
}

function initIndividual() {
    let timer;

    $('#ddlIndividualRole').on('change', function () {
        state.pendingSelection = null;
        $('#txtIndividualSearch').val('');
        $('#individualSearchResults').hide().empty();
    });

    $('#txtIndividualSearch').on('input', function () {
        clearTimeout(timer);
        state.pendingSelection = null;
        const term = $(this).val().trim();
        const roleId = $('#ddlIndividualRole').val();
        const $box = $('#individualSearchResults');

        if (term.length < 2) { $box.hide().empty(); return; }

        timer = setTimeout(() => {
            $.get('/DownloadCenter/SearchUsersByRole', { roleId: roleId, term: term }).done(results => {
                $box.empty();
                if (!results || !results.length) {
                    $box.append('<div class="list-group-item text-muted">No matches</div>').show();
                    return;
                }
                results.forEach(r => {
                    $('<a href="#" class="list-group-item list-group-item-action search-result-item"></a>')
                        .text(r.displayName)
                        .attr('data-referenceid', r.referenceID)
                        .attr('data-name', r.displayName)
                        .appendTo($box);
                });
                $box.show();
            }).fail(() => {
                $box.empty().append('<div class="list-group-item text-danger">Search failed</div>').show();
            });
        }, 300);
    });

    $(document).on('mousedown', '.search-result-item', function (e) {
        e.preventDefault();
        state.pendingSelection = { referenceId: parseInt($(this).attr('data-referenceid'), 10), name: $(this).attr('data-name') };
        $('#txtIndividualSearch').val(state.pendingSelection.name);
        $('#individualSearchResults').hide();
    });

    $(document).on('click', e => {
        if (!$(e.target).closest('#panelIndividual').length) $('#individualSearchResults').hide();
    });

    $('#btnAddIndividual').on('click', function () {
        const roleId = parseInt($('#ddlIndividualRole').val(), 10);
        const roleName = $('#ddlIndividualRole option:selected').text();
        const sel = state.pendingSelection;

        if (!sel) { toast('Select a person', 'Please search and pick a person from the list first.', 'warning'); return; }
        if (state.individuals.some(x => x.referenceId === sel.referenceId && x.roleId === roleId)) {
            toast('Already added', 'This person is already in the list.', 'info'); return;
        }
        state.individuals.push({ roleId, roleName, referenceId: sel.referenceId, name: sel.name });
        state.pendingSelection = null;
        $('#txtIndividualSearch').val('');
        renderIndividuals();
    });

    $(document).on('click', '.remove-individual', function () {
        const idx = parseInt($(this).closest('[data-idx]').attr('data-idx'), 10);
        state.individuals.splice(idx, 1);
        renderIndividuals();
    });

    $('#txtFilterAdded').on('input', function () {
        const term = $(this).val().toLowerCase();
        $('#addedIndividualsList > div[data-idx]').each(function () {
            $(this).toggle($(this).text().toLowerCase().indexOf(term) > -1);
        });
    });
}

// ======================================================================
//  RECIPIENTS JSON  (matches SP_Communication_Save @RECIPIENTSJSON)
//   ROLE       {"scope":"ROLE","roleId":10}
//   CLASS      {"scope":"CLASS","classId":3,"sectionId":7}
//   INDIVIDUAL {"scope":"INDIVIDUAL","targetType":"STUDENT","targetId":125}
//   BIRTHDAY tab -> one INDIVIDUAL row per ticked person (STUDENT -> StudentID, STAFF -> StaffID)
// ======================================================================

// Role name -> targetType expected by SP (STUDENT / STAFF / PARENT)
function roleToTargetType(roleName) {
    const n = (roleName || '').toLowerCase();
    if (n.includes('student')) return 'STUDENT';
    if (n.includes('parent') || n.includes('guardian')) return 'PARENT';
    return 'STAFF';
}

function buildRecipients() {
    const list = [];
    switch (state.sendToType) {
        case 'GROUP':
            $('.role-checkbox:checked').each(function () {
                list.push({ scope: 'ROLE', roleId: parseInt(this.value, 10) });
            });
            break;

        case 'CLASS': {
            const classId = parseInt($('#ddlClass').val(), 10);
            if (classId) {
                $('.section-checkbox:checked').each(function () {
                    list.push({ scope: 'CLASS', classId: classId, sectionId: parseInt(this.value, 10) });
                });
            }
            break;
        }

        case 'INDIVIDUAL':
            state.individuals.forEach(x => list.push({
                scope: 'INDIVIDUAL',
                targetType: roleToTargetType(x.roleName),
                targetId: x.referenceId
            }));
            break;

        case 'BIRTHDAY':
            $('.birthday-checkbox:checked').each(function () {
                list.push({
                    scope: 'INDIVIDUAL',
                    targetType: String($(this).data('type')).toUpperCase(),   // STUDENT or STAFF
                    targetId: parseInt($(this).data('id'), 10)                 // StudentID or StaffID
                });
            });
            break;
    }
    return list;
}

function validateRecipients(list) {
    if (list.length) return true;
    const msg = {
        GROUP: ['No Roles Selected', 'Please select at least one role.'],
        CLASS: ['No Sections Selected', 'Please select a class and at least one section.'],
        INDIVIDUAL: ['No Individuals Added', 'Please add at least one individual.'],
        BIRTHDAY: ['No One Selected', 'Please tick at least one person with a birthday today.']
    }[state.sendToType];
    toast(msg[0], msg[1], 'warning');
    return false;
}

// ======================================================================
//  VALIDATE / BUILD / SAVE
// ======================================================================
function validateForm() {
    let ok = true;
    const title = $('#txtTitle').val().trim();
    const message = $('#txtMessage').val().trim();
    const isSms = $('#chkSms').is(':checked');
    const isApp = $('#chkApp').is(':checked');
    const dlt = $('#txtDltTemplateId').val().trim();
    const mode = $('input[name="SendMode"]:checked').val();

    // title
    $('#errTitle').toggleClass('d-none', !!title);
    $('#txtTitle').toggleClass('is-invalid', !title);
    if (!title) ok = false;

    // send through
    const throughOk = isSms || isApp;
    $('#errThrough').toggleClass('d-none', throughOk);
    if (!throughOk) ok = false;

    // DLT template id: required only when SMS is ticked on an Indian gateway; digits only when filled
    let dltMsg = '';
    if (isSms && window.requireDlt && !dlt) dltMsg = 'Template ID is required for SMS.';
    else if (dlt && !/^\d+$/.test(dlt)) dltMsg = 'Template ID must contain digits only.';
    $('#errDlt').toggleClass('d-none', !dltMsg).text(dltMsg);
    $('#txtDltTemplateId').toggleClass('is-invalid', !!dltMsg);
    if (dltMsg) ok = false;

    // message
    $('#errMessage').toggleClass('d-none', !!message);
    $('#txtMessage').toggleClass('is-invalid', !message);
    if (!message) ok = false;

    // schedule
    let schedOk = true;
    if (mode === 'SCHEDULE') {
        const v = $('#txtSchedule').val();
        schedOk = !!v && new Date(v) > new Date();
    }
    $('#errSchedule').toggleClass('d-none', schedOk);
    if (!schedOk) ok = false;

    return ok;
}

function buildFormData(recipients, mode) {
    const templateId = parseInt($('#ddlSmsTemplate').val(), 10);
    const isSms = $('#chkSms').is(':checked');
    const dlt = $('#txtDltTemplateId').val().trim();
    const fd = new FormData();

    fd.append('Title', $('#txtTitle').val().trim());
    fd.append('Message', $('#txtMessage').val().trim());
    if (!isNaN(templateId)) fd.append('TemplateID', templateId);
    if (isSms && dlt) fd.append('DLTTemplateID', dlt);

    fd.append('IsEmail', 'false');                                   // this screen never sends email
    fd.append('IsSMS', isSms ? 'true' : 'false');
    fd.append('IsMobileApp', $('#chkApp').is(':checked') ? 'true' : 'false');

    fd.append('SendMode', mode);
    if (mode === 'SCHEDULE') fd.append('ScheduleDateTime', $('#txtSchedule').val());

    fd.append('RecipientsJson', JSON.stringify(recipients));
    return fd;
}

function saveRecord() {
    if (state.saving) return;
    if (!validateForm()) return;

    const recipients = buildRecipients();
    if (!validateRecipients(recipients)) return;

    const mode = $('input[name="SendMode"]:checked').val();

    Swal.fire({
        title: mode === 'NOW' ? 'Send SMS now?' : 'Schedule this SMS?',
        icon: 'question', showCancelButton: true, confirmButtonText: 'Yes'
    }).then(r => {
        if (!r.isConfirmed) return;

        state.saving = true;
        $('#btnSend').prop('disabled', true);

        $.ajax({
            url: '/Communication/Save', type: 'POST',
            data: buildFormData(recipients, mode),
            processData: false, contentType: false          // let the browser set the multipart boundary
        }).done(res => {
            if (res && res.success) {
                Swal.fire('Done', res.message || 'Saved successfully.', 'success')
                    .then(() => window.location.reload());
            } else {
                toast('Failed', (res && res.message) || 'Could not save.', 'error');
            }
        }).fail(xhr => {
            toast('Error', 'Server error (' + xhr.status + ').', 'error');
        }).always(() => {
            state.saving = false;
            $('#btnSend').prop('disabled', false);
        });
    });
}

// ======================================================================
//  INIT
// ======================================================================
$(function () {
    initTemplate();
    initTabs();
    initGroup();
    initClass();
    initIndividual();

    // message counter + clear errors while typing
    $('#txtMessage').on('input', function () {
        $(this).removeClass('is-invalid');
        $('#errMessage').addClass('d-none');
        updateCounter();
    });
    updateCounter();

    $('#txtTitle').on('input', function () { $(this).removeClass('is-invalid'); $('#errTitle').addClass('d-none'); });
    $('#txtDltTemplateId').on('input', function () { $(this).removeClass('is-invalid'); $('#errDlt').addClass('d-none'); });
    $('#chkSms, #chkApp').on('change', function () { $('#errThrough').addClass('d-none'); });

    // send mode
    $('input[name="SendMode"]').on('change', function () {
        const sched = this.value === 'SCHEDULE';
        $('#txtSchedule').toggleClass('d-none', !sched);
        if (!sched) $('#errSchedule').addClass('d-none');
    });

    $('#btnSend').on('click', saveRecord);
});