# Introduction
Telegram bot application that converts and crops specified videos and sends the related telegram timeline. youtube or vimeo links can be used.

# Installation
You can use npm package to get all dependent modules installed.

```
npm install
```

# Running the application

```
node giftubebot.js
```

# Running tests

```
npm install -g mocha
```

```
mocha unittests --recursive
```

# Usage
Proper call signatures:

Crops from start time till the seconds value:

```
/gift <video_url> <start_time> <seconds>
```

Crops from start time till the default seconds (5) value:

```
/gift <video_url> <start_time>
```

Crops from beginning of the video till the seconds value:

```
/gift <video_url> <seconds>
```

Examples:

```
/gift https://www.youtube.com/watch?v=KTTTbUCxj2o 00:00:30 5
```

```
/gift https://www.youtube.com/watch?v=KTTTbUCxj2o 00:00:30
```

```
/gift https://www.youtube.com/watch?v=KTTTbUCxj2o 5
```

You can give maximum 30 seconds as duration. If you would give more than that value, the bot will crop the video from start time as far as default duration value as 30 seconds.

# License
The MIT License (MIT)

Copyright (c) 2016 nerezo

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
