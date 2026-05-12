(function ($) {
    'use strict';

    $(function () {

        var $form = $('#frmLogin');
        if (!$form.length) return;
    
        var $summary = $('#loginSummary');
        var $submit = $('#btnLogin');
        var url = $form.data('data-validate-url');
    
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
    
                    contentType: 'application/json',
    
                    data: JSON.stringify({
                        email: $('#Email').val(),
                        password: $('#Password').val(),
                        returnUrl: $('input[name="returnUrl"]').val()
                    }),
    
                    dataType: 'json'
    
                })
    
                .done(function (data) {
    
                    if (data.success && data.redirectUrl) {
                        window.location.assign(data.redirectUrl);
                        return;
                    }
    
                    showSummary(data.message || 'Sign-in failed.');
    
                    if (data.errors) {
    
                        Object.keys(data.errors).forEach(function (key) {
    
                            var msgs = data.errors[key];
    
                            if (!msgs || !msgs.length) return;
    
                            var $span = $form.find(
                                'span[data-valmsg-for="' + key + '"]'
                            );
    
                            if ($span.length) {
                                $span.text(msgs[0]);
                            }
    
                        });
                    }
                })
    
                .fail(function (xhr) {
    
                    console.log(xhr.responseText);
    
                    showSummary('A network error occurred.');
    
                })
    
                .always(function () {
    
                    $submit.prop('disabled', false);
    
                });
    
                return false;
            }
        });
    
    });
})(jQuery);
