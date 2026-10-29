(function ($) {
    'use strict';

    var cfg = window.PosConfig || {};
    var $dd = $('#filter-dropdown');

    var $class = $('#ddlClass');
    var $inst = $('#ddlInstallment');
    var $fee = $('#ddlFeeHead');
    var $trans = $('#ddlTransportHead');

    /* ---------- helpers ---------- */
    function getParam(name) {
        var v = new URLSearchParams(window.location.search).get(name);
        return v ? v.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : [];
    }

    function initSelect($el, placeholder) {
        $el.select2({
            width: '100%',
            placeholder: placeholder,
            allowClear: true,
            closeOnSelect: false,
            dropdownParent: $dd
        });
    }

    function fillSelect($el, items, selected) {
        $el.empty();
        (items || []).forEach(function (x) {
            var id = String(x.id !== undefined ? x.id : x.Id);
            var name = x.name !== undefined ? x.name : x.Name;
            $el.append(new Option(name, id, false, selected.indexOf(id) > -1));
        });
        $el.trigger('change.select2');
    }

    function csv($el) {
        return ($el.val() || []).join(',');
    }

    /* Company / Session come from _CompanySessionFilter partial (ids may differ – adjust if needed) */
    function getCompanyId() {
        var v = $('#ddlCompany').val() || $('#CompanyId').val();
        return v || $('#hdnCompanyId').val();
    }
    function getSessionId() {
        var v = $('#ddlSession').val() || $('#SessionId').val();
        return v || $('#hdnSessionID').val();
    }

    /* ---------- fee head loading ---------- */
    function loadHeads(url, $el, selected) {
        if (!url) return $.Deferred().resolve().promise();
        return $.getJSON(url, {
            companyId: $('#hdnCompanyId').val(),
            sessionId: $('#hdnSessionID').val()
        }).done(function (data) {
            fillSelect($el, data, selected);
        }).fail(function () {
            console.warn('Could not load heads from ' + url);
        });
    }

    /* ---------- badges ---------- */
    function renderBadges() {
        var $wrap = $('#badgeContainer').empty();
        var groups = [
            { label: 'Class', $el: $class },
            { label: 'Installment', $el: $inst },
            { label: 'Fee Head', $el: $fee },
            { label: 'Transport Head', $el: $trans }
        ];
        var count = 0;

        groups.forEach(function (g) {
            g.$el.find('option:selected').each(function () {
                count++;
                var $b = $('<span class="badge bg-primary-subtle text-primary border d-inline-flex align-items-center gap-1 fw-normal px-2 py-1"></span>')
                    .text(g.label + ': ' + $(this).text());
                $wrap.append($b);
            });
        });

        $('#activeFilterBadges').toggle(count > 0);
    }

    /* ---------- apply / reset ---------- */
    function applyFilters() {
        $('#hdnClassIds').val(csv($class));
        $('#hdnInstallments').val(csv($inst));
        $('#hdnFeeHeadIds').val(csv($fee));
        $('#hdnTransportHeadIds').val(csv($trans));

        var comp = getCompanyId();
        var sess = getSessionId();
        if (comp) $('#hdnCompanyId').val(comp);
        if (sess) $('#hdnSessionID').val(sess);

        $('#frmSearch').trigger('submit');
    }

    window.resetAllFilters = function () {
        $class.val(null).trigger('change');
        $inst.val(null).trigger('change');
        $fee.val(null).trigger('change');
        $trans.val(null).trigger('change');

        // reload page with no filters (company/session kept)
        $('#hdnClassIds, #hdnInstallments, #hdnFeeHeadIds, #hdnTransportHeadIds').val('');
        $('#frmSearch').trigger('submit');
    };

    /* ---------- client-side search ---------- */
    function applySearch() {
        var q = ($('#txtSearchInput').val() || '').toLowerCase().trim();
        var $rows = $('#tblPosition tbody tr.data-row');
        var shown = 0;

        $rows.each(function () {
            var match = !q || String($(this).data('search')).indexOf(q) > -1;
            $(this).toggle(match);
            if (match) shown++;
        });

        // "no match" row
        $('#tblPosition tbody tr.no-match').remove();
        if ($rows.length && shown === 0) {
            $('#tblPosition tbody').append(
                '<tr class="no-match"><td colspan="16" class="text-center text-muted py-3">No matching class / section.</td></tr>'
            );
        }
    }

    /* ---------- init ---------- */
    $(function () {
        var selClass = getParam('CLASSIDS');
        var selInst = getParam('INSTALLMENTLABELS');
        var selFee = getParam('FEEHEADIDS');
        var selTrans = getParam('TRANSPORTFEEHEADIDS');

        initSelect($class, 'Select class');
        initSelect($inst, 'Select installment');
        initSelect($fee, 'Select fee head');
        initSelect($trans, 'Auto-detect');

        // restore selections after page reload
        $class.val(selClass).trigger('change.select2');
        $inst.val(selInst).trigger('change.select2');

        //$.when(
        //    loadHeads(cfg.feeHeadUrl, $fee, selFee),
        //    loadHeads(cfg.transportHeadUrl, $trans, selTrans)
        //).always(renderBadges);

        $('#btnApplyFilters').on('click', applyFilters);
        $('#btnCloseFilter').on('click', function () {
            var el = document.getElementById('btnFilterToggle');
            var dd = window.bootstrap && bootstrap.Dropdown.getInstance(el);
            if (dd) dd.hide();
        });

        $('#txtSearchInput').on('input', applySearch);

        renderBadges();
    });

})(jQuery);