var socket= io("http://gsgsignup4-env.audibi2djm.us-west-2.elasticbeanstalk.com");
var lastChat = null;
var currentUsername = '';

socket.on('server-send-ds-message-cu', function (data) {
    console.log(data);
    loadChat(data);
});


$(document).ready(function () {
    currentUsername = $('#user').val();
    console.log($('#id').val());
    socket.emit('client-send-id-conversation', $('#id').val());
    $('#send').click(function () {
        console.log($('#message').val());
        var data={
            mess: $('#message').val(),
            id: $('#id').val(),
            sender: currentUsername
        };
        //console.log(data);
        send(data);
    })
});

function loadChat(result) {
        var lastRendered = lastChat === null ? 0 : lastChat;
        if((lastChat === null && result.cuoi) || lastChat < result.cuoi) {
            lastChat = result.cuoi;
        } else {
            return;
        }
        result.dulieu.forEach(function (message) {
            if(message.Timestamp > lastRendered) {
                var panel = $('<div class="panel">');
                if (message.Sender === currentUsername) {
                    panel.addClass('panel-default');
                } else {
                    panel.addClass('panel-info');
                    panel.append('<div class="panel-heading">' + message.Sender + '</div>');
                }
                var body = $('<div class="panel-body">').text(message.Message);
                panel.append(body);
                panel.append('<div class="panel-footer messageTime" data-time="' + message.Timestamp + '">' + moment(message.Timestamp).fromNow() + '</div>');

                var row = $('<div class="row">');
                var buffer = $('<div class="col-xs-4">');
                var holder = $('<div class="col-xs-8">');
                holder.append(panel);

                if (message.Sender === currentUsername) {
                    row.append(buffer);
                    row.append(holder);
                } else {
                    row.append(holder);
                    row.append(buffer);
                }

                $('#chat').append(row);
            }
        });
        window.scrollTo(0, document.body.scrollHeight);

};

function send(data){
    socket.emit('client-send-message', data);
    // $.post(location.href,{'tri': $('#message').val()})
    //     .done(function () {
    //         $('#message').val('').focus();
    //         loadChat();
    //     });
};


