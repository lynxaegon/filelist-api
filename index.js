const cheerio = require('cheerio');
const crypto = require('crypto');
const CookieJar = require('tough-cookie').CookieJar;
const FileCookieStore = require("tough-cookie-file-store").FileCookieStore;
const querystring = require('querystring');
const axiosCls = require('axios');
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const fs = require('fs');

const _private = {
    obj: {
        user: Symbol('username'),
        pass: Symbol('password'),
        options: Symbol('options')
    },
    fnc: {
        genHash: Symbol("generate hash")
    }
};
let axios;

function cfDecodeEmail(encodedString) {
    var email = "", r = parseInt(encodedString.substr(0, 2), 16), n, i;
    for (n = 2; encodedString.length - n; n += 2){
        i = parseInt(encodedString.substr(n, 2), 16) ^ r;
        email += String.fromCharCode(i);
    }
    return email;
}

module.exports = class FileList {
    constructor(username, password, opts) {
        this[_private.obj.user] = username;
        this[_private.obj.pass] = password;
        this[_private.obj.options] = Object.assign({
            SCHEME: "https",
            HOSTNAME: "filelist.io"
        }, opts);
        this[_private.obj.options].BASE_URL = this[_private.obj.options].SCHEME + "://" + this[_private.obj.options].HOSTNAME;
        axios = axiosCls.create({
            withCredentials: true,
            gzip: true,
            headers: {
                "Connection": "keep-alive",
                "Cache-Control": "max-age=0",
                "Origin": this[_private.obj.options].BASE_URL,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36",
                "Accept-Encoding": "gzip, deflate",
                "Accept-Language": "en-US,en;q=0.8,ro;q=0.6"
            }
        });
        axiosCookieJarSupport(axios);
        axios.defaults.jar = new CookieJar(new FileCookieStore("./cookies.json"));
    }

    search(query, options) {
        options = Object.assign({
            search: query,
            cat: 0,
            searchin: 0,
            sort: 0,
            page: 0
        }, options);
        return new Promise((resolve, reject) => {
            axios.get(this[_private.obj.options].BASE_URL + "/browse.php", {
                headers: {
                    "Referer": this[_private.obj.options].BASE_URL + "/browse.php"
                },
                params: options
            }).then(res => {
                const $ = cheerio.load(res.data);
                let torrents = [];
                $(".torrentrow").each((key, item) => {
                    let cat = $(".torrenttable:nth-child(1) img", item).attr("alt");
                    let title = $(".torrenttable:nth-child(2) a", item).text().trim();
                    let date = $(".torrenttable:nth-child(6) .small", item).html().split("<br>")[1];
                    let size = $(".torrenttable:nth-child(7)", item).text();
                    let seed = $(".torrenttable:nth-child(9)", item).text();
                    let peer = $(".torrenttable:nth-child(10)", item).text();
                    let path = $(".torrenttable:nth-child(2) a", item).attr("href");
                    let img = $(".torrenttable:nth-child(2) a", item).attr("title");
                    if(img.match(/^<img/)){
                        img = $(img).attr("src");
                    } else {
                        img = "";
                    }
                    let id = querystring.parse(path.split("?")[1]).id;

                    let emailProtection = $(".__cf_email__", item).attr('data-cfemail');
                    if(emailProtection){
                        title = cfDecodeEmail(emailProtection);
                    }

                    torrents.push({
                        id: id,
                        cat: cat,
                        title: title,
                        url: this[_private.obj.options].BASE_URL + "/" + path,
                        torrentFile: this[_private.obj.options].BASE_URL + "/download.php?id=" + id,
                        image: img,
                        date: date,
                        size: size,
                        seeds: seed,
                        leechers: peer,
                        path: path
                    });
                });

                let totalPages = 0;
                $(".pager a").each((key, item) => {
                    let page = parseInt($(item).text());
                    if(page > totalPages)
                        totalPages = page;
                });
                resolve({
                    torrents: torrents,
                    page: options.page,
                    totalPages: totalPages
                });
            }).catch(reject);
        });
    }

    login() {
        return new Promise((resolve, reject) => {
            axios.get(this[_private.obj.options].BASE_URL + "/my.php").then(res => {
                if(res.request.path.match(/login.php/)) {
                    const $ = cheerio.load(res.data);
                    axios.post(this[_private.obj.options].BASE_URL + "/takelogin.php", querystring.stringify({
                        validator: $("[name=validator]").val(),
                        username: this[_private.obj.user],
                        password: this[_private.obj.pass],
                        returnto: "/"
                    }) ,{
                        headers: {
                            "Referer": this[_private.obj.options].BASE_URL + "/login.php",
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    }).then((res) => {
                        if(res.data.trim() !== ""){
                            resolve();
                        }
                        else {
                            reject();
                        }
                    }).catch(reject);
                } else {
                    resolve();
                }
            }).catch(reject);
        });
    }

    [_private.fnc.genHash]() {
        let current_date = (new Date()).valueOf().toString();
        let random = Math.random().toString();

        return crypto.createHash('sha1').update(current_date + random).digest('hex')+'.torrent';
    }

    download(torrentUrl, downloadFolder) {
        downloadFolder = downloadFolder || "./tmp";
        return new Promise((resolve, reject) => {
            const path = downloadFolder + "/" + this[_private.fnc.genHash]();
            if(!fs.existsSync(downloadFolder)){
                fs.mkdirSync(downloadFolder);
            }

            const stream = fs.createWriteStream(path);
            stream.on('close', function() {
                resolve(path);
            });
            axios.get(torrentUrl, {
                responseType:'stream'
            }).then(res => {
                res.data.pipe(stream);
            })
            .catch(err => console.log(err));
        });
    }
};