var webScuolabook = require("./core/web");

const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function yesNo(title){
    return new Promise(async function(re){
        rl.question("Proseguire con il download di "+ title + "  (y/n)", function(yesNo) {
            yesNo = yesNo.toLowerCase();
            re((yesNo == "y"));
        });
    })
}
(async function () {
    var s = new webScuolabook("frontend cookie value here","_reader_session cookie value here");
    var a = await s.books();
    for(var i = 0;i<a.length;i++){
        var download = await yesNo(a[i]["ws_title"]);
        if (download){
            await s.download(a[i],__dirname);
        }
    }
})()
