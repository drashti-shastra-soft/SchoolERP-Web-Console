$(document).ready(function () {
    // Keep the tabs bar pinned directly below the toolbar, even if the
    // toolbar wraps to two lines on small screens.
    function positionTabsBar() {
        var toolbarHeight = $('.sticky-toolbar').outerHeight() || 0;
        $('#tabsStickyBar').css('top', toolbarHeight + 'px');
    }
    positionTabsBar();
    $(window).on('resize', positionTabsBar);

    // ================================================================
    // Live (real-time) inline field validation.
    // Runs as the user types/blurs, writing the message straight into
    // each field's existing .invalid-feedback div and toggling
    // is-invalid / is-valid — no popup, no waiting for Save.
    // ================================================================

    //$(document).on('change', 'input[name="If Guardian Address Is Current Address"]', function () {
    //    if ($(this).is(':checked')) {
    //        $('textarea[name="CurrentAddress"]').val($('input[name="Guardian Address"], textarea[name="Guardian Address"]').val());
    //    }
    //});
    //$(document).on('input', 'input[name="Guardian Address"], textarea[name="Guardian Address"]', function () {
    //    if ($('input[name="If Guardian Address Is Current Address"]').is(':checked')) {
    //        $('textarea[name="CurrentAddress"]').val($(this).val());
    //    }
    //});


    function getRequiredFieldMessage(name) {
        var lower = (name || '').toLowerCase();
        if (lower === 'dob' || lower.includes('date of birth')) return 'Date of Birth is required.';
        if (lower === 'mobile' || lower === 'mobile no' || lower === 'mobile number') return 'Mobile Number is required.';
        return name + ' is required.';
    }
    function fieldFeedback($input) {
        var $wrap = $input.closest('.mb-3');
        var $fb = $wrap.find('.invalid-feedback').last();
        return $fb.length ? $fb : $input.siblings('.invalid-feedback');
    }

    function setFieldState($input, isValid, message) {
        var $fb = fieldFeedback($input);
        if (isValid) {
            $input.removeClass('is-invalid').addClass('is-valid');
            $fb.css('display', 'none');
        } else {
            $input.removeClass('is-valid').addClass('is-invalid');
            if ($fb.length && message) $fb.text(message);
            $fb.css('display', 'block');
        }
    }

    // Returns true/false; also updates the UI for the given input.
    function validateFieldLive(input) {
        var $input = $(input);
        var name = $input.attr('name') || '';
        var lowerName = name.toLowerCase();
        var val = $input.val();

        // Respect native "required": empty required fields are flagged,
        // empty optional fields are simply left neutral (no red/green).
        if (!val) {
            if (input.hasAttribute('required')) {
                setFieldState($input, false, getRequiredFieldMessage(name));
                return false;
            }
            $input.removeClass('is-invalid is-valid');
            return true;
        }

        var isValid = true;
        var message = '';
        var today = new Date(); today.setHours(0, 0, 0, 0);

        if (lowerName.includes('mobile') || lowerName.includes('phone') || lowerName.includes('contact')) {
            if (!/^[6-9][0-9]{9}$/.test(val)) {
                isValid = false;
                message = 'Enter a valid 10-digit mobile number (must start with 6-9).';
            }
        } else if (lowerName.includes('email')) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                isValid = false;
                message = 'Enter a valid email address.';
            }
        } else if (lowerName.includes('dob') || lowerName.includes('date of birth')) {
            var dob = new Date(val);
            if (isNaN(dob.getTime()) || dob > today) {
                isValid = false;
                message = 'Date of Birth cannot be a future date.';
            }
        } else if (lowerName.includes('admission date')) {
            var adm = new Date(val);
            if (isNaN(adm.getTime()) || adm > today) {
                isValid = false;
                message = 'Admission Date cannot be a future date.';
            }
        } else if (lowerName === 'caste') {
            if (!/^[A-Za-z .'-]{2,50}$/.test(val)) {
                isValid = false;
                message = 'Enter a valid Caste (letters only).';
            }
        } else if (lowerName === 'height') {
            var h = parseFloat(val);
            if (isNaN(h) || h < 30 || h > 250) {
                isValid = false;
                message = 'Enter a valid Height in cm (between 30 and 250).';
            }
        } else if (lowerName === 'weight') {
            var w = parseFloat(val);
            if (isNaN(w) || w < 2 || w > 200) {
                isValid = false;
                message = 'Enter a valid Weight in kg (between 2 and 200).';
            }
        } else if (lowerName.includes('bank account')) {
            if (!/^[0-9]{9,18}$/.test(val)) {
                isValid = false;
                message = 'Enter a valid Bank Account Number (9-18 digits).';
            }
        } else if (lowerName.includes('ifsc')) {
            if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(val.toUpperCase())) {
                isValid = false;
                message = 'Enter a valid IFSC Code (e.g. SBIN0001234).';
            }
        } else if (lowerName.includes('national identification') || lowerName.includes('national id')) {
            if (!/^[A-Za-z0-9]{4,20}$/.test(val)) {
                isValid = false;
                message = 'Enter a valid National Identification Number.';
            }
        } else if (lowerName.includes('local identification') || lowerName.includes('local id')) {
            if (!/^[A-Za-z0-9]{4,20}$/.test(val)) {
                isValid = false;
                message = 'Enter a valid Local Identification Number.';
            }
        } else if (input.willValidate) {
            // Fall back to whatever native constraints (pattern/min/max/etc.)
            // are already on the element, e.g. via RenderField.
            isValid = input.checkValidity();
            message = input.validationMessage || ('Please provide a valid ' + name + '.');
        }

        setFieldState($input, isValid, message);
        return isValid;
    }

    var liveValidationSelector = '#admissionForm input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), #admissionForm select';

    // Delegated so it also covers cascaded fields (Section, Pickup Point, Room No, etc.).
    $(document).on('input blur change', liveValidationSelector, function () {
        validateFieldLive(this);
    });

    // Runs every relevant field through live validation; returns true only if all pass.
    // Used on submit instead of a popup summary.
    function validateAllFieldsLive() {
        var allValid = true;
        $(liveValidationSelector).each(function () {
            if (!validateFieldLive(this)) {
                allValid = false;
            }
        });
        return allValid;
    }

    // ================================================================
    // Sibling / Parent-link helpers
    // ================================================================

    // Puts the form into "linked to an existing parent" state: locks the
    // parent auth fields (they belong to the sibling's account, not a new
    // one) and surfaces the badge + Unlink button.
    function setParentLinkedState(parentUserId) {
        $('#hdnParentUserID').val(parentUserId || 0);
        $('input[name="Parent Username"]').prop('readonly', true);
        $('input[name="Parent Password"]').prop('readonly', true);
        $('#siblingLinkedBadge').removeClass('d-none');
        $('#btnUnlinkSibling').removeClass('d-none');
    }

    // Reverts back to "create a new parent account" state.
    function clearParentLinkedState() {
        $('#hdnParentUserID').val(0);

        // Father / Mother — Name, Phone, Mobile, Occupation
        ['Father', 'Mother'].forEach(function (who) {
            $('input[name="' + who + ' Name"]').val('');
            $('input[name="' + who + ' Phone"]').val('');
            $('input[name="' + who + ' Mobile"]').val('');
            $('input[name="' + who + ' Occupation"]').val('');
        });

        // Guardian radio selection
        $('.rb-guardian-type').prop('checked', false);

        // Guardian Name/Phone/Mobile/Occupation/Email
        $('input[name="Guardian Name"]').val('');
        $('input[name="Guardian Phone"]').val('');
        $('input[name="Guardian Mobile"]').val('');
        $('input[name="Guardian Occupation"]').val('');
        $('input[name="Guardian Email"]').val('');

        // Guardian Relation — also undo the readonly lock applied when
        // Father/Mother was selected as guardian
        $('#txtGuardianRelation').val('').prop('readonly', false);

        // Addresses copied from the sibling
        $('textarea[name="CurrentAddress"]').val('');
        $('textarea[name="PermanentAddress"]').val('');

        // Parent auth
        $('input[name="Parent Username"]').val('').prop('readonly', false);
        $('input[name="Parent Password"]').val('').prop('readonly', false);

        $('#siblingLinkedBadge').addClass('d-none');
        $('#btnUnlinkSibling').addClass('d-none');
    }

    // If this form loaded already carrying a ParentUserID (e.g. editing a
    // student that was previously linked), reflect that in the UI too.
    if (parseInt($('#hdnParentUserID').val() || 0) > 0 && $('#hdnIsEdit').val() !== 'true') {
        setParentLinkedState($('#hdnParentUserID').val());
    }

    $('#btnUnlinkSibling').on('click', function () {
        clearParentLinkedState();
        $('input[name="Parent Username"]').val('');
        $('input[name="Parent Password"]').val('');
        Swal.fire({
            title: 'Unlinked',
            text: 'This student will now get its own separate parent login.',
            icon: 'info',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2500
        });
    });

    // Sibling Modal Logic
    $('#siblingClass').on('change', function () {
        var classId = $(this).val();
        var $section = $('#siblingSection');
        $section.empty().append('<option value="">Select Section</option>');
        $('#siblingStudent').empty().append('<option value="">Select Student</option>');
        $('#siblingPreview').addClass('d-none');
        $('#btnLinkSibling').prop('disabled', true);

        if (classId) {
            console.log("Fetching sections for sibling class:", classId);
            $.getJSON('/StudentInformation/GetSections', { classId: classId }, function (data) {
                console.log("Sections received:", data);
                $.each(data, function (i, item) {
                    $section.append($('<option>', { value: item.id, text: item.name }));
                });
            });
        }
    });

    $('#siblingSection').on('change', function () {
        var classId = $('#siblingClass').val();
        var sectionId = $(this).val();
        var $student = $('#siblingStudent');
        $student.empty().append('<option value="">Select Student</option>');
        $('#btnLinkSibling').prop('disabled', true);

        if (classId && sectionId) {
            var excludeId = $('#hdnStudentID').val();
            $.getJSON('/StudentInformation/GetStudentList', {
                classId: classId,
                sectionId: sectionId,
                excludeStudentId: excludeId
            }, function (data) {
                $.each(data, function (i, item) {
                    var display = item.fullName + (item.rollNo ? ' (' + item.rollNo + ')' : '');
                    $student.append($('<option>', { value: item.studentID, text: display }));
                });
            });
        }
    });

    $('#siblingStudent').on('change', function () {
        var studentId = $(this).val();
        if (studentId) {
            $.getJSON('/StudentInformation/GetStudentDetails', { id: studentId }, function (data) {
                if (data && data.basicInfo) {
                    $('#btnLinkSibling').prop('disabled', false).data('student', data);
                }
            });
        } else {
            $('#btnLinkSibling').prop('disabled', true);
        }
    });

    $('#btnLinkSibling').on('click', function () {
        var data = $(this).data('student');
        if (data && data.basicInfo) {
            var b = data.basicInfo;

            // Link via ParentUserID — reuse the sibling's existing parent
            // account instead of creating a new one on save.
            setParentLinkedState(b.parentUserID || 0);

            // Auto-fill Parent Info
            $('input[name="Father Name"]').val(b.fatherName);
            $('input[name="Father Phone"]').val(b.fatherPhone);
            $('input[name="Father Mobile"]').val(b.fatherPhone);
            $('input[name="Father Occupation"]').val(b.fatherOccupation);

            $('input[name="Mother Name"]').val(b.motherName);
            $('input[name="Mother Phone"]').val(b.motherPhone);
            $('input[name="Mother Mobile"]').val(b.motherPhone);
            $('input[name="Mother Occupation"]').val(b.motherOccupation);

            // Guardian Info
            if (b.ifGuardianIs) {
                $('.rb-guardian-type[value="' + b.ifGuardianIs + '"]').prop('checked', true).trigger('change');
            }
            $('input[name="Guardian Name"]').val(b.guardianName);
            $('input[name="Guardian Phone"]').val(b.guardianPhone);
            $('input[name="Guardian Mobile"]').val(b.guardianPhone);
            $('input[name="Guardian Occupation"]').val(b.guardianOccupation);
            $('input[name="Guardian Relation"]').val(b.guardianRelation);
            $('input[name="Guardian Email"]').val(b.guardianEmail);

            // Addresses
            if (data.addresses && data.addresses.length > 0) {
                var current = data.addresses.find(a => a.addressType === 'Current');
                var permanent = data.addresses.find(a => a.addressType === 'Permanent');
                if (current) $('textarea[name="CurrentAddress"]').val(current.addressDetails);
                if (permanent) $('textarea[name="PermanentAddress"]').val(permanent.addressDetails);
            }

            // User Auth — shown read-only since it belongs to the linked parent account
            $('input[name="Parent Username"]').val(b.parentUsername);
            $('input[name="Parent Password"]').val(b.parentPassword);

            $('#modalSibling').modal('hide');
            Swal.fire({
                title: 'Linked!',
                text: 'Sibling details have been copied. Both students will share the same parent account.',
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        }
    });

    // Transport Cascading
    $('#ddlRoute').change(function () {
        var selectedOption = $(this).find('option:selected');
        var routeId = selectedOption.data('routeid');
        $('#hdnTransportRouteID').val(routeId || '');

        var $pickup = $('#ddlPickupPoint');
        var selectedVal = $pickup.data('selected');
        $pickup.html('<option value="">Select Pickup Point</option>');
        if (routeId) {
            $.getJSON('/StudentInformation/GetPickupPoints', { routeId: routeId }, function (data) {
                $.each(data, function (i, item) {
                    var isSelected = (selectedVal == item.id) ? true : false;
                    $pickup.append($('<option>', { value: item.id, text: item.name, selected: isSelected }));
                });
                $pickup.attr('data-selected', ''); // Clear after use
            });
        }
    });

    // Hostel Cascading
    $('#ddlHostel').change(function () {

        var hostelId = $(this).val();
        var $room = $('#ddlHostelRoom');

        var selectedVal = $room.attr('data-selected');

        $room.html('<option value="">Select Room</option>');

        if (hostelId) {

            $.getJSON(
                '/StudentInformation/GetHostelRooms',
                { hostelId: hostelId },
                function (response) {

                    if (response.success && response.data) {

                        $.each(response.data, function (i, item) {

                            var isSelected = selectedVal == item.id;

                            $room.append(
                                $('<option>', {
                                    value: item.id,
                                    text: item.name,
                                    selected: isSelected
                                })
                            );

                        });

                    }

                    $room.attr('data-selected', '');
                }
            );
        }
    });

    // Guardian Selection Logic
    $(document).on('change', '.rb-guardian-type', function () {
        var val = $(this).val();
        if (val === 'Father' || val === 'Mother') {
            $('#txtGuardianRelation').val(val).prop('readonly', true);

            // Copy fields
            $('input[name="Guardian Name"]').val($('input[name="' + val + ' Name"]').val());

            var phone = $('input[name="' + val + ' Phone"]').val() || $('input[name="' + val + ' Mobile"]').val();
            var mobile = $('input[name="' + val + ' Mobile"]').val() || $('input[name="' + val + ' Phone"]').val();

            $('input[name="Guardian Phone"]').val(phone);
            $('input[name="Guardian Mobile"]').val(mobile);
            $('input[name="Guardian Occupation"]').val($('input[name="' + val + ' Occupation"]').val());
        } else {
            $('#txtGuardianRelation').val('').prop('readonly', false).focus();
            $('input[name="Guardian Name"]').val('');
            $('input[name="Guardian Phone"]').val('');
            $('input[name="Guardian Mobile"]').val('');
            $('input[name="Guardian Occupation"]').val('');
        }
    });

    // Sync Guardian if Father/Mother details change while they are selected as guardian
    $(document).on('input', 'input[name^="Father "], input[name^="Mother "]', function () {
        var selectedGuardian = $('.rb-guardian-type:checked').val();
        var fieldName = $(this).attr('name');
        if (fieldName.startsWith(selectedGuardian)) {
            var suffix = fieldName.substring(selectedGuardian.length); // e.g. " Name"
            $('input[name="Guardian' + suffix + '"]').val($(this).val());
        }
    });

    // Class -> Section Cascading
    $('#ddlClass').change(function () {
        var classId = $(this).val();
        var $section = $('#ddlSection');
        var selectedVal = $section.data('selected');
        $section.html('<option value="">Select Section</option>');
        if (classId) {
            $.getJSON('/StudentInformation/GetSections', { classId: classId }, function (data) {
                $.each(data, function (i, item) {
                    var isSelected = (selectedVal == item.id) ? true : false;
                    $section.append($('<option>', { value: item.id, text: item.name, selected: isSelected }));
                });
                $section.attr('data-selected', ''); // Clear after use
                maybeLoadFeeTemplates();
            });
        } else {
            maybeLoadFeeTemplates();       // clears the fees tab when Class is cleared
        }
    });
    const isEdit = $('#hdnIsEdit').val() === 'true';
    const isRollAutoGenerated = $('#hdnIsRollAutoGenerated').val() === 'true';
    // If in edit mode, trigger cascading loads
    if (isEdit) {
        if ($('#ddlClass').val()) $('#ddlClass').trigger('change');
        if ($('#ddlRoute').val()) $('#ddlRoute').trigger('change');
        if ($('#ddlHostel').val()) $('#ddlHostel').trigger('change');
    }

    // Auto ID Dependencies
    var dependencies = '@(ViewBag.RollNoDependencies ?? "")'.split(',').map(s => s.trim()).filter(s => s !== "");
    if (dependencies.length > 0 && isRollAutoGenerated) {
        $(document).on('change', '.mb-3[data-fieldname] select, .mb-3[data-fieldname] input', function () {
            var fieldName = $(this).closest('.mb-3').data('fieldname');
            if (dependencies.includes(fieldName)) {
                refreshRollNo();
            }
        });
    }

    function refreshRollNo() {
        var formData = {};
        $('.mb-3[data-fieldname]').each(function () {
            var fieldName = $(this).data('fieldname');
            var val = $(this).find('select, input').val();
            if (val) formData[fieldName] = val;
        });

        $.getJSON('/StudentInformation/GetNextRollNo', formData, function (res) {
            if (res.rollNo) {
                $('input[name="Roll No"], input[name="RollNo"]').val(res.rollNo);
            }
        });
    }

    // Form Submit
    $('#admissionForm').on('submit', async function (e) {
        e.preventDefault();

        var form = this;

        // 1) Native constraints (required / pattern / min / max already on the markup).
        var nativeValid = form.checkValidity();
        $(form).addClass('was-validated');

        // 2) Extra business-rule checks (caste, height/weight ranges, bank/IFSC/ID formats, etc.)
        //    that aren't expressible as plain HTML5 attributes. This also re-paints every
        //    field's inline .invalid-feedback text, so nothing is left showing a stale message.
        var extraValid = validateAllFieldsLive();

        if (!nativeValid || !extraValid) {
            var $firstInvalid = $(form).find('.is-invalid, :invalid').first();
            if ($firstInvalid.length > 0) {
                var tabPane = $firstInvalid.closest('.tab-pane');
                if (tabPane.length > 0) {
                    var tabId = tabPane.attr('id');
                    $('.nav-link[href="#' + tabId + '"]').tab('show');
                }
                $firstInvalid.trigger('focus');
            }
            // No popup — every offending field already shows its own inline message.
            return;
        }

        // Collect checked fee templates -> "5,2,1,7"
        // Collect DetailIds (not FeeTemplateIds) from every CHECKED template,
        // merged into one flat CSV, e.g. checked templates with detailids
        // "1,2" and "5,6" -> "1,2,5,6".
        var feeTemplateIds = $('#feesTemplateContainer .fees-template-checkbox:checked')
            .map(function () {
                return ($(this).data('detailids') || '').toString();
            })
            .get()
            .filter(function (csv) { return csv !== ''; })
            .join(',');

        var formData = {
            StudentID: parseInt($('#hdnStudentID').val() || 0),
            // Sibling link: 0 means "create a new parent account as usual";
            // > 0 means "attach this student to that existing parent instead".
            ParentUserID: parseInt($('#hdnParentUserID').val() || 0),
            RollNo: "",
            // Comma separated FeeTemplateIds. null = don't touch fee mappings.
            FeeTemplateId: feeTemplateIds || null,
            FieldValues: {}
        };

        var checkboxGroups = {};
        $('#admissionForm').find('input[type="checkbox"]').each(function () {
            var n = $(this).attr('name');
            if (!n) return;
            checkboxGroups[n] = (checkboxGroups[n] || 0) + 1;
        });

        var inputPromises = [];
        $('#admissionForm').find('input, select, textarea').each(function () {
            var input = $(this);
            var name = input.attr('name');
            if (!name) return;

            if (input.attr('type') === 'file') {
                if (this.files && this.files.length > 0) {
                    var promise = new Promise((resolve) => {
                        var reader = new FileReader();
                        reader.onload = function (e) {
                            formData.FieldValues[name] = e.target.result.split(',')[1];
                            formData.FieldValues[name + " Name"] = input.val().split('\\').pop();
                            formData.FieldValues[name + " Type"] = input[0].files[0].type;
                            resolve();
                        };
                        reader.readAsDataURL(this.files[0]);
                    });
                    inputPromises.push(promise);
                }
            } else if (input.attr('type') === 'radio') {
                if (input.is(':checked')) {
                    formData.FieldValues[name] = input.val();
                }
            } else if (input.attr('type') === 'checkbox') {
                if (checkboxGroups[name] > 1) {
                    // Multi-select checkbox list (e.g. field.FieldValues has multiple options):
                    // collect only the checked ones, once per name, as a comma-separated string.
                    if (!formData.FieldValues.hasOwnProperty(name)) {
                        var checkedVals = $('#admissionForm')
                            .find('input[type="checkbox"][name="' + name + '"]:checked')
                            .map(function () { return $(this).val(); }).get();
                        formData.FieldValues[name] = checkedVals.join(',');
                    }
                } else {
                    // Single toggle checkbox (e.g. RTE): send its actual checked state,
                    // not its (always-empty) value attribute.
                    formData.FieldValues[name] = input.is(':checked') ? 'true' : 'false';
                }
            } else {
                formData.FieldValues[name] = input.val();
            }
        });

        await Promise.all(inputPromises);

        function selText(sel) {
            var $o = $(sel).find('option:selected');
            return $o.val() ? $o.text().trim() : '';
        }

        formData.Addresses = ['Current', 'Permanent'].map(function (t) {
            var street = ($('#txt' + t + 'Address').val() || '').trim();
            var pin = ($('#txt' + t + 'PinCode').val() || '').trim();
            var country = selText('#ddl' + t + 'Country');
            var state = selText('#ddl' + t + 'State');
            var city = selText('#ddl' + t + 'City');

            return {
                AddressType: t,
                AddressDetails: street,
                PostalCode: pin,
                CountryId: parseInt($('#ddl' + t + 'Country').val()) || null,
                StateId: parseInt($('#ddl' + t + 'State').val()) || null,
                CityId: parseInt($('#ddl' + t + 'City').val()) || null,
                FullAddress: [street, city, state, country].filter(Boolean).join(', ')
                    + (pin ? ' - ' + pin : '')
            };
        });

        if (!formData.RollNo) {
            formData.RollNo = formData.FieldValues["Roll No"] || formData.FieldValues["RollNo"] || "";
        }
        var id = $('#hdnStudentID').val();
        const isEdit = id > 0;
        $.ajax({
            url: '/StudentInformation/SaveStudent',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function (res) {
                if (res.success) {
                    Swal.fire({
                        title: 'Success!',
                        text: isEdit
                            ? 'Student has been updated successfully.'
                            : 'Student has been added successfully.',
                        icon: 'success',
                        confirmButtonText: 'OK'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = '/StudentInformation/Students';
                        }
                    });
                } else {
                    Swal.fire('Error!', res.message, 'error');
                }
            },
            error: function () {
                Swal.fire('Error!', 'An unexpected error occurred while saving.', 'error');
            }
        });
    });
});

