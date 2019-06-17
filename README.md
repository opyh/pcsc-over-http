# Underground Conference memory card HTTP bridge server

Connect a memory card reader to USB and use this server to expose the reader over HTTP.

The server will listen on localhost:80.

## Usage

### Reading a card

```bash
curl 'http://127.0.0.1/HTTPToSerial?cmd=R' \
-XGET \
-H 'Accept: */*' \
-H 'Origin: http://localhost:3000' \
-H 'Pragma: no-cache' \
-H 'Cache-Control: no-cache' \
-H 'Accept-Language: en-us' \
-H 'Host: 127.0.0.1' \
-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.1 Safari/605.1.15' \
-H 'Referer: http://localhost:3000/rule-cards/dNvZJBtAuT4mCthdK' \
-H 'Accept-Encoding: gzip, deflate' \
-H 'Connection: keep-alive'
```

The server will respond with:

```json
{"type":"read","content":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255]}%
```

…or:

```json
{"error":"No card inserted"}
```

…or a JSON object with an `error` field for other errors.

### Writing a card

```bash
curl 'http://127.0.0.1/HTTPToSerial?cmd=W&data=000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff' \
  -XGET \
  -H 'Accept: */*' \
  -H 'Origin: http://localhost:3000' \
  -H 'Pragma: no-cache' \
  -H 'Cache-Control: no-cache' \
  -H 'Accept-Language: en-us' \
  -H 'Host: 127.0.0.1' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.1 Safari/605.1.15' \
  -H 'Referer: http://localhost:3000/rule-cards/dNvZJBtAuT4mCthdK' \
  -H 'Accept-Encoding: gzip, deflate' \
  -H 'Connection: keep-alive'
```

The server will respond like this:

```json
{"type":"write","success":true}
```

…or with an error message, e.g.:

```json
{"error":"Some error happened…"}
```

## Installation

- Install Node.js 11, e.g. with `choco install nvm; nvm install 11; nvm use 11` under Windows
- Run `npm install`
- Start the server with `npm start`
