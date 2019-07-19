var socket= io("http://gsgsignup4-env.audibi2djm.us-west-2.elasticbeanstalk.com");

socket.on('server-send-dki-thatbai', function () {
    alert('Sai username co nguoi da dang ki roi');
});

socket.on('server-send-dki-thanhcong', function (data) {
    $('#currentUser').html(data);
    $('#loginForm').hide(2000);
    $('#chatForm').show(1000);
});
socket.on('server-send-danhsach-User', function (data) {
    $('#boxContent').html('');
    data.body.forEach(function (i) {
        var otherUsers = [];
        i.participants.forEach(function (user) {
            if (user !== data.currentUser) {
                otherUsers.push(user);
            }
        });
        $('#boxContent').append('<div class="user"><a href="chat?id=' + i.id + '&user='+data.currentUser+'">' + otherUsers.join(', ') + '</a></div>');
    });
});

socket.on('server-send-message', function (data) {
   $('#listMessages'). append('<div class="ms">'+data.un+":"+ data.nd+'</div>');
});

$(document).ready(function () {
    $('#loginForm').show();
    $('#chatForm').hide();
    $('#btnRegister').click(function () {
        socket.emit('client-send-Username', $('#txtUsername').val());
    });
    $('#btnLogout').click(function () {
        socket.emit('logout');
        $('#loginForm').show(2000);
        $('#chatForm').hide(1000);
    });
    $('#1').click(function () {
        console.log($('#1').val());
        //socket.emit('get-convo', $('.user').val());
    });
    $('#btnSendMessage').click(function () {
       socket.emit('user-send-message', $('#txtMessage').val());
    });

});