// Remove an already-uploaded photo (mirrors the Attachment remove-file UX)
$(document).on('click', '.remove-existing-file', function () {
    var fieldKey = $(this).data('target');
    $('#row_' + fieldKey).addClass('d-none');
    $('#hdn_' + fieldKey + '_Remove').val('true');
});

// If the user picks a NEW file after seeing the old one, the removal is implicit
// (new file replaces it) — hide the old link and reset the remove flag so the
// backend doesn't try to delete something that's about to be overwritten anyway.
$(document).on('change', 'input[type="file"][data-photo-field]', function () {
    var fieldKey = $(this).data('photo-field');
    if (this.files && this.files.length > 0) {
        $('#hdn_' + fieldKey + '_Remove').val('false');
        $('#row_' + fieldKey).addClass('d-none');
    }
});


// ================================================================
// Fees tab — dynamic, driven off Class + Section
// ================================================================

function maybeLoadFeeTemplates() {
    var classId = $('#ddlClass').val();
    var sectionId = $('#ddlSection').val();

    if (classId && sectionId) {
        loadFeeTemplatesForFeesTab(classId, sectionId);
    } else {
        $('#feesTemplateContainer').html(
            '<div class="text-muted small p-2">Select a Class and Section to view applicable fees.</div>'
        );
    }
}

