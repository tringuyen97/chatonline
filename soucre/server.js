var express = require('express');
var url = require('url');




var fs = require('fs');
var app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', './views');
app.set('port', process.env.PORT || 3000);

var server = require('http').Server(app);
var io = require('socket.io')(server);

var config = fs.readFileSync('./app_config.json', 'utf8');
config = JSON.parse(config);

app.locals.theme = process.env.THEME; //Make the THEME environment variable available to the app.


var AWS = require("aws-sdk");

AWS.config.update({
    region: config.AWS_REGION
});
AWS.config.accessKeyId = "AKIAJ3W3EO7PHUZVOSYA";
AWS.config.secretAccessKey = "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";
var dynamo = new AWS.DynamoDB.DocumentClient();


var mangUsers = ['Student', 'Brian', 'Frank', 'Alice'];

io.on('connection', function (socket) {
    console.log('co nguoi đan ket noi: ' + socket.id);

    socket.on('disconnect', function () {
        console.log('ngat ket noi: '+ socket.id);
    });

    socket.on('client-send-Username', function (data) {
        if (mangUsers.indexOf(data) >= 0) {
            socket.Username = data;
            socket.emit('server-send-dki-thanhcong', data);
            getConvons(data, socket);

        } else {
            socket.emit('server-send-dki-thatbai');
        }
    });
    socket.on('logout', function () {
        mangUsers.splice(
            mangUsers.indexOf(socket.Username), 1
        );
        socket.broadcast.emit('server-send-danhsach-User', mangUsers);
    });
    socket.on('user-send-message', function (data) {
        io.sockets.emit('server-send-message', {un: socket.Username, nd: data});
    });
    socket.on('client-send-id-conversation', function (data) {
        //console.log(data);
        socket.join(data);
        console.log(socket.adapter.rooms);
        socket.phong=data;
        getMessages(socket, data);
    });
    socket.on('client-send-message', function (data) {
        addMessage(data, socket);
    })
});

app.get('/', function (req, res) {
    res.render('trangchu');
});
app.get('/chat', function (req, res) {
    var path4=url.parse(req.url, true);
    var id= path4.query.id;
    var user= path4.query.user;

    console.log('asdasda: '+id);
    console.log('asdasda: '+user);

    res.render('chat', {id: id, user: user});
});
server.listen(app.get('port'));

const done = function (err, res, socket) {
    var data={
        body: res,
        currentUser: socket.Username
    }
    console.log(data);
    socket.emit('server-send-danhsach-User', data);
};

function handleIdQuery(err, data, callback, ids, username, socket) {
    //console.log("Username query results: " + JSON.stringify(data));
    if (err === null) {
        data.Items.forEach(function (item) {
            ids.push(item.ConversationId);
        });

        if (data.LastEvaluatedKey) {
            dynamo.query({
                TableName: config.Chat_Conversations,
                IndexName: 'Username-ConversationId-index',
                Select: 'ALL_PROJECTED_ATTRIBUTES',
                KeyConditionExpression: 'Username = :username',
                ExpressionAttributeValues: {':username': username},
                ExclusiveStartKey: data.LastEvaluatedKey
            }, function (err, data) {
                handleIdQuery(err, data, callback, ids, username);
            });
        } else {

            loadDetails(ids, callback, socket);
        }
    } else {
        callback(err);
    }
}

function loadDetails(ids, callback, socket) {
    console.log("Loading details");
    var convos = [];
    ids.forEach(function (id) {
        var convo = {id: id};
        convos.push(convo);
    });

    if (convos.length > 0) {
        //console.log(convos);

        convos.forEach(function (convo) {
            loadConvoLast(convo, convos, callback, socket);
        });
    } else {
        callback(null, convos);
    }
    //console.log(convos);
}

function loadConvoLast(convo, convos, callback, socket) {
    dynamo.query({
        TableName: config.Chat_Messages,
        ProjectionExpression: '#T',
        Limit: 1,
        ScanIndexForward: false,
        KeyConditionExpression: 'ConversationId = :id',
        ExpressionAttributeNames: {'#T': 'Timestamp'},
        ExpressionAttributeValues: {':id': convo.id}
    }, function (err, data) {
        if (err === null) {
            if (data.Items.length === 1) {
                convo.last = Number(data.Items[0].Timestamp);
            }
            //console.log(convos);

            loadConvoParticipants(convo, convos, callback, socket);
        } else {
            callback(err);
        }
    });
}

function loadConvoParticipants(convo, convos, callback, socket) {
    dynamo.query({
        TableName: config.Chat_Conversations,
        Select: 'ALL_ATTRIBUTES',
        KeyConditionExpression: 'ConversationId = :id',
        ExpressionAttributeValues: {':id': convo.id}
    }, function (err, data) {

        if (err === null) {
            var participants = [];
            data.Items.forEach(function (item) {
                participants.push(item.Username);
            });
            convo.participants = participants;
            //console.log(convos);
            if (finished(convos)) {
                callback(null, convos, socket);
            }
        } else {
            callback(err);
        }
    });
}

function finished(convos) {
    for (var i = 0; i < convos.length; i++) {
        if (!convos[i].participants) {
            return false;
        }
    }
    return true;
}

function getConvons(usename, socket) {
    dynamo.query({
        TableName: config.Chat_Conversations,
        IndexName: 'Username-ConversationId-index',
        Select: 'ALL_PROJECTED_ATTRIBUTES',
        KeyConditionExpression: 'Username = :username',
        ExpressionAttributeValues: {':username': usename}
    }, function (err, data) {

        handleIdQuery(err, data, done, [],usename , socket);

    });
}
function getMessages(socket, id) {
    var params = {
        TableName : config.Chat_Messages,
        ProjectionExpression : '#T, Sender, Message',
        ExpressionAttributeNames: {'#T': 'Timestamp'},
        KeyConditionExpression : 'ConversationId = :ma',
        ExpressionAttributeValues: {
            ':ma' : id
        }
    };
    dynamo.query(params, function(err, data) {
        if (err) {
            console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
            res.end();

        } else {
            console.log("Query succeeded.");
            // console.log(JSON.stringify(data,null,2));
            // console.log(data.Items);
            //res.render('chat',{Messages:data.Items, Count : data.Items.length});
            var dl={};
            dl.dulieu=data.Items;
            dl.cuoi=data.Items.length > 0 ? data.Items[data.Items.length-1].Timestamp : undefined;
            console.log(dl);
            io.sockets.in(socket.phong).emit('server-send-ds-message-cu',dl);
            //socket.emit('server-send-ds-message-cu',dl);
        }
    });
}
function addMessage(data, socket) {
    var id = data.id;
    console.log(data);
    var params = {
        TableName: config.Chat_Messages,
        Item: {
            ConversationId: id,
            Timestamp: new Date().getTime(),
            Message: data.mess,
            Sender:  data.sender
        }
    };
    dynamo.put(params, function(err, data) {
        if (err) {
            console.error("Unable to Put. Error:", JSON.stringify(err, null, 2));
        } else {
            console.log("Put succeeded.");
            getMessages(socket, id);
        }
    });
}