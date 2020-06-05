# Filelist API
An api for search and download for the private tracker filelist
```
npm install filelist-api
```
it uses cookies.json to keep your cookies for future requests
## Usage

``` js
const FileList = new (require('filelist-api'))([username], [password]);

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