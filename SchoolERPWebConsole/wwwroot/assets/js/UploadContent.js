function triggerExport(index) {
    if ($.fn.DataTable.isDataTable('#tblContent')) {
        const table = $('#tblContent').DataTable();
        table.button(index).trigger();
    }
}
// ========================================
// Filter badges — sessionStorage persistence
// ========================================
const FILTER_KEY = 'appliedFilters_budget';
let appliedFilters = {};
try {
    const stored = sessionStorage.getItem(FILTER_KEY);
    if (stored) appliedFilters = JSON.parse(stored);
} catch (e) { appliedFilters = {}; }

function saveAppliedFilters() {
    try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(appliedFilters)); }
    catch (e) { console.warn('sessionStorage unavailable'); }
}

function clearAppliedFilters() {
    appliedFilters = {};
    try { sessionStorage.removeItem(FILTER_KEY); } catch (e) { }
}

function submitForm() {
    // Sync hidden form fields from dropdowns before submit
    
    const searchEl = document.getElementById('txtSearchInput');
    if (searchEl) document.getElementById('hdnSearch').value = searchEl.value;
    //document.getElementById('frmSearch').submit();
    const form = document.getElementById('frmSearch');
    const params = new URLSearchParams(new FormData(form)).toString();

    loadUploadContentPartial(params);
}

function applyFilters() {
    
    const searchEl = document.getElementById('txtSearchInput');

    const searchVal = searchEl?.value.trim();
    if (searchVal) appliedFilters['txtSearchInput'] = { label: 'Search', text: searchVal };
    else delete appliedFilters['txtSearchInput'];

    

    saveAppliedFilters();
    renderFilterBadges();   // ← was missing
}

function renderFilterBadges() {
    const container = document.getElementById('badgeContainer');
    const mainContainer = document.getElementById('activeFilterBadges');
    if (!container || !mainContainer) return;

    container.innerHTML = '';
    const activeCount = Object.keys(appliedFilters).length;

    Object.entries(appliedFilters).forEach(([id, { label, text }]) => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-primary-subtle text-primary border border-primary-subtle d-flex align-items-center gap-1 fw-medium px-2 py-1';
        badge.innerHTML = `${label}: ${text} <i class="ti ti-x ms-1 cursor-pointer" onclick="removeFilter('${id}')" style="font-size:10px;"></i>`;
        container.appendChild(badge);
    });

    mainContainer.style.display = activeCount > 0 ? 'block' : 'none';
}

function removeFilter(filterId) {
    if (filterId === 'txtSearchInput') {
        const el = document.getElementById('txtSearchInput');
        if (el) el.value = '';
        document.getElementById('hdnSearch').value = '';
    }
    delete appliedFilters[filterId];
    saveAppliedFilters();
    renderFilterBadges();   // ← was missing
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

function resetAllFilters() {
    document.getElementById('txtSearchInput').value = '';
    document.getElementById('hdnSearch').value = '';

    clearAppliedFilters();
    renderFilterBadges();   // ← was missing — "Clear All" now actually clears the badge row
    document.getElementById('hdnPageIndex').value = 1;
    submitForm();
}

// ========================================
// DOMContentLoaded — init DataTable + UI
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    var companyname = localStorage.getItem("comName");
    // ── DataTable (export only) ───────────────────────────────────────
    if ($.fn.DataTable.isDataTable('#tblContent')) {
        $('#tblContent').DataTable().destroy();
    }
    $.fn.dataTable.ext.errMode = 'none';
    window.exportTable = $('#tblContent').DataTable({
        dom: 'Bfrtip',
        buttons: [
            { extend: 'copy', title: `Content Type - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'csv', title: `Content Type - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'excel', title: `Content Type - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'pdf', title: `Content Type - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } },
            { extend: 'print', title: `Content Type - ${companyname}`, exportOptions: { columns: [1, 2, 3, 4] } }
        ],
        searching: false,
        paging: false,
        info: false,
        ordering: false
    });

   
   

    // ── Render badges on load ─────────────────────────────────────────
    clearAppliedFilters();
    renderFilterBadges();
});

// ========================================
// Search input — debounced server submit
// ========================================
let searchTimer = null;

document.getElementById('txtSearchInput')?.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        document.getElementById('hdnSearch').value = this.value;
        document.getElementById('hdnPageIndex').value = 1;
        const val = this.value.trim();
        if (val) appliedFilters['txtSearchInput'] = { label: 'Search', text: val };
        else delete appliedFilters['txtSearchInput'];
        saveAppliedFilters();
        renderFilterBadges();   // ← was missing — badge now updates live as you type/pause
        submitForm();
    }, 500);
});

