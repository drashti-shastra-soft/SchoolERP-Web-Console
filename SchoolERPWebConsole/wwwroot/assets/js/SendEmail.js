/* ======================================================================
   SendEmail.js  -  Communication / SendEmail screen
   Needs: jQuery, Bootstrap 5, SweetAlert2 (Swal)
   Editor: CKEditor 4  (<textarea id="txtMessage">)  - falls back to the
           contenteditable <div id="editor"> if CKEditor is not on the page.
   Save  : multipart/form-data  (file is posted with the form, saved by the controller)

   BIRTHDAY TAB: the list is rendered by Razor (direct bind, no AJAX, no dropdown).
   Every <input class="birthday-checkbox" data-type="STUDENT|STAFF" data-id="..."> that is
   ticked is sent as an INDIVIDUAL recipient.
   ====================================================================== */

const EDITOR_ID = 'txtMessage';
const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'txt'];

// ---------- state ----------
const state = {
    sendToType: 'GROUP',
    // file   = new File chosen by the user (posted on save)
    // url    = already-stored file that came from the email template
    // removed= user removed an existing (template) attachment
    attachment: { file: null, url: null, name: null, removed: false },
    individuals: [],            // [{roleId, roleName, referenceId, name}]
    pendingSelection: null,
    saving: false
};
let pendingEditorHtml = null;   // html waiting for CKEditor to become ready

// ---------- helpers ----------
function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(title, text, icon) {
    return Swal.fire(title, text, icon || 'info');
}

// Remove scripts / event handlers / javascript: urls. <style> is kept (email templates use it).
function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    doc.querySelectorAll('script,iframe,object,embed,link,meta,form').forEach(n => n.remove());
    doc.querySelectorAll('*').forEach(el => {
        [...el.attributes].forEach(a => {
            const n = a.name.toLowerCase(), v = a.value.trim().toLowerCase();
            if (n.startsWith('on')) el.removeAttribute(a.name);
            else if ((n === 'href' || n === 'src') && v.startsWith('javascript:')) el.removeAttribute(a.name);
        });
    });
    // a leading <style> ends up in <head> when parsed - keep it
    const styles = [...doc.head.querySelectorAll('style')].map(s => s.outerHTML).join('');
    return styles + doc.body.innerHTML;
}

// Some SPs / APIs return the template html already encoded ("&lt;p&gt;...")
function normalizeTemplateHtml(html) {
    html = html || '';
    if (html.indexOf('<') === -1 && /&lt;\s*\/?\s*[a-z]/i.test(html)) {
        const t = document.createElement('textarea');
        t.innerHTML = html;
        html = t.value;
    }
    return html;
}

// ======================================================================
//  EDITOR  (CKEditor 4 or fallback)
// ======================================================================
function ckInst() {
    return (window.CKEDITOR && CKEDITOR.instances && CKEDITOR.instances[EDITOR_ID]) || null;
}

// Returns {get,set} for whichever CKEditor is on the page, or null if none is ready yet.
function editorApi() {
    // ---- CKEditor 5 (classic): the instance lives on the editable element ----
    const src = document.getElementById('editor');
    let root = null;
    if (src && src.nextElementSibling && src.nextElementSibling.querySelector)
        root = src.nextElementSibling.querySelector('.ck-editor__editable');
    root = root || document.querySelector('.ck-editor__editable');

    // note: window.editor can be the <div id="editor"> itself, so check the methods
    const ed5 = (root && root.ckeditorInstance) || window.editor || null;
    if (ed5 && typeof ed5.setData === 'function' && typeof ed5.getData === 'function')
        return { type: 'ck5', inst: ed5, get: () => ed5.getData(), set: h => ed5.setData(h) };

    // ---- CKEditor 4 ----
    const ed4 = ckInst();
    if (ed4 && ed4.status === 'ready')
        return { type: 'ck4', inst: ed4, get: () => ed4.getData(), set: h => ed4.setData(h) };

    return null;
}

// true while a CKEditor exists on the page but has not finished starting
function editorStarting() {
    return !editorApi() && (!!document.querySelector('.ck-editor') || !!ckInst());
}

function clearMessageError() {
    $('#editorWrap').removeClass('is-invalid');
    $('#errMessage').addClass('d-none');
}

function setEditorHtml(html, tries) {
    tries = tries || 0;
    html = normalizeTemplateHtml(html);

    const api = editorApi();
    if (api) { api.set(html); return; }

    // CKEditor is on the page but not ready yet -> retry for up to 10 seconds
    if (editorStarting() && tries < 40) {
        setTimeout(() => setEditorHtml(html, tries + 1), 250);
        return;
    }

    // no CKEditor: plain fallbacks
    if (document.getElementById('editor')) {
        document.getElementById('editor').innerHTML = sanitizeHtml(html);
    } else {
        $('#' + EDITOR_ID).val(html);
    }
}

