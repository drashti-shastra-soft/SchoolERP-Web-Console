document.addEventListener('DOMContentLoaded', () => {
    renderSelectedItems();
});

function getSelectedItems() {
    try {
        const raw = sessionStorage.getItem('genSharedItems');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.warn('Could not read selected items', e);
        return [];
    }
}

function renderSelectedItems() {
    const items = getSelectedItems();
    const selList = document.getElementById('selList');
    const selCount = document.getElementById('selCount');

    if (items.length === 0) {
        selList.innerHTML = '<span class="text-muted small">No documents selected.</span>';
        selCount.textContent = '0';
        return;
    }

    let html = '';
    items.forEach(item => {
        html += `<div class="p-1 border-bottom small"><i class="ti ti-check text-success me-1"></i> ${item.title}</div>`;
    });

    selList.innerHTML = html;
    selCount.textContent = items.length;
}

function getSendToData() {
    const sendToType = $('input[name="SendToType"]:checked').val();
    const data = { sendToType: sendToType };

    if (sendToType === 'GROUP') {
        const roleIds = [];
        $('input[name="SelectedRoleIds"]:checked').each(function () {
            roleIds.push(parseInt($(this).val(), 10));
        });
        data.roleIds = roleIds;
    }
    else if (sendToType === 'CLASS') {
        const classId = $('#ddlClass').val();
        const sectionIds = [];
        $('input[name="SelectedSectionIds"]:checked').each(function () {
            sectionIds.push(parseInt($(this).val(), 10));
        });
        // Current UI only lets one class be picked at a time via the dropdown,
        // so we wrap it as a single-element array (SP/API support multiple).
        data.classSections = classId
            ? [{ classID: parseInt(classId, 10), sectionIds: sectionIds }]
            : [];
    }
    else if (sendToType === 'INDIVIDUAL') {
        const individuals = [];
        $('#addedIndividualsList > div[data-refid]').each(function () {
            individuals.push({
                roleID: parseInt($(this).data('roleid'), 10),
                referenceID: parseInt($(this).data('refid'), 10)
            });
        });
        data.individuals = individuals;
    }

    return data;
}

function validateSendTo(sendTo) {
    if (!sendTo.sendToType) {
        Swal.fire('Missing Selection', 'Please choose who to send this to.', 'warning');
        return false;
    }
    if (sendTo.sendToType === 'GROUP' && (!sendTo.roleIds || sendTo.roleIds.length === 0)) {
        Swal.fire('No Roles Selected', 'Please select at least one role.', 'warning');
        return false;
    }
    if (sendTo.sendToType === 'CLASS' &&
        (!sendTo.classSections || sendTo.classSections.length === 0 ||
            !sendTo.classSections.some(cs => cs.sectionIds && cs.sectionIds.length > 0))) {
        Swal.fire('No Sections Selected', 'Please select a class and at least one section.', 'warning');
        return false;
    }
    if (sendTo.sendToType === 'INDIVIDUAL' && (!sendTo.individuals || sendTo.individuals.length === 0)) {
        Swal.fire('No Individuals Added', 'Please add at least one individual.', 'warning');
        return false;
    }
    return true;
}

function generateLink() {
    const title = $('#genTitle').val().trim();

    $('#err-genTitle').addClass('d-none');
    $('#genTitle').removeClass('is-invalid');

    if (!title) {
        $('#err-genTitle').removeClass('d-none');
        $('#genTitle').addClass('is-invalid');
        return;
    }

    const items = getSelectedItems();
    if (items.length === 0) {
        Swal.fire('No Documents', 'No documents were selected. Please go back and select some.', 'warning');
        return;
    }

    const sendTo = getSendToData();
    if (!validateSendTo(sendTo)) {
        return;
    }

    const data = {
        title: title,
        shareDate: $('#genDate').val(),
        validUpto: $('#genValid').val(),
        contentIDs: items.map(i => i.id),
        sendToType: sendTo.sendToType,
        roleIds: sendTo.roleIds || null,
        classSections: sendTo.classSections || null,
        individuals: sendTo.individuals || null
    };

    $.ajax({
        url: '/DownloadCenter/GenerateWithSendTypeShared',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function (res) {
            if (res.success) {
                const publicUrl = window.location.origin + '/Public/SharedContent?token=' + res.token;
                $('#genResult').val(publicUrl);
                $('#resultBox').removeClass('d-none');
                showToast('Link generated successfully', 'success');

                try { sessionStorage.removeItem('genSharedItems'); } catch (e) { }
            } else {
                Swal.fire('Error!', res.message || 'Failed to generate link.', 'error');
            }
        },
        error: function (xhr) {
            console.error('Generate link failed:', xhr.status, xhr.responseText);
            let msg = 'An unexpected error occurred.';
            try {
                const body = JSON.parse(xhr.responseText);
                if (body && body.message) msg = body.message;
            } catch (e) { }
            Swal.fire('Error!', msg, 'error');
        }
    });
}

function copyResult() {
    const el = document.getElementById('genResult');
    el.select();
    document.execCommand('copy');
    showToast('Link copied to clipboard', 'info');
}