$(document).ready(function () {
    //loadData();

    $(document).on('change', '.content-check', function () {
        const val = $(this).val();
        const checked = $(this).prop('checked');
        $(`.content-check[value="${val}"]`).prop('checked', checked);
        updateSelection();
    });

    $('#list-view-btn').click(function (e) {
        e.preventDefault();
        $('#card-v').addClass('d-none');
        $('#list-v').removeClass('d-none');
        $(this).addClass('active');
        $('#card-view-btn').removeClass('active');
        updateSelection();
    });

    $('#card-view-btn').click(function (e) {
        e.preventDefault();
        $('#list-v').addClass('d-none');
        $('#card-v').removeClass('d-none');
        $(this).addClass('active');
        $('#list-view-btn').removeClass('active');
        updateSelection();
    });
});

function loadData() {
    const search = $('#txtSearch').val();
    $.get('/DownloadCenter/GetContentList', { search }, function (res) {
        let listHtml = '';
        let cardHtml = '';
        if (res.success && res.data.length > 0) {
            res.data.forEach(item => {
                listHtml += `
                            <tr>
                                <td class="ps-3"><input type="checkbox" name="rowCheck" class="form-check-input content-check" value="${item.contentID}" data-title="${item.title}"></td>
                                <td>
                                    <div class="d-flex align-items-center">
                                        <i class="ti ti-${item.fileType == 'File' ? 'file-description' : 'brand-youtube'} me-2 text-${item.fileType == 'File' ? 'info' : 'danger'}"></i>
                                        <a href="${item.filePath}" target="_blank" class="">${item.title}</a>
                                    </div>
                                </td>
                                <td><span class="badge bg-light text-dark border fw-normal">${item.contentTypeName}</span></td>
                                <td>${item.fileType}</td>
                                <td>${item.fileSize}</td>
                                <td>${item.uploadBy}</td>
                                <td>${new Date(item.createdOn).toLocaleString('en-GB')}</td>
                            </tr>
                        `;

                cardHtml += `
                            <div class="col-xl-6 col-md-12 content-item-card">
                                <div class="card shadow-tbl-outer mb-2">
                                    <div class="card-body d-flex align-items-center flex-sm-nowrap flex-wrap row-gap-3 position-relative">
                                        <input type="checkbox" name="rowCheck" class="form-check-input content-check position-absolute" style="top:10px;left:10px;" value="${item.contentID}" data-title="${item.title}">
                                        <div class="me-3 d-flex align-items-center ps-3">
                                            <div class="file-icon-img d-flex align-items-center justify-content-center bg-light rounded" style="width: 60px; height: 60px;">
                                                <i class="ti ti-${item.fileType == 'File' ? 'file-description' : 'brand-youtube'} fs-1 text-${item.fileType == 'File' ? 'info' : 'danger'}"></i>
                                            </div>
                                        </div>
                                        <div class="flex-grow-1">
                                            <h6 class="mb-1 fs-15">
                                                <a href="${item.filePath}" target="_blank" class="text-primary">${item.title}</a>
                                            </h6>
                                            <div class="d-flex justify-content-between mb-1 gap-2">
                                                <div class="flex-fill">
                                                    <p class="mb-1 fs-13"><span class="text-dark">Type</span> : ${item.contentTypeName}</p>
                                                    <p class="mb-1 fs-13"><span class="text-dark">Format</span> : ${item.fileType}</p>
                                                    <p class="mb-1 fs-13"><span class="text-dark">Size</span> : ${item.fileSize}</p>
                                                </div>
                                                <div class="flex-fill">
                                                    <p class="mb-1 fs-13"><span class="text-dark">Upload By</span> : ${item.uploadBy}</p>
                                                    <p class="mb-1 fs-13"><span class="text-dark">Date</span> : ${new Date(item.createdOn).toLocaleDateString('en-GB')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
            });
        } else {
            listHtml = '<tr><td colspan="7" class="text-center py-4 text-muted">No content found.</td></tr>';
            cardHtml = '<div class="col-12 text-center py-4 text-muted">No content found.</div>';
        }
        $('#listBody').html(listHtml);
        $('#cardContainer').html(cardHtml);
        updateSelection();
    });
}

function toggleAllCheckboxes() {
    const isChecked = $('#checkAll').is(':checked');
    $('.content-check').prop('checked', isChecked);
    updateSelection();
}

function updateSelection() {
    const selected = $('#list-v:visible, #card-v:visible').find('.content-check:checked');
    $('#btnDelete').prop('disabled', selected.length === 0);

    let html = '';
    selected.each(function () {
        html += `<div class="p-1 border-bottom small"><i class="ti ti-check text-success me-1"></i> ${$(this).data('title')}</div>`;
    });
    $('#selList').html(html || '<span class="text-muted small">No documents selected.</span>');
    $('#selCount').text(selected.length);
}

function openUploadModal() {
    $('#uploadForm')[0].reset();
    $('#uploadModal').modal('show');
}

function clearLink() { $('#upLink').val(''); }
function clearFile() { $('#upFile').val(''); }

function isVideoFile(file) {
    const allowedExt = ['.mp4', '.mov', '.avi', '.wmv', '.webm', '.mkv', '.m4v'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    return file.type.startsWith('video/') || allowedExt.includes(ext);
}

function saveUpload() {
    const title = $('#upTitle').val().trim();
    const type = $('#upType').val();
    const file = $('#upFile')[0].files[0];
    const link = $('#upLink').val().trim();
    const companyID = $('#hdnCompanyID').val() || 0;

    // Reset errors
    $('#err-upTitle, #err-upType, #err-upFile, #err-upFileType').addClass('d-none');
    $('#upTitle, #upType, #upLink, #upFile').removeClass('is-invalid');

    let isValid = true;

    if (!title) {
        $('#err-upTitle').removeClass('d-none');
        $('#upTitle').addClass('is-invalid');
        isValid = false;
    }
    if (!type) {
        $('#err-upType').removeClass('d-none');
        $('#upType').addClass('is-invalid');
        isValid = false;
    }
    if (!file && !link) {
        $('#err-upFile').removeClass('d-none');
        $('#upLink').addClass('is-invalid');
        $('#upFile').addClass('is-invalid');
        isValid = false;
    }
    if (file && !isVideoFile(file)) {
        $('#err-upFileType').removeClass('d-none');
        $('#upFile').addClass('is-invalid');
        isValid = false;
    }

    if (!isValid) return;

    const formData = new FormData();
    formData.append('title', title);
    formData.append('contentTypeId', type);
    formData.append('companyid', companyID);
    if (file) formData.append('file', file);
    if (link) formData.append('videoLink', link);

    $.ajax({
        url: '/DownloadCenter/SaveUploadContent',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function (res) {
            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Saved!',
                    text: 'Upload & share content has been updated successfully.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-success' },
                    buttonsStyling: false
                }).then(() => {
                    window.location.href = '/DownloadCenter/UploadContent';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: res.message || 'Failed to save upload & share content.',
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-danger' },
                    buttonsStyling: false
                });
            }
        },
        error: function (xhr) {
            console.error('Upload request failed:', xhr.status, xhr.responseText);
            Swal.fire('Error!', 'An unexpected error occurred while saving.', 'error');
        }
    });
}

function clearLink() { $('#upLink').val(''); }
function clearFile() { $('#upFile').val(''); }

function openGenModal() {
    const selected = $('#list-v:visible, #card-v:visible').find('.content-check:checked');
    if (selected.length === 0) {
        Swal.fire('Selection Required', 'Please select at least one document to share.', 'warning');
        return;
    }
    $('#resultBox').addClass('d-none');
    $('#genModal').modal('show');
}

function generateLink() {
    const title = $('#genTitle').val().trim();

    // Reset errors
    $('#err-genTitle').addClass('d-none');
    $('#genTitle').removeClass('is-invalid');

    if (!title) {
        $('#err-genTitle').removeClass('d-none');
        $('#genTitle').addClass('is-invalid');
        return;
    }

    const ids = [];
    $('#list-v:visible, #card-v:visible').find('.content-check:checked').each(function () {
        ids.push(parseInt($(this).val()));
    });

    const data = {
        title: title,
        shareDate: $('#genDate').val(),
        validUpto: $('#genValid').val(),
        contentIDs: ids
    };

    $.ajax({
        url: '/DownloadCenter/GenerateSharedLink',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function (res) {
            if (res.success) {
                const publicUrl = window.location.origin + '/Public/SharedContent?token=' + res.token;
                $('#genResult').val(publicUrl);
                $('#resultBox').removeClass('d-none');
                showToast('Link generated successfully', 'success');
            } else {
                Swal.fire('Error!', res.message, 'error');
            }
        }
    });
}

function copyResult() {
    const el = document.getElementById('genResult');
    el.select();
    document.execCommand('copy');
    showToast('Link copied to clipboard', 'info');
}

function deleteSelected() {
    const selected = $('#list-v:visible, #card-v:visible').find('.content-check:checked');
    if (selected.length === 0) return;

    Swal.fire({
        title: 'Delete Selected?',
        text: `You are about to delete ${selected.length} items.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete!',
        customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-secondary' },
        buttonsStyling: false
    }).then((result) => {
        if (!result.isConfirmed) return;

        let completed = 0;
        let successCount = 0;
        let failMessages = [];
        const total = selected.length;

        selected.each(function () {
            const id = $(this).val();

            $.ajax({
                url: '/DownloadCenter/DeleteContent',
                type: 'POST',
                data: { id: id },
                success: function (res) {
                    if (res.success) {
                        successCount++;
                    } else {
                        failMessages.push(res.message || `Failed to delete item ${id}.`);
                    }
                },
                error: function () {
                    failMessages.push(`An unexpected error occurred deleting item ${id}.`);
                },
                complete: function () {
                    completed++;
                    if (completed === total) {
                        if (failMessages.length === 0) {
                            Swal.fire('Deleted!', `${successCount} item(s) deleted successfully.`, 'success')
                                .then(() => submitForm());
                        } else if (successCount > 0) {
                            Swal.fire('Partially Deleted', `${successCount} of ${total} item(s) deleted.\n${failMessages.join('\n')}`, 'warning')
                                .then(() => submitForm());
                        } else {
                            Swal.fire('Error!', failMessages.join('\n'), 'error');
                        }
                    }
                }
            });
        });
    });
}
// ========================================
// Partial reload — used by submitForm() for filter/search/pagination
// ========================================
function loadUploadContentPartial(queryString) {
    const container = document.getElementById('uploadContentContainer');
    if (!container) return;

    container.style.opacity = '0.5';

    fetch(`/DownloadCenter/GetUploadContentPartial?${queryString}`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to load subjects');
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            container.style.opacity = '1';
            updateButtonStates();
        })
        .catch(err => {
            console.error(err);
            container.style.opacity = '1';
            if (window.toast) window.toast.error('Could not refresh the list.');
        });
}

// ✅ Pagination click interception, scoped to the hostel type container
document.addEventListener('click', function (e) {
    const link = e.target.closest('#uploadContentContainer .page-link');
    if (!link || link.closest('.disabled')) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const query = href.split('?')[1] || '';
    document.getElementById('hdnPageIndex').value = new URLSearchParams(query).get('PageIndex') || 1;
    loadUploadContentPartial(query);
    history.replaceState(null, '', href);
});

// ========================================
// Helpers
// ========================================
function updateButtonStates() {
    const count = $('.student-checkbox:checked').length;
    $('#btnEdit').prop('disabled', count !== 1);
    $('#btnDelete').prop('disabled', count === 0);
    $('#btnActive').prop('disabled', count === 0);
    $('#btnInactive').prop('disabled', count === 0);
}
function goToGenerateUrl() {
    const selected = $('#list-v:visible, #card-v:visible').find('.content-check:checked');

    if (selected.length === 0) {
        Swal.fire('Selection Required', 'Please select at least one document to share.', 'warning');
        return;
    }

    const items = [];
    selected.each(function () {
        items.push({
            id: parseInt($(this).val()),
            title: $(this).data('title')
        });
    });

    try {
        sessionStorage.setItem('genSharedItems', JSON.stringify(items));
    } catch (e) {
        console.warn('sessionStorage unavailable', e);
    }

    window.location.href = '/DownloadCenter/GenerateURL';
}

function goToShareUrl() {
    const selected = $('#list-v:visible, #card-v:visible').find('.content-check:checked');

    if (selected.length === 0) {
        Swal.fire('Selection Required', 'Please select at least one document to share.', 'warning');
        return;
    }

    const items = [];
    selected.each(function () {
        items.push({
            id: parseInt($(this).val()),
            title: $(this).data('title')
        });
    });

    try {
        sessionStorage.setItem('genSharedItems', JSON.stringify(items));
    } catch (e) {
        console.warn('sessionStorage unavailable', e);
    }

    window.location.href = '/DownloadCenter/ShareURL';
}