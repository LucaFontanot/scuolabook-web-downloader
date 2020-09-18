
var axios = require("axios");
var doc = require("html-pdf");
var fs = require("fs");
var path = require("path");
const tough = require('tough-cookie');
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
var pdf = require("easy-pdf-merge");
axiosCookieJarSupport(axios);
const cookieJar = new tough.CookieJar();

const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
class Scuolabook{

    readerToken = {};
    constructor(u,p) {
        cookieJar.setCookieSync("frontend="+u+"; path=/; domain= .scuolabook.it", 'https://webapp.scuolabook.it');

        cookieJar.setCookieSync("_reader_session="+p+"; path=/; domain= webapp.scuolabook.it", 'https://webapp.scuolabook.it');
    }

    async mergeF(a,b){
        var newTh = this;
        return new Promise(async function(re){
            pdf(a, b, function (err) {
                if (err) {
                    console.log("MERGEee",err)
                }
                re(true);
            });
        })
    }
    deleteFolderRecursive (path) {
        var  newTh =this;
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach((file, index) => {
                var Path = require("path");
                const curPath = Path.join(path, file);
                if (fs.lstatSync(curPath).isDirectory()) { // recurse
                    newTh.deleteFolderRecursive(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    };
    async books(){
        var th = this;
        return new Promise(async function(re){
            axios({
                method: "GET",
                timeout: 6000,
                url:"https://webapp.scuolabook.it/books",
                withCredentials: true,
                jar: cookieJar,
                headers:{
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                }
            }).then(function(d){
                re(d.data);
            }).catch(function(d){
                console.log(d)
                re(false);
            });
        })
    }
    listToMatrix(list, elementsPerSubArray) {
        var matrix = [], i, k;

        for (i = 0, k = -1; i < list.length; i++) {
            if (i % elementsPerSubArray === 0) {
                k++;
                matrix[k] = [];
            }

            matrix[k].push(list[i]);
        }

        return matrix;
    }
    async dwFile(u,p){
        var th = this;
        return new Promise(async function(re){
            axios({
                method: "GET",
                timeout: 6000,
                url:u,
                withCredentials: true,
                jar: cookieJar,
                headers:{
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                },
                responseType: 'stream'

            }).then(function(d){
                const writer = fs.createWriteStream(p)
                d.data.pipe(writer)
                writer.on('finish', ()=>{re(true);})
                writer.on('error', ()=>{re(true);})

            }).catch(function(d){
                console.log(d)
                re(false);
            });
        })
    }
    async yesNo(title){
        return new Promise(async function(re){
            rl.question("RIPRISTINARE STATUS? (y/n)", function(yesNo) {
                yesNo = yesNo.toLowerCase();
                re((yesNo == "y"));
            });
        })
    }
    async export(obj,dir_ = __dirname){
        var th = this;
        var n = obj["sku"];
        var p = parseInt(obj["ws_num_pages"]);
        return new Promise(async function(re){
            var pa = "file:///"+dir_+"/"+n+"/";
            var pages = [];
            for (var i  =0;i<p;i++){
                pages.push(i+1);
            }
            var tmpPages = pages.slice();
            pages = th.listToMatrix(pages,50);
            if (pages.length==1){
                pages=th.listToMatrix(tmpPages,parseInt(tmpPages.length/2));
            }
            var merger = [];
            for (var i  =0;i<pages.length;i++) {
                console.log("EXP",i+1,"/",pages.length);
                var ht ="<style>img{height: 100%;width: 100%} div{height: 100%;width: 100%}</style>";
                for (var j = 0;j<pages[i].length;j++){
                    ht+=`<div><img src='${pages[i][j]}.jpg'/></div>`;
                }
                await (async function (){
                    return new Promise(async function(re){
                        doc.create(ht, {
                            "type": "pdf",
                            "base": pa,
                            "border": "0.3in"

                        }).toFile(dir_+'/'+n+"/"+i+".pdf", function(err, res) {
                            if (err) return console.log("MERGE ERR",err);
                            console.log("Generated");
                            re();
                        });});
                })();
                merger.push(dir_+'/'+n+"/"+i+".pdf");
            }
            await th.mergeF(merger,dir_+'/'+n+".pdf");

            th.deleteFolderRecursive(dir_+"/" + n+ "/");
            var a = JSON.parse(fs.readFileSync(__dirname+"/web.json","utf8"));
            delete a[n];

            fs.writeFileSync(__dirname+ "/web.json",JSON.stringify(a),"utf8");

            console.log("DONE")
            re(true);



        })
    }
    async download(obj, path_ = __dirname){
        var n = obj["sku"];
        var p = parseInt(obj["ws_num_pages"]);

        var a = JSON.parse(fs.readFileSync(__dirname+"/web.json","utf8"));
        var last = 0;
        if (a.hasOwnProperty(n)){
            if (await this.yesNo()){
                last = a[n]["last"];
            }
        }else{
            a[n] = {};
            a[n]["last"] = 0;
        }

        var th = this;
        return new Promise(async function(re){
            if (last>= (p-1)){
                re(await th.export(obj,path_))
                return;
            }
            var url = "https://webapp.scuolabook.it/books/"+n+"/pages?";
            var pages = [];
            for (var i  =0;i<p;i++){
                pages.push("pages%5B%5D="+(i+1));
            }
            var aa = th.listToMatrix(pages,50);
            var pdfs = [];
            var pagesUrl = [];
            for (var i  =0;i<aa.length;i++){
                console.log("SCRAPING: " , i+1 , "/", aa.length)
                var dataz = await axios.get(url+aa[i].join("&"),{headers:{
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json, text/javascript, */*; q=0.01'
                    },
                    withCredentials: true,
                    jar: cookieJar});
                var thaa = dataz.data.pages;
                var ret = [];
                for(var j in thaa){
                    var sub_key = j;
                    var sub_val = thaa[j];
                    pagesUrl.push(sub_val);
                }


            }
            console.log(pagesUrl)
            if (!fs.existsSync(path.join(path_, n))){
                fs.mkdirSync(path.join(path_, n));
            }
            for (var i  =last;i<pagesUrl.length;i++){
                console.log("DOWNLOADING: " , i+1 , "/", pagesUrl.length)

                await th.dwFile(pagesUrl[i],path_+"/"+n+"/"+(i+1)+".jpg");
                a[n]["last"] = i;
                fs.writeFileSync(__dirname+ "/web.json",JSON.stringify(a),"utf8");
            }
            await th.export(obj,path_)
            re(true);
        })
    }

}
module.exports = Scuolabook;
