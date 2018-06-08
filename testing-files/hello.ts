// import { Subject } from 'rxjs/Subject';
// import {XMLHttpRequest} from 'xmlhttprequest';

// var sub = new Subject();

var msg:string = "hello world";
console.log(msg);



// let url = 'http://raspberrypi.local:5000/'
// let method = 'GET'


// var xmlHttp = new XMLHttpRequest();
// xmlHttp.onreadystatechange = function() { 
//     if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
//         console.log(xmlHttp.responseText);
// }
// xmlHttp.open(method, url, true); // true for asynchronous 
// xmlHttp.send(null);

// function makeRequest (method, url) {
//   return new Promise(function (resolve, reject) {
//     var xhr = new XMLHttpRequest();
//     xhr.open(method, url);
//     xhr.onload = function () {
//       if (this.status >= 200 && this.status < 300) {
//         resolve(xhr.response);
//       } else {
//         reject({
//           status: this.status,
//           statusText: xhr.statusText
//         });
//       }
//     };
//     xhr.onerror = function () {
//       reject({
//         status: this.status,
//         statusText: xhr.statusText
//       });
//     };
//     xhr.send();
//   });
// }



// makeRequest(method, url)
// .then(function (datums) {
//   console.log(datums);
// })
// .catch(function (err) {
//   console.error('Augh, there was an error!', err.statusText);
// });
