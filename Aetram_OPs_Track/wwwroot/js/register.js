(function ($) {
    'use strict';

    $(function () {
        var $form = $('#frmRegister');
        if (!$form.length) return;

        var $summary = $('#registerSummary');
        var $submit = $('#btnRegister');
        var url = $form.data('submit-url');

        function showSummary(message) {
            if (!message) {
                $summary.attr('hidden', true).text('');
                return;
            }
            $summary.removeAttr('hidden').text(message);
        }

        function clearServerFieldErrors() {
            $form.find('span[data-valmsg-for]').text('');
        }

        $form.validate({
            errorClass: 'text-danger',
            errorElement: 'span',
            highlight: function (el) {
                $(el).addClass('input-validation-error');
            },
            unhighlight: function (el) {
                $(el).removeClass('input-validation-error');
            },
            submitHandler: function () {
                showSummary('');
                clearServerFieldErrors();
                $submit.prop('disabled', true);

                $.ajax({
                    type: 'POST',
                    url: url,
                    data: $form.serialize(),
                    dataType: 'json'
                })
                    .done(function (data) {
                        if (data.success && data.redirectUrl) {
                            window.location.assign(data.redirectUrl);
                            return;
                        }
                        showSummary(data.message || 'Registration failed.');
                        if (data.errors) {
                            Object.keys(data.errors).forEach(function (key) {
                                var msgs = data.errors[key];
                                if (!msgs || !msgs.length) return;
                                var $span = $form.find('span[data-valmsg-for="' + key + '"]');
                                if ($span.length) $span.text(msgs[0]);
                            });
                        }
                    })
                    .fail(function () {
                        showSummary('A network error occurred. Please try again.');
                    })
                    .always(function () {
                        $submit.prop('disabled', false);
                    });

                return false;
            }
        });
    });
})(jQuery);
