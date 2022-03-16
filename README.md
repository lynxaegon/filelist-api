# Filelist API
An api for search and download for the private tracker filelist
```
npm install filelist-api
```
it uses cookies.json to keep your cookies for future requests
## Usage

``` js
const FileList = new (require('filelist-api'))([username], [password]);
// optional
const options = {
    search: query,
    cat: 0, // or array: [4, 6, 19]
    searchin: 0,
    sort: 0,
    page: 0
};
FileList.search("Stargate", options).then(result => {
    FileList.download(result[0].torrentFile);
});
```


Login is automatic, but if you want to manually login:
``` js
FileList.login().then(() => {
    FileList.search("Stargate").then(result => {
        FileList.download(result[0].torrentFile);
    });
}).catch((err) => {
    console.log(err);
});
```

## License

MIT
