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

    const data = {
        title: title,
        shareDate: $('#genDate').val(),
        validUpto: $('#genValid').val(),
        contentIDs: items.map(i => i.id)
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

                // Clear the selection now that the link has been generated
                try { sessionStorage.removeItem('genSharedItems'); } catch (e) { }
            } else {
                Swal.fire('Error!', res.message || 'Failed to generate link.', 'error');
            }
        },
        error: function (xhr) {
            console.error('Generate link failed:', xhr.status, xhr.responseText);
            Swal.fire('Error!', 'An unexpected error occurred.', 'error');
        }
    });
}

function copyResult() {
    const el = document.getElementById('genResult');
    el.select();
    document.execCommand('copy');
    showToast('Link copied to clipboard', 'info');
}