function getEditorHtml() {
    let html = '';
    const api = editorApi();

    if (api) {
        html = api.get();
    } else if (document.getElementById('editor')) {
        html = document.getElementById('editor').innerHTML;
    } else {
        html = $('#' + EDITOR_ID).val() || '';
    }

    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const hasContent = tmp.textContent.trim() || tmp.querySelector('img,table,hr,figure');
    return hasContent ? sanitizeHtml(html) : '';
}

function hookCk5Change(tries) {
    const api = editorApi();
    if (api && api.type === 'ck5') {
        api.inst.model.document.on('change:data', clearMessageError);
        return;
    }
    if (tries < 40) setTimeout(() => hookCk5Change(tries + 1), 250);
}

function initEditor() {
    hookCk5Change(0);                      // CKEditor 5 is created by the page, we only attach to it
    const ta = document.getElementById(EDITOR_ID);

    // ---- CKEditor 4 ----
    if (window.CKEDITOR && ta) {
        let inst = CKEDITOR.instances[EDITOR_ID];
        if (!inst) {
            inst = CKEDITOR.replace(EDITOR_ID, {
                height: 320,
                allowedContent: true,      // do NOT let CKEditor strip template html (tables, styles, classes)
                versionCheck: false
            });
        }
        inst.on('instanceReady', function () {
            if (pendingEditorHtml !== null) { inst.setData(pendingEditorHtml); pendingEditorHtml = null; }
        });
        inst.on('change', clearMessageError);
        return;
    }

    // ---- fallback: contenteditable editor ----
    const $editor = $('#editor');
    if (!$editor.length) return;

    $('#editorToolbar').on('mousedown', 'button, .dropdown-item', e => e.preventDefault());

    $('#editorToolbar').on('click', '[data-cmd]', function () {
        const cmd = $(this).data('cmd');
        $editor.trigger('focus');
        if (cmd === 'quote') {
            document.execCommand('formatBlock', false, 'blockquote');
        } else if (cmd === 'link') {
            const url = prompt('Enter URL (https://...)');
            if (url && /^(https?:|mailto:)/i.test(url.trim())) document.execCommand('createLink', false, url.trim());
            else if (url) toast('Invalid link', 'Only http, https and mailto links are allowed.', 'warning');
        } else if (cmd === 'image') {
            $('#editorImageFile').trigger('click');
        } else {
            document.execCommand(cmd, false, null);
        }
    });

    $('#editorToolbar').on('click', '[data-format]', function () {
        const f = $(this).data('format');
        $editor.trigger('focus');
        document.execCommand('formatBlock', false, f === 'p' ? 'p' : f);
        $('#formatLabel').text($(this).text());
    });

    $('#editorImageFile').on('change', function () {
        const file = this.files[0];
        this.value = '';
        if (!file) return;
        if (file.size > 1024 * 1024) { toast('Image too large', 'Inline images must be under 1 MB. Use the attachment instead.', 'warning'); return; }
        const r = new FileReader();
        r.onload = () => { $editor.trigger('focus'); document.execCommand('insertImage', false, r.result); };
        r.readAsDataURL(file);
    });

    $editor.on('paste', function (e) {
        const cd = (e.originalEvent || e).clipboardData;
        if (!cd) return;
        const html = cd.getData('text/html');
        if (html) { e.preventDefault(); document.execCommand('insertHTML', false, sanitizeHtml(html)); }
    });

    $editor.on('input', clearMessageError);
}

// ======================================================================
//  ATTACHMENT  (file is only picked here; it is posted with the form on save)
// ======================================================================
function showAttachment() {
    const a = state.attachment;
    const $info = $('#fileInfo');
    if (!a.file && !a.url) { $info.addClass('d-none').removeClass('d-flex'); return; }

    const $name = $('#fileInfoName').text(a.name || 'Attachment');
    if (a.url) $name.attr('href', a.url); else $name.removeAttr('href');
    $info.removeClass('d-none').addClass('d-flex');
}

function clearAttachment() {
    const hadStored = !!state.attachment.url;
    state.attachment = { file: null, url: null, name: null, removed: hadStored };
    $('#attachmentFile').val('');
    $('#errAttachment').addClass('d-none').text('');
    showAttachment();
}

function pickFile(file) {
    const $err = $('#errAttachment').addClass('d-none');
    if (!file) return;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
        $err.text('File type not allowed.').removeClass('d-none');
        $('#attachmentFile').val('');
        return;
    }
    const maxBytes = (window.maxFileSizeMB || 5) * 1024 * 1024;
    if (file.size > maxBytes) {
        $err.text('File is larger than ' + (window.maxFileSizeMB || 5) + ' MB.').removeClass('d-none');
        $('#attachmentFile').val('');
        return;
    }
    state.attachment = { file: file, url: null, name: file.name, removed: false };
    showAttachment();
}

