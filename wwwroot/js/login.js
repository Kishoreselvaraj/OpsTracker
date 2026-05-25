$(document).ready(function () {
    // Toggle password visibility
    $('#togglePassword').on('click', function () {
        const passwordInput = $('#passwordInput');
        const isPressed = $(this).attr('aria-pressed') === 'true';
        const type = isPressed ? 'password' : 'text';
        passwordInput.attr('type', type);
        $(this).attr('aria-pressed', !isPressed);
        $(this).find('i').toggleClass('fa-eye fa-eye-slash');
    });

    // Form submission
    $('#loginForm').on('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
        const form = this;
        if (!form.checkValidity()) {
            $(form).addClass('was-validated');
            return;
        }
        $('#loginBtn').prop('disabled', true);
        $('#btnText').text('Signing in...');
        $('#btnLoader').removeClass('d-none');
        const email = $('#emailInput').val();
        const password = $('#passwordInput').val();
        $.ajax({
            url: 'https://localhost:7181/api/Login', // Change to your actual login API endpoint
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email: email, password: password }),
            success: function (response) {
                // Handle success (redirect, show message, etc.)
                window.location.href = '/Dashboard/index';
            },
            error: function (xhr) {
                // Handle error (show message, etc.)
                alert('Login failed: ' + (xhr.responseJSON?.message || 'Unknown error'));
                
            },
            complete: function () {
                $('#loginBtn').prop('disabled', false);
                $('#btnText').text('Sign In');
                $('#btnLoader').addClass('d-none');
            }
        });
    });
});