function loadFeeTemplatesForFeesTab(classId, sectionId) {
    var $container = $('#feesTemplateContainer');
    $container.html('<div class="text-muted small p-2">Loading fees...</div>');

    var payload = {
        CLASSID: parseInt(classId, 10),
        SECTIONID: parseInt(sectionId, 10),
        COMPANYID: 0,
        SESSIONID: 0,
        CATEGORYID: null,
        ADMISSIONTYPE: null,
        INSTALLMENTID: null
    };

    $.ajax({
        // TODO: confirm this is the right controller route for your project —
        // the action you pasted lives wherever FeeTemplateController.GetFeeTemplateByClassSection
        // is actually routed (e.g. '/FeeTemplate/GetFeeTemplateByClassSection').
        url: '/StudentInformation/GetFeeTemplateByClassSection',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function (res) {
            if (!res || !res.success || !res.data || res.data.length === 0) {
                $container.html('<div class="text-muted small p-2">No fee template found for this Class / Section.</div>');
                return;
            }
            renderFeeTemplateGroups(res.data);
        },
        error: function () {
            $container.html('<div class="text-danger small p-2">Failed to load fee templates.</div>');
        }
    });
}

function formatDueDate(raw) {
    if (raw == null) {
        return '-';
    }
    var d = new Date(raw);
    if (isNaN(d.getTime())) return raw || '-';
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    return dd + '-' + mm + '-' + d.getFullYear();
}
var detailsIds = [];
// Renders one collapsible group per Class (a class-checkbox header + a
// Fees Type / Due Date / Amount table underneath), matching the
// screenshot layout. Since one CLASSID+SECTIONID request is already
// scoped to a single class, this is usually one group — written
// generically in case a future call widens the request.
function renderFeeTemplateGroups(templates) {
    var $container = $('#feesTemplateContainer');
    $container.empty();

    // Outer grouping stays by Class, in case a future request ever spans
    // more than one class — but the checkbox/collapse unit below is now
    // the TEMPLATE, not the class.
    var classGroups = {};
    templates.forEach(function (t) {
        var key = t.classid;
        if (!classGroups[key]) {
            classGroups[key] = { className: t.classname, total: 0, templates: [] };
        }
        classGroups[key].total += (t.totalamount || 0);
        classGroups[key].templates.push(t);
    });

    var classIdx = 0;
    $.each(classGroups, function (classId, classGroup) {
        classIdx++;
        var classCollapseId = 'fcls_' + classId + '_' + classIdx;

        var $classHeader = $(
            '<button type="button" class="btn btn-outline-primary d-flex justify-content-between align-items-center w-100 mb-1 fees-class-toggle" ' +
            'data-bs-toggle="collapse" data-bs-target="#' + classCollapseId + '">' +
            '<span><input type="checkbox" class="form-check-input me-2 fees-class-checkbox" data-classid="' + classId + '" onclick="event.stopPropagation()"> ' + classGroup.className + '</span>' +
            '<span class="fw-bold">' + classGroup.total.toFixed(2) + '</span>' +
            '</button>'
        );

        var $classBody = $('<div class="collapse show" id="' + classCollapseId + '"></div>');

        // One block per TEMPLATE — this is now the header/selectable unit.
        classGroup.templates.forEach(function (t, tIdx) {
            var templateCollapseId = 'ftpl_' + t.feetemplateid + '_' + classIdx + '_' + tIdx;

            // TODO: label source still unconfirmed — falling back through
            // remark, then Admission Type + Installment.
            var label = t.remark
                ? t.remark
                : (t.admissiontype ? (t.admissiontype + ' - Installment ' + t.installmentid) : ('Installment ' + t.installmentid));

            // Parse this template's fee-head lines out of detailsjson.
            var details = [];
            try {
                details = t.detailsjson ? JSON.parse(t.detailsjson) : [];
            } catch (e) {
                details = [];
            }

            // Comma-separated DetailIds for this template, stashed on the checkbox as a
            // data attribute for reference only. The checkbox's own `value` stays the
            // FeeTemplateId — that's the only thing the Save payload (FeeTemplateId
            // CSV) is allowed to send, since tbl_map_StudentFees / FN_STUDENT_FEE_PAYABLE
            // key off FeeTemplateId, not FeeTemplateDetail.DetailId. Do NOT read
            // data-detailids into the save payload.
            var detailIdsCsv = details
                .map(function (d) { return d.DetailId ?? d.DETAILID ?? d.detailId; })
                .filter(function (id) { return id !== null && id !== undefined; })
                .join(',');

            var $templateHeader = $(
                '<div class="d-flex justify-content-between align-items-center border-top py-2 px-3 fees-template-toggle" ' +
                'style="cursor:pointer" data-bs-toggle="collapse" data-bs-target="#' + templateCollapseId + '">' +
                '<span><input type="checkbox" class="form-check-input me-2 fees-template-checkbox" ' +
                    'value="' + t.feetemplateid + '" ' +
                    'data-classid="' + classId + '" ' +
                    'data-detailids="' + detailIdsCsv + '" ' +
                    'onclick="event.stopPropagation()"> ' + label + '</span>' +
                '<span class="text-muted">' + (t.totalamount || 0).toFixed(2) + '</span>' +
                '</div>'
            );

            var rowsHtml = '<table class="table table-sm mb-2"><tr><th>Fees Type</th><th>Due Date</th><th class="text-end">Amount</th></tr>';
            if (details.length === 0) {
                rowsHtml += '<tr><td colspan="3" class="text-muted text-center">No fee head details.</td></tr>';
            } else {
                details.forEach(function (d) {
                    // Detail rows don't carry their own date — fall back to
                    // the template's LATEFEEDATE for every line under it.
                    rowsHtml +=
                        '<tr>' +
                        '<td>' + (d.FEEHEADNAME || '-') + '</td>' +
                        '<td>' + formatDueDate(t.latefeedate) + '</td>' +
                        '<td class="text-end">' + (parseFloat(d.AMOUNT) || 0).toFixed(2) + '</td>' +
                        '</tr>';
                });
            }
            rowsHtml += '</table>';

            var $templateBody = $('<div class="collapse" id="' + templateCollapseId + '">' + rowsHtml + '</div>');

            $classBody.append($templateHeader).append($templateBody);
        });

        $container.append($classHeader).append($classBody);
    });

    // Class-level checkbox selects/deselects every template underneath it
    $container.off('change', '.fees-class-checkbox').on('change', '.fees-class-checkbox', function () {
        var classId = $(this).data('classid');
        var checked = $(this).is(':checked');
        $container.find('.fees-template-checkbox[data-classid="' + classId + '"]').prop('checked', checked);
    });

    // If every template under a class gets unchecked manually, uncheck
    // that class's own box too (keeps the two levels honest)
    $container.off('change', '.fees-template-checkbox').on('change', '.fees-template-checkbox', function () {
        var classId = $(this).data('classid');
        var $siblings = $container.find('.fees-template-checkbox[data-classid="' + classId + '"]');
        var allChecked = $siblings.length === $siblings.filter(':checked').length;
        $container.find('.fees-class-checkbox[data-classid="' + classId + '"]').prop('checked', allChecked);
    });

    // EDIT MODE: pre-check templates already saved for this student.
    // Set window.savedFeeTemplateIds = [5,2,1,7] from the view (e.g. via Razor)
    // before this script runs. Without this, saving an edit would soft-delete
    // the existing mappings because every box renders unchecked.
    (window.savedFeeTemplateIds || []).forEach(function (id) {
        $container.find('.fees-template-checkbox[value="' + id + '"]').prop('checked', true);
    });
    $container.find('.fees-class-checkbox').each(function () {
        var classId = $(this).data('classid');
        var $siblings = $container.find('.fees-template-checkbox[data-classid="' + classId + '"]');
        $(this).prop('checked', $siblings.length > 0 && $siblings.length === $siblings.filter(':checked').length);
    });
}
// Fire whenever either select changes...
$(document).on('change', '#ddlClass, #ddlSection', maybeLoadFeeTemplates);


