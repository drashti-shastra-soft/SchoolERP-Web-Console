// Expose the student id for the collect-fees modal partial script.
var studentId = $("#hdnStudentId").val();
$('#hdnStudentId').val(studentId);

// Header checkbox toggles all enabled row checkboxes.
$(document).on('change', '#chkAllFees', function () {
    $('.fee-check:not(:disabled)').prop('checked', this.checked);
});

// Placeholder for "Print Selected" - wire up to your print/report action.
$(document).on('click', '#btnPrintSelected', function () {
    var $rows = $('.fee-check:checked').closest('tr');
    if ($rows.length === 0) {
        Swal.fire('Select fees', 'Please tick at least one fee to print.', 'info');
        return;
    }
    // TODO: replace with your actual print/report endpoint, passing $rows.data('mapid') values.
    window.print();
});

// Single-row print icon - reuses the same placeholder logic for now.
$(document).on('click', '.btn-print-row', function () {
    window.print();
});

(function () {
    var modes = window.feePaymentModes || [
        { code: 'Cash', label: 'Cash' },
        { code: 'Cheque', label: 'Cheque', box: 'cheque' },
        { code: 'DD', label: 'DD', box: 'cheque' },
        { code: 'Bank Transfer', label: 'Bank Transfer', box: 'ref' },
        { code: 'UPI', label: 'UPI', box: 'ref' },
        { code: 'Card', label: 'Card', box: 'ref' },
        { code: 'Online', label: 'Online (Stripe)', online: true }
    ];

    var lines = [];   // {id (MapStudentsFeeId), detailId, group, code, amount, lateDate, lateAmt}

    function money(n) { return '₹' + (Number(n) || 0).toFixed(2); }
    function todayStr() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

    // Student / Parent can pay online only
    function availableModes() {
        var role = $("#hdnRole").val().toLowerCase();
        if (role === 'student' || role === 'parent') {
            return modes.filter(function (m) { return m.online; });
        }
        return modes;
    }

    function currentMode() {
        var list = availableModes();
        var c = $('input[name="cfMode"]:checked').val();
        return list.find(function (m) { return m.code === c; }) || list[0];
    }
    function fineFor(l) {
        // display only - the server always recomputes the real fine
        var d = $('#cfDate').val();
        return (l.lateDate && l.lateAmt > 0 && d && d > l.lateDate) ? l.lateAmt : 0;
    }

    function renderLines() {
        var html = '', fine = 0, total = 0;
        lines.forEach(function (l) {
            var f = fineFor(l);
            fine += f; total += l.amount + f;
            html += '<div class="d-flex justify-content-between mt-2">' +
                '<div><div class="fw-bold" style="color:#0f8bb5">' + $('<div>').text(l.group).html() + '</div>' +
                '<div class="text-muted small">' + $('<div>').text(l.code).html() + '</div></div>' +
                '<div style="color:#0f8bb5">' + money(l.amount) + '</div></div>';
        });
        $('#cfLines').html(html);
        $('#cfFine').text(money(fine));
        $('#cfTotal').text(money(total));
    }

    function renderModes() {
        var html = '';
        availableModes().forEach(function (m, i) {
            html += '<div class="form-check form-check-inline">' +
                '<input class="form-check-input" type="radio" name="cfMode" id="cfMode' + i + '" value="' + m.code + '"' + (i === 0 ? ' checked' : '') + '>' +
                '<label class="form-check-label" for="cfMode' + i + '">' + m.label + '</label></div>';
        });
        $('#cfModes').html(html);
    }
    function applyModeBoxes() {
        var m = currentMode();
        $('#cfChequeBox').toggleClass('d-none', m.box !== 'cheque');
        $('#cfRefBox').toggleClass('d-none', m.box !== 'ref');
        $('#cfOnlineBox').toggleClass('d-none', !m.online);
        $('#cfDate').prop('disabled', !!m.online);                   // online payments are dated by the gateway
        if (m.online) $('#cfDate').val(todayStr());
        $('#cfChequeNoLabel').text(m.code === 'DD' ? 'DD No' : 'Cheque No');
        $('#cfPay').html(m.online ? '<i class="fa fa-credit-card"></i> Pay Online' : '<i class="fa fa-money-bill"></i> Pay');
        renderLines();
    }

    function openModal($rows) {
        lines = $rows.map(function () {
            var $r = $(this);
            return {
                id: parseInt($r.data('mapid'), 10),           // MapStudentsFeeId (kept for reference)
                detailId: parseInt($r.data('detailid'), 10),  // FeeTemplateDetail.DetailId  <-- sent to server
                group: String($r.data('group') || ''),
                code: String($r.data('code') || ''),
                amount: parseFloat($r.data('amount')) || 0,
                lateDate: String($r.data('latedate') || '').substring(0, 10),
                lateAmt: parseFloat($r.data('lateamt')) || 0
            };
        }).get();

        renderModes();
        $('#cfDate').val(todayStr()).attr('max', todayStr()).removeClass('is-invalid');
        $('#cfNote, #cfChequeNo, #cfChequeDate, #cfBankName, #cfReferenceNo').val('');
        $('#cfPay').prop('disabled', false);
        applyModeBoxes();
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalCollectFees')).show();
    }

    // Row "+" button
    $(document).on('click', '.btn-collect-row', function () { openModal($(this).closest('tr')); });

    // "Collect Selected" button
    $(document).on('click', '#btnCollectSelected', function () {
        var $rows = $('.fee-check:checked').closest('tr');
        if ($rows.length === 0) { Swal.fire('Select fees', 'Please tick at least one unpaid fee.', 'info'); return; }
        openModal($rows);
    });

    $(document).on('click', '.btn-refund-row', function () {
        var collectionId = parseInt($(this).data('collec'), 10);
        var maxAmount = parseFloat($(this).data('paid')) || 0;

        Swal.fire({
            title: 'Refund payment',
            html:
                '<div class="text-start">' +
                '<label class="form-label">Amount (max ' + money(maxAmount) + ')</label>' +
                '<input id="swalRefundAmount" type="number" step="0.01" max="' + maxAmount + '" class="swal2-input" value="' + maxAmount + '">' +
                '<label class="form-label">Reason</label>' +
                '<input id="swalRefundReason" type="text" class="swal2-input" placeholder="Optional">' +
                '</div>',
            showCancelButton: true,
            confirmButtonText: 'Refund',
            preConfirm: function () {
                var amt = parseFloat($('#swalRefundAmount').val());
                if (!amt || amt <= 0 || amt > maxAmount) {
                    Swal.showValidationMessage('Enter an amount up to ' + money(maxAmount));
                    return false;
                }
                return { amount: amt, reason: $('#swalRefundReason').val() };
            }
        }).then(function (result) {
            if (!result.isConfirmed) return;

            $.ajax({
                url: '/StudentFees/Refund', type: 'POST', contentType: 'application/json',
                data: JSON.stringify({ CollectionId: collectionId, Amount: result.value.amount, Reason: result.value.reason }),
                success: function (res) {
                    if (res.success) {
                        Swal.fire({ title: 'Refunded', text: res.message, icon: 'success' }).then(function () { window.location.reload(); });
                    } else {
                        Swal.fire('Error!', res.message, 'error');
                    }
                },
                error: function () { Swal.fire('Error!', 'An unexpected error occurred.', 'error'); }
            });
        });
    });

    $(document).on('change', 'input[name="cfMode"]', applyModeBoxes);
    $(document).on('change input', '#cfDate', renderLines);

    // delegated, so it works even if the modal partial renders after this script
    $(document).on('click', '#cfPay', function () {
        var m = currentMode();
        var date = $('#cfDate').val();
        if (!date) { $('#cfDate').addClass('is-invalid'); return; }
        $('#cfDate').removeClass('is-invalid');
        if (m.box === 'cheque' && !$('#cfChequeNo').val().trim()) {
            Swal.fire('Required', ($('#cfChequeNoLabel').text()) + ' is required.', 'warning'); return;
        }

        // DetailId values (FeeTemplateDetail.DetailId), NOT MapStudentsFeeId
        var ids = lines.map(function (l) { return l.detailId; });
        if (!ids.length || ids.some(function (x) { return isNaN(x) || x <= 0; })) {
            Swal.fire('Error!', 'No valid fees selected (DetailId missing on the row).', 'error');
            return;
        }

        var studentId = parseInt($('#hdnStudentId').val(), 10);
        var $btn = $(this).prop('disabled', true);

        if (m.online) {
            $.ajax({
                url: '/StudentFees/StartOnline', type: 'POST', contentType: 'application/json',
                data: JSON.stringify({ StudentId: studentId, GatewayName: null, DetailIds: ids }),
                success: function (res) {
                    if (res.success && res.url) { window.location.href = res.url; return; }
                    $btn.prop('disabled', false);
                    Swal.fire('Error!', res.message || 'Could not start online payment.', 'error');
                },
                error: function () { $btn.prop('disabled', false); Swal.fire('Error!', 'Could not start online payment.', 'error'); }
            });
            return;
        }

        $.ajax({
            url: '/StudentFees/CollectOffline', type: 'POST', contentType: 'application/json',
            data: JSON.stringify({
                StudentId: studentId,
                PaymentDate: date,
                PaymentMode: m.code,
                Note: $('#cfNote').val(),
                ChequeNo: $('#cfChequeNo').val() || null,
                ChequeDate: $('#cfChequeDate').val() || null,
                BankName: $('#cfBankName').val() || null,
                ReferenceNo: $('#cfReferenceNo').val() || null,
                DetailIds: ids
            }),
            success: function (res) {
                $btn.prop('disabled', false);
                if (res.success) {
                    bootstrap.Modal.getInstance(document.getElementById('modalCollectFees')).hide();
                    Swal.fire({ title: 'Success!', text: res.message, icon: 'success' }).then(function () { window.location.reload(); });
                } else {
                    Swal.fire('Error!', res.message, 'error');
                }
            },
            error: function () { $btn.prop('disabled', false); Swal.fire('Error!', 'An unexpected error occurred.', 'error'); }
        });
    });
})();