$(function () {
    // ---------- Toggle panels on radio change ----------
    $('.sendto-radio').on('change', function () {
        $('.sendto-panel').hide();
        if (this.value === 'GROUP') $('#panelGroup').show();
        else if (this.value === 'CLASS') $('#panelClass').show();
        else if (this.value === 'INDIVIDUAL') $('#panelIndividual').show();
    });

    // ---------- CLASS: load sections on class change ----------
    $('#ddlClass').on('change', function () {
        var classId = $(this).val();
        var $container = $('#sectionContainer');
        $container.html('<div class="text-muted small">Loading...</div>');

        if (!classId) {
            $container.html('<div class="text-muted small">Select a class to load sections</div>');
            return;
        }

        $.get('/DownloadCenter/GetSections', { classId: classId }, function (sections) {
            $container.empty();
            if (!sections || sections.length === 0) {
                $container.html('<div class="text-muted small">No sections found</div>');
                return;
            }
            $.each(sections, function (i, s) {
                $container.append(
                    '<div class="col-6 col-md-4">' +
                    '  <div class="form-check">' +
                    '    <input class="form-check-input" type="checkbox" name="SelectedSectionIds" ' +
                    '           value="' + s.sectionID + '" id="sec_' + s.sectionID + '">' +
                    '    <label class="form-check-label" for="sec_' + s.sectionID + '">' + s.sectionName + '</label>' +
                    '  </div>' +
                    '</div>'
                );
            });
        }).fail(function () {
            $container.html('<div class="text-danger small">Failed to load sections</div>');
        });
    });

    // ---------- INDIVIDUAL: live search as you type ----------
    var searchTimer;
    var pendingSelection = null;

    $('#txtIndividualSearch').on('input', function () {
        clearTimeout(searchTimer);
        var term = $(this).val().trim();
        var roleId = $('#ddlIndividualRole').val();

        pendingSelection = null; // clear stale selection when user retypes

        if (term.length < 2) {
            $('#individualSearchResults').hide().empty();
            return;
        }

        searchTimer = setTimeout(function () {
            $.get('/DownloadCenter/SearchUsersByRole', { roleId: roleId, term: term })
                .done(function (results) {
                    var $box = $('#individualSearchResults').empty();
                    if (!results || results.length === 0) {
                        $box.append('<div class="list-group-item text-muted">No matches</div>').show();
                        return;
                    }
                    $.each(results, function (i, r) {
                        $box.append(
                            '<a href="#" class="list-group-item list-group-item-action search-result-item" ' +
                            '   data-referenceid="' + r.referenceID + '" data-name="' + r.displayName + '">' +
                            r.displayName + '</a>'
                        );
                    });
                    $box.show();
                })
                .fail(function (xhr) {
                    console.error('Search failed:', xhr.status, xhr.responseText);
                    $('#individualSearchResults')
                        .empty()
                        .append('<div class="list-group-item text-danger">Search failed - check console</div>')
                        .show();
                });
        }, 300);
    });

    // use mousedown, not click — fires BEFORE the input's blur hides the dropdown
    $(document).on('mousedown', '.search-result-item', function (e) {
        e.preventDefault();
        pendingSelection = {
            referenceId: $(this).data('referenceid'),
            name: $(this).data('name')
        };
        $('#txtIndividualSearch').val($(this).data('name'));
        $('#individualSearchResults').hide();
    });

    // hide dropdown when clicking elsewhere
    $(document).on('click', function (e) {
        if (!$(e.target).closest('#panelIndividual').length) {
            $('#individualSearchResults').hide();
        }
    });

    $('#btnAddIndividual').on('click', function () {
        var roleId = $('#ddlIndividualRole').val();
        var roleName = $('#ddlIndividualRole option:selected').text();

        if (!pendingSelection) {
            alert('Please search and select a person from the list first.');
            return;
        }

        var refId = pendingSelection.referenceId;
        var name = pendingSelection.name;

        if ($('#addedIndividualsList [data-refid="' + refId + '"][data-roleid="' + roleId + '"]').length > 0) {
            alert('Already added.');
            return;
        }

        $('#addedIndividualsList').append(
            '<div class="d-flex justify-content-between align-items-center border-bottom py-2" ' +
            '     data-refid="' + refId + '" data-roleid="' + roleId + '">' +
            '  <span><i class="fa fa-person-fill me-1"></i>' + name + ' <span class="text-muted">(' + roleName + ')</span></span>' +
            '  <button type="button" class="btn btn-sm text-danger remove-individual">' +
            '    <i class="fa fa-trash"></i></button>' +
            '</div>'
        );

        $('#hiddenIndividualInputs').append(
            '<input type="hidden" name="Individuals[' + refId + '_' + roleId + '].RoleID" value="' + roleId + '" />' +
            '<input type="hidden" name="Individuals[' + refId + '_' + roleId + '].ReferenceID" value="' + refId + '" />'
        );

        pendingSelection = null;
        $('#txtIndividualSearch').val('');
    });

    $(document).on('click', '.remove-individual', function () {
        var $row = $(this).closest('[data-refid]');
        var refId = $row.data('refid');
        var roleId = $row.data('roleid');
        $row.remove();
        $('input[name="Individuals[' + refId + '_' + roleId + '].RoleID"]').remove();
        $('input[name="Individuals[' + refId + '_' + roleId + '].ReferenceID"]').remove();
    });

    $('#txtFilterAdded').on('input', function () {
        var term = $(this).val().toLowerCase();
        $('#addedIndividualsList > div').each(function () {
            $(this).toggle($(this).text().toLowerCase().indexOf(term) > -1);
        });
    });
});