// ======================================================================
//  EMAIL TEMPLATE  ->  fills Title, Message, Attachment
// ======================================================================
function initTemplate() {
    $('#ddlEmailTemplate').on('change', function () {
        const id = $(this).val();
        if (!id) return;

        $.get('/Communication/GetTemplate', { id: id }).done(res => {
            console.log('GetTemplate response:', res);          // check data.message here if the editor stays empty
            if (!res || !res.success) { toast('Template', (res && res.message) || 'Could not load template.', 'warning'); return; }

            const t = res.data || {};
            $('#txtTitle').val(t.title || '').removeClass('is-invalid');
            $('#errTitle').addClass('d-none');
            setEditorHtml(t.message || '');
            clearMessageError();

            if (t.attachment) {
                state.attachment = {
                    file: null,
                    url: t.attachment,
                    name: decodeURIComponent(String(t.attachment).split('/').pop().split('?')[0]),
                    removed: false
                };
            } else {
                state.attachment = { file: null, url: null, name: null, removed: false };
            }
            $('#attachmentFile').val('');
            showAttachment();
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
//   CLASS      {"scope":"CLASS","classId":3,"sectionId":7[,"targetType":"STUDENT|PARENT"]}
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
            const aud = $('input[name="ClassAudience"]:checked').val() || 'BOTH';
            if (classId) {
                $('.section-checkbox:checked').each(function () {
                    list.push({
                        scope: 'CLASS', classId: classId, sectionId: parseInt(this.value, 10),
                        targetType: aud === 'BOTH' ? undefined : aud       // undefined is dropped by JSON.stringify
                    });
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
//  SAVE / SEND   (multipart/form-data -> [FromForm] + IFormFile attachmentFile)
// ======================================================================
function validateForm() {
    let ok = true;
    const title = $('#txtTitle').val().trim();
    const html = getEditorHtml();
    const mode = $('input[name="SendMode"]:checked').val();

    $('#errTitle').toggleClass('d-none', !!title);
    $('#txtTitle').toggleClass('is-invalid', !title);
    if (!title) ok = false;

    $('#errMessage').toggleClass('d-none', !!html);
    $('#editorWrap').toggleClass('is-invalid', !html);
    if (!html) ok = false;

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
    const a = state.attachment;
    const templateId = parseInt($('#ddlEmailTemplate').val(), 10);
    const fd = new FormData();

    fd.append('Title', $('#txtTitle').val().trim());
    fd.append('Message', getEditorHtml());
    if (!isNaN(templateId)) fd.append('TemplateID', templateId);

    if (a.file) {
        fd.append('attachmentFile', a.file, a.file.name);          // new file: controller saves it
    } else if (a.url) {
        fd.append('Attachment', a.url);                            // file that came with the template
        fd.append('AttachmentName', a.name || '');
    }
    fd.append('RemoveAttachment', a.removed ? 'true' : 'false');

    fd.append('IsEmail', 'true');
    fd.append('IsSMS', 'false');
    fd.append('IsMobileApp', 'false');

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
    console.log('RecipientsJson:', JSON.stringify(recipients));

    Swal.fire({
        title: mode === 'NOW' ? 'Send email now?' : 'Schedule this email?',
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
    initEditor();
    initTemplate();
    initTabs();
    initGroup();
    initClass();
    initIndividual();

    // attachment drop zone
    const $dz = $('#dropZone');
    $dz.on('click', () => $('#attachmentFile').trigger('click'));
    $dz.on('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#attachmentFile').trigger('click'); } });
    $dz.on('dragover dragenter', e => { e.preventDefault(); $dz.addClass('dragover'); });
    $dz.on('dragleave drop', e => { e.preventDefault(); $dz.removeClass('dragover'); });
    $dz.on('drop', e => pickFile(e.originalEvent.dataTransfer.files[0]));
    $('#attachmentFile').on('change', function () { pickFile(this.files[0]); });
    $('#btnClearFile').on('click', clearAttachment);

    // send mode
    $('input[name="SendMode"]').on('change', function () {
        const sched = this.value === 'SCHEDULE';
        $('#txtSchedule').toggleClass('d-none', !sched);
        if (!sched) $('#errSchedule').addClass('d-none');
    });

    $('#txtTitle').on('input', function () { $(this).removeClass('is-invalid'); $('#errTitle').addClass('d-none'); });

    $('#btnSend').on('click', saveRecord);
});