// подключаем нужные модули из стандартной библиотеки:
var http = require('http');
var querystring = require("querystring"); // для поддержки unescape
var fs = require('fs');

// хорошим тоном будет держать эту настройку отдельным файлом, чтобы меняя настройки не трогать код, но пока так:
var config =  // для запуска настройте под себя папку которую будете показывать и порт
{
	port:10009, 		// к этому порту вы будете обращаться из клиентского js
	localdir:"D:/Temp"	// а содержимое этой папки будете показывать людям, не выкладывайте туда компромат :-)
}

var mongo = require('mongodb');
var mongo_host = 'localhost';
var mongo_port = 27017;

function getComments(subj, callback)
{
	console.log("Читаем из: "+subj);
	var db = new mongo.Db('test', new mongo.Server(mongo_host, mongo_port, {}), {safe:false});
	db.open(function(err, db) {
		var collection = db.collection("simple_collection");
		
		collection.findOne({path:subj}, function(err, item) {
			db.close();
			callback(item);
		});
		
	});
}

function addComment(subj, post, callback)
{
	console.log("Пишем в: "+subj);
	var db = new mongo.Db('test', new mongo.Server(mongo_host, mongo_port, {}), {safe:false});
	db.open(function(err, db) {
		var collection = db.collection("simple_collection");
		
		collection.findOne({path:subj}, function(err, item) {
			if (item==null){
				var newitem = {
					path:subj,
					comments: []
				};
				newitem.comments.push(post);
				collection.insert(newitem);
				db.close();
				callback(newitem);
			}
			else
			{
				item.comments.push(post);
				collection.updateOne({ _id:item._id}, item, {upsert:true,w:1}, function(err, result) {
						db.close();
						callback(item);
					});
			};
		});
		
	});
};


http.createServer(function (req, res) {

	// req is an http.IncomingMessage, which is a Readable Stream
	// res is an http.ServerResponse, which is a Writable Stream
	
	if(req.method=="GET")
	{
		console.log("Пришёл запрос"+req.url);

		res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
		
		var reqpath = querystring.unescape(req.url); // для поддержки русских букв и пробелов
		var path = config.localdir + reqpath; // реальный путь в файловой системе
		
		var answ = { // нашим ответом будет структура с такими полями:
			path: reqpath, // полный путь доступа к просматриваемому файлу или папке
			dirlist:[], // список вложенных папок 
			filelist:[], // список вложенных файлов
			comments: [] // когда-нибудь тут будет массив из структур комментариев к папке или файлу
		};
		
		// если ресурса с таким именем не существует, дурацкая функция statSync генерирует ошибку, а не false, потому:
		try { 
			var stat = fs.statSync(path);
		} catch(e)
		{	console.log(e); // я хочу видеть, как вы умудрились сделать ошибочный запрос
			answ.err = "Не найден ресурс "+reqpath;
			res.end(JSON.stringify(answ,null,'\t'));
			return;
		};
		
		// если по запросу файл, то сразу ищем для него комментарии:
		if(stat.isFile()) {
			
			getComments(reqpath, function(r)   {
				if(r) if(r.comments) answ.comments = r.comments;

				var jres = JSON.stringify(answ,null,'\t');
				res.end(jres); // самый цивилизованный ответ
				console.log(jres);
			});
			
			return;
		};
		
		//чтение папки по мотивам http://stackoverflow.com/questions/2727167/getting-all-filenames-in-a-directory-with-node-js
		fs.readdir(path, function(err, files) {
			if (err) { 
				console.log(err); // я хочу видеть, как вы умудрились сделать ошибочный запрос
				answ.err = "Не найден ресурс "+reqpath;
				res.end(JSON.stringify(answ,null,'\t'));
				return; 
			};
			files.forEach(function (name) {
				var filePath = path+name;
				var stat = fs.statSync(filePath);
				if(stat.isFile()) answ.filelist.push(name);
				else if (stat.isDirectory()) answ.dirlist.push(name+'/');
			});
			
			getComments(reqpath, function(r)   {
				if(r) if(r.comments) answ.comments = r.comments;

				var jres = JSON.stringify(answ,null,'\t');
				res.end(jres); // самый цивилизованный ответ
				console.log(jres);
			});
		});
	}
	else
	if(req.method=="POST")
	{
		var body = '';
		// We want to get the data as utf8 strings. If you don't set an encoding, then you'll get Buffer objects.
		req.setEncoding('utf8');
		
		// Readable streams emit 'data' events once a listener is added
		req.on('data', function (chunk) {
			body += chunk; // здесь можно проверять, не прислали ли слишком много лишнего
		});

		// the end event tells you that you have entire body
		req.on('end', function () {
			if(req.url=="/addcomment")
			{
				var j = JSON.parse(body);
				res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
				addComment(j.path, {date:j.date, text:j.text }, function(r) {
					res.end(JSON.stringify(r));
				});
			}
			else
			{
				res.writeHead(405, {'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
				res.end('Unknown post command=' + req.url);
				console.log('Unknown post command=' + req.url);
			}
		});
	}
	
	else
	{	// код ошибки 405 - Method Not Allowed
		res.writeHead(405, {'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
		res.end('Unknown method=' + req.method + " in req=" + req.url);
		console.log('Unknown method=' + req.method + " in req=" + req.url);
	}

}).listen(config.port); // , '127.0.0.1'); - это следует дописать только если слушать запросы исключительно с локалхоста
console.log('Server running at http://127.0.0.1:'+config.port);