(function () {
    'use strict';

    const api = {};

    // Case-insensitive property reader (tolerates stateId / StateId / StateID)
    const pick = (o, ...keys) => {
        if (!o) return null;
        for (const k of keys) {
            const hit = Object.keys(o).find(x => x.toLowerCase() === k.toLowerCase());
            if (hit && o[hit] != null && o[hit] !== '') return o[hit];
        }
        return null;
    };

    // Keep a select2 UI (if the theme wraps these selects) in sync after setting .value in code
    const syncUi = select => {
        if (window.jQuery && jQuery(select).data('select2')) jQuery(select).trigger('change.select2');
    };

    // jQuery handler if available (catches select2's jQuery-only change events), else native
    const onChange = (el, fn) => {
        if (window.jQuery) jQuery(el).on('change', fn);
        else el.addEventListener('change', fn);
    };

    const els = p => ({
        block: document.querySelector(`.address-block[data-prefix="${p}"]`),
        addr: document.getElementById(`txt${p}Address`),
        pin: document.getElementById(`txt${p}PinCode`),
        list: document.getElementById(`pinSuggestions${p}`),
        country: document.getElementById(`ddl${p}Country`),
        state: document.getElementById(`ddl${p}State`),
        city: document.getElementById(`ddl${p}City`)
    });

    async function fillSelect(select, url, idKey, nameKey, preselect, placeholder, preselectName) {
        const token = (select._token = (select._token || 0) + 1);
        select.innerHTML = `<option value="">${placeholder}</option>`;
        syncUi(select);
        if (!url) return;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (token !== select._token) return;               // stale response, ignore
            const rows = json.data || json.Data || [];
            console.log('Loaded', url, rows);

            rows.forEach(x => select.add(new Option(pick(x, nameKey), pick(x, idKey))));

            if (preselect != null && preselect !== '') {
                select.value = String(preselect);
            } else if (preselectName) {                        // fallback: match by name
                const opt = [...select.options].find(o =>
                    o.text.trim().toLowerCase() === String(preselectName).trim().toLowerCase());
                if (opt) select.value = opt.value;
            }
            syncUi(select);
        } catch (err) {
            console.error('Failed to load', url, err);
        }
    }

    function initAddress(p) {
        const e = els(p);
        if (!e.block || !e.pin) return;

        let timer, items = [];

        const loadStates = (countryId, pre, preName) => fillSelect(e.state,
            countryId ? `/PostalCode/GetStatesByCountry?countryID=${countryId}` : null,
            'stateId', 'stateName', pre, 'Select State', preName);

        const loadCities = (stateId, pre, preName) => fillSelect(e.city,
            stateId ? `/PostalCode/GetCitiesByState?stateID=${stateId}` : null,
            'cityId', 'cityName', pre, 'Select City', preName);

        api[p] = { loadStates, loadCities };

        onChange(e.country, () => { loadStates(e.country.value); loadCities(null); });
        onChange(e.state, () => loadCities(e.state.value));

        e.pin.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '').slice(0, 6);
            clearTimeout(timer);
            if (this.value.length < 2) return hideList();
            timer = setTimeout(() => fetchPins(this.value), 300);
        });

        async function fetchPins(term) {
            try {
                const res = await fetch(`/Hostel/SearchPostalCode?term=${encodeURIComponent(term)}`);
                const result = await res.json();
                if (e.pin.value !== term) return;              // user kept typing, drop stale result
                const data = result.data || result.Data;
                if (!(result.success && data && data.length)) return hideList();

                items = data;
                if (term.length === 6 && items.length === 1) return selectItem(items[0]);
                renderList();
            } catch (err) {
                console.error('SearchPostalCode error:', err);
                hideList();
            }
        }

        function renderList() {
            e.list.innerHTML = '';
            items.forEach(it => {
                const li = document.createElement('li');
                li.className = 'list-group-item list-group-item-action';
                const city = pick(it, 'cityName');
                li.textContent = pick(it, 'postalCode', 'pinCode') + (city ? ` - ${city}` : '');
                li.addEventListener('click', () => selectItem(it));
                e.list.appendChild(li);
            });
            e.list.style.display = 'block';
        }

        async function selectItem(it) {
            console.log('Selected pin item:', it);
            const countryId = pick(it, 'countryId');
            const stateId = pick(it, 'stateId');
            const cityId = pick(it, 'cityId');

            e.pin.value = pick(it, 'postalCode', 'pinCode') ?? e.pin.value;
            hideList();

            e.country.value = countryId ?? '';                 // programmatic set: no change event
            syncUi(e.country);

            await loadStates(countryId, stateId, pick(it, 'stateName'));
            await loadCities(e.state.value || stateId, cityId, pick(it, 'cityName'));
        }

        function hideList() { e.list.style.display = 'none'; e.list.innerHTML = ''; }

        document.addEventListener('click', ev => {
            if (!e.pin.contains(ev.target) && !e.list.contains(ev.target)) hideList();
        });

        // Edit mode
        const preState = e.block.dataset.state, preCity = e.block.dataset.city;
        if (e.country.value) {
            loadStates(e.country.value, preState).then(() => {
                if (e.state.value) loadCities(e.state.value, preCity);
            });
        }
    }

    async function copyCurrentToPermanent() {
        const c = els('Current'), p = els('Permanent');
        p.addr.value = c.addr.value;
        p.pin.value = c.pin.value;
        p.country.value = c.country.value;
        syncUi(p.country);
        await api.Permanent.loadStates(c.country.value, c.state.value);
        await api.Permanent.loadCities(p.state.value, c.city.value);
    }

    document.addEventListener('DOMContentLoaded', function () {
        ['Current', 'Permanent'].forEach(initAddress);
        document.getElementById('chkSameAsCurrent')?.addEventListener('change', function () {
            if (this.checked) copyCurrentToPermanent();
        });
    });
})();